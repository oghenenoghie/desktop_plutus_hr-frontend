"use client";

import { AnalyticsPage, ChartGrid } from "@/components/analytics/analytics-shell";
import { BreakdownCard, TrendCard } from "@/components/analytics/chart-card";
import { BudgetTable, SectionBody } from "@/components/analytics/section-body";
import { analyticsApi } from "@/lib/analytics/api";
import { useApiResource } from "@/lib/hooks";

export default function FinancialAnalyticsPage() {
  return (
    <AnalyticsPage
      section="financial"
      title="Financial Analytics"
      subtitle="Revenue, expenses, payroll's share, cash movement and budgets, by accounting date"
      filters={["compare", "department", "country"]}
      exportReport="financial"
    >
      {({ query, compareLabel }) => <Financial query={query} compareLabel={compareLabel} />}
    </AnalyticsPage>
  );
}

const NO_LEDGER = "No ledger activity in this period.";

function Financial({ query, compareLabel }: { query: string; compareLabel: string }) {
  const resource = useApiResource(() => analyticsApi.financial(query), [query]);
  return (
    <SectionBody resource={resource} compareLabel={compareLabel} kpiCount={6}>
      {(data, refreshing) => (
        <div className="flex flex-col gap-4">
          <ChartGrid>
            <TrendCard
              trend={data.revenue_expense_trend}
              colorOrder={["revenue", "expenses"]}
              refreshing={refreshing}
              emptyLabel={NO_LEDGER}
            />
            <TrendCard trend={data.payroll_share_trend} refreshing={refreshing} emptyLabel="No expenses in this period." />
            <TrendCard
              trend={data.cash_movement_trend}
              kind="bar"
              refreshing={refreshing}
              emptyLabel="No money moved through the cash or bank accounts in this period."
            />
            <BreakdownCard
              breakdown={data.expenses_by_department}
              allowOrientation
              refreshing={refreshing}
              emptyLabel="No expenses in this period."
            />
            <BreakdownCard
              breakdown={data.expenses_by_account}
              refreshing={refreshing}
              emptyLabel="No expenses in this period."
            />
          </ChartGrid>
          <BudgetTable rows={data.budget_vs_actual} currency={data.meta.currency} />
        </div>
      )}
    </SectionBody>
  );
}
