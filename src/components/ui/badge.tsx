type Tone = "good" | "warn" | "bad" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  good: "border-good bg-good-tint text-good",
  warn: "border-warn bg-warn-tint text-warn",
  bad: "border-bad bg-bad-tint text-bad",
  neutral: "border-border bg-bg text-ink-soft",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-badge border px-3 py-[5px] text-[11px] font-bold uppercase tracking-[0.03em] ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  // pay runs
  completed: "good",
  processing: "warn",
  draft: "neutral",
  failed: "bad",
  reversed: "bad",
  // leave / expenses
  approved: "good",
  pending: "warn",
  rejected: "bad",
  cancelled: "neutral",
  reimbursed: "good",
  // loans
  active: "good",
  paid_off: "good",
  // statutory liabilities
  filed: "warn",
  remitted: "good",
  // lifecycle
  suspended: "warn",
  terminated: "bad",
  onboarding: "warn",
  // probation periods
  confirmed: "good",
  // checklist items
  done: "good",
  // generated documents
  sent_for_signature: "warn",
  signed: "good",
  // subscriptions
  past_due: "warn",
  canceled: "bad",
  // recruitment: job postings
  open: "good",
  closed: "neutral",
  // recruitment: candidates
  applied: "neutral",
  interviewing: "warn",
  offered: "warn",
  hired: "good",
  // performance reviews
  submitted: "warn",
  acknowledged: "good",
  // training enrollments
  enrolled: "neutral",
  in_progress: "warn",
  // company assets
  available: "good",
  assigned: "warn",
  maintenance: "warn",
  retired: "neutral",
  // bills / invoices
  paid: "good",
  void: "bad",
  sent: "warn",
  // fixed assets
  disposed: "neutral",
  // tasks
  todo: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return <Badge tone={tone}>{status.replace(/_/g, " ")}</Badge>;
}
