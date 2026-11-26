import { expect, test } from "@playwright/test";

import { installMockApi, freshStore, type MockStore } from "./support/mock-api";

test("an employee can submit an expense claim and see it in their history", async ({ context, page }) => {
  const store: MockStore = freshStore("employee");
  const claims: Record<string, unknown>[] = [];

  await installMockApi(context, store);
  await context.route("**/api/v1/expenses/me", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      claims.push(body);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "expense-1",
          employee_id: "employee-1",
          ...body,
          status: "pending",
          created_at: "2026-11-26T00:00:00Z",
          decided_at: null,
          reimbursed_at: null,
        }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(claims.map((claim) => ({
      id: "expense-1",
      employee_id: "employee-1",
      ...claim,
      status: "pending",
      created_at: "2026-11-26T00:00:00Z",
      decided_at: null,
      reimbursed_at: null,
    }))) });
  });

  await page.goto("/expenses");
  await page.getByLabel("Category").fill("Transport");
  await page.getByLabel("Expense date").fill("2026-11-25");
  await page.getByLabel("Amount (₦)").fill("1250.50");
  await page.getByLabel("Description").fill("Travel to customer site");
  await page.getByRole("button", { name: "Submit expense claim" }).click();

  await expect(page.getByText("Expense claim submitted for approval.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Transport" })).toBeVisible();
  expect(claims).toHaveLength(1);
  expect(claims[0]).toMatchObject({
    category: "Transport",
    description: "Travel to customer site",
    amount_minor: 125050,
    expense_date: "2026-11-25",
    receipt_url: null,
  });
});
