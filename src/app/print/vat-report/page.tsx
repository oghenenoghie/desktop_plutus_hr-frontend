"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { VatReportView, monthTitle } from "@/components/accounting/vat-report-view";
import { PrintPage } from "@/components/print/print-page";
import { LoadingState } from "@/components/ui/data-state";
import { financialStatementsApi, organisationApi } from "@/lib/api/endpoints";
import { formatDate, formatDateTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { todayInLagos } from "@/lib/inventory";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function PrintVatReportPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PrintVatReport />
    </Suspense>
  );
}

// The month's VAT report laid out to print and file.
function PrintVatReport() {
  const asked = useSearchParams().get("month") ?? "";
  const month = MONTH.test(asked) ? asked : todayInLagos().slice(0, 7);
  const report = useApiResource(() => financialStatementsApi.vatReport(month), [month]);
  const organisation = useApiResource(() => organisationApi.get());
  const data = report.data;

  return (
    <PrintPage
      title="VAT Report"
      subtitle={
        data
          ? `${monthTitle(month)} · ${formatDate(data.period_start)} to ${formatDate(data.period_end)}`
          : monthTitle(month)
      }
      aside={
        <>
          {organisation.data?.company_tin ? <p>Tax ID: {organisation.data.company_tin}</p> : null}
          {data ? <p className="text-ink-soft">Generated {formatDateTime(data.generated_at)}</p> : null}
        </>
      }
      allow={["admin", "payroll_manager", "accountant", "auditor"]}
      loading={report.loading || organisation.loading}
      error={report.error ?? organisation.error}
      ready={Boolean(data && organisation.data)}
    >
      {data ? <VatReportView report={data} variant="print" /> : null}
    </PrintPage>
  );
}
