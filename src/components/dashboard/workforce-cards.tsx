"use client";

import Link from "next/link";
import { useState } from "react";

import { DonutChart } from "@/components/analytics/charts/breakdown-chart";
import { TrendChart } from "@/components/analytics/charts/trend-chart";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import type { Breakdown, Series, Trend, WorkforceAnalytics } from "@/lib/analytics/types";

type Range = "6m" | "12m" | "ytd";

const RANGES: { key: Range; label: string; description: string }[] = [
  { key: "6m", label: "6M", description: "Last 6 months" },
  { key: "12m", label: "12M", description: "Last 12 months" },
  { key: "ytd", label: "YTD", description: "This year to date" },
];

// The categorical palette's green and amber slots, so the brand green
// carries the headcount line and new hires read as a second series.
const WORKFORCE_COLOR_ORDER = ["_slot_blue", "_slot_orange", "headcount", "hires"];

function sliceSeries(series: Series, months: string[]): Series {
  const wanted = new Set(months);
  return { ...series, points: series.points.filter((point) => wanted.has(point.period)) };
}

// Headcount and new hires month by month, from the same workforce analytics
// the Analytics pages use (the last 12 months), narrowed to the range picked.
export function WorkforceOverviewCard({
  workforce,
  loading,
  error,
  unavailable,
  currentYear,
}: {
  workforce: WorkforceAnalytics | null;
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  currentYear: string;
}) {
  const [range, setRange] = useState<Range>("6m");
  const headcount = workforce?.headcount_trend.series[0];
  const hires = workforce?.hires_vs_departures.series.find((series) => series.key === "hires");
  const allMonths = headcount?.points.map((point) => point.period) ?? [];
  const months =
    range === "6m"
      ? allMonths.slice(-6)
      : range === "ytd"
        ? allMonths.filter((month) => month.startsWith(currentYear))
        : allMonths;
  const trend: Trend | null =
    headcount && hires
      ? {
          key: "workforce_overview",
          title: "Employees and new hires",
          unit: "count",
          currency: null,
          stacked: false,
          series: [
            sliceSeries({ ...headcount, key: "headcount", label: "Employees" }, months),
            sliceSeries({ ...hires, key: "hires", label: "New hires" }, months),
          ],
          definition: "Employees on the books at each month end, and people who joined that month.",
          dataset: null,
        }
      : null;

  return (
    <Card className="min-w-0">
      <CardHeader
        title="Workforce overview"
        subtitle="Employees at each month end, and new hires"
        action={
          unavailable ? null : (
            <div role="group" aria-label="Range" className="flex rounded-btn border border-border bg-surface-muted p-0.5">
              {RANGES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={range === option.key}
                  title={option.description}
                  onClick={() => setRange(option.key)}
                  className={`rounded-[8px] px-3 py-1 text-[12px] font-bold ${
                    range === option.key ? "bg-surface text-primary-dark ring-1 ring-border" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )
        }
      />
      {unavailable ? <EmptyState label="Workforce figures aren't part of your role's access." /> : null}
      {!unavailable && loading ? <LoadingState /> : null}
      {!unavailable && error ? <ErrorState message={error} /> : null}
      {!unavailable && trend ? (
        months.length < 2 ? (
          <EmptyState label="A chart appears once there are two months of history to compare." />
        ) : (
          <TrendChart trend={trend} kind="line" colorOrder={WORKFORCE_COLOR_ORDER} />
        )
      ) : null}
    </Card>
  );
}

const NO_DEPARTMENT = "No department";

// The five biggest departments and everyone else as "Other", so the donut
// never falls back to bars just because a company has many departments.
function topDepartments(breakdown: Breakdown): Breakdown {
  const rows = [...breakdown.rows].filter((row) => (row.value ?? 0) > 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  if (rows.length <= 6) return { ...breakdown, rows };
  const top = rows.slice(0, 5);
  const rest = rows.slice(5);
  const other = rest.reduce((sum, row) => sum + (row.value ?? 0), 0);
  return {
    ...breakdown,
    rows: [...top, { key: "other", label: `Other (${rest.length})`, value: other, count: null, suppressed: false }],
  };
}

export function DepartmentDistributionCard({
  workforce,
  loading,
  error,
  unavailable,
}: {
  workforce: WorkforceAnalytics | null;
  loading: boolean;
  error: string | null;
  unavailable: boolean;
}) {
  const breakdown = workforce ? topDepartments(workforce.by_department) : null;
  const onlyUnassigned =
    breakdown !== null && breakdown.rows.length > 0 && breakdown.rows.every((row) => row.label === NO_DEPARTMENT);

  return (
    <Card className="min-w-0">
      <CardHeader title="Department distribution" subtitle="Employees by department" />
      {unavailable ? <EmptyState label="Workforce figures aren't part of your role's access." /> : null}
      {!unavailable && loading ? <LoadingState /> : null}
      {!unavailable && error ? <ErrorState message={error} /> : null}
      {!unavailable && breakdown ? (
        breakdown.rows.length === 0 ? (
          <EmptyState label="No employees on record yet." />
        ) : (
          <>
            <DonutChart breakdown={breakdown} />
            {onlyUnassigned ? (
              <p className="mt-3 text-[12px] text-ink-soft">
                No one is in a department yet.{" "}
                <Link href="/departments" className="font-bold text-primary hover:underline">
                  Set up departments
                </Link>{" "}
                and assign them on each employee&apos;s page.
              </p>
            ) : null}
          </>
        )
      ) : null}
    </Card>
  );
}
