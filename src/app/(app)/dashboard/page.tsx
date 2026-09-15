"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label, Textarea } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { ApiError } from "@/lib/api/client";
import { dashboardApi, employeesApi, notificationsApi, payRunsApi, remindersApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { PayRun } from "@/lib/types";

export default function DashboardPage() {
  const summary = useApiResource(() => dashboardApi.summary());
  const deadlines = useApiResource(() => dashboardApi.deadlines(30));
  const payRuns = useApiResource(() => payRunsApi.list());
  const employees = useApiResource(() => employeesApi.list());
  const [broadcasting, setBroadcasting] = useState(false);
  const { showToast } = useToast();

  const completedPayRuns = (payRuns.data ?? [])
    .filter((run) => run.status === "completed")
    .sort((a, b) => a.period_end.localeCompare(b.period_end));
  const recentPayRuns = [...completedPayRuns].reverse().slice(0, 5);
  const trendPayRuns = completedPayRuns.slice(-6);
  const recentEmployees = [...(employees.data ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  async function runReminders() {
    try {
      const result = await remindersApi.run();
      showToast(
        `${result.notifications_created} reminder notification(s) sent (${result.deadline_count} deadlines, ${result.stale_approval_count} stale approvals, ${result.expiring_contract_count} expiring contracts)`,
        "good",
      );
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Workforce, payroll and compliance at a glance"
        action={
          <div className="flex gap-3">
            <ConfirmActionButton
              action={runReminders}
              label="Run Reminders"
              tone="primary"
              confirmTitle="Run the reminder job now?"
              confirmMessage="Notifies admins/payroll managers of upcoming statutory deadlines and stale approval requests. Intended to run on a schedule externally, but safe to trigger on demand."
              confirmLabel="Run"
            />
            <Button onClick={() => setBroadcasting(true)}>Send Announcement</Button>
          </div>
        }
      />

      {summary.loading ? <LoadingState /> : null}
      {summary.error ? <ErrorState message={summary.error} /> : null}

      {summary.data ? (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiTile label="Active Employees" value={summary.data.active_employee_count.toLocaleString("en-NG")} />
          <KpiTile
            label="Outstanding Liability"
            value={formatNaira(summary.data.outstanding_liability_minor)}
          />
          <KpiTile
            label="Pending Leave Requests"
            value={summary.data.pending_leave_request_count.toLocaleString("en-NG")}
          />
          <KpiTile
            label="Pending Expenses"
            value={summary.data.pending_expense_count.toLocaleString("en-NG")}
          />
          <KpiTile
            label="Expiring Contracts"
            value={summary.data.expiring_contract_count.toLocaleString("en-NG")}
            caption="Within 30 days"
          />
        </div>
      ) : null}

      {summary.data ? (
        <Card className="mb-8">
          <CardHeader
            title="Accounting"
            subtitle="Cash and outstanding balances across the accounting suite"
            action={
              <Link href="/general-ledger">
                <Button variant="secondary">General Ledger</Button>
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiTile label="Cash Balance" value={formatNaira(summary.data.cash_balance_minor)} />
            <KpiTile
              label="Accounts Payable"
              value={formatNaira(summary.data.accounts_payable_minor)}
              caption="Owed to vendors"
            />
            <KpiTile
              label="Accounts Receivable"
              value={formatNaira(summary.data.accounts_receivable_minor)}
              caption="Owed by customers"
            />
          </div>
        </Card>
      ) : null}

      {summary.data?.last_completed_pay_run ? (
        <Card className="mb-8">
          <CardHeader
            title="Last Completed Pay Run"
            subtitle={`${formatDate(summary.data.last_completed_pay_run.period_start)} – ${formatDate(summary.data.last_completed_pay_run.period_end)}`}
          />
          <div className="grid grid-cols-3 gap-4 text-[13px]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Employees</div>
              <div className="mt-1 font-extrabold">{summary.data.last_completed_pay_run.employee_count}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Gross</div>
              <div className="mt-1 font-extrabold">{formatNaira(summary.data.last_completed_pay_run.gross_minor)}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Net</div>
              <div className="mt-1 font-extrabold">{formatNaira(summary.data.last_completed_pay_run.net_minor)}</div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Payroll Cost Trend" subtitle="Net pay across the last 6 completed pay runs" />
          {payRuns.loading ? <LoadingState /> : null}
          {payRuns.error ? <ErrorState message={payRuns.error} /> : null}
          {payRuns.data && trendPayRuns.length === 0 ? (
            <EmptyState label="No completed pay runs yet." />
          ) : null}
          {trendPayRuns.length > 0 ? <PayrollCostTrendChart payRuns={trendPayRuns} /> : null}
        </Card>

        <Card>
          <CardHeader
            title="Recent Pay Runs"
            action={
              <Link href="/payroll">
                <Button variant="secondary">All Pay Runs</Button>
              </Link>
            }
          />
          {payRuns.loading ? <LoadingState /> : null}
          {payRuns.error ? <ErrorState message={payRuns.error} /> : null}
          {payRuns.data && recentPayRuns.length === 0 ? (
            <EmptyState label="No pay runs completed yet." />
          ) : null}
          {recentPayRuns.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Status</Th>
                  <Th align="right">Net</Th>
                </tr>
              </Thead>
              <tbody>
                {recentPayRuns.map((run) => (
                  <tr key={run.id}>
                    <Td>
                      {formatDate(run.period_start)} – {formatDate(run.period_end)}
                    </Td>
                    <Td>
                      <StatusBadge status={run.status} />
                    </Td>
                    <Td align="right" className="font-bold">
                      {formatNaira(run.net_minor)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader
          title="Recently Added Employees"
          action={
            <Link href="/employees">
              <Button variant="secondary">All Employees</Button>
            </Link>
          }
        />
        {employees.loading ? <LoadingState /> : null}
        {employees.error ? <ErrorState message={employees.error} /> : null}
        {employees.data && recentEmployees.length === 0 ? (
          <EmptyState label="No employees on record yet." />
        ) : null}
        {recentEmployees.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Employee</Th>
                <Th>Employment Type</Th>
                <Th>Joined</Th>
              </tr>
            </Thead>
            <tbody>
              {recentEmployees.map((employee) => (
                <tr key={employee.id}>
                  <Td className="font-bold">
                    {employee.full_name}
                    <span className="ml-2 font-normal text-ink-soft">{employee.employee_number}</span>
                  </Td>
                  <Td>{employee.employment_type.replace(/_/g, " ")}</Td>
                  <Td>{formatDate(employee.date_of_joining)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Upcoming Statutory Deadlines" subtitle="Filings and remittances due within 30 days" />
        {deadlines.loading ? <LoadingState /> : null}
        {deadlines.error ? <ErrorState message={deadlines.error} /> : null}
        {deadlines.data && deadlines.data.length === 0 ? (
          <EmptyState label="No deadlines due within the next 30 days." />
        ) : null}
        {deadlines.data && deadlines.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Scheme</Th>
                <Th>Authority</Th>
                <Th>State</Th>
                <Th align="right">Amount</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <tbody>
              {deadlines.data.map((liability) => (
                <tr key={liability.id}>
                  <Td>{liability.scheme.toUpperCase()}</Td>
                  <Td>{liability.authority}</Td>
                  <Td>{liability.state ?? "—"}</Td>
                  <Td align="right">{formatNaira(liability.amount_minor)}</Td>
                  <Td>{formatDate(liability.due_date)}</Td>
                  <Td>
                    <StatusBadge status={liability.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {broadcasting ? <BroadcastDrawer onClose={() => setBroadcasting(false)} /> : null}
    </div>
  );
}

// Single-series magnitude-over-time — a hand-rolled SVG bar chart rather
// than a new charting dependency, matching the Ledger design system's flat,
// bordered register (no shadows/gradients) and using the app's own primary
// hue rather than a categorical palette, since one series needs neither a
// legend nor color-identity work.
function PayrollCostTrendChart({ payRuns }: { payRuns: PayRun[] }) {
  const width = 480;
  const height = 180;
  const barGap = 10;
  const barWidth = (width - barGap * (payRuns.length - 1)) / payRuns.length;
  const maxNet = Math.max(...payRuns.map((run) => run.net_minor), 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 22}`}
      className="w-full"
      role="img"
      aria-label="Net pay across recent pay runs"
    >
      <line x1={0} y1={height} x2={width} y2={height} stroke="var(--color-border)" strokeWidth={1} />
      {payRuns.map((run, index) => {
        const barHeight = Math.max((run.net_minor / maxNet) * (height - 8), 2);
        const x = index * (barWidth + barGap);
        const y = height - barHeight;
        return (
          <g key={run.id}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill="var(--color-primary)">
              <title>
                {formatDate(run.period_end)} — {formatNaira(run.net_minor)}
              </title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={height + 16}
              textAnchor="middle"
              className="fill-ink-soft"
              style={{ fontSize: 10, fontWeight: 700 }}
            >
              {new Date(run.period_end).toLocaleDateString("en-NG", { month: "short" })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BroadcastDrawer({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const recipients = await notificationsApi.broadcast({ title, body: body || null });
      showToast(`Announcement sent to ${recipients.length} account(s)`, "good");
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Send Announcement" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="announcement-title">Title</Label>
          <Input
            id="announcement-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Payroll cutoff moved"
            required
          />
        </div>
        <div>
          <Label htmlFor="announcement-body">Message</Label>
          <Textarea
            id="announcement-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send to Everyone"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
