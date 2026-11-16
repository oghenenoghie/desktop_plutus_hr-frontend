"use client";

import { use } from "react";

import { PrintPage, printTd, printTdRight, printTh, printThRight } from "@/components/print/print-page";
import { useIsNigeria } from "@/components/region-field";
import { employeesApi, payRunsApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { employerLines, isEnginePayslip, sumLines } from "@/lib/payslip-lines";
import { authorityLabel } from "@/lib/pay-runs";
import type { Payslip } from "@/lib/types";

// What the employer pays on top of gross: employer pension for a Nigerian
// payslip, the employer contribution lines for a country-engine one.
function employerCost(slip: Payslip): number {
  return isEnginePayslip(slip) ? sumLines(employerLines(slip.statutory_lines)) : slip.pension_employer_minor;
}

// The employee's statutory contributions other than income tax: pension and
// NHF for a Nigerian payslip, the employee contribution lines otherwise.
function contributions(slip: Payslip): number {
  if (!isEnginePayslip(slip)) return slip.pension_employee_minor + slip.nhf_minor;
  return sumLines((slip.statutory_lines ?? []).filter((line) => line.kind === "employee_contribution"));
}

function incomeTax(slip: Payslip): number {
  if (!isEnginePayslip(slip)) return slip.paye_minor;
  return sumLines((slip.statutory_lines ?? []).filter((line) => line.kind === "income_tax"));
}

// The payroll register for one posted pay run, laid out to print.
export default function PrintPayRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNigeria = useIsNigeria();
  const payRun = useApiResource(() => payRunsApi.get(id), [id]);
  const payslips = useApiResource(() => payRunsApi.payslips(id), [id]);
  const charges = useApiResource(() => payRunsApi.statutoryCharges(id), [id]);
  const employees = useApiResource(() => employeesApi.list());
  const byId = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const run = payRun.data;
  const slips = [...(payslips.data ?? [])].sort((a, b) =>
    (byId.get(a.employee_id)?.employee_number ?? "").localeCompare(byId.get(b.employee_id)?.employee_number ?? ""),
  );
  const total = (pick: (slip: Payslip) => number) => slips.reduce((sum, slip) => sum + pick(slip), 0);
  // Loans, benefits and union dues: whatever came off gross besides the
  // statutory deductions shown in their own columns.
  const otherDeductions = (slip: Payslip) =>
    slip.gross_minor - slip.net_minor - contributions(slip) - incomeTax(slip);

  return (
    <PrintPage
      title="Payroll Register"
      subtitle={
        run
          ? `${titleCase(run.frequency)} pay run, ${formatDate(run.period_start)} to ${formatDate(run.period_end)}${run.locked_at ? ` · posted ${formatDate(run.locked_at)}` : " · not posted"}`
          : undefined
      }
      allow={["admin", "payroll_manager", "accountant", "auditor"]}
      loading={payRun.loading || payslips.loading || employees.loading}
      error={payRun.error ?? payslips.error ?? employees.error}
      ready={Boolean(run && payslips.data && employees.data)}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={printTh}>No.</th>
            <th className={printTh}>Employee</th>
            <th className={printThRight}>Gross</th>
            {isNigeria ? (
              <>
                <th className={printThRight}>Pension</th>
                <th className={printThRight}>NHF</th>
              </>
            ) : (
              <th className={printThRight}>Contributions</th>
            )}
            <th className={printThRight}>{isNigeria ? "PAYE" : "Income tax"}</th>
            <th className={printThRight}>Other deductions</th>
            <th className={printThRight}>Net pay</th>
            <th className={printThRight}>Employer costs</th>
          </tr>
        </thead>
        <tbody>
          {slips.map((slip) => {
            const employee = byId.get(slip.employee_id);
            return (
              <tr key={slip.id}>
                <td className={printTd}>{employee?.employee_number ?? "—"}</td>
                <td className={printTd}>{employee?.full_name ?? "—"}</td>
                <td className={printTdRight}>{formatMoney(slip.gross_minor)}</td>
                {isNigeria ? (
                  <>
                    <td className={printTdRight}>{formatMoney(slip.pension_employee_minor)}</td>
                    <td className={printTdRight}>{formatMoney(slip.nhf_minor)}</td>
                  </>
                ) : (
                  <td className={printTdRight}>{formatMoney(contributions(slip))}</td>
                )}
                <td className={printTdRight}>{formatMoney(incomeTax(slip))}</td>
                <td className={printTdRight}>{formatMoney(otherDeductions(slip))}</td>
                <td className={printTdRight}>{formatMoney(slip.net_minor)}</td>
                <td className={printTdRight}>{formatMoney(employerCost(slip))}</td>
              </tr>
            );
          })}
          <tr className="font-extrabold">
            <td className={printTd} colSpan={2}>
              Total ({slips.length} employee{slips.length === 1 ? "" : "s"})
            </td>
            <td className={printTdRight}>{formatMoney(total((slip) => slip.gross_minor))}</td>
            {isNigeria ? (
              <>
                <td className={printTdRight}>{formatMoney(total((slip) => slip.pension_employee_minor))}</td>
                <td className={printTdRight}>{formatMoney(total((slip) => slip.nhf_minor))}</td>
              </>
            ) : (
              <td className={printTdRight}>{formatMoney(total(contributions))}</td>
            )}
            <td className={printTdRight}>{formatMoney(total(incomeTax))}</td>
            <td className={printTdRight}>{formatMoney(total(otherDeductions))}</td>
            <td className={printTdRight}>{formatMoney(total((slip) => slip.net_minor))}</td>
            <td className={printTdRight}>{formatMoney(total(employerCost))}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-[11px] text-ink-soft">
        Other deductions are loan repayments, benefits and union dues. Employer costs (employer pension or
        contributions) are paid on top of gross.
      </p>

      {charges.data && charges.data.charges.length > 0 ? (
        <>
          <h2 className="mb-2 mt-8 text-[13px] font-extrabold">Statutory charges</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={printTh}>Scheme</th>
                <th className={printTh}>Paid to</th>
                <th className={printTh}>Due</th>
                <th className={printThRight}>From employees</th>
                <th className={printThRight}>Employer pays</th>
                <th className={printThRight}>Total</th>
              </tr>
            </thead>
            <tbody>
              {charges.data.charges.map((charge) => (
                <tr key={`${charge.scheme}-${charge.state ?? ""}`}>
                  <td className={printTd}>
                    {charge.name}
                    {charge.state ? ` · ${charge.state}` : ""}
                  </td>
                  <td className={printTd}>{authorityLabel(charge.authority, charge.state)}</td>
                  <td className={printTd}>{formatDate(charge.due_date)}</td>
                  <td className={printTdRight}>{formatMoney(charge.employee_minor)}</td>
                  <td className={printTdRight}>{formatMoney(charge.employer_minor)}</td>
                  <td className={printTdRight}>{formatMoney(charge.total_minor)}</td>
                </tr>
              ))}
              <tr className="font-extrabold">
                <td className={printTd} colSpan={3}>
                  Total
                </td>
                <td className={printTdRight}>{formatMoney(charges.data.employee_deductions_minor)}</td>
                <td className={printTdRight}>{formatMoney(charges.data.employer_costs_minor)}</td>
                <td className={printTdRight}>
                  {formatMoney(charges.data.employee_deductions_minor + charges.data.employer_costs_minor)}
                </td>
              </tr>
            </tbody>
          </table>
          {charges.data.note ? <p className="mt-2 text-[11px] text-ink-soft">{charges.data.note}</p> : null}
        </>
      ) : null}
    </PrintPage>
  );
}
