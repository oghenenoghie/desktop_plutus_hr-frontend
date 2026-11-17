import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Circle,
  CircleAlert,
  Clock,
  FileText,
  Info,
  Landmark,
  Receipt,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { describeAuditEvent, daysBetween, deadlineUrgency, payRunStages, timeAgo } from "@/lib/dashboard";
import { formatDate, formatMoney } from "@/lib/format";
import { liabilityLabel } from "@/lib/liabilities";
import { ROLE_LABELS } from "@/lib/nav";
import type { AuditLogEntry, PayRun, PayRunReadinessIssue, Role, StatutoryLiability } from "@/lib/types";

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-primary hover:underline">
      {label}
      <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
    </Link>
  );
}

// --- recent activity ------------------------------------------------------------

const ENTITY_ICONS: Record<string, LucideIcon> = {
  employee: UserPlus,
  membership: UserPlus,
  leave_request: Clock,
  pay_run: Banknote,
  payslip: Banknote,
  invoice: Receipt,
  bill: Receipt,
  ledger_entry: Landmark,
  journal_entry: Landmark,
};

export function RecentActivityCard({
  entries,
  loading,
  error,
}: {
  entries: AuditLogEntry[] | null;
  loading: boolean;
  error: string | null;
}) {
  const recent = (entries ?? []).slice(0, 5);
  return (
    <Card className="min-w-0">
      <CardHeader title="Recent activity" subtitle="The latest changes, from the audit trail" action={<ViewAll href="/audit-log" />} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {entries && recent.length === 0 ? <EmptyState label="Nothing has happened yet." /> : null}
      {recent.length > 0 ? (
        <ol className="space-y-3.5">
          {recent.map((entry) => {
            const { headline, detail } = describeAuditEvent(entry);
            const Icon = ENTITY_ICONS[entry.entity_type] ?? ENTITY_ICONS[entry.action.split(".")[0] ?? ""] ?? Activity;
            const who = entry.role && entry.role in ROLE_LABELS ? ROLE_LABELS[entry.role as Role] : "System";
            return (
              <li key={entry.id} className="flex gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold leading-5 text-ink">{headline}</p>
                  <p className="truncate text-[12px] text-ink-soft">
                    {detail ? `${detail} · ` : ""}
                    {who} ·{" "}
                    <time dateTime={entry.created_at} title={new Date(entry.created_at).toLocaleString("en-NG")}>
                      {timeAgo(entry.created_at)}
                    </time>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </Card>
  );
}

// --- payroll status ---------------------------------------------------------------

function ProgressRing({ done, total, label }: { done: number; total: number; label: string }) {
  const size = 112;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-primary-tint)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[22px] font-extrabold leading-none text-ink">{pct}%</span>
        <span className="mt-1 text-[11px] font-semibold text-ink-soft">{label}</span>
      </div>
    </div>
  );
}

export function PayrollStatusCard({
  run,
  readiness,
  loading,
  error,
}: {
  run: PayRun | null;
  readiness: PayRunReadinessIssue[] | null;
  loading: boolean;
  error: string | null;
}) {
  const stages = run ? payRunStages(run) : [];
  const done = stages.filter((stage) => stage.done).length;
  const blockers = (readiness ?? []).filter((issue) => issue.severity === "blocker");
  const blockerPeople = new Set(blockers.map((issue) => issue.employee_id)).size;
  const stageLabel = done === 4 ? "Paid" : done === 3 ? "Posted" : done === 2 ? "Validated" : "Draft";
  // A draft's totals aren't stored until it's validated; the employees
  // chosen for it are known from the start.
  const people = run ? (run.status === "draft" ? run.employee_ids.length : run.employee_count) : 0;

  let banner: { tone: "good" | "warn" | "bad" | "neutral"; text: string } | null = null;
  if (run) {
    if (run.status === "reversed") {
      banner = { tone: "bad", text: `Reversed on ${formatDate(run.reversed_at)}` };
    } else if (run.status === "draft" && blockers.length > 0) {
      banner = {
        tone: "bad",
        text: `${blockerPeople} employee${blockerPeople === 1 ? "" : "s"} must be fixed before it can be validated`,
      };
    } else if (run.status === "draft") {
      banner = { tone: "warn", text: "Ready to validate" };
    } else if (run.status === "validated") {
      banner = { tone: "warn", text: "Validated, ready to post" };
    } else if (!run.disbursed_at) {
      banner = { tone: "neutral", text: "Posted, waiting to be marked paid" };
    } else {
      banner = { tone: "good", text: `Paid on ${formatDate(run.disbursed_at)}` };
    }
  }
  const bannerClass = {
    good: "bg-good-tint text-good-ink",
    warn: "bg-warn-tint text-warn-ink",
    bad: "bg-bad-tint text-bad-ink",
    neutral: "bg-surface-muted text-ink",
  };

  return (
    <Card className="min-w-0">
      <CardHeader
        title="Payroll status"
        subtitle={
          run
            ? `${formatDate(run.period_start)} – ${formatDate(run.period_end)} · ${people} employee${people === 1 ? "" : "s"}`
            : "The pay run in progress"
        }
        action={run ? <ViewAll href={`/payroll/${run.id}`} label="View details" /> : null}
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && !run ? (
        <div className="py-6 text-center">
          <p className="text-[13px] text-ink-soft">No pay runs yet.</p>
          <Link href="/payroll/new" className="mt-2 inline-block text-[13px] font-bold text-primary hover:underline">
            Start the first pay run
          </Link>
        </div>
      ) : null}
      {run ? (
        <>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <ProgressRing done={done} total={stages.length} label={stageLabel} />
            <ul className="w-full space-y-2.5" aria-label="Pay run steps">
              {stages.map((stage) => {
                const blocked = stage.key === "validated" && !stage.done && blockers.length > 0;
                const Icon = stage.done ? CheckCircle2 : blocked ? CircleAlert : Circle;
                return (
                  <li key={stage.key} className="flex items-center gap-2.5 text-[13px]">
                    <Icon
                      size={18}
                      strokeWidth={2.25}
                      aria-hidden="true"
                      className={stage.done ? "text-good" : blocked ? "text-bad" : "text-border"}
                    />
                    <span className={stage.done ? "font-semibold text-ink" : "text-ink-soft"}>{stage.label}</span>
                    <span className="sr-only">{stage.done ? "(done)" : blocked ? "(blocked)" : "(not yet)"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          {banner ? (
            <p className={`mt-5 flex items-center justify-center gap-2 rounded-panel px-3 py-2.5 text-center text-[13px] font-bold ${bannerClass[banner.tone]}`}>
              {banner.tone === "good" ? <CheckCircle2 size={16} strokeWidth={2.5} aria-hidden="true" /> : null}
              {banner.tone === "bad" ? <AlertTriangle size={16} strokeWidth={2.5} aria-hidden="true" /> : null}
              {banner.text}
            </p>
          ) : null}
          <p className="mt-3 text-center text-[12px] text-ink-soft">
            {run.status === "draft" ? (
              <Link href={`/payroll/${run.id}`} className="font-semibold text-primary hover:underline">
                See the figures before validating
              </Link>
            ) : (
              <>
                Gross {formatMoney(run.gross_minor)} · Net {formatMoney(run.net_minor)}
              </>
            )}
          </p>
        </>
      ) : null}
    </Card>
  );
}

// --- compliance alerts ---------------------------------------------------------------

interface Alert {
  key: string;
  tone: "bad" | "warn" | "info";
  title: string;
  detail: string;
  badge: string;
  href: string;
}

const TONE_ORDER = { bad: 0, warn: 1, info: 2 } as const;

export function ComplianceAlertsCard({
  deadlines,
  missingTinCount,
  expiringContracts,
  outstandingMinor,
  today,
  loading,
  error,
}: {
  deadlines: StatutoryLiability[] | null;
  missingTinCount: number | null;
  expiringContracts: number | null;
  outstandingMinor: number | null;
  today: string;
  loading: boolean;
  error: string | null;
}) {
  const alerts: Alert[] = [];
  for (const liability of deadlines ?? []) {
    if (liability.status === "remitted") continue;
    const urgency = deadlineUrgency(liability, today);
    const days = daysBetween(today, liability.due_date);
    alerts.push({
      key: liability.id,
      tone: urgency === "overdue" ? "bad" : urgency === "due_soon" ? "warn" : "info",
      title: `${liabilityLabel(liability)} remittance${liability.state ? ` · ${liability.state}` : ""}`,
      detail: `${formatMoney(liability.amount_minor)} to ${liability.authority} · due ${formatDate(liability.due_date)}`,
      badge:
        urgency === "overdue"
          ? `Overdue ${-days} day${days === -1 ? "" : "s"}`
          : days === 0
            ? "Due today"
            : `Due in ${days} day${days === 1 ? "" : "s"}`,
      href: "/reports",
    });
  }
  if (missingTinCount) {
    alerts.push({
      key: "missing-tin",
      tone: "bad",
      title: `${missingTinCount} employee${missingTinCount === 1 ? " has" : "s have"} no TIN`,
      detail: "Payroll can't be validated until each one is added",
      badge: "Action required",
      href: "/employees",
    });
  }
  if (expiringContracts) {
    alerts.push({
      key: "expiring-contracts",
      tone: "warn",
      title: `${expiringContracts} contract${expiringContracts === 1 ? " ends" : "s end"} within 30 days`,
      detail: "Renew them or plan the exits",
      badge: "Review",
      href: "/employees",
    });
  }
  alerts.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
  const shown = alerts.slice(0, 5);
  const toneClass = {
    bad: { icon: "bg-bad-tint text-bad-ink", badge: "bg-bad-tint text-bad-ink" },
    warn: { icon: "bg-warn-tint text-warn-ink", badge: "bg-warn-tint text-warn-ink" },
    info: { icon: "bg-primary-tint text-primary", badge: "bg-surface-muted text-ink-soft" },
  };
  const ToneIcon = { bad: CircleAlert, warn: AlertTriangle, info: Info };

  return (
    <Card className="min-w-0">
      <CardHeader
        title="Compliance alerts"
        subtitle={
          outstandingMinor !== null
            ? `${formatMoney(outstandingMinor)} in statutory liabilities still to remit`
            : "Deadlines and missing statutory details"
        }
        action={<ViewAll href="/reports" />}
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && shown.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-8 text-[13px] font-semibold text-good-ink">
          <CheckCircle2 size={16} strokeWidth={2.5} aria-hidden="true" />
          Nothing needs attention in the next 30 days.
        </p>
      ) : null}
      {shown.length > 0 ? (
        <ul className="space-y-3">
          {shown.map((alert) => {
            const Icon = ToneIcon[alert.tone];
            return (
              <li key={alert.key}>
                <Link href={alert.href} className="flex gap-3 rounded-panel p-1 -m-1 hover:bg-surface-muted">
                  <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full ${toneClass[alert.tone].icon}`}>
                    <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="text-[13px] font-bold text-ink">{alert.title}</span>
                      <span className={`rounded-badge px-2 py-0.5 text-[11px] font-bold ${toneClass[alert.tone].badge}`}>
                        {alert.badge}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-soft">{alert.detail}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      {alerts.length > shown.length ? (
        <p className="mt-3 text-[12px] text-ink-soft">
          <FileText size={12} className="mr-1 inline" aria-hidden="true" />
          {alerts.length - shown.length} more in Financial Reports.
        </p>
      ) : null}
    </Card>
  );
}
