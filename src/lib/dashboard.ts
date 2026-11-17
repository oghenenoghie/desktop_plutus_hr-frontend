// Pure helpers behind the Overview dashboard: turning audit events into
// sentences, relative times, today's date in Lagos, and where a pay run is
// in its lifecycle. Kept free of React so they're easy to reason about.

import type { AuditLogEntry, PayRun, StatutoryLiability } from "@/lib/types";

// --- dates -------------------------------------------------------------------

// Today as YYYY-MM-DD in Lagos, the timezone every statutory due date is set
// in, so "overdue" flips at midnight there rather than wherever the viewer is.
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier.
export function daysBetween(from: string, to: string): number {
  const start = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const end = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((end - start) / 86_400_000);
}

export function timeAgo(isoDateTime: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(isoDateTime).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDateTime).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

// --- greeting ----------------------------------------------------------------

export function firstName(displayName: string | null | undefined): string | null {
  const first = displayName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

// --- audit events as sentences ---------------------------------------------------

const ENTITY_NAMES: Record<string, string> = {
  ledger_entry: "Journal entry",
  membership: "Team member",
  statutory_liability: "Statutory liability",
  wht_payment: "WHT payment",
  pay_run: "Pay run",
  payslip: "Payslip",
  leave_request: "Leave request",
  leave_encashment: "Leave encashment",
  fixed_asset: "Fixed asset",
  bank_reconciliation: "Bank reconciliation",
  tax_settings: "Tax settings",
};

const VERBS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  approve: "approved",
  reject: "rejected",
  submit: "submitted",
  cancel: "cancelled",
  send: "sent",
  pay: "marked paid",
  mark_paid: "marked paid",
  void: "voided",
  validate: "validated",
  lock: "posted to the books",
  reverse: "reversed",
  discard: "discarded",
  file: "filed",
  remit: "remitted",
  record: "recorded",
  request: "requested",
  dispose: "disposed of",
  depreciate: "depreciated",
  revalue: "revalued",
  transfer: "transferred",
  assign: "assigned",
  return: "returned",
  resend_email: "emailed again",
  role_change: "given a new role",
};

// The record a metadata payload names, if it names one.
const DETAIL_KEYS = ["full_name", "name", "invoice_number", "bill_number", "asset_tag", "employee_number", "title"];

function humanize(text: string): string {
  const words = text.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface ActivitySentence {
  headline: string;
  detail: string | null;
}

export function describeAuditEvent(entry: AuditLogEntry): ActivitySentence {
  const [entityKey = entry.entity_type, verbKey = ""] = entry.action.split(".", 2);
  const entity = ENTITY_NAMES[entityKey] ?? humanize(entityKey);
  const verb = VERBS[verbKey];
  const headline = verb ? `${entity} ${verb}` : `${entity}: ${verbKey.replace(/_/g, " ")}`;
  let detail: string | null = null;
  for (const key of DETAIL_KEYS) {
    const value = entry.event_metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      detail = value;
      break;
    }
  }
  return { headline, detail };
}

// --- pay run lifecycle --------------------------------------------------------

export type PayRunStageKey = "calculated" | "validated" | "posted" | "paid";

export interface PayRunStage {
  key: PayRunStageKey;
  label: string;
  done: boolean;
}

// The four steps every pay run goes through, in order. A reversed run is
// shown as it stood when it was posted; the card says it was reversed.
export function payRunStages(run: PayRun): PayRunStage[] {
  const validated = run.status !== "draft" || run.validated_at !== null;
  const posted = run.locked_at !== null || run.status === "locked" || run.status === "reversed";
  const paid = run.disbursed_at !== null;
  return [
    { key: "calculated", label: "Figures calculated", done: true },
    { key: "validated", label: "Validated", done: validated },
    { key: "posted", label: "Posted to the books", done: posted },
    { key: "paid", label: "Paid to employees", done: paid },
  ];
}

// The run the payroll team is working on: the newest one that isn't
// reversed, by period and then by when it was started.
export function currentPayRun(runs: PayRun[]): PayRun | null {
  const live = runs.filter((run) => run.status !== "reversed");
  live.sort((a, b) => b.period_end.localeCompare(a.period_end) || b.created_at.localeCompare(a.created_at));
  return live[0] ?? null;
}

// --- statutory deadlines -------------------------------------------------------

export type DeadlineUrgency = "overdue" | "due_soon" | "upcoming";

// Still owed (not remitted) and how pressing it is. A filed but unremitted
// liability is still owed to the authority.
export function deadlineUrgency(liability: StatutoryLiability, today: string): DeadlineUrgency {
  const days = daysBetween(today, liability.due_date);
  if (days < 0) return "overdue";
  if (days <= 7) return "due_soon";
  return "upcoming";
}
