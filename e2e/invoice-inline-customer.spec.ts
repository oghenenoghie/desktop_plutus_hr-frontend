import { expect, test, type Page } from "@playwright/test";

import { expectModalContract, isOnTop, trackPageErrors } from "./support/dialogs";
import { freshStore, installMockApi, writesTo, type MockStore } from "./support/mock-api";

// Customer → invoice: "+ New Customer" inside the New Customer Invoice drawer.

const INVOICE_FIELDS = {
  "#invoiceNumber": "INV-9001",
  "#issueDate": "2026-11-01",
  "#dueDate": "2026-11-30",
  "#amount": "1500",
  "#description": "Consulting retainer",
};

let store: MockStore;
let errors: ReturnType<typeof trackPageErrors>;

test.beforeEach(async ({ context, page }) => {
  store = freshStore();
  await installMockApi(context, store);
  errors = trackPageErrors(page);
  await page.goto("/invoices");
  await page.getByRole("button", { name: "New Customer Invoice" }).click();
  await expect(drawer(page)).toBeVisible();
  for (const [selector, value] of Object.entries(INVOICE_FIELDS)) await page.fill(selector, value);
  await page.selectOption("#revenueAccount", "4000");
});

test.afterEach(() => errors.expectNone());

const drawer = (page: Page) => page.getByRole("dialog", { name: "New Customer Invoice" });
const customerModal = (page: Page) => page.getByRole("dialog", { name: "New Customer", exact: true });
const openCustomerModal = (page: Page) => page.getByRole("button", { name: "+ New Customer" }).click();

async function expectInvoiceUntouched(page: Page) {
  for (const [selector, value] of Object.entries(INVOICE_FIELDS)) await expect(page.locator(selector)).toHaveValue(value);
  await expect(page.locator("#revenueAccount")).toHaveValue("4000");
}

test("the customer modal behaves as a modal on top of the invoice drawer", async ({ page }) => {
  await expectModalContract(page, { open: () => openCustomerModal(page), name: "New Customer", parent: drawer(page) });
  await expectInvoiceUntouched(page);

  await test.step("a backdrop click closes the modal only", async () => {
    await openCustomerModal(page);
    await expect(customerModal(page)).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(customerModal(page)).toBeHidden();
    await expect(drawer(page)).toBeVisible();
  });

  await test.step("the close button returns focus to '+ New Customer'", async () => {
    await openCustomerModal(page);
    await customerModal(page).getByRole("button", { name: "Close dialog" }).click();
    await expect(customerModal(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "+ New Customer" })).toBeFocused();
  });

  await test.step("Cancel creates nothing and leaves the invoice as it was", async () => {
    await openCustomerModal(page);
    await customerModal(page).locator("#new-customer-name").fill("Abandoned Co");
    await customerModal(page).getByRole("button", { name: "Cancel" }).click();
    await expect(customerModal(page)).toBeHidden();
    await expect(page.locator("#customer")).toHaveValue("");
    expect(writesTo(store, "POST", "/customers")).toHaveLength(0);
    await expectInvoiceUntouched(page);
  });

  await test.step("with nothing above it, Escape still closes the drawer", async () => {
    await page.locator("#invoiceNumber").focus();
    await page.keyboard.press("Escape");
    await expect(drawer(page)).toBeHidden();
  });
});

test("a refused customer keeps the modal open, the error visible and the cursor in place", async ({ page }) => {
  await openCustomerModal(page);
  const modal = customerModal(page);
  await modal.locator("#new-customer-name").fill("Existing Customer");
  await modal.locator("#new-customer-email").fill("ap@existing.test");
  await modal.locator("#new-customer-email").press("Enter");

  const message = page.getByRole("status").filter({ hasText: "a customer with this name already exists" });
  await expect(message).toBeVisible();
  expect(await isOnTop(page, message), "the error toast is hidden behind the modal backdrop").toBe(true);
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("button", { name: "Create Customer" })).toBeEnabled();
  await expect(modal.locator("#new-customer-email")).toBeFocused();
});

test("a new customer is selected and the invoice saves with it", async ({ page }) => {
  await openCustomerModal(page);
  await customerModal(page).locator("#new-customer-name").fill("Acme Ltd");
  await customerModal(page).locator("#new-customer-tin").fill("12345678-0001");
  await customerModal(page).getByRole("button", { name: "Create Customer" }).click();
  await expect(customerModal(page)).toBeHidden();

  const [created] = writesTo(store, "POST", "/customers");
  expect(created.body).toEqual({ name: "Acme Ltd", contact_email: null, contact_phone: null, tin: "12345678-0001" });
  const acme = store.customers.find((customer) => customer.name === "Acme Ltd")!;

  await expect(page.locator("#customer")).toHaveValue(acme.id);
  await expect(page.locator("#customer option")).toHaveText(["Select customer", "Existing Customer", "Acme Ltd"]);
  await expectInvoiceUntouched(page);
  expect(writesTo(store, "POST", "/invoices"), "creating the customer submitted the invoice").toHaveLength(0);

  await test.step("a second inline customer keeps the first listed", async () => {
    await openCustomerModal(page);
    await customerModal(page).locator("#new-customer-name").fill("Zenith Partners");
    await customerModal(page).getByRole("button", { name: "Create Customer" }).click();
    await expect(customerModal(page)).toBeHidden();
    await expect(page.locator("#customer option")).toHaveText([
      "Select customer",
      "Existing Customer",
      "Acme Ltd",
      "Zenith Partners",
    ]);
    await page.selectOption("#customer", acme.id);
  });

  await page.getByRole("button", { name: "Create Customer Invoice" }).click();
  await expect(drawer(page)).toBeHidden();
  const invoices = writesTo(store, "POST", "/invoices");
  expect(invoices).toHaveLength(1);
  expect(invoices[0].body).toEqual({
    customer_id: acme.id,
    invoice_number: "INV-9001",
    issue_date: "2026-11-01",
    due_date: "2026-11-30",
    revenue_account_code: "4000",
    amount_minor: 150000,
    description: "Consulting retainer",
  });
});
