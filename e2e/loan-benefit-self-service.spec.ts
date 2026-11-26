import { expect, test } from "@playwright/test";

import { installMockApi, freshStore } from "./support/mock-api";

test("an employee can submit a loan request and a benefit application", async ({ context, page }) => {
  const store = freshStore("employee");
  const loanWrites: Record<string, unknown>[] = [];
  const loans: Record<string, unknown>[] = [];
  const applicationWrites: Record<string, unknown>[] = [];
  const applications: Record<string, unknown>[] = [];

  await installMockApi(context, store);
  await context.route("**/api/v1/employees/me", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "employee-1",
        org_id: "o1",
        account_id: "acc1",
        employee_number: "EMP-001",
        full_name: "Test Employee",
        state_of_residence: "Lagos",
        employment_type: "permanent",
        lifecycle_state: "active",
        lifecycle_stage: "active",
        date_of_joining: "2025-01-01",
        contract_end_date: null,
        job_title: "Analyst",
        photo_url: null,
        photo_thumbnail_url: null,
        manager_id: null,
        department_id: null,
        branch_id: null,
        job_grade_id: null,
        shift_id: null,
        tin: null,
        basic_minor: 30000000,
        housing_minor: 10000000,
        transport_minor: 5000000,
        other_earnings_minor: 0,
        annual_rent_paid_minor: null,
        pay_frequency: "monthly",
        annual_leave_entitlement_days: 20,
        salary_masked: false,
        created_at: "2025-01-01T00:00:00Z",
      }),
    }),
  );
  await context.route("**/api/v1/loans/me", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      loanWrites.push(body);
      const loan = {
        id: "loan-1",
        employee_id: "employee-1",
        principal_minor: body.principal_minor,
        num_installments: body.num_installments,
        installment_minor: 100_000,
        start_date: body.start_date,
        status: "pending",
        outstanding_minor: body.principal_minor,
        created_at: "2026-11-26T00:00:00Z",
      };
      loans.push(loan);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(loan),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(loans) });
  });
  await context.route("**/api/v1/benefits/plans/available", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "plan-health",
          name: "Health Cover",
          frequency: "monthly",
          description: "Employee medical cover",
          default_employee_cost_minor: 500_000,
          employer_cost_minor: 1_500_000,
          created_at: "2026-11-01T00:00:00Z",
        },
      ]),
    }),
  );
  await context.route("**/api/v1/benefits/applications/me", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      applicationWrites.push(body);
      const application = {
        id: "application-1",
        employee_id: "employee-1",
        plan_id: body.plan_id,
        requested_effective_date: body.requested_effective_date,
        note: body.note ?? null,
        status: "pending",
        decision_note: null,
        benefit_id: null,
        reviewed_by_account_id: null,
        reviewed_at: null,
        created_at: "2026-11-26T00:00:00Z",
        updated_at: "2026-11-26T00:00:00Z",
      };
      applications.push(application);
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(application) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(applications) });
  });

  await page.goto("/me");

  await page.getByRole("button", { name: "New Request" }).click();
  await page.getByLabel("Amount").fill("50000");
  await page.getByLabel("Number of installments").fill("5");
  await page.getByLabel("Requested start date").fill("2026-12-01");
  await page.getByRole("button", { name: "Submit Loan Request" }).click();
  await expect(page.getByText("Loan request submitted for approval.")).toBeVisible();

  await page.getByRole("button", { name: "New Application" }).click();
  await page.getByLabel("Benefit plan").selectOption("plan-health");
  await page.getByLabel("Requested effective date").fill("2026-12-01");
  await page.getByLabel("Note (optional)").fill("Please add me to the health plan.");
  await page.getByRole("button", { name: "Submit Application" }).click();
  await expect(page.getByText("Benefit application submitted for approval.")).toBeVisible();
  await expect(page.getByText("Health Cover")).toBeVisible();
  await expect(page.getByText(/pending/i).first()).toBeVisible();

  expect(loanWrites).toHaveLength(1);
  expect(loanWrites[0]).toMatchObject({
    principal_minor: 5_000_000,
    num_installments: 5,
    start_date: "2026-12-01",
  });
  expect(applicationWrites).toHaveLength(1);
  expect(applicationWrites[0]).toMatchObject({
    plan_id: "plan-health",
    requested_effective_date: "2026-12-01",
    note: "Please add me to the health plan.",
  });
});

test("a manager can approve a pending loan and a pending benefit application", async ({ context, page }) => {
  const store = freshStore("payroll_manager");
  const loan = {
    id: "loan-approval-1",
    employee_id: "employee-1",
    principal_minor: 2_000_000,
    num_installments: 4,
    installment_minor: 500_000,
    start_date: "2026-12-01",
    status: "pending",
    outstanding_minor: 2_000_000,
    created_at: "2026-11-26T00:00:00Z",
  };
  const loanToReject = {
    ...loan,
    id: "loan-reject-1",
    status: "pending",
  };
  const application: Record<string, unknown> = {
    id: "benefit-approval-1",
    employee_id: "employee-1",
    plan_id: "plan-health",
    requested_effective_date: "2026-12-01",
    note: "Health cover",
    status: "pending",
    decision_note: null,
    benefit_id: null,
    reviewed_by_account_id: null,
    reviewed_at: null,
    created_at: "2026-11-26T00:00:00Z",
    updated_at: "2026-11-26T00:00:00Z",
  };

  const applicationToReject: Record<string, unknown> = {
    ...application,
    id: "benefit-reject-1",
    status: "pending",
  };

  await installMockApi(context, store);
  await context.route("**/api/v1/loans", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([loan, loanToReject]) });
    }
    return route.fallback();
  });
  await context.route("**/api/v1/loans/loan-approval-1/approve", async (route) => {
    loan.status = "active";
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(loan) });
  });
  await context.route("**/api/v1/loans/loan-reject-1/reject", async (route) => {
    loanToReject.status = "rejected";
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(loanToReject) });
  });
  await context.route("**/api/v1/benefits/applications", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([application, applicationToReject]) }),
  );
  await context.route("**/api/v1/benefits/applications/benefit-approval-1/approve", async (route) => {
    application.status = "approved";
    application.benefit_id = "benefit-1";
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(application) });
  });
  await context.route("**/api/v1/benefits/applications/benefit-reject-1/reject", async (route) => {
    applicationToReject.status = "rejected";
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(applicationToReject) });
  });

  await page.goto("/loans");
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByText("Loan approved.")).toBeVisible();
  await page.getByRole("button", { name: "Reject" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reject Loan" }).click();
  await expect(page.getByText("Loan rejected.")).toBeVisible();

  await page.goto("/benefits");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Benefit application approved and enrolment created.")).toBeVisible();
  await page.getByRole("button", { name: "Reject" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reject Application" }).click();
  await expect(page.getByText("Benefit application rejected.")).toBeVisible();
});
