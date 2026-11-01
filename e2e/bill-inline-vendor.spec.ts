import { expect, test, type Page } from "@playwright/test";

import { expectModalContract, trackPageErrors } from "./support/dialogs";
import { freshStore, installMockApi, writesTo, type MockStore } from "./support/mock-api";

// Vendor → bill: "+ New Vendor" inside the New Vendor Bill drawer, where the
// vendor also decides which goods receipts the bill can be linked to.

let store: MockStore;
let errors: ReturnType<typeof trackPageErrors>;

const drawer = (page: Page) => page.getByRole("dialog", { name: "New Vendor Bill" });
const vendorModal = (page: Page) => page.getByRole("dialog", { name: "New Vendor", exact: true });
const openVendorModal = (page: Page) => page.getByRole("button", { name: "+ New Vendor" }).click();

const BILL_FIELDS = {
  "#billNumber": "VB-77",
  "#billDate": "2026-11-01",
  "#dueDate": "2026-12-01",
  "#vat": "37.5",
  "#description": "Stationery delivery",
};

test.beforeEach(async ({ context, page }) => {
  store = freshStore();
  await installMockApi(context, store);
  errors = trackPageErrors(page);
  await page.goto("/bills");
  await page.getByRole("button", { name: "New Vendor Bill" }).click();
  await expect(drawer(page)).toBeVisible();
  // An existing vendor with a goods receipt to link, which fills the amount.
  await page.selectOption("#vendor", "v1");
  await page.selectOption("#goodsReceipt", "g1");
  await expect(page.locator("#amount")).toHaveValue("500");
  for (const [selector, value] of Object.entries(BILL_FIELDS)) await page.fill(selector, value);
  await page.selectOption("#expenseAccount", "5000");
  await page.selectOption("#whtCategory", "goods");
});

test.afterEach(() => errors.expectNone());

test("the vendor modal behaves as a modal on top of the bill drawer", async ({ page }) => {
  await expectModalContract(page, { open: () => openVendorModal(page), name: "New Vendor", parent: drawer(page) });
  await expect(page.locator("#billNumber")).toHaveValue("VB-77");
  await expect(page.locator("#goodsReceipt")).toHaveValue("g1");
});

test("a new vendor is selected, the goods receipt cleared, and the bill saves with it", async ({ page }) => {
  await openVendorModal(page);
  await vendorModal(page).locator("#new-vendor-name").fill("Beta Supplies");
  await vendorModal(page).getByRole("button", { name: "Create Vendor" }).click();
  await expect(vendorModal(page)).toBeHidden();

  const beta = store.vendors.find((vendor) => vendor.name === "Beta Supplies")!;
  await expect(page.locator("#vendor")).toHaveValue(beta.id);
  // Receipts belong to one vendor; one created just now has none to link.
  await expect(page.locator("#goodsReceipt")).toHaveCount(0);
  for (const [selector, value] of Object.entries(BILL_FIELDS)) await expect(page.locator(selector)).toHaveValue(value);
  await expect(page.locator("#amount")).toHaveValue("500");
  await expect(page.locator("#expenseAccount")).toHaveValue("5000");
  await expect(page.locator("#whtCategory")).toHaveValue("goods");

  await page.getByRole("button", { name: "Create Vendor Bill" }).click();
  await expect(drawer(page)).toBeHidden();
  const bills = writesTo(store, "POST", "/bills");
  expect(bills).toHaveLength(1);
  expect(bills[0].body).toEqual({
    vendor_id: beta.id,
    bill_number: "VB-77",
    bill_date: "2026-11-01",
    due_date: "2026-12-01",
    expense_account_code: "5000",
    amount_minor: 50000,
    vat_minor: 3750,
    wht_category: "goods",
    description: "Stationery delivery",
    goods_receipt_id: null,
  });
});
