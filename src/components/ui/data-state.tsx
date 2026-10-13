export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <p className="py-8 text-center text-[13px] text-ink-soft">{label}</p>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-panel bg-bad-tint px-4 py-3 text-[13px] font-bold text-bad-ink">
      {message}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="py-8 text-center text-[13px] text-ink-soft">{label}</p>;
}
