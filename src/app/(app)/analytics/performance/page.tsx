"use client";

import { AnalyticsPage, ChartGrid } from "@/components/analytics/analytics-shell";
import { BreakdownCard, TrendCard } from "@/components/analytics/chart-card";
import { SectionBody } from "@/components/analytics/section-body";
import { analyticsApi } from "@/lib/analytics/api";
import { useApiResource } from "@/lib/hooks";

export default function PerformanceAnalyticsPage() {
  return (
    <AnalyticsPage
      section="performance"
      title="Performance Analytics"
      subtitle="Review completion, ratings as recorded, and training completion"
      filters={["compare", "department", "location", "employment_type", "status"]}
      exportReport="performance"
    >
      {({ query, compareLabel }) => <Performance query={query} compareLabel={compareLabel} />}
    </AnalyticsPage>
  );
}

function Performance({ query, compareLabel }: { query: string; compareLabel: string }) {
  const resource = useApiResource(() => analyticsApi.performance(query), [query]);
  return (
    <SectionBody resource={resource} compareLabel={compareLabel} kpiCount={5}>
      {(data, refreshing) => (
        <ChartGrid>
          <TrendCard
            trend={data.completion_trend}
            refreshing={refreshing}
            emptyLabel="No reviews end in this period."
          />
          <BreakdownCard
            breakdown={data.reviews_by_status}
            kind="donut"
            colorOrder={["draft", "submitted", "acknowledged"]}
            refreshing={refreshing}
            emptyLabel="No reviews end in this period."
          />
          <BreakdownCard
            breakdown={data.rating_distribution}
            kind="columns"
            refreshing={refreshing}
            emptyLabel="No completed review carries a rating."
          />
          <BreakdownCard
            breakdown={data.rating_by_department}
            refreshing={refreshing}
            emptyLabel="No completed review carries a rating."
          />
          <BreakdownCard
            breakdown={data.training_by_status}
            kind="donut"
            colorOrder={["enrolled", "in_progress", "completed", "failed"]}
            refreshing={refreshing}
            emptyLabel="No training enrolments in this period."
          />
        </ChartGrid>
      )}
    </SectionBody>
  );
}
