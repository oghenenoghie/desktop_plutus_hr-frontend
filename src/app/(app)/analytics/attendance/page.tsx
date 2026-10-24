"use client";

import { AnalyticsPage, ChartGrid } from "@/components/analytics/analytics-shell";
import { BreakdownCard, TrendCard } from "@/components/analytics/chart-card";
import { SectionBody } from "@/components/analytics/section-body";
import { analyticsApi } from "@/lib/analytics/api";
import { useApiResource } from "@/lib/hooks";

export default function AttendanceAnalyticsPage() {
  return (
    <AnalyticsPage
      section="attendance"
      title="Attendance Analytics"
      subtitle="Attendance, absence, punctuality and hours, measured against rostered shifts"
      filters={["compare", "department", "location", "employment_type", "status"]}
      exportReport="attendance"
    >
      {({ query, compareLabel }) => <Attendance query={query} compareLabel={compareLabel} />}
    </AnalyticsPage>
  );
}

const NO_ROSTER = "No rostered shifts in this period, so attendance can't be measured.";

function Attendance({ query, compareLabel }: { query: string; compareLabel: string }) {
  const resource = useApiResource(() => analyticsApi.attendance(query), [query]);
  return (
    <SectionBody resource={resource} compareLabel={compareLabel} kpiCount={6}>
      {(data, refreshing) => (
        <ChartGrid>
          <TrendCard
            trend={data.rate_trend}
            colorOrder={["attendance", "absence"]}
            refreshing={refreshing}
            emptyLabel={NO_ROSTER}
          />
          <TrendCard trend={data.late_trend} kind="bar" refreshing={refreshing} />
          <TrendCard trend={data.hours_trend} kind="bar" colorOrder={["scheduled", "actual"]} refreshing={refreshing} />
          <TrendCard trend={data.overtime_hours_trend} kind="bar" refreshing={refreshing} />
          <BreakdownCard
            breakdown={data.rate_by_department}
            allowOrientation
            refreshing={refreshing}
            emptyLabel={NO_ROSTER}
          />
          <BreakdownCard breakdown={data.rate_by_location} refreshing={refreshing} emptyLabel={NO_ROSTER} />
          <BreakdownCard breakdown={data.rate_by_weekday} kind="columns" refreshing={refreshing} emptyLabel={NO_ROSTER} />
        </ChartGrid>
      )}
    </SectionBody>
  );
}
