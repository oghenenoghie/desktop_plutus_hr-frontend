"use client";

import { AnalyticsPage, ChartGrid } from "@/components/analytics/analytics-shell";
import { BreakdownCard, TrendCard } from "@/components/analytics/chart-card";
import { SectionBody } from "@/components/analytics/section-body";
import { analyticsApi } from "@/lib/analytics/api";
import { useApiResource } from "@/lib/hooks";

export default function PayrollAnalyticsPage() {
  return (
    <AnalyticsPage
      section="payroll"
      title="Payroll Analytics"
      subtitle="Payroll cost, pay, deductions and employer contributions from completed pay runs"
      filters={["compare", "department", "location", "employment_type", "status", "payroll_status", "country"]}
      exportReport="payroll"
    >
      {({ query, compareLabel }) => <Payroll query={query} compareLabel={compareLabel} />}
    </AnalyticsPage>
  );
}

const NO_RUNS = "No pay runs in this period with the selected status.";

function Payroll({ query, compareLabel }: { query: string; compareLabel: string }) {
  const resource = useApiResource(() => analyticsApi.payroll(query), [query]);
  return (
    <SectionBody resource={resource} compareLabel={compareLabel} kpiCount={8}>
      {(data, refreshing) => (
        <ChartGrid>
          <TrendCard
            trend={data.cost_trend}
            kind="bar"
            colorOrder={["gross", "employer_pension"]}
            refreshing={refreshing}
            emptyLabel={NO_RUNS}
          />
          <TrendCard
            trend={data.gross_net_trend}
            colorOrder={["gross", "net"]}
            refreshing={refreshing}
            emptyLabel={NO_RUNS}
          />
          <TrendCard
            trend={data.deduction_trend}
            kind="bar"
            colorOrder={["paye", "employee_pension", "nhf", "other_deductions"]}
            refreshing={refreshing}
            emptyLabel={NO_RUNS}
          />
          <TrendCard trend={data.employer_contribution_trend} kind="bar" refreshing={refreshing} emptyLabel={NO_RUNS} />
          <TrendCard trend={data.overtime_trend} kind="bar" refreshing={refreshing} emptyLabel={NO_RUNS} />
          <BreakdownCard
            breakdown={data.runs_by_status}
            kind="donut"
            colorOrder={["draft", "validated", "locked", "reversed"]}
            refreshing={refreshing}
            emptyLabel="No pay runs end in this period."
          />
          <BreakdownCard breakdown={data.cost_by_department} allowOrientation refreshing={refreshing} emptyLabel={NO_RUNS} />
          <BreakdownCard breakdown={data.average_gross_by_department} refreshing={refreshing} emptyLabel={NO_RUNS} />
          <BreakdownCard breakdown={data.cost_by_employment_type} refreshing={refreshing} emptyLabel={NO_RUNS} />
        </ChartGrid>
      )}
    </SectionBody>
  );
}
