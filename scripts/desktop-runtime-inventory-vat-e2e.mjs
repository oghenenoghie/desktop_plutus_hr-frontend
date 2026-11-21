import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";

// This runs against the installed Windows app's own Electron renderer,
// bundled FastAPI process and persistent embedded PostgreSQL database.
const API = "http://127.0.0.1:47821/api/v1";
const suffix = randomUUID().slice(0, 8);
const today = new Date().toISOString().slice(0, 10);
const email = `desktop-e2e-${suffix}@example.com`;
const password = `Desktop-E2E-${randomUUID()}-Aa9!`;
let token;

async function call(path, { method = "GET", body, auth = true, expected = [200] } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(auth && token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });
  const raw = await response.text();
  assert(expected.includes(response.status),
    `${method} ${path}: expected ${expected.join("/")}, got ${response.status}: ${raw}`);
  return raw ? JSON.parse(raw) : null;
}

async function stock(itemId) {
  const rows = await call(`/inventory/stock?item_id=${encodeURIComponent(itemId)}&include_zero=true`);
  return Number(rows.find((row) => row.warehouse_code === "MAIN")?.quantity ?? 0);
}

async function createItem(sku, name, unitId) {
  const item = await call("/inventory/items", {
    method: "POST", expected: [201],
    body: { sku, name, base_unit_id: unitId, item_type: "stock" },
  });
  return item.id;
}

async function openingStock(itemId, warehouseId, quantity) {
  const adjustment = await call("/inventory/adjustments", {
    method: "POST", expected: [201],
    body: {
      warehouse_id: warehouseId,
      reason: "opening_balance",
      adjustment_date: today,
      lines: [{ item_id: itemId, quantity: String(quantity), unit_cost_minor: 1000 }],
    },
  });
  await call(`/inventory/adjustments/${adjustment.id}/post`, { method: "POST" });
}

async function approvedOrder(vendorId, warehouseId, itemId, quantity, label, unitPriceMinor = 1000) {
  const order = await call("/inventory/purchase-orders", {
    method: "POST", expected: [201],
    body: {
      vendor_id: vendorId, warehouse_id: warehouseId, order_date: today,
      vendor_reference: `E2E-${label}-${suffix}`,
      lines: [{ item_id: itemId, quantity: String(quantity), unit_price_minor: unitPriceMinor }],
    },
  });
  await call(`/inventory/purchase-orders/${order.id}/submit`, { method: "POST" });
  const approved = await call(`/inventory/purchase-orders/${order.id}/approve`, {
    method: "POST", body: {},
  });
  assert.equal(approved.status, "approved");
  return approved;
}

async function receive(order, warehouseId, quantity, reference) {
  const receipt = await call("/inventory/goods-receipts", {
    method: "POST", expected: [201],
    body: {
      purchase_order_id: order.id, warehouse_id: warehouseId,
      receipt_date: today, supplier_reference: reference,
      lines: [{ po_line_id: order.lines[0].id, accepted_quantity: String(quantity) }],
    },
  });
  assert.ok(!("vat_minor" in receipt) && !("vat_treatment" in receipt),
    "Goods Receipt must not collect supplier VAT");
  const posted = await call(`/inventory/goods-receipts/${receipt.id}/post`, { method: "POST" });
  assert.equal(posted.status, "posted");
  return posted;
}

async function main() {
  // Create an isolated test workspace using the public first-run endpoint.
  await call("/organisation/signup", {
    method: "POST", auth: false, expected: [201],
    body: {
      org_name: `Plutus Desktop E2E ${suffix}`,
      admin_email: email, admin_password: password, country_code: "NG",
    },
  });

  // Sign in through the actual installed Electron window (not a browser
  // against next dev and not the mock API).
  const browser = await chromium.connectOverCDP("http://127.0.0.1:47823");
  try {
    const context = browser.contexts()[0];
    assert.ok(context, "Electron should expose its renderer context");
    const pages = context.pages();
    const page = pages[0];
    assert.ok(page, "Electron should have an application window");
    await page.goto("http://127.0.0.1:47822/login");
    await page.locator("#identifier").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 30_000 });
    await page.getByRole("heading", { name: /Welcome back/ }).waitFor({ state: "visible", timeout: 30_000 });
    console.log("Electron renderer login passed.");
  } finally {
    await browser.close();
  }

  const login = await call("/auth/login", {
    method: "POST", auth: false, body: { identifier: email, password },
  });
  token = login.access_token;
  assert.ok(token, "login should return an access token");

  await call("/chart-of-accounts/seed-defaults", { method: "POST" });
  await call("/inventory/settings", {
    method: "PUT", body: { enabled: true, require_issue_approval: false },
  });
  const units = await call("/inventory/units");
  const pcs = units.find((unit) => unit.code === "PCS");
  assert.ok(pcs, "PCS unit must be available");
  const warehouse = await call("/inventory/warehouses", {
    method: "POST", expected: [201], body: { code: "MAIN", name: "Main store" },
  });
  const vendor = await call("/vendors", {
    method: "POST", expected: [201], body: { name: `E2E Supplier ${suffix}` },
  });

  // 3 existing + two partial deliveries (4 + 3) = 10.
  const itemA = await createItem(`E2E-A-${suffix}`, "E2E paper rolls", pcs.id);
  await openingStock(itemA, warehouse.id, 3);
  const orderA = await approvedOrder(vendor.id, warehouse.id, itemA, 7, "A", 2500000);
  const receiptA1 = await receive(orderA, warehouse.id, 4, `A1-${suffix}`);
  const receiptA2 = await receive(orderA, warehouse.id, 3, `A2-${suffix}`);
  assert.equal(await stock(itemA), 10, "3 existing + 4 + 3 received must equal 10");
  const finalOrderA = await call(`/inventory/purchase-orders/${orderA.id}`);
  assert.equal(finalOrderA.status, "received");
  assert.equal(finalOrderA.receipts.length, 2);

  // 1 existing + 5 received = 6.
  const itemB = await createItem(`E2E-B-${suffix}`, "E2E staplers", pcs.id);
  await openingStock(itemB, warehouse.id, 1);
  const orderB = await approvedOrder(vendor.id, warehouse.id, itemB, 5, "B");
  await receive(orderB, warehouse.id, 5, `B1-${suffix}`);
  assert.equal(await stock(itemB), 6, "1 existing + 5 received must equal 6");

  // A posted stock issue reduces the first item's balance from 10 to 9.
  const issue = await call("/inventory/issues", {
    method: "POST", expected: [201],
    body: {
      warehouse_id: warehouse.id, issue_date: today,
      purpose: "Desktop E2E stock issue",
      lines: [{ item_id: itemA, quantity: "1" }],
    },
  });
  await call(`/inventory/issues/${issue.id}/submit`, { method: "POST" });
  const postedIssue = await call(`/inventory/issues/${issue.id}/post`, { method: "POST" });
  assert.equal(postedIssue.status, "posted");
  assert.equal(await stock(itemA), 9);

  // VAT is entered on the supplier bill and associated with its goods receipt.
  const bill = await call("/bills", {
    method: "POST", expected: [201],
    body: {
      vendor_id: vendor.id, bill_number: `E2E-BILL-${suffix}`,
      bill_date: today, due_date: today,
      expense_account_code: "contractor_expense",
      amount_minor: 10000000, vat_treatment: "standard",
      goods_receipt_id: receiptA1.id,
      description: "Desktop E2E supplier invoice",
    },
  });
  assert.equal(bill.vat_rate_ppm, 75000, "Nigeria standard VAT must be 7.5%");
  assert.equal(bill.vat_minor, 750000, "VAT on N100,000 must be N7,500");
  const approvedBill = await call(`/bills/${bill.id}/approve`, { method: "POST" });
  assert.equal(approvedBill.status, "approved");

  const [year, month] = today.slice(0, 7).split("-");
  const report = await call(`/financial-statements/vat-report?year=${year}&month=${Number(month)}`);
  assert.ok(report.input_vat_minor >= 750000, "VAT report must include approved supplier input VAT");
  const pdf = await fetch(
    `${API}/financial-statements/vat-report/pdf?year=${year}&month=${Number(month)}`,
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) },
  );
  assert.equal(pdf.status, 200);
  assert.ok((pdf.headers.get("content-type") ?? "").includes("application/pdf"));
  assert.ok((await pdf.arrayBuffer()).byteLength > 500, "VAT PDF must not be empty");

  console.log(JSON.stringify({
    status: "passed",
    checks: {
      electron_login: "passed",
      partial_receipts: "4 + 3",
      stock_a: "3 + 7 = 10",
      stock_b: "1 + 5 = 6",
      stock_issue: "10 - 1 = 9",
      goods_receipt_vat: "not collected",
      supplier_bill_vat: "7.5%",
      monthly_vat_report: "input VAT included",
      vat_pdf: "application/pdf",
    },
    purchase_orders: [orderA.po_number, orderB.po_number],
    goods_receipts: [receiptA1.grn_number, receiptA2.grn_number],
    issue: issue.issue_number,
    bill: bill.bill_number,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
