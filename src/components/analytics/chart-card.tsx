"use client";

import { Info, ListTree } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { BreakdownChart, DonutChart } from "@/components/analytics/charts/breakdown-chart";
import { TrendChart } from "@/components/analytics/charts/trend-chart";
import { BreakdownTable, TrendTable } from "@/components/analytics/data-table";
import { useDrill } from "@/components/analytics/records-drawer";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/data-state";
import type { Breakdown, Trend } from "@/lib/analytics/types";

// A definition behind a small (i): every figure says exactly what it counts.
export function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={`How ${label} is calculated`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-0.5 text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Info size={14} aria-hidden />
      </button>
      {open ? (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-6 z-20 w-[260px] rounded-panel border border-border bg-surface p-3 text-[12px] font-normal normal-case leading-relaxed tracking-normal text-ink shadow-sm"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

function ViewToggle({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-panel border border-border p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-[8px] px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
            value === option.value ? "bg-primary-tint text-primary-dark" : "text-ink-soft hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChartFrame({
  title,
  definition,
  dataset,
  controls,
  refreshing,
  children,
  className = "",
}: {
  title: string;
  definition: string;
  dataset: string | null;
  controls?: React.ReactNode;
  refreshing: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { openRecords } = useDrill();
  return (
    <Card className={`flex min-w-0 flex-col ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="text-sm font-extrabold text-ink">{title}</h2>
          <InfoTip text={definition} label={title} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          {dataset ? (
            <button
              type="button"
              onClick={() => openRecords(dataset, title)}
              className="inline-flex items-center gap-1 rounded-panel px-2 py-1 text-[11.5px] font-bold text-ink-soft hover:bg-bg hover:text-ink"
            >
              <ListTree size={13} aria-hidden /> Records
            </button>
          ) : null}
        </div>
      </div>
      {/* A refetch keeps the previous render, dimmed: no skeleton flash, no jump. */}
      <div className={`min-w-0 flex-1 transition-opacity ${refreshing ? "opacity-50" : ""}`} aria-busy={refreshing}>
        {children}
      </div>
    </Card>
  );
}

// Nothing to draw: no values, or nothing but zeros (no overtime paid, no
// late arrivals). The table view still has the zeros.
function isEmptyTrend(trend: Trend): boolean {
  return trend.series.every((s) => s.points.every((p) => !p.value));
}

export function TrendCard({
  trend,
  kind = "line",
  colorOrder,
  refreshing = false,
  emptyLabel = "No data for this period.",
  className,
}: {
  trend: Trend;
  kind?: "line" | "bar";
  colorOrder?: string[];
  refreshing?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const [view, setView] = useState("chart");
  const empty = isEmptyTrend(trend);
  return (
    <ChartFrame
      title={trend.title}
      definition={trend.definition}
      dataset={trend.dataset}
      refreshing={refreshing}
      className={className}
      controls={
        empty ? null : (
          <ViewToggle
            label={`${trend.title} view`}
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: "Chart" },
              { value: "table", label: "Table" },
            ]}
          />
        )
      }
    >
      {empty ? (
        <EmptyState label={emptyLabel} />
      ) : view === "chart" ? (
        <TrendChart trend={trend} kind={kind} colorOrder={colorOrder} />
      ) : (
        <TrendTable trend={trend} />
      )}
    </ChartFrame>
  );
}

export function BreakdownCard({
  breakdown,
  kind = "bars",
  colorOrder,
  allowOrientation = false,
  refreshing = false,
  emptyLabel = "No data for this period.",
  className,
}: {
  breakdown: Breakdown;
  kind?: "bars" | "columns" | "donut";
  colorOrder?: string[];
  // Offer bars ⇄ columns where both read well (department comparisons).
  allowOrientation?: boolean;
  refreshing?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const [view, setView] = useState<string>(kind);
  const empty = breakdown.rows.length === 0 || breakdown.rows.every((r) => !r.suppressed && !r.value);
  const options = [
    ...(allowOrientation
      ? [
          { value: "bars", label: "Bars" },
          { value: "columns", label: "Columns" },
        ]
      : [{ value: kind, label: "Chart" }]),
    { value: "table", label: "Table" },
  ];
  return (
    <ChartFrame
      title={breakdown.title}
      definition={breakdown.definition}
      dataset={breakdown.dataset}
      refreshing={refreshing}
      className={className}
      controls={
        empty ? null : (
          <ViewToggle label={`${breakdown.title} view`} value={view} onChange={setView} options={options} />
        )
      }
    >
      {empty ? (
        <EmptyState label={emptyLabel} />
      ) : view === "table" ? (
        <BreakdownTable breakdown={breakdown} />
      ) : view === "donut" ? (
        <DonutChart breakdown={breakdown} colorOrder={colorOrder} />
      ) : (
        <BreakdownChart breakdown={breakdown} orientation={view === "columns" ? "vertical" : "horizontal"} />
      )}
    </ChartFrame>
  );
}

export function ChartError({ message }: { message: string }) {
  return (
    <Card>
      <ErrorState message={message} />
    </Card>
  );
}
