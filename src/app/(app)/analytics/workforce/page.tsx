"use client";

import { AnalyticsPage, ChartGrid } from "@/components/analytics/analytics-shell";
import { BreakdownCard, TrendCard } from "@/components/analytics/chart-card";
import { SectionBody } from "@/components/analytics/section-body";
import { analyticsApi } from "@/lib/analytics/api";
import { useApiResource } from "@/lib/hooks";

export default function WorkforceAnalyticsPage() {
  return (
    <AnalyticsPage
      section="workforce"
      title="Workforce Analytics"
      subtitle="Headcount, hiring, departures and the shape of the workforce"
      filters={["compare", "department", "location", "employment_type", "status"]}
      exportReport="workforce"
    >
      {({ query, compareLabel }) => <Workforce query={query} compareLabel={compareLabel} />}
    </AnalyticsPage>
  );
}

function Workforce({ query, compareLabel }: { query: string; compareLabel: string }) {
  const resource = useApiResource(() => analyticsApi.workforce(query), [query]);
  return (
    <SectionBody resource={resource} compareLabel={compareLabel} kpiCount={6}>
      {(data, refreshing) => (
        <ChartGrid>
          <TrendCard trend={data.headcount_trend} refreshing={refreshing} />
          <TrendCard
            trend={data.hires_vs_departures}
            kind="bar"
            colorOrder={["hires", "departures"]}
            refreshing={refreshing}
          />
          <TrendCard trend={data.turnover_trend} refreshing={refreshing} emptyLabel="No headcount in this period." />
          <BreakdownCard breakdown={data.by_department} allowOrientation refreshing={refreshing} />
          <BreakdownCard
            breakdown={data.by_status}
            kind="donut"
            colorOrder={["active", "suspended", "terminated"]}
            refreshing={refreshing}
          />
          <BreakdownCard
            breakdown={data.by_employment_type}
            kind="donut"
            colorOrder={["permanent", "fixed_term", "part_time", "intern", "consultant"]}
            refreshing={refreshing}
          />
          <BreakdownCard breakdown={data.by_location} allowOrientation refreshing={refreshing} />
          <BreakdownCard breakdown={data.by_job_title} refreshing={refreshing} />
          <BreakdownCard breakdown={data.tenure_bands} kind="columns" refreshing={refreshing} />
          <BreakdownCard breakdown={data.age_bands} kind="columns" refreshing={refreshing} />
        </ChartGrid>
      )}
    </SectionBody>
  );
}
