"use client";

import { useEffect, useRef, useState } from "react";

// Shared pieces for the hand-drawn SVG charts (no charting dependency, the
// same choice as the dashboard's payroll chart): the palette, a width
// observer so text renders at its real size on every screen, the legend
// and the tooltip.

// One series wears the brand's primary. Two or more take this categorical
// order, run through the dataviz palette validator against the Ledger
// surface (#fdfcf8): every adjacent pair clears the colour-blind (ΔE ≥ 8)
// and normal-vision (ΔE ≥ 15) floors. Three slots sit under 3:1 contrast,
// so every chart also has a legend or labels and a table view.
export const CATEGORICAL = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6250d6",
  "#e34948",
];
export const SINGLE = "var(--color-primary)";
export const MUTED = "var(--color-border)";

// Colour follows the entity, never its rank: a series or category keeps
// its colour when a filter removes its neighbours. `order` lists every key
// the chart can show, in a fixed order.
export function colorFor(key: string, order: string[] | undefined, fallbackIndex: number): string {
  const index = order ? order.indexOf(key) : -1;
  const slot = index >= 0 ? index : fallbackIndex;
  return CATEGORICAL[slot % CATEGORICAL.length]!;
}

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      setWidth((current) => (current === next ? current : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export function Legend({
  items,
  shape,
}: {
  items: { key: string; label: string; color: string }[];
  shape: "line" | "box";
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          {shape === "line" ? (
            <span aria-hidden className="inline-block h-[2px] w-3.5 rounded" style={{ background: item.color }} />
          ) : (
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: item.color }} />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export interface TooltipRow {
  key: string;
  label: string;
  value: string;
  color?: string;
}

// Values lead and labels follow; series are keyed with a short stroke.
export function Tooltip({
  x,
  y,
  width,
  title,
  rows,
}: {
  x: number;
  y: number;
  width: number;
  title: string;
  rows: TooltipRow[];
}) {
  // Beside the pointer (right of it, or left near the edge) so it never
  // covers the mark being read.
  const boxWidth = Math.min(196, width);
  const right = x + 12;
  const left = right + boxWidth <= width ? right : Math.max(x - 12 - boxWidth, 0);
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 rounded-panel border border-border bg-surface px-3 py-2 text-[12px] shadow-sm"
      style={{ left, top: Math.max(y, 0), width: boxWidth }}
    >
      <div className="mb-1 font-bold text-ink-soft">{title}</div>
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2 py-[1px]">
          {row.color ? (
            <span aria-hidden className="inline-block h-[2px] w-3 shrink-0 rounded" style={{ background: row.color }} />
          ) : null}
          <span className="font-extrabold tabular-nums text-ink">{row.value}</span>
          <span className="truncate text-ink-soft">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

// A rectangle with only its data end rounded (4px), square at the baseline.
export function barPath(x: number, y: number, width: number, height: number, end: "top" | "bottom" | "right"): string {
  const r = Math.min(4, width / 2, Math.abs(height) / 2);
  if (height <= 0 || width <= 0) return "";
  if (end === "top") {
    return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
  }
  if (end === "bottom") {
    return `M${x},${y}V${y + height - r}Q${x},${y + height} ${x + r},${y + height}H${x + width - r}Q${x + width},${y + height} ${x + width},${y + height - r}V${y}Z`;
  }
  return `M${x},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height - r}Q${x + width},${y + height} ${x + width - r},${y + height}H${x}Z`;
}
