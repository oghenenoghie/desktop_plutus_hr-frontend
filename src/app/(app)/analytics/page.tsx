"use client";

import { AnalyticsPage, ChartGrid } from "@/components/analytics/analytics-shell";
import { BreakdownCard, TrendCard } from "@/components/analytics/chart-card";
import { DeadlinesTable, SectionBody } from "@/components/analytics/section-body";
import { analyticsApi } from "@/lib/analytics/api";
import { useApiResource } from "@/lib/hooks";

export default function AnalyticsOverviewPage() {
  return (
    <AnalyticsPage
      section="overview"
      title="Executive Overview"
      subtitle="Headline workforce, payroll, attendance, leave and compliance figures for the period"
      filters={["compare", "department", "location", "employment_type"]}
      exportReport="overview"
    >
      {({ query, compareLabel }) => <Overview query={query} compareLabel={compareLabel} />}
    </AnalyticsPage>
  );
}

function Overview({ query, compareLabel }: { query: string; compareLabel: string }) {
  const resource = useApiResource(() => analyticsApi.overview(query), [query]);
  return (
    <SectionBody resource={resource} compareLabel={compareLabel} kpiCount={8}>
      {(data, refreshing) => (
        <div className="flex flex-col gap-4">
          <ChartGrid>
            {data.headcount_trend ? <TrendCard trend={data.headcount_trend} refreshing={refreshing} /> : null}
            {data.payroll_cost_trend ? (
              <TrendCard
                trend={data.payroll_cost_trend}
                kind="bar"
                colorOrder={["gross", "employer_pension"]}
                refreshing={refreshing}
                emptyLabel="No locked pay runs in this period."
              />
            ) : null}
            {data.headcount_by_department ? (
              <BreakdownCard breakdown={data.headcount_by_department} allowOrientation refreshing={refreshing} />
            ) : null}
            {data.deadlines ? <DeadlinesTable deadlines={data.deadlines} currency={data.meta.currency} /> : null}
          </ChartGrid>
        </div>
      )}
    </SectionBody>
  );
}
