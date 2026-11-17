import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { formatChangePct } from "@/lib/analytics/format";

export interface StatChange {
  pct: number;
  // Whether a rise is good news (employees) or bad (overdue items); null
  // when it is neither, so the change is shown without a verdict.
  higherIsBetter: boolean | null;
  versus: string;
}

// One headline figure: what it is, the number, how it moved against the
// comparison period, and a small line of its recent history. Flat and
// bordered like every other card; tinted green, or amber when the figure
// needs someone's attention.
export function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  change,
  spark,
  attention = false,
  href,
  hrefLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption?: React.ReactNode;
  change?: StatChange | null;
  spark?: number[] | null;
  attention?: boolean;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`flex min-w-0 flex-col rounded-card border p-5 ${
        attention ? "border-warn/35 bg-warn-tint/60" : "border-primary/15 bg-primary-tint/45"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-btn bg-surface ${
            attention ? "text-warn-ink" : "text-primary"
          }`}
        >
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
        </span>
        <h3 className="text-[13px] font-bold text-ink">{label}</h3>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[26px] font-extrabold leading-none tracking-tight text-ink">{value}</p>
          {change ? <ChangeLine change={change} /> : null}
        </div>
        {spark && spark.length >= 2 ? <Sparkline values={spark} attention={attention} /> : null}
      </div>
      {caption ? <div className="mt-2 text-[12px] leading-5 text-ink-soft">{caption}</div> : null}
      {href ? (
        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-1 pt-3 text-[12px] font-bold text-primary hover:underline"
        >
          {hrefLabel ?? "View details"}
          <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}

function ChangeLine({ change }: { change: StatChange }) {
  const flat = Math.abs(change.pct) < 0.05;
  const up = change.pct > 0;
  const tone =
    flat || change.higherIsBetter === null
      ? "text-ink-soft"
      : up === change.higherIsBetter
        ? "text-good-ink"
        : "text-bad-ink";
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`mt-2 flex items-center gap-1 text-[12px] font-bold ${tone}`}>
      {flat ? null : <Arrow size={14} strokeWidth={2.5} aria-hidden="true" />}
      {flat ? "No change" : formatChangePct(change.pct)}
      <span className="font-medium text-ink-soft">{change.versus}</span>
    </p>
  );
}

// Decorative: the figure and its change are already in text beside it.
function Sparkline({ values, attention }: { values: number[]; attention: boolean }) {
  const width = 96;
  const height = 34;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    // A flat series sits mid-height rather than on the floor.
    const y = max === min ? height / 2 : height - 3 - ((value - min) / span) * (height - 6);
    return [x, y] as const;
  });
  const last = points[points.length - 1]!;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`-2 -2 ${width + 4} ${height + 4}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke={attention ? "var(--color-warn)" : "var(--color-primary)"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.75} fill={attention ? "var(--color-warn)" : "var(--color-primary)"} />
    </svg>
  );
}
