"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { payRunsApi, payrollReportsApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

const CURRENT_YEAR = new Date().getFullYear();

export default function PayrollReportsPage() {
  return (
    <div>
      <PageHeader title="Payroll Reports" subtitle="Payroll register, PAYE by state, and annual tax reconciliation" />
      <Tabs
        tabs={[
          { id: "register", label: "Payroll Register", content: <PayrollRegisterTab /> },
          { id: "paye-by-state", label: "PAYE by State", content: <PayeByStateTab /> },
          { id: "annual-reconciliation", label: "Annual Tax Reconciliation", content: <AnnualReconciliationTab /> },
        ]}
      />
    </div>
  );
}

function PayrollRegisterTab() {
  const payRuns = useApiResource(() => payRunsApi.list());
  const [payRunId, setPayRunId] = useState("");
  const register = useApiResource(
    () => (payRunId ? payrollReportsApi.register(payRunId) : Promise.resolve([])),
    [payRunId],
  );

  return (
    <div>
      <Card className="mb-6">
        <Label htmlFor="payRun">Pay Run</Label>
        <Select id="payRun" value={payRunId} onChange={(event) => setPayRunId(event.target.value)}>
          <option value="">Select a pay run</option>
          {(payRuns.data ?? []).map((payRun) => (
            <option key={payRun.id} value={payRun.id}>
              {formatDate(payRun.period_start)} – {formatDate(payRun.period_end)}
            </option>
          ))}
        </Select>
      </Card>

      {payRunId ? (
        <Card>
          {register.loading ? <LoadingState /> : null}
          {register.error ? <ErrorState message={register.error} /> : null}
          {register.data && register.data.length === 0 ? (
            <EmptyState label="No payslips for this pay run." />
          ) : null}
          {register.data && register.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th align="right">Gross</Th>
                    <Th align="right">Pension (Ee)</Th>
                    <Th align="right">Pension (Er)</Th>
                    <Th align="right">NHF</Th>
                    <Th align="right">PAYE</Th>
                    <Th align="right">Loan</Th>
                    <Th align="right">Benefit</Th>
                    <Th align="right">Union Dues</Th>
                    <Th align="right">Net</Th>
                  </tr>
                </Thead>
                <tbody>
                  {register.data.map((line) => (
                    <tr key={line.employee_id}>
                      <Td className="font-bold">
                        {line.full_name}
                        <div className="text-[11px] font-normal text-ink-soft">{line.employee_number}</div>
                      </Td>
                      <Td align="right">{formatMoney(line.gross_minor)}</Td>
                      <Td align="right">{formatMoney(line.pension_employee_minor)}</Td>
                      <Td align="right">{formatMoney(line.pension_employer_minor)}</Td>
                      <Td align="right">{formatMoney(line.nhf_minor)}</Td>
                      <Td align="right">{formatMoney(line.paye_minor)}</Td>
                      <Td align="right">{formatMoney(line.loan_deduction_minor)}</Td>
                      <Td align="right">{formatMoney(line.benefit_deduction_minor)}</Td>
                      <Td align="right">{formatMoney(line.union_dues_deduction_minor)}</Td>
                      <Td align="right" className="font-bold">
                        {formatMoney(line.net_minor)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function PayeByStateTab() {
  const lines = useApiResource(() => payrollReportsApi.payeByState());

  return (
    <Card>
      {lines.loading ? <LoadingState /> : null}
      {lines.error ? <ErrorState message={lines.error} /> : null}
      {lines.data && lines.data.length === 0 ? <EmptyState label="No PAYE recorded yet." /> : null}
      {lines.data && lines.data.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>State</Th>
              <Th align="right">Employees</Th>
              <Th align="right">Total PAYE</Th>
            </tr>
          </Thead>
          <tbody>
            {lines.data.map((line) => (
              <tr key={line.state_of_residence}>
                <Td className="font-bold">{line.state_of_residence}</Td>
                <Td align="right">{line.employee_count}</Td>
                <Td align="right">{formatMoney(line.total_paye_minor)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </Card>
  );
}

function AnnualReconciliationTab() {
  const [taxYear, setTaxYear] = useState(CURRENT_YEAR);
  const { showToast } = useToast();
  const reconciliation = useApiResource(
    () => payrollReportsApi.annualTaxReconciliation(taxYear),
    [taxYear],
  );

  async function downloadCertificate(employeeId: string) {
    try {
      await payrollReportsApi.downloadTaxCertificate(
        employeeId,
        taxYear,
        `tax-certificate-${taxYear}.pdf`,
      );
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Download failed.", "bad");
    }
  }

  return (
    <div>
      <Card className="mb-6">
        <Label htmlFor="taxYear">Tax Year</Label>
        <Input
          id="taxYear"
          type="number"
          value={taxYear}
          onChange={(event) => setTaxYear(Number(event.target.value))}
          className="w-32"
        />
      </Card>

      <Card>
        {reconciliation.loading ? <LoadingState /> : null}
        {reconciliation.error ? <ErrorState message={reconciliation.error} /> : null}
        {reconciliation.data && reconciliation.data.length === 0 ? (
          <EmptyState label="No locked payslips for this tax year yet." />
        ) : null}
        {reconciliation.data && reconciliation.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Employee</Th>
                <Th>TIN</Th>
                <Th align="right">Gross</Th>
                <Th align="right">Pension</Th>
                <Th align="right">NHF</Th>
                <Th align="right">PAYE</Th>
                <Th align="right">Payslips</Th>
                <Th align="right">Certificate</Th>
              </tr>
            </Thead>
            <tbody>
              {reconciliation.data.map((line) => (
                <tr key={line.employee_id}>
                  <Td className="font-bold">
                    {line.full_name}
                    <div className="text-[11px] font-normal text-ink-soft">{line.employee_number}</div>
                  </Td>
                  <Td>{line.tin ?? "Missing"}</Td>
                  <Td align="right">{formatMoney(line.total_gross_minor)}</Td>
                  <Td align="right">{formatMoney(line.total_pension_employee_minor)}</Td>
                  <Td align="right">{formatMoney(line.total_nhf_minor)}</Td>
                  <Td align="right">{formatMoney(line.total_paye_minor)}</Td>
                  <Td align="right">{line.payslip_count}</Td>
                  <Td align="right">
                    <Button size="md" variant="secondary" onClick={() => downloadCertificate(line.employee_id)}>
                      Download PDF
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
