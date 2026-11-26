import { expect, test } from "@playwright/test";

import { installMockApi, freshStore } from "./support/mock-api";

test("PDF preview is shown before printing and Print is an explicit action", async ({ context, page }) => {
  await installMockApi(context, freshStore("accountant"));
  await context.route("**/api/v1/organisation", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "org-1",
        name: "E2E Organisation",
        rc_number: null,
        company_tin: "TIN-001",
        address: null,
        default_pay_frequency: "monthly",
        default_pfa: null,
        states_of_operation: [],
        country_code: "NG",
        country_name: "Nigeria",
        currency: "NGN",
      }),
    }),
  );
  await context.route("**/api/v1/financial-statements/vat-report**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        year: 2026,
        month: 11,
        period_start: "2026-11-01",
        period_end: "2026-11-30",
        currency: "NGN",
        country_code: "NG",
        output_groups: [],
        sales_net_minor: 0,
        vat_charged_minor: 0,
        credit_note_count: 0,
        credit_note_net_minor: 0,
        credit_note_vat_minor: 0,
        output_vat_minor: 0,
        input_groups: [],
        purchases_net_minor: 0,
        input_vat_minor: 0,
        net_vat_minor: 0,
        position: "nil",
        draft_invoice_count: 0,
        draft_bill_count: 0,
        documents: [],
        generated_at: "2026-11-26T09:00:00Z",
      }),
    }),
  );

  await page.addInitScript(() => {
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => {
      const target = window as Window & { __printCalls?: number };
      target.__printCalls = (target.__printCalls ?? 0) + 1;
    };
  });

  await page.goto("/print/vat-report?month=2026-11");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "VAT Report" })).toBeVisible();
  await expect(page.getByText("Output VAT").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeEnabled();

  // Rendering a document must never open the native print dialog by itself.
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls)).toBe(0);

  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls)).toBe(1);
});
