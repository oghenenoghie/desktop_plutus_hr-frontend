import type { BrowserContext } from "@playwright/test";

import type { Customer, InventoryItem, Role, Vendor } from "@/lib/types";

// Every backend call the app makes is answered here, in the browser, from an
// in-memory store — so these tests need no backend and no database, and can
// assert on exactly what the app tried to write. Behaviour mirrors the API
// where the tests depend on it: duplicate names are refused with the API's
// 400 message, and creating customers, vendors and items is refused with 403
// for the roles the API refuses (require_roles / inventory.manage).

export interface Write {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

export interface MockStore {
  role: Role;
  seq: number;
  writes: Write[];
  customers: Customer[];
  vendors: Vendor[];
  items: InventoryItem[];
  invoices: Record<string, unknown>[];
  receiptsByVendor: Record<string, Record<string, unknown>[]>;
}

const NOW = "2026-11-01T00:00:00Z";
const WRITERS: Role[] = ["admin", "payroll_manager", "accountant"];

const ACCOUNTS = [
  { id: "a1", org_id: "o1", code: "4000", name: "Sales Revenue", type: "revenue", is_system: true, is_active: true, created_at: NOW },
  { id: "a2", org_id: "o1", code: "5000", name: "Office Expense", type: "expense", is_system: true, is_active: true, created_at: NOW },
];
const UNITS = [
  { id: "u1", code: "PCS", name: "Pieces", allows_fraction: false, is_active: true },
  { id: "u2", code: "BOX", name: "Box", allows_fraction: false, is_active: true },
];
const CATEGORIES = [
  { id: "cat1", name: "Stationery", parent_id: null, is_active: true, expense_account_code: null, created_at: NOW },
];
const WAREHOUSES = [
  { id: "w1", code: "MAIN", name: "Main Store", branch_id: null, address: null, is_active: true, created_at: NOW },
];

export function itemRecord(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: "i?",
    sku: "",
    name: "",
    description: null,
    item_type: "stock",
    category_id: null,
    category_name: null,
    base_unit_id: "u1",
    base_unit_code: "PCS",
    base_unit_allows_fraction: false,
    reorder_level: null,
    max_level: null,
    default_cost_minor: null,
    preferred_vendor_id: null,
    barcode: null,
    is_active: true,
    track_lots: false,
    track_expiry: false,
    created_at: NOW,
    units: [],
    quantity_on_hand: "0",
    value_minor: 0,
    average_cost_minor: 0,
    ...overrides,
  };
}

export function freshStore(role: Role = "admin"): MockStore {
  return {
    role,
    seq: 100,
    writes: [],
    customers: [
      { id: "c1", org_id: "o1", name: "Existing Customer", contact_email: null, contact_phone: null, tin: null, created_at: NOW },
    ],
    vendors: [
      { id: "v1", org_id: "o1", contractor_id: null, name: "Existing Vendor", contact_email: null, contact_phone: null, tin: null, created_at: NOW },
    ],
    items: [itemRecord({ id: "i1", sku: "SKU-1", name: "Paper", quantity_on_hand: "10" })],
    invoices: [],
    receiptsByVendor: {
      v1: [{ id: "g1", grn_number: "GRN-0001", po_number: "PO-0001", accrued_minor: 50000, vendor_id: "v1", status: "posted" }],
    },
  };
}

export function writesTo(store: MockStore, method: string, path: string): Write[] {
  return store.writes.filter((write) => write.method === method && write.path === path);
}

// Signs the browser in (any token — /auth/me below decides the role) and
// routes every /api/v1 request, on whatever host the build points at, to the
// store.
export async function installMockApi(context: BrowserContext, store: MockStore): Promise<void> {
  await context.addInitScript(() => {
    window.localStorage.setItem("plutus.access_token", "e2e-access");
    window.localStorage.setItem("plutus.refresh_token", "e2e-refresh");
  });

  await context.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const method = request.method();
    const raw = request.postData();
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    if (method !== "GET") store.writes.push({ method, path, body });
    const json = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    // Enough latency for loading states to be observable.
    await new Promise((resolve) => setTimeout(resolve, method === "GET" ? 120 : 200));

    if (method === "GET" && path === "/auth/me") {
      return json(200, {
        account_id: "acc1",
        org_id: "o1",
        role: store.role,
        org_name: "E2E Org",
        mfa_enabled: false,
        country_code: "NG",
        country_name: "Nigeria",
        currency: "NGN",
        payroll_available: true,
      });
    }

    for (const kind of ["customers", "vendors"] as const) {
      if (path !== `/${kind}`) continue;
      const records: (Customer | Vendor)[] = store[kind];
      if (method === "GET") return json(200, records);
      if (method === "POST" && body) {
        if (!WRITERS.includes(store.role)) return json(403, { detail: "insufficient role" });
        const name = String(body.name).toLowerCase();
        if (records.some((record) => record.name.toLowerCase() === name)) {
          return json(400, { detail: `a ${kind.slice(0, -1)} with this name already exists` });
        }
        const record = {
          id: `${kind[0]}${++store.seq}`,
          org_id: "o1",
          contractor_id: null,
          contact_email: null,
          contact_phone: null,
          tin: null,
          created_at: NOW,
          ...body,
        } as Customer & Vendor;
        records.push(record);
        return json(201, record);
      }
    }

    if (method === "GET" && path === "/chart-of-accounts") return json(200, ACCOUNTS);
    if (method === "GET" && path === "/invoices") return json(200, store.invoices);
    if (method === "POST" && path === "/invoices") return json(201, { id: "inv1", status: "draft", ...body });
    if (method === "GET" && path === "/bills") return json(200, []);
    if (method === "POST" && path === "/bills") return json(201, { id: "bill1", status: "draft", ...body });
    if (method === "GET" && path === "/inventory/goods-receipts") {
      return json(200, store.receiptsByVendor[url.searchParams.get("vendor_id") ?? ""] ?? []);
    }
    if (method === "GET" && path === "/inventory/units") return json(200, UNITS);
    if (method === "GET" && path === "/inventory/categories") return json(200, CATEGORIES);
    if (method === "GET" && path === "/inventory/warehouses") return json(200, WAREHOUSES);

    if (path === "/inventory/items") {
      if (method === "GET") return json(200, store.items);
      if (method === "POST" && body) {
        if (!WRITERS.includes(store.role)) return json(403, { detail: "insufficient permission" });
        if (store.items.some((item) => item.sku === body.sku)) {
          return json(400, { detail: "an item with this SKU already exists" });
        }
        const unit = UNITS.find((candidate) => candidate.id === body.base_unit_id);
        const item = itemRecord({
          ...(body as Partial<InventoryItem>),
          id: `i${++store.seq}`,
          base_unit_code: unit?.code ?? "?",
        });
        store.items.push(item);
        return json(201, item);
      }
    }
    const itemPath = path.match(/^\/inventory\/items\/([^/]+)$/);
    if (itemPath && method === "PATCH" && body) {
      const item = store.items.find((candidate) => candidate.id === itemPath[1]);
      if (!item) return json(404, { detail: "item not found" });
      Object.assign(item, body);
      return json(200, item);
    }

    if (method === "POST" && path === "/inventory/purchase-orders") {
      return json(201, { id: "po1", po_number: "PO-0099", status: "draft", ...body, lines: [] });
    }
    if (method === "GET" && path === "/inventory/purchase-orders/po1") {
      return json(200, {
        id: "po1",
        po_number: "PO-0099",
        status: "draft",
        vendor_id: "v1",
        vendor_name: "Existing Vendor",
        warehouse_id: null,
        order_date: "2026-11-01",
        expected_date: null,
        vendor_reference: null,
        notes: null,
        lines: [],
        subtotal_minor: 0,
        tax_minor: 0,
        total_minor: 0,
      });
    }
    if (method === "POST" && path === "/inventory/adjustments") {
      return json(201, { id: "adj1", status: "draft", ...body, lines: [] });
    }

    // Anything else the shell asks for (notifications, badges…) is empty.
    if (method === "GET") return json(200, []);
    return json(404, { detail: `not mocked: ${method} ${path}` });
  });
}
