import { expect, test, type Page } from "@playwright/test";

import { expectModalContract, trackPageErrors } from "./support/dialogs";
import { freshStore, installMockApi, writesTo, type MockStore } from "./support/mock-api";

// Vendor → purchase order, and item → purchase order line, on the full-page
// New Purchase Order form.

let store: MockStore;
let errors: ReturnType<typeof trackPageErrors>;

const vendorModal = (page: Page) => page.getByRole("dialog", { name: "New Vendor", exact: true });
const itemModal = (page: Page) => page.getByRole("dialog", { name: "New Item", exact: true });

test.beforeEach(async ({ context, page }) => {
  store = freshStore();
  await installMockApi(context, store);
  errors = trackPageErrors(page);
  await page.goto("/inventory/purchase-orders/new");
  await page.selectOption("#po-item-0", "i1");
  await page.fill("#po-qty-0", "5");
  await page.fill("#po-price-0", "100");
  await page.fill("#po-reference", "Q-1");
  await page.fill("#po-notes", "Urgent");
});

test.afterEach(() => errors.expectNone());

async function expectOrderUntouched(page: Page) {
  await expect(page.locator("#po-item-0")).toHaveValue("i1");
  await expect(page.locator("#po-qty-0")).toHaveValue("5");
  await expect(page.locator("#po-price-0")).toHaveValue("100");
  await expect(page.locator("#po-reference")).toHaveValue("Q-1");
  await expect(page.locator("#po-notes")).toHaveValue("Urgent");
}

test("the vendor modal behaves as a modal on the order page", async ({ page }) => {
  await expectModalContract(page, {
    open: () => page.getByRole("button", { name: "+ New Vendor" }).click(),
    name: "New Vendor",
  });
  await expectOrderUntouched(page);
});

test("creating a vendor neither saves the order nor loses what's typed", async ({ page }) => {
  await page.getByRole("button", { name: "+ New Vendor" }).click();
  await vendorModal(page).locator("#new-vendor-name").fill("Gamma Traders");
  await vendorModal(page).getByRole("button", { name: "Create Vendor" }).click();
  await expect(vendorModal(page)).toBeHidden();

  // The vendor modal's submit used to bubble through the portal and save the
  // order with the previously selected vendor.
  expect(writesTo(store, "POST", "/inventory/purchase-orders")).toHaveLength(0);
  await expect(page).toHaveURL(/\/inventory\/purchase-orders\/new$/);
  const gamma = store.vendors.find((vendor) => vendor.name === "Gamma Traders")!;
  await expect(page.locator("#po-vendor")).toHaveValue(gamma.id);
  await expectOrderUntouched(page);

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/inventory\/purchase-orders\/po1$/);
  const [order] = writesTo(store, "POST", "/inventory/purchase-orders");
  expect(order.body?.vendor_id).toBe(gamma.id);
});

test("a new item goes on the open line and the order saves with it", async ({ page }) => {
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByRole("button", { name: "+ New Item" }).click();
  await expect(itemModal(page)).toBeVisible();
  await itemModal(page).locator("#item-sku").fill("TONER-9");
  await itemModal(page).locator("#item-name").fill("Toner cartridge");
  await itemModal(page).locator("#item-unit").selectOption("u2");
  await itemModal(page).getByRole("button", { name: "Create Item" }).click();
  await expect(itemModal(page)).toBeHidden();

  const toner = store.items.find((item) => item.sku === "TONER-9")!;
  expect(writesTo(store, "POST", "/inventory/items")[0].body).toMatchObject({
    sku: "TONER-9",
    name: "Toner cartridge",
    item_type: "stock",
    base_unit_id: "u2",
  });
  await expect(page.locator("#po-item-1")).toHaveValue(toner.id);
  await expect(page.locator("#po-unit-1")).toHaveValue("u2");
  await expectOrderUntouched(page);
  expect(writesTo(store, "POST", "/inventory/purchase-orders")).toHaveLength(0);

  await test.step("with no open line, the next new item gets a line of its own", async () => {
    await page.fill("#po-qty-1", "2");
    await page.fill("#po-price-1", "4500");
    await page.getByRole("button", { name: "+ New Item" }).click();
    await itemModal(page).locator("#item-sku").fill("INK-2");
    await itemModal(page).locator("#item-name").fill("Ink");
    await itemModal(page).getByRole("button", { name: "Create Item" }).click();
    await expect(itemModal(page)).toBeHidden();
    const ink = store.items.find((item) => item.sku === "INK-2")!;
    await expect(page.locator("#po-item-2")).toHaveValue(ink.id);
    await expect(page.locator("#po-item-1")).toHaveValue(toner.id);
    await page.fill("#po-qty-2", "1");
    await page.fill("#po-price-2", "800");
  });

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/inventory\/purchase-orders\/po1$/);
  const [order] = writesTo(store, "POST", "/inventory/purchase-orders");
  const ink = store.items.find((item) => item.sku === "INK-2")!;
  const lines = order.body?.lines as { item_id: string }[];
  expect(order.body?.vendor_id).toBe("v1");
  expect(lines.map((line) => line.item_id)).toEqual(["i1", toner.id, ink.id]);
});
