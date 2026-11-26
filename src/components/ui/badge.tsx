type Tone = "good" | "warn" | "bad" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  good: "border-good bg-good-tint text-good-ink",
  warn: "border-warn bg-warn-tint text-warn-ink",
  bad: "border-bad bg-bad-tint text-bad-ink",
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
  locked: "good", validated: "warn", draft: "neutral", reversed: "bad", completed: "good", failed: "bad",
  approved: "good", pending: "warn", rejected: "bad", cancelled: "neutral", reimbursed: "good",
  active: "good", paid_off: "good", filed: "warn", remitted: "good", suspended: "warn", terminated: "bad",
  onboarding: "warn", confirmed: "good", done: "good", sent_for_signature: "warn", signed: "good",
  past_due: "warn", canceled: "bad", open: "good", closed: "neutral", applied: "neutral",
  interviewing: "warn", offered: "warn", hired: "good", submitted: "warn", acknowledged: "good",
  enrolled: "neutral", in_progress: "warn", available: "good", assigned: "warn", maintenance: "warn",
  retired: "neutral", paid: "good", void: "bad", sent: "warn", disposed: "neutral",
  todo: "neutral", pending_approval: "warn", posted: "good", issued: "warn", partially_received: "warn",
  received: "good", in_transit: "warn", counting: "warn",
};

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const safeStatus = status || "unknown";
  const tone = STATUS_TONE[safeStatus] ?? "neutral";
  return <Badge tone={tone}>{(label ?? safeStatus).replace(/_/g, " ")}</Badge>;
}
