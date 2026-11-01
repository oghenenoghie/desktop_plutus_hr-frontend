import { expect, test, type Page } from "@playwright/test";

import { expectModalContract, trackPageErrors } from "./support/dialogs";
import { freshStore, installMockApi, writesTo, type MockStore } from "./support/mock-api";

// The one item form (ItemFormModal): on the Items page in create and edit
// mode, and inline from a stock adjustment.

let store: MockStore;
let errors: ReturnType<typeof trackPageErrors>;

const itemModal = (page: Page, name = "New Item") => page.getByRole("dialog", { name, exact: true });

test.beforeEach(async ({ context, page }) => {
  store = freshStore();
  await installMockApi(context, store);
  errors = trackPageErrors(page);
});

test.afterEach(() => errors.expectNone());

test.describe("Items page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/inventory/items");
    await expect(page.getByRole("cell", { name: "SKU-1" })).toBeVisible();
  });

  test("the item form behaves as a modal", async ({ page }) => {
    await expectModalContract(page, {
      open: () => page.getByRole("button", { name: "New Item" }).click(),
      name: "New Item",
    });
  });

  test("create mode posts the item and refreshes the list", async ({ page }) => {
    await page.getByRole("button", { name: "New Item" }).click();
    const modal = itemModal(page);
    await modal.locator("#item-sku").fill("PEN-1");
    await modal.locator("#item-name").fill("Blue pen");
    await modal.locator("#item-category").selectOption("cat1");
    await modal.locator("#item-cost").fill("150");
    await modal.getByRole("button", { name: "Create Item" }).click();
    await expect(modal).toBeHidden();

    expect(writesTo(store, "POST", "/inventory/items")[0].body).toEqual({
      sku: "PEN-1",
      name: "Blue pen",
      item_type: "stock",
      base_unit_id: "u1",
      description: null,
      category_id: "cat1",
      reorder_level: null,
      max_level: null,
      default_cost_minor: 15000,
      preferred_vendor_id: null,
      barcode: null,
      track_lots: false,
      track_expiry: false,
    });
    await expect(page.getByRole("cell", { name: "PEN-1" })).toBeVisible();
  });

  test("edit mode loads the item and patches that record", async ({ page }) => {
    await page.getByRole("row", { name: /SKU-1/ }).getByRole("button", { name: "Edit" }).click();
    const modal = itemModal(page, "Edit SKU-1");
    await expect(modal.locator("#item-sku")).toHaveValue("SKU-1");
    await expect(modal.locator("#item-name")).toHaveValue("Paper");
    await expect(modal.locator("#item-active")).toHaveValue("active");

    await modal.locator("#item-name").fill("A4 Paper");
    await modal.getByRole("button", { name: "Save Changes" }).click();
    await expect(modal).toBeHidden();

    const patches = writesTo(store, "PATCH", "/inventory/items/i1");
    expect(patches).toHaveLength(1);
    expect(patches[0].body).toMatchObject({ sku: "SKU-1", name: "A4 Paper", is_active: true });
    expect(writesTo(store, "POST", "/inventory/items")).toHaveLength(0);
  });

  test.describe("on a 375px phone", () => {
    test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

    test("the item form fits the screen and scrolls inside itself", async ({ page }) => {
      await page.getByRole("button", { name: "New Item" }).click();
      const modal = itemModal(page);
      await expect(modal).toBeVisible();
      const box = (await modal.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(8);
      expect(box.x + box.width).toBeLessThanOrEqual(375 - 8);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(667);
      expect(await modal.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
      await modal.getByRole("button", { name: "Create Item" }).scrollIntoViewIfNeeded();
      await expect(modal.getByRole("button", { name: "Create Item" })).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    });
  });
});

test.describe("Stock adjustment", () => {
  test("new stock items go on the open line, then on lines of their own", async ({ page }) => {
    store.items = []; // first-time set-up: entering opening balances
    await page.goto("/inventory/adjustments/new");
    await page.fill("#adj-notes", "Opening count");
    await page.getByRole("button", { name: "+ New Item" }).click();
    const modal = itemModal(page);

    await test.step("only the types an adjustment can take are offered", async () => {
      await expect(modal.locator("#item-type option")).toHaveText(["Stock", "Consumable"]);
    });

    await modal.locator("#item-sku").fill("RICE-50");
    await modal.locator("#item-name").fill("Rice 50kg");
    await modal.getByRole("button", { name: "Create Item" }).click();
    await expect(modal).toBeHidden();
    const rice = store.items.find((item) => item.sku === "RICE-50")!;
    await expect(page.locator("#line-item-0")).toHaveValue(rice.id);
    await expect(page.locator("#adj-notes")).toHaveValue("Opening count");

    await page.fill("#line-qty-0", "40");
    await page.getByRole("button", { name: "+ New Item" }).click();
    await modal.locator("#item-sku").fill("OIL-5");
    await modal.locator("#item-name").fill("Oil 5L");
    await modal.locator("#item-type").selectOption("consumable");
    await modal.getByRole("button", { name: "Create Item" }).click();
    await expect(modal).toBeHidden();
    const oil = store.items.find((item) => item.sku === "OIL-5")!;
    expect(oil.item_type).toBe("consumable");
    await expect(page.locator("#line-item-0")).toHaveValue(rice.id);
    await expect(page.locator("#line-qty-0")).toHaveValue("40");
    await expect(page.locator("#line-item-1")).toHaveValue(oil.id);

    expect(writesTo(store, "POST", "/inventory/adjustments"), "creating items saved the adjustment").toHaveLength(0);
  });
});
