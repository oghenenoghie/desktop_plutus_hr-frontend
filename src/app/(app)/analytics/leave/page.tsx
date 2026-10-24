"use client";

import { AnalyticsPage, ChartGrid } from "@/components/analytics/analytics-shell";
import { BreakdownCard, TrendCard } from "@/components/analytics/chart-card";
import { SectionBody } from "@/components/analytics/section-body";
import { analyticsApi } from "@/lib/analytics/api";
import { useApiResource } from "@/lib/hooks";

const LEAVE_TYPES = ["annual", "sick", "maternity", "paternity", "unpaid"];

export default function LeaveAnalyticsPage() {
  return (
    <AnalyticsPage
      section="leave"
      title="Leave Analytics"
      subtitle="Requests, approved days, utilisation and balances"
      filters={["compare", "department", "location", "employment_type", "status"]}
      exportReport="leave"
    >
      {({ query, compareLabel }) => <Leave query={query} compareLabel={compareLabel} />}
    </AnalyticsPage>
  );
}

function Leave({ query, compareLabel }: { query: string; compareLabel: string }) {
  const resource = useApiResource(() => analyticsApi.leave(query), [query]);
  return (
    <SectionBody resource={resource} compareLabel={compareLabel} kpiCount={5}>
      {(data, refreshing) => (
        <ChartGrid>
          <TrendCard
            trend={data.monthly_trend}
            kind="bar"
            colorOrder={LEAVE_TYPES}
            refreshing={refreshing}
            emptyLabel="No approved leave starts in this period."
          />
          <BreakdownCard
            breakdown={data.by_status}
            kind="donut"
            colorOrder={["pending", "approved", "rejected", "cancelled"]}
            refreshing={refreshing}
            emptyLabel="No leave requests start in this period."
          />
          <BreakdownCard breakdown={data.days_by_type} refreshing={refreshing} emptyLabel="No approved leave in this period." />
          <BreakdownCard breakdown={data.utilisation_by_department} allowOrientation refreshing={refreshing} />
          <BreakdownCard breakdown={data.balance_bands} kind="columns" refreshing={refreshing} />
        </ChartGrid>
      )}
    </SectionBody>
  );
}
