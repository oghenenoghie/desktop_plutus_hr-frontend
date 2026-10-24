import { Table, Td, Th, Thead } from "@/components/ui/table";
import { formatPeriod, formatValue } from "@/lib/analytics/format";
import type { Breakdown, Trend } from "@/lib/analytics/types";

// The table twin of every chart: the same figures, readable without a
// pointer or colour vision, and the place a value lives when its label
// wouldn't fit on the chart.

export function TrendTable({ trend }: { trend: Trend }) {
  const periods = trend.series[0]?.points.map((p) => p.period) ?? [];
  const showTotal = trend.stacked && trend.series.length > 1;
  return (
    <Table>
      <Thead>
        <tr>
          <Th>Month</Th>
          {trend.series.map((s) => (
            <Th key={s.key} align="right">
              {s.label}
            </Th>
          ))}
          {showTotal ? <Th align="right">Total</Th> : null}
        </tr>
      </Thead>
      <tbody>
        {periods.map((period, i) => {
          const values = trend.series.map((s) => s.points[i]?.value ?? null);
          const total = values.every((v) => v === null)
            ? null
            : values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
          return (
            <tr key={period}>
              <Td>{formatPeriod(period)}</Td>
              {values.map((v, si) => (
                <Td key={trend.series[si]!.key} align="right" className="tabular-nums">
                  {formatValue(v, trend.unit, trend.currency)}
                </Td>
              ))}
              {showTotal ? (
                <Td align="right" className="font-bold tabular-nums">
                  {formatValue(total, trend.unit, trend.currency)}
                </Td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export function BreakdownTable({ breakdown }: { breakdown: Breakdown }) {
  const hasCount = breakdown.rows.some((r) => r.count !== null);
  return (
    <Table>
      <Thead>
        <tr>
          <Th>Category</Th>
          <Th align="right">Value</Th>
          {hasCount ? <Th align="right">Count</Th> : null}
        </tr>
      </Thead>
      <tbody>
        {breakdown.rows.map((row) => (
          <tr key={row.key}>
            <Td>{row.label}</Td>
            <Td align="right" className="tabular-nums">
              {row.suppressed ? "Hidden (fewer than 3)" : formatValue(row.value, breakdown.unit, breakdown.currency)}
            </Td>
            {hasCount ? (
              <Td align="right" className="tabular-nums">
                {row.count?.toLocaleString("en-NG") ?? "—"}
              </Td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
