"use client";

import { useState } from "react";

import {
  Legend,
  SINGLE,
  Tooltip,
  colorFor,
  useWidth,
} from "@/components/analytics/charts/chart-kit";
import { formatValue } from "@/lib/analytics/format";
import type { Breakdown, BreakdownRow } from "@/lib/analytics/types";

// A value per category. Horizontal bars (the default) suit unordered
// categories with long names; columns suit ordered bands (tenure, age,
// weekday), read left to right. One series, so one colour and no legend.
// A group hidden to protect individuals keeps its row and says so.

const SUPPRESSED = "Hidden: fewer than 3 people";

function countText(row: BreakdownRow): string | null {
  return row.count === null ? null : `${row.count.toLocaleString("en-NG")} behind this figure`;
}

export function BreakdownChart({
  breakdown,
  orientation = "horizontal",
}: {
  breakdown: Breakdown;
  orientation?: "horizontal" | "vertical";
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<{ index: number; x: number; y: number } | null>(null);
  const values = breakdown.rows.map((r) => Math.abs(r.value ?? 0));
  const max = Math.max(...values, 0) || 1;

  function show(index: number, element: HTMLElement) {
    const box = element.getBoundingClientRect();
    const parent = ref.current?.getBoundingClientRect();
    setActive({
      index,
      x: box.left - (parent?.left ?? 0) + (orientation === "vertical" ? box.width / 2 : Math.min(box.width, 220)),
      y: box.top - (parent?.top ?? 0),
    });
  }

  const activeRow = active ? breakdown.rows[active.index] : null;

  return (
    <div ref={ref} className="relative w-full" onPointerLeave={() => setActive(null)}>
      {orientation === "horizontal" ? (
        <ul className="flex flex-col gap-2" aria-label={breakdown.title}>
          {breakdown.rows.map((row, i) => {
            const share = Math.abs(row.value ?? 0) / max;
            const label = `${row.label}: ${
              row.suppressed ? SUPPRESSED : formatValue(row.value, breakdown.unit, breakdown.currency)
            }${countText(row) ? ` (${countText(row)})` : ""}`;
            return (
              <li
                key={row.key}
                tabIndex={0}
                aria-label={label}
                onPointerEnter={(event) => show(i, event.currentTarget)}
                onFocus={(event) => show(i, event.currentTarget)}
                onBlur={() => setActive(null)}
                className="grid grid-cols-[minmax(84px,34%)_1fr_auto] items-center gap-3 rounded-chip px-1 py-0.5 outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="line-clamp-2 text-[12.5px] leading-tight text-ink" title={row.label}>
                  {row.label}
                </span>
                <span className="h-3.5">
                  {row.suppressed ? (
                    <span className="text-[11.5px] italic text-ink-soft">{SUPPRESSED}</span>
                  ) : (
                    <span
                      className="block h-3.5 rounded-r-[4px]"
                      style={{
                        width: `${Math.max(share * 100, row.value ? 1.5 : 0)}%`,
                        background: (row.value ?? 0) < 0 ? "var(--color-ink-soft)" : SINGLE,
                      }}
                    />
                  )}
                </span>
                <span className="min-w-[64px] text-right text-[12.5px] font-bold tabular-nums text-ink">
                  {row.suppressed ? "—" : formatValue(row.value, breakdown.unit, breakdown.currency, { compact: true })}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex h-[220px] items-stretch gap-1.5" aria-label={breakdown.title}>
          {breakdown.rows.map((row, i) => {
            const share = Math.abs(row.value ?? 0) / max;
            const label = `${row.label}: ${
              row.suppressed ? SUPPRESSED : formatValue(row.value, breakdown.unit, breakdown.currency)
            }`;
            return (
              <li
                key={row.key}
                tabIndex={0}
                aria-label={label}
                onPointerEnter={(event) => show(i, event.currentTarget)}
                onFocus={(event) => show(i, event.currentTarget)}
                onBlur={() => setActive(null)}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-chip outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* The value sits on the column's cap; the plot leaves 16% headroom for it. */}
                <span className="relative w-full flex-1">
                  {row.suppressed ? (
                    <span className="absolute inset-x-0 bottom-1 text-center text-[10.5px] italic leading-tight text-ink-soft">
                      Hidden
                    </span>
                  ) : (
                    <>
                      <span
                        className="absolute inset-x-0 mx-auto block w-full max-w-[24px] rounded-t-[4px]"
                        style={{ bottom: 0, height: `${Math.max(share * 84, row.value ? 1.5 : 0)}%`, background: SINGLE }}
                      />
                      <span
                        className="absolute inset-x-0 text-center text-[11.5px] font-bold tabular-nums text-ink"
                        style={{ bottom: `calc(${Math.max(share * 84, row.value ? 1.5 : 0)}% + 4px)` }}
                      >
                        {formatValue(row.value, breakdown.unit, breakdown.currency, { compact: true })}
                      </span>
                    </>
                  )}
                </span>
                <span className="w-full text-center text-[11px] leading-tight text-ink-soft [overflow-wrap:anywhere]">
                  {row.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {activeRow && active && width > 0 ? (
        <Tooltip
          x={active.x}
          y={active.y}
          width={width}
          title={activeRow.label}
          rows={[
            {
              key: "value",
              label: breakdown.title,
              value: activeRow.suppressed ? "Hidden" : formatValue(activeRow.value, breakdown.unit, breakdown.currency),
            },
            ...(activeRow.count !== null
              ? [{ key: "count", label: activeRow.suppressed ? "fewer than 3: hidden" : "behind this figure", value: activeRow.count.toLocaleString("en-NG") }]
              : []),
          ]}
        />
      ) : null}
    </div>
  );
}

// Part-to-whole for a handful of categories. More than six slices (or any
// negative or hidden value) reads better as bars, so it falls back.
export function DonutChart({ breakdown, colorOrder }: { breakdown: Breakdown; colorOrder?: string[] }) {
  const [active, setActive] = useState<number | null>(null);
  const rows = breakdown.rows.filter((r) => (r.value ?? 0) > 0);
  const unsuitable =
    rows.length > 6 || breakdown.rows.some((r) => r.suppressed || (r.value ?? 0) < 0);
  if (unsuitable || rows.length === 0) return <BreakdownChart breakdown={breakdown} />;

  const total = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
  const size = 168;
  const radius = 66;
  const thickness = 22;
  const circumference = 2 * Math.PI * radius;
  const gap = rows.length > 1 ? 2 : 0;
  const lengths = rows.map((row) => ((row.value ?? 0) / total) * circumference);
  const offsets = lengths.map((_, i) => lengths.slice(0, i).reduce((sum, l) => sum + l, 0));
  const colors = rows.map((r, i) => colorFor(r.key, colorOrder, i));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="group"
        aria-label={breakdown.title}
        className="shrink-0"
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {rows.map((row, i) => {
            const dash = Math.max(lengths[i]! - gap, 0.5);
            return (
              <circle
                key={row.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={colors[i]}
                strokeWidth={active === i ? thickness + 4 : thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offsets[i]!}
                tabIndex={0}
                role="img"
                aria-label={`${row.label}: ${formatValue(row.value, breakdown.unit, breakdown.currency)}, ${Math.round(((row.value ?? 0) / total) * 100)}%`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="cursor-default outline-none"
              />
            );
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="fill-ink" style={{ fontSize: 17, fontWeight: 800 }}>
          {active === null
            ? formatValue(total, breakdown.unit, breakdown.currency, { compact: true })
            : formatValue(rows[active]!.value, breakdown.unit, breakdown.currency, { compact: true })}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-ink-soft" style={{ fontSize: 11 }}>
          {active === null ? "Total" : rows[active]!.label}
        </text>
      </svg>
      <div className="w-full">
        <Legend
          shape="box"
          items={rows.map((r, i) => ({
            key: r.key,
            label: `${r.label} · ${formatValue(r.value, breakdown.unit, breakdown.currency)} (${Math.round(((r.value ?? 0) / total) * 100)}%)`,
            color: colors[i]!,
          }))}
        />
      </div>
    </div>
  );
}
