import { expect, test } from "@playwright/test";

import { freshStore, installMockApi } from "./support/mock-api";

// Inline "+ New …" buttons are offered only to roles the API lets create
// that record (src/lib/accounting.ts, canManageInventory). The API is the
// real check — these keep the UI from offering forms it will refuse.

test("an auditor opening a bill is not offered '+ New Vendor'", async ({ context, page }) => {
  await installMockApi(context, freshStore("auditor"));
  await page.goto("/bills");
  await page.getByRole("button", { name: "New Vendor Bill" }).click();
  await expect(page.getByRole("dialog", { name: "New Vendor Bill" })).toBeVisible();
  await expect(page.locator("#vendor")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ New Vendor" })).toHaveCount(0);
});

test("an auditor is not offered 'New Item' on the Items page", async ({ context, page }) => {
  await installMockApi(context, freshStore("auditor"));
  await page.goto("/inventory/items");
  await expect(page.getByRole("cell", { name: "SKU-1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Item" })).toHaveCount(0);
});

test("an HR manager on a purchase order is offered neither vendor nor item creation", async ({ context, page }) => {
  await installMockApi(context, freshStore("hr_manager"));
  await page.goto("/inventory/purchase-orders/new");
  await expect(page.locator("#po-vendor")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ New Vendor" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ New Item" })).toHaveCount(0);
});
