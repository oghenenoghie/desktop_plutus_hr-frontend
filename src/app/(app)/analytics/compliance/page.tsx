"use client";

import { AnalyticsPage, ChartGrid } from "@/components/analytics/analytics-shell";
import { BreakdownCard, TrendCard } from "@/components/analytics/chart-card";
import { DeadlinesTable, SectionBody } from "@/components/analytics/section-body";
import { analyticsApi } from "@/lib/analytics/api";
import { useApiResource } from "@/lib/hooks";

export default function ComplianceAnalyticsPage() {
  return (
    <AnalyticsPage
      section="compliance"
      title="Tax & Compliance Analytics"
      subtitle="Statutory obligations by category and status, deadlines, and VAT reported separately"
      filters={["compare", "country"]}
      exportReport="compliance"
    >
      {({ query, compareLabel }) => <Compliance query={query} compareLabel={compareLabel} />}
    </AnalyticsPage>
  );
}

function Compliance({ query, compareLabel }: { query: string; compareLabel: string }) {
  const resource = useApiResource(() => analyticsApi.compliance(query), [query]);
  return (
    <SectionBody resource={resource} compareLabel={compareLabel} kpiCount={7}>
      {(data, refreshing) => (
        <div className="flex flex-col gap-4">
          <p className="text-[12.5px] text-ink-soft">
            Jurisdiction: <span className="font-bold text-ink">{data.country_name}</span>
          </p>
          <ChartGrid>
            <TrendCard
              trend={data.obligations_trend}
              kind="bar"
              colorOrder={["paye", "pension", "nhf", "nsitf", "itf", "wht"]}
              refreshing={refreshing}
              emptyLabel="No statutory liabilities for periods ending in this range."
            />
            <BreakdownCard
              breakdown={data.obligations_by_category}
              refreshing={refreshing}
              emptyLabel="No statutory liabilities for periods ending in this range."
            />
            <BreakdownCard
              breakdown={data.obligations_by_status}
              kind="donut"
              colorOrder={["pending", "filed", "remitted"]}
              refreshing={refreshing}
            />
            <TrendCard
              trend={data.input_vat_trend}
              kind="bar"
              refreshing={refreshing}
              emptyLabel="No VAT on approved bills in this period."
            />
          </ChartGrid>
          <DeadlinesTable deadlines={data.deadlines} currency={data.meta.currency} />
        </div>
      )}
    </SectionBody>
  );
}
