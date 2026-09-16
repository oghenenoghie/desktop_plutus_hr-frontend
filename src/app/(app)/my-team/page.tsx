"use client";

import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { employeesApi, expensesApi, leaveApi, overtimeApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Employee, Expense, LeaveRequest, Overtime } from "@/lib/types";

// Manager/Department Manager's own landing view: their reports at a glance,
// and every leave/expense/overtime request awaiting their decision, without
// needing to visit those (org-wide-looking) pages to find their own team's
// items — each of those endpoints is already scoped to "my reports" for
// these two roles server-side, so this page adds no new backend surface.
export default function MyTeamPage() {
  const team = useApiResource(() => employeesApi.list());
  const leave = useApiResource(() => leaveApi.list());
  const expenses = useApiResource(() => expensesApi.list());
  const overtime = useApiResource(() => overtimeApi.list());
  const { showToast } = useToast();

  const nameFor = (employeeId: string) =>
    team.data?.find((employee) => employee.id === employeeId)?.full_name ?? "—";

  const pendingLeave = (leave.data ?? []).filter((request) => request.status === "pending");
  const pendingExpenses = (expenses.data ?? []).filter((expense) => expense.status === "pending");
  const pendingOvertime = (overtime.data ?? []).filter((entry) => entry.status === "pending");

  async function decideLeave(request: LeaveRequest, action: "approve" | "reject") {
    try {
      if (action === "approve") await leaveApi.approve(request.id);
      else await leaveApi.reject(request.id);
      showToast(`Leave request ${action}d.`, "good");
      leave.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function decideExpense(expense: Expense, action: "approve" | "reject") {
    try {
      if (action === "approve") await expensesApi.approve(expense.id);
      else await expensesApi.reject(expense.id);
      showToast(`Expense ${action}d.`, "good");
      expenses.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function decideOvertime(entry: Overtime, action: "approve" | "reject") {
    try {
      if (action === "approve") await overtimeApi.approve(entry.id);
      else await overtimeApi.reject(entry.id);
      showToast(`Overtime ${action}d.`, "good");
      overtime.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  const pendingTotal = pendingLeave.length + pendingExpenses.length + pendingOvertime.length;

  return (
    <div>
      <PageHeader
        title="My Team"
        subtitle={
          pendingTotal > 0
            ? `${pendingTotal} item${pendingTotal === 1 ? "" : "s"} awaiting your decision`
            : "Your reports and everything awaiting your decision"
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ApprovalCard
          title="Leave requests"
          linkHref="/leave"
          count={pendingLeave.length}
          loading={leave.loading}
          error={leave.error}
        >
          {pendingLeave.map((request) => (
            <RequestRow key={request.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-ink">{nameFor(request.employee_id)}</p>
                <p className="text-[11px] text-ink-soft">
                  {titleCase(request.leave_type)} · {formatDate(request.start_date)} –{" "}
                  {formatDate(request.end_date)}
                </p>
              </div>
              <DecideButtons
                itemLabel={`${titleCase(request.leave_type)} leave for ${nameFor(request.employee_id)}`}
                onApprove={() => decideLeave(request, "approve")}
                onReject={() => decideLeave(request, "reject")}
              />
            </RequestRow>
          ))}
        </ApprovalCard>

        <ApprovalCard
          title="Expenses"
          linkHref="/expenses"
          count={pendingExpenses.length}
          loading={expenses.loading}
          error={expenses.error}
        >
          {pendingExpenses.map((expense) => (
            <RequestRow key={expense.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-ink">{nameFor(expense.employee_id)}</p>
                <p className="text-[11px] text-ink-soft">
                  {expense.category} · {formatNaira(expense.amount_minor)}
                </p>
              </div>
              <DecideButtons
                itemLabel={`the ${expense.category} expense for ${nameFor(expense.employee_id)}`}
                onApprove={() => decideExpense(expense, "approve")}
                onReject={() => decideExpense(expense, "reject")}
              />
            </RequestRow>
          ))}
        </ApprovalCard>

        <ApprovalCard
          title="Overtime"
          linkHref="/overtime"
          count={pendingOvertime.length}
          loading={overtime.loading}
          error={overtime.error}
        >
          {pendingOvertime.map((entry) => (
            <RequestRow key={entry.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-ink">{nameFor(entry.employee_id)}</p>
                <p className="text-[11px] text-ink-soft">
                  {formatDate(entry.work_date)} · {entry.hours}h
                </p>
              </div>
              <DecideButtons
                itemLabel={`the ${entry.hours}h overtime entry for ${nameFor(entry.employee_id)}`}
                onApprove={() => decideOvertime(entry, "approve")}
                onReject={() => decideOvertime(entry, "reject")}
              />
            </RequestRow>
          ))}
        </ApprovalCard>
      </div>

      <Card>
        <CardHeader title="Your reports" subtitle={`${team.data?.length ?? 0} people`} />
        {team.loading ? <LoadingState /> : null}
        {team.error ? <ErrorState message={team.error} /> : null}
        {team.data && team.data.length === 0 ? <EmptyState label="No direct reports yet." /> : null}
        <div className="flex flex-col">
          {team.data?.map((employee: Employee) => (
            <Link
              key={employee.id}
              href={`/employees/${employee.id}`}
              className="flex items-center gap-3 border-b border-border py-3 last:border-b-0 hover:bg-bg"
            >
              <Avatar name={employee.full_name} src={employee.photo_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">{employee.full_name}</p>
                <p className="truncate text-[11px] text-ink-soft">
                  {employee.job_title ?? "—"} · {employee.employee_number}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ApprovalCard({
  title,
  linkHref,
  count,
  loading,
  error,
  children,
}: {
  title: string;
  linkHref: string;
  count: number;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={count > 0 ? `${count} pending` : "Nothing pending"}
        action={
          <Link href={linkHref} className="text-[11px] font-bold text-primary hover:underline">
            View all
          </Link>
        }
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && count === 0 ? <EmptyState label="All caught up." /> : null}
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}

function RequestRow({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 rounded-panel border border-border px-3 py-2.5">{children}</div>;
}

function DecideButtons({
  itemLabel,
  onApprove,
  onReject,
}: {
  itemLabel: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1.5">
      <ConfirmActionButton
        action={onReject}
        label="Reject"
        confirmTitle="Reject this request?"
        confirmMessage={`${itemLabel} will be rejected.`}
        confirmLabel="Reject"
      />
      <ConfirmActionButton
        action={onApprove}
        label="Approve"
        tone="primary"
        confirmTitle="Approve this request?"
        confirmMessage={`${itemLabel} will be approved.`}
        confirmLabel="Approve"
      />
    </div>
  );
}
