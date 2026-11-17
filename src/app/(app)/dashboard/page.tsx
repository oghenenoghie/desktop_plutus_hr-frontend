"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardCheck, Fingerprint, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { ComplianceAlertsCard, PayrollStatusCard, RecentActivityCard } from "@/components/dashboard/activity-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatCard, type StatChange } from "@/components/dashboard/stat-card";
import { DepartmentDistributionCard, WorkforceOverviewCard } from "@/components/dashboard/workforce-cards";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { analyticsApi } from "@/lib/analytics/api";
import { useAnalyticsAccess } from "@/lib/analytics/access";
import { presetRange, type PresetKey } from "@/lib/analytics/filters";
import { formatPeriodRange, formatValue } from "@/lib/analytics/format";
import type { Metric } from "@/lib/analytics/types";
import { ApiError } from "@/lib/api/client";
import {
  auditLogApi,
  dashboardApi,
  employeesApi,
  notificationsApi,
  payRunsApi,
  remindersApi,
} from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { currentPayRun, firstName, lagosToday } from "@/lib/dashboard";
import { formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { navGroupsForRole, type CountryAccess } from "@/lib/nav";

type PeriodKey = Extract<PresetKey, "this_month" | "last_month" | "this_quarter" | "this_year" | "last_12_months">;

const PERIODS: { key: PeriodKey; label: string; versus: string }[] = [
  { key: "this_month", label: "This month", versus: "vs last month" },
  { key: "last_month", label: "Last month", versus: "vs the month before" },
  { key: "this_quarter", label: "This quarter", versus: "vs last quarter" },
  { key: "this_year", label: "This year", versus: "vs last year" },
  { key: "last_12_months", label: "Last 12 months", versus: "vs the 12 months before" },
];

function periodQuery(key: PeriodKey): string {
  const { from, to } = presetRange(key);
  const params = new URLSearchParams();
  if (from) params.set("date_from", from);
  if (to) params.set("date_to", to);
  return params.toString();
}

function changeOf(metric: Metric | undefined, versus: string): StatChange | null {
  if (!metric || metric.value === null || metric.change_pct === null) return null;
  return { pct: metric.change_pct, higherIsBetter: metric.higher_is_better, versus };
}

function sparkOf(points: { value: number | null }[] | undefined): number[] | null {
  const values = (points ?? []).map((point) => point.value).filter((value): value is number => value !== null);
  return values.length >= 2 ? values : null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const analytics = useAnalyticsAccess();
  const { showToast } = useToast();
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [broadcasting, setBroadcasting] = useState(false);
  const today = lagosToday();
  const periodInfo = PERIODS.find((option) => option.key === period)!;

  // What this role can open decides which cards and requests make sense.
  const countryAccess: CountryAccess = {
    payrollAvailable: user?.payroll_available !== false,
    isNigeria: (user?.country_code ?? "NG") === "NG",
  };
  const pages = useMemo(() => {
    const hrefs = new Set<string>();
    if (!user) return hrefs;
    for (const group of navGroupsForRole(user.role, countryAccess)) {
      const items = group.subgroups ? group.subgroups.flatMap((subgroup) => subgroup.items) : (group.items ?? []);
      for (const item of items) hrefs.add(item.href);
    }
    return hrefs;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- countryAccess is derived from user
  }, [user]);
  const seesPayroll = pages.has("/payroll");
  const seesEmployees = pages.has("/employees");
  const seesAudit = pages.has("/audit-log");
  const seesLedger = pages.has("/general-ledger");
  const analyticsReady = analytics.access !== null || analytics.error;
  const canOverview = Boolean(analytics.access?.can_view);
  const canWorkforce = analytics.can("workforce");
  const canAttendance = analytics.can("attendance");

  const summary = useApiResource(() => dashboardApi.summary());
  const deadlines = useApiResource(() => dashboardApi.deadlines(30));
  const payRuns = useApiResource(() => (seesPayroll ? payRunsApi.list() : Promise.resolve(null)), [seesPayroll]);
  const employees = useApiResource(() => (seesEmployees ? employeesApi.list() : Promise.resolve(null)), [seesEmployees]);
  const audit = useApiResource(() => (seesAudit ? auditLogApi.list({ limit: 6 }) : Promise.resolve(null)), [seesAudit]);
  const overview = useApiResource(
    () => (canOverview ? analyticsApi.overview(periodQuery(period)) : Promise.resolve(null)),
    [canOverview, period],
  );
  const workforce = useApiResource(() => (canWorkforce ? analyticsApi.workforce("") : Promise.resolve(null)), [canWorkforce]);
  const attendance = useApiResource(
    () => (canAttendance ? analyticsApi.attendance("") : Promise.resolve(null)),
    [canAttendance],
  );

  const run = payRuns.data ? currentPayRun(payRuns.data) : null;
  const needsReadiness = run !== null && (run.status === "draft" || run.status === "validated");
  const readiness = useApiResource(
    () => (run && needsReadiness ? payRunsApi.readiness(run.id) : Promise.resolve(null)),
    [run?.id, needsReadiness],
  );

  const kpi = (key: string) => overview.data?.kpis.find((metric) => metric.key === key);
  const headcount = kpi("headcount");
  const cost = kpi("cost");
  const attendanceRate = kpi("attendance_rate");
  const completedRuns = (payRuns.data ?? [])
    .filter((payRun) => payRun.status === "locked")
    .sort((a, b) => a.period_end.localeCompare(b.period_end));
  const lastRun = summary.data?.last_completed_pay_run ?? null;
  const missingTin = employees.data
    ? employees.data.filter((employee) => employee.lifecycle_state !== "terminated" && !employee.tin?.trim()).length
    : null;
  const pendingLeave = summary.data?.pending_leave_request_count ?? 0;
  const pendingExpenses = summary.data?.pending_expense_count ?? 0;
  const pendingTotal = pendingLeave + pendingExpenses;

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

  const name = firstName(user?.display_name);
  const loadingFigure = !analyticsReady || overview.loading;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary">Dashboard</p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-ink sm:text-[30px]">
            Welcome back{name ? `, ${name}` : ""}!
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Here&apos;s what&apos;s happening at {user?.org_name ?? "your organisation"} today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="dashboard-period" className="sr-only">
            Period for the headline figures
          </label>
          <div className="relative">
            <CalendarDays
              size={16}
              strokeWidth={2}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary"
            />
            <select
              id="dashboard-period"
              value={period}
              onChange={(event) => setPeriod(event.target.value as PeriodKey)}
              className="h-10 appearance-none rounded-btn border border-border bg-surface pl-9 pr-9 text-[13px] font-bold text-ink focus:border-primary focus:outline-none"
            >
              {PERIODS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-soft">
              ▼
            </span>
          </div>
        </div>
      </header>

      <section aria-label="Headline figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total employees"
          value={
            headcount?.value != null
              ? formatValue(headcount.value, "count", null)
              : summary.data
                ? summary.data.active_employee_count.toLocaleString("en-NG")
                : "…"
          }
          change={changeOf(headcount, periodInfo.versus)}
          spark={sparkOf(workforce.data?.headcount_trend.series[0]?.points)}
          caption={headcount?.value != null ? `At the end of ${periodInfo.label.toLowerCase()}` : "Active now"}
          href={seesEmployees ? "/employees" : undefined}
          hrefLabel="All employees"
        />
        <StatCard
          icon={Wallet}
          label="Payroll cost"
          value={
            cost?.value != null
              ? formatValue(cost.value, "money", cost.currency)
              : loadingFigure
                ? "…"
                : !canOverview && lastRun
                  ? formatMoney(lastRun.gross_minor)
                  : "—"
          }
          change={changeOf(cost, periodInfo.versus)}
          spark={completedRuns.length >= 2 ? completedRuns.slice(-6).map((payRun) => payRun.gross_minor) : null}
          caption={
            cost?.value != null ? (
              `Gross pay and employer costs, ${periodInfo.label.toLowerCase()}`
            ) : lastRun ? (
              <>
                {canOverview ? `No payroll posted for ${periodInfo.label.toLowerCase()}. ` : ""}
                Latest run: {formatPeriodRange(lastRun.period_start, lastRun.period_end)},{" "}
                {formatMoney(lastRun.gross_minor)} gross.
              </>
            ) : (
              "No pay run posted yet."
            )
          }
          href={seesPayroll ? "/payroll" : undefined}
          hrefLabel="Pay runs"
        />
        <StatCard
          icon={Fingerprint}
          label="Attendance rate"
          value={
            attendanceRate?.value != null
              ? formatValue(attendanceRate.value, "percent", null)
              : loadingFigure
                ? "…"
                : "—"
          }
          change={changeOf(attendanceRate, periodInfo.versus)}
          spark={sparkOf(attendance.data?.rate_trend.series[0]?.points)}
          caption={
            attendanceRate?.value != null
              ? `Of scheduled working days, ${periodInfo.label.toLowerCase()}`
              : canOverview
                ? `No attendance recorded for ${periodInfo.label.toLowerCase()}.`
                : "Attendance figures aren't part of your role's access."
          }
          href={pages.has("/attendance") ? "/attendance" : undefined}
          hrefLabel="Attendance"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Pending approvals"
          value={summary.data ? pendingTotal.toLocaleString("en-NG") : "…"}
          attention={pendingTotal > 0}
          caption={
            summary.data ? (
              <>
                {pages.has("/leave") ? (
                  <Link href="/leave" className="font-semibold text-ink hover:underline">
                    {pendingLeave} leave
                  </Link>
                ) : (
                  `${pendingLeave} leave`
                )}{" "}
                ·{" "}
                {pages.has("/expenses") ? (
                  <Link href="/expenses" className="font-semibold text-ink hover:underline">
                    {pendingExpenses} expense{pendingExpenses === 1 ? "" : "s"}
                  </Link>
                ) : (
                  `${pendingExpenses} expense${pendingExpenses === 1 ? "" : "s"}`
                )}{" "}
                waiting for a decision
              </>
            ) : null
          }
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <WorkforceOverviewCard
          workforce={workforce.data}
          loading={!analyticsReady || workforce.loading}
          error={workforce.error}
          unavailable={analyticsReady && !canWorkforce}
          currentYear={today.slice(0, 4)}
        />
        <DepartmentDistributionCard
          workforce={workforce.data}
          loading={!analyticsReady || workforce.loading}
          error={workforce.error}
          unavailable={analyticsReady && !canWorkforce}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {seesAudit ? <RecentActivityCard entries={audit.data} loading={audit.loading} error={audit.error} /> : null}
        {seesPayroll ? (
          <PayrollStatusCard
            run={run}
            readiness={readiness.data}
            loading={payRuns.loading}
            error={payRuns.error}
          />
        ) : null}
        <ComplianceAlertsCard
          deadlines={deadlines.data}
          missingTinCount={missingTin}
          expiringContracts={summary.data?.expiring_contract_count ?? null}
          outstandingMinor={summary.data?.outstanding_liability_minor ?? null}
          today={today}
          loading={deadlines.loading}
          error={deadlines.error}
        />
      </div>

      {seesLedger && summary.data ? (
        <Card>
          <CardHeader
            title="Financial position"
            subtitle="Cash and outstanding balances from the general ledger"
            action={
              <Link
                href="/general-ledger"
                className="inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline"
              >
                General Ledger
                <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiTile label="Cash Balance" value={formatMoney(summary.data.cash_balance_minor)} />
            <KpiTile
              label="Accounts Payable"
              value={formatMoney(summary.data.accounts_payable_minor)}
              caption="Owed to vendors"
            />
            <KpiTile
              label="Accounts Receivable"
              value={formatMoney(summary.data.accounts_receivable_minor)}
              caption="Owed by customers"
            />
          </div>
        </Card>
      ) : null}

      <QuickActions pages={pages} onAnnounce={() => setBroadcasting(true)} onRunReminders={runReminders} />

      {broadcasting ? <BroadcastModal onClose={() => setBroadcasting(false)} /> : null}
    </div>
  );
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
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
    <Modal title="Send Announcement" onClose={onClose}>
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
    </Modal>
  );
}
