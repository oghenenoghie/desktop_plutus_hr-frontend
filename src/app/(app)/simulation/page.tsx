"use client";

import { useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { employeesApi, simulationApi } from "@/lib/api/endpoints";
import { currencyLabel, formatMoney, toMinorUnits } from "@/lib/format";
import type { PayRunSimulationOut, SimulationOut, SimulationRequestBody } from "@/lib/types";

const TODAY = new Date().toISOString().slice(0, 10);

export default function SimulationPage() {
  const [mode, setMode] = useState<"employee" | "org">("employee");

  return (
    <div>
      <PageHeader
        title="Payroll Simulation"
        subtitle="Every figure derived step by step, the way the engine computes it"
      />

      <div className="mb-6 inline-flex gap-1 rounded-panel border border-border bg-surface p-1">
        <TabButton active={mode === "employee"} onClick={() => setMode("employee")}>
          Per-Employee
        </TabButton>
        <TabButton active={mode === "org"} onClick={() => setMode("org")}>
          Org-Wide
        </TabButton>
      </div>

      {mode === "employee" ? <EmployeeSimulation /> : <OrgWideSimulation />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-btn px-4 py-2 text-[13px] font-bold transition-colors ${
        active ? "bg-primary text-white" : "text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function EmployeeSimulation() {
  const [employeeId, setEmployeeId] = useState("");
  const [periodEnd, setPeriodEnd] = useState(TODAY);
  const [basic, setBasic] = useState("");
  const [housing, setHousing] = useState("");
  const [transport, setTransport] = useState("");
  const [result, setResult] = useState<SimulationOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const out = await simulationApi.payslip(employeeId, {
        period_end: periodEnd,
        basic_minor: basic ? toMinorUnits(basic) : undefined,
        housing_minor: housing ? toMinorUnits(housing) : undefined,
        transport_minor: transport ? toMinorUnits(transport) : undefined,
      });
      setResult(out);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Simulation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader title="Inputs" subtitle="Leave pay components blank to use the employee's current record" />
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="employee">Employee</Label>
            <EmployeePicker value={employeeId} onChange={setEmployeeId} />
          </div>
          <div>
            <Label htmlFor="period">Period End</Label>
            <Input id="period" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="basic">Annual Basic ({currencyLabel()}, override)</Label>
            <Input id="basic" inputMode="decimal" value={basic} onChange={(e) => setBasic(e.target.value)} placeholder="e.g. 3600000" />
          </div>
          <div>
            <Label htmlFor="housing">Annual Housing ({currencyLabel()}, override)</Label>
            <Input id="housing" inputMode="decimal" value={housing} onChange={(e) => setHousing(e.target.value)} placeholder="e.g. 2160000" />
          </div>
          <div>
            <Label htmlFor="transport">Annual Transport ({currencyLabel()}, override)</Label>
            <Input id="transport" inputMode="decimal" value={transport} onChange={(e) => setTransport(e.target.value)} placeholder="e.g. 1440000" />
          </div>
          <Button type="submit" className="w-full" disabled={!employeeId || submitting}>
            {submitting ? "Simulating…" : "Run Simulation"}
          </Button>
          {error ? <ErrorState message={error} /> : null}
        </form>
      </Card>

      <Card>
        <CardHeader title="Derivation" subtitle="Gross → statutory deductions → chargeable income → PAYE → net" />
        {!result ? (
          <p className="py-8 text-center text-[13px] text-ink-soft">
            Run a simulation to see the payslip breakdown.
          </p>
        ) : (
          <div className="space-y-3">
            <DerivationRow label="Gross Pay" value={result.gross_minor} />
            <DerivationRow label="Pensionable Pay" value={result.pensionable_pay_minor} />
            <DerivationRow label="Pension (Employee, 8%)" value={result.pension_employee_minor} subtract />
            <DerivationRow label="Pension (Employer, 10%)" value={result.pension_employer_minor} muted />
            <DerivationRow label="NHF (2.5%)" value={result.nhf_minor} subtract />
            <DerivationRow label="Cumulative Rent Relief" value={result.cumulative_rent_relief_minor} muted />
            <DerivationRow label="Cumulative Chargeable Income" value={result.cumulative_chargeable_income_minor} />
            <DerivationRow label="PAYE" value={result.paye_minor} subtract />
            {result.loan_deduction_minor > 0 ? (
              <DerivationRow label="Loan Deduction" value={result.loan_deduction_minor} subtract />
            ) : null}
            {result.benefit_deduction_minor > 0 ? (
              <DerivationRow label="Benefit Deduction" value={result.benefit_deduction_minor} subtract />
            ) : null}
            {result.union_dues_deduction_minor > 0 ? (
              <DerivationRow label="Union Dues" value={result.union_dues_deduction_minor} subtract />
            ) : null}
            <div className="!mt-6 flex items-center justify-between border-t-2 border-primary pt-4">
              <span className="text-[13px] font-extrabold text-ink">Net Pay</span>
              <span className="text-[20px] font-extrabold text-primary">{formatMoney(result.net_pay_minor)}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function OrgWideSimulation() {
  const [periodEnd, setPeriodEnd] = useState(TODAY);
  const [raisePercent, setRaisePercent] = useState("5");
  const [before, setBefore] = useState<PayRunSimulationOut | null>(null);
  const [after, setAfter] = useState<PayRunSimulationOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setBefore(null);
    setAfter(null);
    try {
      const employees = await employeesApi.list();
      // This page is admin/payroll_manager only, so compensation is never
      // actually masked (null) for this viewer — the null check is just
      // satisfying the type, which is shared with the manager-facing
      // Employees list where a masked report's figures really can be null.
      const activeEmployees = employees.filter(
        (employee) =>
          employee.lifecycle_state === "active" &&
          employee.basic_minor !== null &&
          employee.housing_minor !== null &&
          employee.transport_minor !== null,
      );
      const pct = Number(raisePercent) || 0;
      const overrides: Record<string, SimulationRequestBody> = {};
      for (const employee of activeEmployees) {
        overrides[employee.id] = {
          period_end: periodEnd,
          basic_minor: Math.round(employee.basic_minor! * (1 + pct / 100)),
          housing_minor: Math.round(employee.housing_minor! * (1 + pct / 100)),
          transport_minor: Math.round(employee.transport_minor! * (1 + pct / 100)),
        };
      }
      const [beforeResult, afterResult] = await Promise.all([
        simulationApi.payRun({ period_end: periodEnd }),
        simulationApi.payRun({ period_end: periodEnd, overrides }),
      ]);
      setBefore(beforeResult);
      setAfter(afterResult);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Simulation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader
          title="Inputs"
          subtitle="Applies an across-the-board raise to basic, housing and transport for every active employee"
        />
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="org-period">Period End</Label>
            <Input
              id="org-period"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="raise">Raise (%)</Label>
            <Input
              id="raise"
              inputMode="decimal"
              value={raisePercent}
              onChange={(e) => setRaisePercent(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Simulating…" : "Run Org-Wide Simulation"}
          </Button>
          {error ? <ErrorState message={error} /> : null}
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Before / After"
          subtitle="Total gross, employer cost and net pay across every active employee"
        />
        {!before || !after ? (
          <p className="py-8 text-center text-[13px] text-ink-soft">
            Run a simulation to compare payroll totals before and after the raise.
          </p>
        ) : (
          <div className="space-y-4">
            <CompareRow
              label="Total Gross"
              before={before.total_gross_minor}
              after={after.total_gross_minor}
            />
            <CompareRow
              label="Total Employer Cost"
              before={before.total_employer_cost_minor}
              after={after.total_employer_cost_minor}
            />
            <CompareRow label="Total Net" before={before.total_net_minor} after={after.total_net_minor} />
          </div>
        )}
      </Card>
    </div>
  );
}

function CompareRow({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return (
    <div className="border-b border-border pb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-bold text-ink">{label}</span>
        <span
          className={`text-[12px] font-bold ${delta > 0 ? "text-warn" : delta < 0 ? "text-good" : "text-ink-soft"}`}
        >
          {delta > 0 ? "+" : ""}
          {formatMoney(delta)}
        </span>
      </div>
      <div className="flex items-center justify-between text-[13px] text-ink-soft">
        <span>Before: {formatMoney(before)}</span>
        <span className="font-extrabold text-ink">After: {formatMoney(after)}</span>
      </div>
    </div>
  );
}

function DerivationRow({
  label,
  value,
  subtract,
  muted,
}: {
  label: string;
  value: number;
  subtract?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <span className={`text-[13px] ${muted ? "text-ink-soft" : "font-bold text-ink"}`}>{label}</span>
      <span className={`text-[13px] font-bold ${subtract ? "text-bad" : "text-ink"}`}>
        {subtract ? "− " : ""}
        {formatMoney(value)}
      </span>
    </div>
  );
}
