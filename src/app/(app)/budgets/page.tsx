"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { budgetsApi, chartAccountsApi, departmentsApi } from "@/lib/api/endpoints";
import { currencyLabel, formatDate, formatMoney, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Budget, BudgetVsActual, ChartAccount } from "@/lib/types";

export default function BudgetsPage() {
  const budgets = useApiResource(() => budgetsApi.list());
  const departments = useApiResource(() => departmentsApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Budget | null>(null);

  const departmentNameById = new Map(
    (departments.data ?? []).map((department) => [department.id, department.name]),
  );

  async function remove(budget: Budget) {
    try {
      await budgetsApi.remove(budget.id);
      budgets.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Planning targets for revenue and expense accounts, compared against actual ledger activity"
        action={<Button onClick={() => setCreating(true)}>New Budget</Button>}
      />

      <Card>
        {budgets.loading ? <LoadingState /> : null}
        {budgets.error ? <ErrorState message={budgets.error} /> : null}
        {budgets.data && budgets.data.length === 0 ? (
          <EmptyState label="No budgets yet." />
        ) : null}
        {budgets.data && budgets.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Scope</Th>
                <Th>Period</Th>
                <Th align="right">Total Budgeted</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {budgets.data.map((budget) => (
                <tr key={budget.id}>
                  <Td className="font-bold">{budget.name}</Td>
                  <Td>
                    {budget.department_id
                      ? (departmentNameById.get(budget.department_id) ?? "—")
                      : "Org-wide"}
                  </Td>
                  <Td>
                    {formatDate(budget.period_start)} – {formatDate(budget.period_end)}
                  </Td>
                  <Td align="right" className="font-bold">
                    {formatMoney(budget.total_budgeted_minor)}
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setViewing(budget)}>
                        View Actuals
                      </Button>
                      <ConfirmActionButton
                        action={() => remove(budget)}
                        label="Delete"
                        tone="danger"
                        confirmTitle="Delete this budget?"
                        confirmMessage={`This removes "${budget.name}" and all its lines. This can't be undone.`}
                        confirmLabel="Delete"
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewBudgetDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            budgets.reload();
          }}
        />
      ) : null}

      {viewing ? <BudgetActualsDrawer budget={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}

function BudgetActualsDrawer({ budget, onClose }: { budget: Budget; onClose: () => void }) {
  const actuals = useApiResource(() => budgetsApi.actuals(budget.id), [budget.id]);
  const data: BudgetVsActual | null = actuals.data;

  return (
    <Drawer title={`${budget.name} — Actuals`} onClose={onClose}>
      {actuals.loading ? <LoadingState /> : null}
      {actuals.error ? <ErrorState message={actuals.error} /> : null}
      {data ? (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-[13px] text-ink-soft">
            {formatDate(data.period_start)} – {formatDate(data.period_end)}
          </p>
          <div className="flex flex-col gap-2">
            {data.lines.map((line) => (
              <div key={line.account_code} className="rounded-panel border border-border p-3">
                <div className="flex items-center justify-between text-[13px] font-bold">
                  <span>{line.account_name}</span>
                  <span className={line.variance_minor > 0 ? "text-warn" : "text-good"}>
                    {line.variance_minor > 0 ? "+" : ""}
                    {formatMoney(line.variance_minor)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[12px] text-ink-soft">
                  <span>Budgeted {formatMoney(line.budgeted_minor)}</span>
                  <span>Actual {formatMoney(line.actual_minor)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-panel border border-border bg-bg px-3 py-2.5 text-[12px]">
            <div className="flex justify-between">
              <span>Total budgeted</span>
              <span className="font-bold">{formatMoney(data.total_budgeted_minor)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total actual</span>
              <span className="font-bold">{formatMoney(data.total_actual_minor)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total variance</span>
              <span className={`font-bold ${data.total_variance_minor > 0 ? "text-warn" : "text-good"}`}>
                {data.total_variance_minor > 0 ? "+" : ""}
                {formatMoney(data.total_variance_minor)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

interface DraftLine {
  accountCode: string;
  amount: string;
}

function emptyLine(): DraftLine {
  return { accountCode: "", amount: "" };
}

function NewBudgetDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const accounts = useApiResource(() => chartAccountsApi.list());
  const departments = useApiResource(() => departmentsApi.list());
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  const budgetableAccounts = (accounts.data ?? []).filter(
    (account: ChartAccount) =>
      (account.type === "revenue" || account.type === "expense") && account.is_active,
  );

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await budgetsApi.create({
        name,
        department_id: departmentId || null,
        period_start: periodStart,
        period_end: periodEnd,
        lines: lines
          .filter((line) => line.accountCode && toMinorUnits(line.amount) > 0)
          .map((line) => ({
            account_code: line.accountCode,
            amount_minor: toMinorUnits(line.amount),
          })),
      });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Budget" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Q1 Operating Budget"
            required
          />
        </div>
        <div>
          <Label htmlFor="department">Department (optional)</Label>
          <Select
            id="department"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">Org-wide</option>
            {(departments.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="periodStart">Period Start</Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="periodEnd">Period End</Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <CardHeader title="Lines" />
          {lines.map((line, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Account</Label>
                <Select
                  value={line.accountCode}
                  onChange={(event) => updateLine(index, { accountCode: event.target.value })}
                  required
                >
                  <option value="">Select account</option>
                  {budgetableAccounts.map((account) => (
                    <option key={account.id} value={account.code}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-32">
                <Label>Amount ({currencyLabel()})</Label>
                <Input
                  value={line.amount}
                  onChange={(event) => updateLine(index, { amount: event.target.value })}
                  placeholder="0"
                  inputMode="decimal"
                  required
                />
              </div>
              {lines.length > 1 ? (
                <Button type="button" variant="secondary" onClick={() => removeLine(index)}>
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addLine}>
            Add Line
          </Button>
        </div>

        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Budget"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
