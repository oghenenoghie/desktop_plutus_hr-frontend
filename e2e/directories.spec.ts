import { expect, test } from "@playwright/test";

import { trackPageErrors } from "./support/dialogs";
import { freshStore, installMockApi, writesTo } from "./support/mock-api";

// The Customer List and Vendor List pages create through the same modals as
// the inline flows; they must keep their validation, loading and error
// states, and refresh the list after a create.

const DIRECTORIES = [
  { kind: "customers", url: "/invoices/customers", label: "Customer", existing: "Existing Customer", created: "Delta Co" },
  { kind: "vendors", url: "/bills/vendors", label: "Vendor", existing: "Existing Vendor", created: "Delta Supplies" },
] as const;

for (const directory of DIRECTORIES) {
  test(`${directory.label} List creates through the shared modal`, async ({ context, page }) => {
    const store = freshStore();
    await installMockApi(context, store);
    const errors = trackPageErrors(page);
    const prefix = `#new-${directory.label.toLowerCase()}`;
    const submit = `Create ${directory.label}`;

    await page.goto(directory.url);
    await expect(page.getByRole("cell", { name: directory.existing })).toBeVisible();
    await page.getByRole("button", { name: `New ${directory.label}`, exact: true }).click();
    const modal = page.getByRole("dialog", { name: `New ${directory.label}`, exact: true });
    await expect(modal).toBeVisible();

    await test.step("the name is required and the email must be one", async () => {
      await modal.getByRole("button", { name: submit }).click();
      await modal.locator(`${prefix}-name`).fill(directory.created);
      await modal.locator(`${prefix}-email`).fill("not-an-email");
      await modal.getByRole("button", { name: submit }).click();
      await expect(modal).toBeVisible();
      expect(writesTo(store, "POST", `/${directory.kind}`)).toHaveLength(0);
      await modal.locator(`${prefix}-email`).fill("");
    });

    await test.step("a duplicate shows a busy button, then the API's error, and stays open", async () => {
      await modal.locator(`${prefix}-name`).fill(directory.existing);
      await modal.getByRole("button", { name: submit }).click();
      await expect(modal.getByRole("button", { name: "Creating…" })).toBeDisabled();
      await expect(page.getByRole("status").filter({ hasText: "with this name already exists" })).toBeVisible();
      await expect(modal).toBeVisible();
      await expect(modal.getByRole("button", { name: submit })).toBeEnabled();
    });

    await test.step("a new name is created, the modal closes and the list refreshes", async () => {
      await modal.locator(`${prefix}-name`).fill(directory.created);
      await modal.getByRole("button", { name: submit }).click();
      await expect(modal).toBeHidden();
      await expect(page.getByRole("cell", { name: directory.created })).toBeVisible();
    });

    errors.expectNone();
  });
}
