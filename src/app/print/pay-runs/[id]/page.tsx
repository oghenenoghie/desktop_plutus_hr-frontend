"use client";

import { use } from "react";

import { PrintPage, printTd, printTdRight, printTh, printThRight } from "@/components/print/print-page";
import { useIsNigeria } from "@/components/region-field";
import { employeesApi, payRunsApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { employerLines, isEnginePayslip, sumLines } from "@/lib/payslip-lines";
import type { Payslip } from "@/lib/types";

// What the employer pays on top of gross: employer pension for a Nigerian
// payslip, the employer contribution lines for a country-engine one.
function employerCost(slip: Payslip): number {
  return isEnginePayslip(slip) ? sumLines(employerLines(slip.statutory_lines)) : slip.pension_employer_minor;
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
  const employees = useApiResource(() => employeesApi.list());
  const byId = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const run = payRun.data;
  const slips = [...(payslips.data ?? [])].sort((a, b) =>
    (byId.get(a.employee_id)?.employee_number ?? "").localeCompare(byId.get(b.employee_id)?.employee_number ?? ""),
  );
  const total = (pick: (slip: Payslip) => number) => slips.reduce((sum, slip) => sum + pick(slip), 0);
  const deductions = (slip: Payslip) => slip.gross_minor - slip.net_minor;

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
            <th className={printThRight}>{isNigeria ? "PAYE" : "Income tax"}</th>
            <th className={printThRight}>All deductions</th>
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
                <td className={printTdRight}>{formatMoney(incomeTax(slip))}</td>
                <td className={printTdRight}>{formatMoney(deductions(slip))}</td>
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
            <td className={printTdRight}>{formatMoney(total(incomeTax))}</td>
            <td className={printTdRight}>{formatMoney(total(deductions))}</td>
            <td className={printTdRight}>{formatMoney(total((slip) => slip.net_minor))}</td>
            <td className={printTdRight}>{formatMoney(total(employerCost))}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-6 text-[11px] text-ink-soft">
        All deductions are what came out of gross pay: the employee&apos;s statutory contributions, income tax, loan
        repayments, benefits and union dues. Employer costs are paid on top of gross.
      </p>
    </PrintPage>
  );
}
