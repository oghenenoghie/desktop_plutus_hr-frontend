"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, ListTree } from "lucide-react";
import Link from "next/link";

import { InfoTip } from "@/components/analytics/chart-card";
import { useDrill } from "@/components/analytics/records-drawer";
import { Card } from "@/components/ui/card";
import { formatChangePct, formatValue } from "@/lib/analytics/format";
import type { Metric } from "@/lib/analytics/types";

// One KPI: the period's value, how it compares with the comparison period
// (direction by icon and words, never colour alone), its definition, and a
// way into the records behind it.

function Delta({ metric, compareLabel }: { metric: Metric; compareLabel: string }) {
  if (metric.previous_value === null || metric.change === null) {
    return <span className="text-ink-soft">{metric.note ?? "No comparison"}</span>;
  }
  const direction = metric.change > 0 ? "up" : metric.change < 0 ? "down" : "flat";
  const good =
    direction === "flat" || metric.higher_is_better === null
      ? null
      : (direction === "up") === metric.higher_is_better;
  const tone = good === null ? "text-ink-soft" : good ? "text-good-ink" : "text-bad-ink";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : ArrowRight;
  // The word carries the direction, so the amount is unsigned.
  const amount =
    metric.change_pct !== null
      ? formatChangePct(Math.abs(metric.change_pct)).replace("+", "")
      : formatValue(Math.abs(metric.change), metric.unit, metric.currency, { compact: true });
  const words = direction === "flat" ? "No change" : `${direction === "up" ? "Up" : "Down"} ${amount}`;
  return (
    <span className="flex flex-wrap items-center gap-x-1">
      <span className={`inline-flex items-center gap-0.5 font-bold ${tone}`}>
        <Icon size={13} aria-hidden />
        {words}
      </span>
      <span className="text-ink-soft">
        {compareLabel} ({formatValue(metric.previous_value, metric.unit, metric.currency, { compact: true })})
      </span>
    </span>
  );
}

export function KpiCard({
  metric,
  compareLabel,
  refreshing = false,
}: {
  metric: Metric;
  compareLabel: string;
  refreshing?: boolean;
}) {
  const { openRecords } = useDrill();
  const value = metric.unit === "text" ? metric.text_value ?? "—" : formatValue(metric.value, metric.unit, metric.currency);
  return (
    <Card padding="compact" className={`flex flex-col gap-2 transition-opacity ${refreshing ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
          {metric.label}
          <InfoTip text={metric.definition} label={metric.label} />
        </div>
        {metric.dataset ? (
          <button
            type="button"
            onClick={() => openRecords(metric.dataset!, metric.label)}
            aria-label={`Records behind ${metric.label}`}
            className="rounded-panel p-1 text-ink-soft hover:bg-bg hover:text-ink"
          >
            <ListTree size={14} aria-hidden />
          </button>
        ) : null}
      </div>
      <div className={`font-extrabold text-ink ${metric.unit === "text" ? "text-[15px] leading-snug" : "text-[24px] leading-tight"}`}>
        {value}
      </div>
      <div className="text-[11.5px] leading-snug">
        {metric.unit === "text" ? (
          metric.href ? (
            <Link href={metric.href} className="font-bold text-primary hover:underline">
              Open payroll runs
            </Link>
          ) : null
        ) : (
          <Delta metric={metric} compareLabel={compareLabel} />
        )}
        {metric.note && metric.previous_value !== null ? (
          <div className="mt-0.5 text-ink-soft">{metric.note}</div>
        ) : null}
      </div>
    </Card>
  );
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} padding="compact" className="animate-pulse">
          <div className="h-3 w-24 rounded bg-bg" />
          <div className="mt-3 h-6 w-32 rounded bg-bg" />
          <div className="mt-3 h-3 w-40 rounded bg-bg" />
        </Card>
      ))}
    </>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
