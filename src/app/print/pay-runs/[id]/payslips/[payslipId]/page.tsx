"use client";

import { use } from "react";

import { PrintPage } from "@/components/print/print-page";
import { useIsNigeria } from "@/components/region-field";
import { employeesApi, payRunsApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Payslip } from "@/lib/types";

const OTHER_DEDUCTIONS = [
  ["loan_deduction_minor", "Loan repayment"],
  ["benefit_deduction_minor", "Benefit deductions"],
  ["union_dues_deduction_minor", "Union dues"],
] as const;

function amountFromOutputs(slip: Payslip, key: string): number {
  const outputs = slip.derivation?.outputs;
  if (!outputs || typeof outputs !== "object") return 0;
  const value = (outputs as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function PayslipPrintPage({
  params,
}: {
  params: Promise<{ id: string; payslipId: string }>;
}) {
  const { id, payslipId } = use(params);
  const isNigeria = useIsNigeria();
  const payslips = useApiResource(() => payRunsApi.payslips(id), [id]);
  const employees = useApiResource(() => employeesApi.list());
  const slip = payslips.data?.find((item) => item.id === payslipId);
  const employee = employees.data?.find((item) => item.id === slip?.employee_id);
  const employerLines = (slip?.statutory_lines ?? []).filter(
    (line) => line.kind === "employer_contribution",
  );
  const employeeLines = (slip?.statutory_lines ?? []).filter(
    (line) => line.kind !== "employer_contribution",
  );
  const otherDeductions = slip
    ? OTHER_DEDUCTIONS.map(([key, label]) => ({
        label,
        amount: amountFromOutputs(slip, key),
      })).filter((row) => row.amount > 0)
    : [];

  return (
    <PrintPage
      title="Employee Payslip"
      subtitle={slip ? `${formatDate(slip.period_start)} to ${formatDate(slip.period_end)}` : undefined}
      allow={["admin", "payroll_manager", "accountant", "auditor"]}
      loading={payslips.loading || employees.loading}
      error={
        payslips.error ??
        employees.error ??
        (payslips.data && !slip ? "Payslip not found in this pay run." : null) ??
        (slip && !employee ? "Employee record could not be loaded." : null)
      }
      ready={Boolean(slip && employee)}
    >
      {slip && employee ? (
        <article className="mx-auto max-w-[720px]">
          <section className="mb-6 grid grid-cols-2 gap-4 border-b border-ink pb-4 text-[12px]">
            <div>
              <p className="text-ink-soft">Employee</p>
              <p className="font-extrabold text-[16px]">{employee.full_name}</p>
              <p>{employee.employee_number}</p>
              <p>{employee.job_title || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-ink-soft">{isNigeria ? "TIN" : "Tax ID"}</p>
              <p className="font-bold">{employee.tin || "Not recorded"}</p>
              <p className="mt-3 text-ink-soft">Pay period</p>
              <p className="font-bold">
                {formatDate(slip.period_start)} – {formatDate(slip.period_end)}
              </p>
            </div>
          </section>

          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="py-2 text-left font-extrabold">Description</th>
                <th className="py-2 text-right font-extrabold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2">Gross pay</td>
                <td className="py-2 text-right tabular-nums">{formatMoney(slip.gross_minor)}</td>
              </tr>
              {isNigeria ? (
                <>
                  <tr className="border-b border-border">
                    <td className="py-2">Pension (employee)</td>
                    <td className="py-2 text-right tabular-nums">− {formatMoney(slip.pension_employee_minor)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2">National Housing Fund (NHF)</td>
                    <td className="py-2 text-right tabular-nums">− {formatMoney(slip.nhf_minor)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2">PAYE (income tax)</td>
                    <td className="py-2 text-right tabular-nums">− {formatMoney(slip.paye_minor)}</td>
                  </tr>
                </>
              ) : (
                employeeLines.map((line) => (
                  <tr key={line.code} className="border-b border-border">
                    <td className="py-2">{line.name}</td>
                    <td className="py-2 text-right tabular-nums">− {formatMoney(line.amount_minor)}</td>
                  </tr>
                ))
              )}
              {otherDeductions.map((row) => (
                <tr key={row.label} className="border-b border-border">
                  <td className="py-2">{row.label}</td>
                  <td className="py-2 text-right tabular-nums">− {formatMoney(row.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink font-extrabold">
                <td className="py-3">Net pay</td>
                <td className="py-3 text-right tabular-nums">{formatMoney(slip.net_minor)}</td>
              </tr>
            </tbody>
          </table>

          <section className="mt-6 border-t border-border pt-4 text-[11px]">
            <p className="font-extrabold">Employer contributions (not deducted from employee pay)</p>
            {isNigeria ? (
              <p className="mt-1">Employer pension: {formatMoney(slip.pension_employer_minor)}</p>
            ) : employerLines.length ? (
              employerLines.map((line) => (
                <p key={line.code} className="mt-1">
                  {line.name}: {formatMoney(line.amount_minor)}
                </p>
              ))
            ) : (
              <p className="mt-1">No employer contributions recorded for this period.</p>
            )}
            <p className="mt-4 text-ink-soft">Payslip generated from the posted payroll record. Rule version: {slip.rule_version_id}.</p>
          </section>
        </article>
      ) : null}
    </PrintPage>
  );
}
