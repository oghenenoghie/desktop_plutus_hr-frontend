import { expect, test } from "@playwright/test";

import { trackPageErrors } from "./support/dialogs";
import { freshStore, installMockApi } from "./support/mock-api";

// Overlays now share a stack so only the top one answers Escape; one
// standing alone must still close on it. (A drawer alone is covered at the
// end of the invoice spec.)

test("a confirmation dialog on its own still cancels on Escape", async ({ context, page }) => {
  const store = freshStore();
  store.invoices = [
    {
      id: "inv9",
      customer_id: "c1",
      invoice_number: "INV-0009",
      issue_date: "2026-10-01",
      due_date: "2026-10-31",
      amount_minor: 10000,
      status: "draft",
      description: null,
      revenue_account_code: "4000",
    },
  ];
  await installMockApi(context, store);
  const errors = trackPageErrors(page);

  await page.goto("/invoices");
  await page.getByRole("button", { name: "Void" }).click();
  const confirm = page.getByRole("dialog", { name: "Void this customer invoice?" });
  await expect(confirm).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirm).toBeHidden();
  expect(store.writes).toEqual([]);
  errors.expectNone();
});
