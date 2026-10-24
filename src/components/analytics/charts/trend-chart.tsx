"use client";

import { useId, useState } from "react";

import {
  Legend,
  SINGLE,
  Tooltip,
  barPath,
  colorFor,
  useWidth,
} from "@/components/analytics/charts/chart-kit";
import { formatPeriod, formatTick, formatValue, isWholeUnit, niceTicks } from "@/lib/analytics/format";
import type { Trend } from "@/lib/analytics/types";

// A month-by-month chart of one or more series sharing one unit (the API
// never mixes units in a Trend, so there is only ever one axis). Lines for
// trends, columns for counts and amounts: grouped side by side, or stacked
// when the series add up to a meaningful total. A month with no value is a
// gap, never a zero.

const HEIGHT = 220;
const MARGIN = { top: 14, right: 12, bottom: 28, left: 60 };

export function TrendChart({
  trend,
  kind,
  colorOrder,
}: {
  trend: Trend;
  kind: "line" | "bar";
  colorOrder?: string[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const descriptionId = useId();
  const periods = trend.series[0]?.points.map((p) => p.period) ?? [];
  const single = trend.series.length === 1;
  const colors = trend.series.map((s, i) => (single ? SINGLE : colorFor(s.key, colorOrder, i)));

  // Domain: stacked columns sum per month (positives up, negatives down).
  let min = 0;
  let max = 0;
  periods.forEach((_, i) => {
    if (trend.stacked && kind === "bar") {
      let up = 0;
      let down = 0;
      for (const s of trend.series) {
        const v = s.points[i]?.value ?? 0;
        if (v >= 0) up += v;
        else down += v;
      }
      max = Math.max(max, up);
      min = Math.min(min, down);
    } else {
      for (const s of trend.series) {
        const v = s.points[i]?.value;
        if (v !== null && v !== undefined) {
          max = Math.max(max, v);
          min = Math.min(min, v);
        }
      }
    }
  });
  const ticks = niceTicks(min, max, 4, isWholeUnit(trend.unit));
  const low = ticks[0] ?? 0;
  const high = ticks[ticks.length - 1] ?? 1;
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const y = (v: number) => MARGIN.top + plotHeight - ((v - low) / (high - low || 1)) * plotHeight;
  const band = plotWidth / Math.max(periods.length, 1);
  const cx = (i: number) => MARGIN.left + band * i + band / 2;
  const labelEvery = Math.ceil(periods.length / Math.max(Math.floor(plotWidth / 56), 1));

  function onPointer(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - box.left) / band);
    setActive(Math.min(Math.max(index, 0), periods.length - 1));
  }

  function onKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      setActive((current) =>
        Math.min(Math.max((current ?? (step > 0 ? -1 : periods.length)) + step, 0), periods.length - 1),
      );
    }
  }

  const tooltipRows =
    active === null
      ? []
      : trend.series.map((s, i) => ({
          key: s.key,
          label: s.label,
          value: formatValue(s.points[active]?.value ?? null, trend.unit, trend.currency),
          color: colors[i],
        }));

  const summary = `${trend.title}, ${periods.length} months${
    periods.length ? ` from ${formatPeriod(periods[0]!)} to ${formatPeriod(periods[periods.length - 1]!)}` : ""
  }. Use the left and right arrow keys to read each month, or switch to the table view.`;

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 ? (
        <svg
          width={width}
          height={HEIGHT}
          role="group"
          aria-label={trend.title}
          aria-describedby={descriptionId}
          tabIndex={0}
          onKeyDown={onKey}
          onFocus={() => setActive((current) => current ?? periods.length - 1)}
          onBlur={() => setActive(null)}
          className="block rounded-panel outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-border)"
                strokeWidth={tick === 0 ? 1.25 : 1}
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-ink-soft tabular-nums"
                style={{ fontSize: 11 }}
              >
                {formatTick(tick, trend.unit, trend.currency)}
              </text>
            </g>
          ))}
          {periods.map((period, i) =>
            i % labelEvery === 0 ? (
              <text
                key={period}
                x={cx(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-ink-soft"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {formatPeriod(period, true)}
                {period.endsWith("-01") || i === 0 ? ` ’${period.slice(2, 4)}` : ""}
              </text>
            ) : null,
          )}

          {active !== null && kind === "bar" ? (
            <rect
              x={MARGIN.left + band * active}
              y={MARGIN.top}
              width={band}
              height={plotHeight}
              fill="var(--color-bg)"
            />
          ) : null}

          {kind === "line"
            ? trend.series.map((s, si) => {
                const segments: string[] = [];
                let current = "";
                s.points.forEach((p, i) => {
                  if (p.value === null) {
                    if (current) segments.push(current);
                    current = "";
                    return;
                  }
                  current += `${current ? "L" : "M"}${cx(i)},${y(p.value)}`;
                });
                if (current) segments.push(current);
                const isolated = s.points
                  .map((p, i) => ({ p, i }))
                  .filter(
                    ({ p, i }) =>
                      p.value !== null &&
                      (s.points[i - 1]?.value ?? null) === null &&
                      (s.points[i + 1]?.value ?? null) === null,
                  );
                return (
                  <g key={s.key}>
                    {segments.map((d) => (
                      <path
                        key={d}
                        d={d}
                        fill="none"
                        stroke={colors[si]}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ))}
                    {isolated.map(({ p, i }) => (
                      <circle key={i} cx={cx(i)} cy={y(p.value!)} r={4} fill={colors[si]} stroke="var(--color-surface)" strokeWidth={2} />
                    ))}
                    {active !== null && s.points[active]?.value !== null && s.points[active]?.value !== undefined ? (
                      <circle
                        cx={cx(active)}
                        cy={y(s.points[active]!.value!)}
                        r={4.5}
                        fill={colors[si]}
                        stroke="var(--color-surface)"
                        strokeWidth={2}
                      />
                    ) : null}
                  </g>
                );
              })
            : periods.map((period, i) => {
                const columnWidth = trend.stacked
                  ? Math.min(24, band * 0.6)
                  : Math.min(24, (band * 0.72) / trend.series.length);
                const groupLeft = cx(i) - (trend.stacked ? columnWidth : columnWidth * trend.series.length) / 2;
                let up = 0;
                let down = 0;
                const positives = trend.series
                  .map((s, si) => ({ s, si, v: s.points[i]?.value ?? 0 }))
                  .filter(({ v }) => v > 0);
                const topIndex = positives.length ? positives[positives.length - 1]!.si : -1;
                return (
                  <g key={period}>
                    {trend.series.map((s, si) => {
                      const v = s.points[i]?.value;
                      if (v === null || v === undefined || v === 0) return null;
                      if (trend.stacked) {
                        const base = v > 0 ? up : down;
                        const next = base + v;
                        if (v > 0) up = next;
                        else down = next;
                        const top = Math.min(y(base), y(next));
                        const height = Math.abs(y(base) - y(next)) - (si === topIndex ? 0 : 2);
                        const end = v > 0 ? "top" : "bottom";
                        const rounded = (v > 0 && si === topIndex) || v < 0;
                        return (
                          <path
                            key={s.key}
                            d={
                              rounded
                                ? barPath(groupLeft, top, columnWidth, height, end)
                                : `M${groupLeft},${top}h${columnWidth}v${Math.max(height, 0)}h${-columnWidth}Z`
                            }
                            fill={colors[si]}
                          />
                        );
                      }
                      const x = groupLeft + si * columnWidth;
                      const top = Math.min(y(0), y(v));
                      return (
                        <path
                          key={s.key}
                          d={barPath(x + 1, top, columnWidth - 2, Math.abs(y(v) - y(0)), v > 0 ? "top" : "bottom")}
                          fill={colors[si]}
                        />
                      );
                    })}
                  </g>
                );
              })}

          {active !== null && kind === "line" ? (
            <line
              x1={cx(active)}
              x2={cx(active)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotHeight}
              stroke="var(--color-ink-soft)"
              strokeWidth={1}
            />
          ) : null}

          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onPointerMove={onPointer}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      ) : (
        <div style={{ height: HEIGHT }} />
      )}
      <p id={descriptionId} className="sr-only">
        {summary}
      </p>
      <div aria-live="polite" className="sr-only">
        {active !== null
          ? `${formatPeriod(periods[active]!)}: ${tooltipRows.map((r) => `${r.label} ${r.value}`).join(", ")}`
          : ""}
      </div>
      {active !== null && width > 0 ? (
        <Tooltip
          x={cx(active)}
          y={MARGIN.top + 4}
          width={width}
          title={formatPeriod(periods[active]!)}
          rows={tooltipRows}
        />
      ) : null}
      {trend.series.length > 1 ? (
        <Legend
          shape={kind === "line" ? "line" : "box"}
          items={trend.series.map((s, i) => ({ key: s.key, label: s.label, color: colors[i]! }))}
        />
      ) : null}
    </div>
  );
}
