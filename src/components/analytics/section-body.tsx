"use client";

import { ListTree } from "lucide-react";

import { MetaPanel } from "@/components/analytics/analytics-shell";
import { useDrill } from "@/components/analytics/records-drawer";
import { KpiCard, KpiGrid, KpiSkeleton } from "@/components/analytics/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { formatIsoDate, formatMoney, formatPeriodRange } from "@/lib/analytics/format";
import type { BudgetActual, Deadline, Meta, Metric } from "@/lib/analytics/types";

// The state handling every analytics page shares: a skeleton on first load,
// the previous figures (dimmed) while a filter change refetches, and the
// API's own message when a filter is refused.
export function SectionBody<T extends { meta: Meta; kpis: Metric[] }>({
  resource,
  compareLabel,
  kpiCount = 4,
  children,
}: {
  resource: { data: T | null; error: string | null; loading: boolean };
  compareLabel: string;
  kpiCount?: number;
  children: (data: T, refreshing: boolean) => React.ReactNode;
}) {
  const { data, error, loading } = resource;
  if (!data) {
    return error ? (
      <ErrorState message={error} />
    ) : (
      <KpiGrid>
        <KpiSkeleton count={kpiCount} />
      </KpiGrid>
    );
  }
  const refreshing = loading;
  return (
    <>
      {error ? (
        <div className="mb-4">
          <ErrorState message={`${error} The figures below are from the previous filters.`} />
        </div>
      ) : null}
      <KpiGrid>
        {data.kpis.map((metric) => (
          <KpiCard key={metric.key} metric={metric} compareLabel={compareLabel} refreshing={refreshing} />
        ))}
      </KpiGrid>
      {children(data, refreshing)}
      <MetaPanel meta={data.meta} />
    </>
  );
}

const DEADLINE_ROWS = 10;

export function DeadlinesTable({
  deadlines,
  currency,
  title = "Upcoming and overdue obligations",
}: {
  deadlines: Deadline[];
  currency: string;
  title?: string;
}) {
  const { openRecords } = useDrill();
  const shown = deadlines.slice(0, DEADLINE_ROWS);
  const overdue = deadlines.filter((d) => d.overdue).length;
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={`Unremitted statutory liabilities due in the next 30 days or already overdue${
          overdue ? ` (${overdue}${deadlines.length >= 50 ? "+" : ""} overdue)` : ""
        }, by the due dates their rule version set`}
        action={
          <button
            type="button"
            onClick={() => openRecords("liabilities", "Statutory liabilities")}
            className="inline-flex items-center gap-1 rounded-panel px-2 py-1 text-[11.5px] font-bold text-ink-soft hover:bg-bg hover:text-ink"
          >
            <ListTree size={13} aria-hidden /> Records
          </button>
        }
      />
      {deadlines.length === 0 ? (
        <EmptyState label="Nothing due in the next 30 days, and nothing overdue." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Due</Th>
              <Th>Obligation</Th>
              <Th>Period</Th>
              <Th align="right">Amount</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {shown.map((d) => (
              <tr key={d.id}>
                <Td className="whitespace-nowrap">{formatIsoDate(d.due_date)}</Td>
                <Td>
                  <div className="font-bold">{d.scheme}</div>
                  <div className="text-[11.5px] text-ink-soft">{d.authority}</div>
                </Td>
                <Td className="whitespace-nowrap">{formatPeriodRange(d.period_start, d.period_end)}</Td>
                <Td align="right" className="tabular-nums">
                  {formatMoney(d.amount_minor, currency)}
                </Td>
                <Td>
                  {d.overdue ? (
                    <Badge tone="bad">Overdue</Badge>
                  ) : (
                    <Badge tone={d.status === "filed" ? "warn" : "neutral"}>{d.status}</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {deadlines.length > shown.length ? (
        <p className="mt-3 text-[12px] text-ink-soft">
          The {shown.length} earliest are shown. Records lists every liability for the period.
        </p>
      ) : null}
    </Card>
  );
}

export function BudgetTable({ rows, currency }: { rows: BudgetActual[]; currency: string }) {
  return (
    <Card>
      <CardHeader
        title="Budget vs actual"
        subtitle="Budgets overlapping the period, against ledger activity on their accounts within each budget's own dates"
      />
      {rows.length === 0 ? (
        <EmptyState label="No budget covers this period." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Budget</Th>
              <Th>Period</Th>
              <Th align="right">Budgeted</Th>
              <Th align="right">Actual</Th>
              <Th align="right">Variance</Th>
            </tr>
          </Thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.budget_id}>
                <Td>
                  <div className="font-bold">{b.name}</div>
                  {b.department_name ? <div className="text-[11.5px] text-ink-soft">{b.department_name}</div> : null}
                </Td>
                <Td className="whitespace-nowrap">
                  {formatIsoDate(b.period_start)} – {formatIsoDate(b.period_end)}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatMoney(b.budgeted_minor, currency)}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatMoney(b.actual_minor, currency)}
                </Td>
                <Td align="right" className="tabular-nums">
                  {b.variance_minor > 0 ? "+" : ""}
                  {formatMoney(b.variance_minor, currency)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
