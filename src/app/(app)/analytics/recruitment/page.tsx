"use client";

import { AnalyticsPage, ChartGrid } from "@/components/analytics/analytics-shell";
import { BreakdownCard, TrendCard } from "@/components/analytics/chart-card";
import { SectionBody } from "@/components/analytics/section-body";
import { analyticsApi } from "@/lib/analytics/api";
import { useApiResource } from "@/lib/hooks";

export default function RecruitmentAnalyticsPage() {
  return (
    <AnalyticsPage
      section="recruitment"
      title="Recruitment Analytics"
      subtitle="Vacancies, applications and where candidates stand today"
      filters={["compare", "department"]}
      exportReport="recruitment"
    >
      {({ query, compareLabel }) => <Recruitment query={query} compareLabel={compareLabel} />}
    </AnalyticsPage>
  );
}

function Recruitment({ query, compareLabel }: { query: string; compareLabel: string }) {
  const resource = useApiResource(() => analyticsApi.recruitment(query), [query]);
  return (
    <SectionBody resource={resource} compareLabel={compareLabel} kpiCount={5}>
      {(data, refreshing) => (
        <ChartGrid>
          <TrendCard
            trend={data.applications_trend}
            kind="bar"
            refreshing={refreshing}
            emptyLabel="No applications in this period."
          />
          <BreakdownCard
            breakdown={data.candidates_by_stage}
            refreshing={refreshing}
            emptyLabel="No candidates applied in this period."
          />
          <BreakdownCard
            breakdown={data.vacancies_by_department}
            refreshing={refreshing}
            emptyLabel="No job postings are open."
          />
        </ChartGrid>
      )}
    </SectionBody>
  );
}
