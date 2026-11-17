"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { VatReportView, monthTitle } from "@/components/accounting/vat-report-view";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { financialStatementsApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import { todayInLagos } from "@/lib/inventory";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function VatReportPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VatReportScreen />
    </Suspense>
  );
}

function VatReportScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const asked = useSearchParams().get("month") ?? "";
  const month = MONTH.test(asked) ? asked : todayInLagos().slice(0, 7);
  const report = useApiResource(() => financialStatementsApi.vatReport(month), [month]);
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      await financialStatementsApi.downloadVatReportPdf(month);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Download failed.", "bad");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="VAT Report"
        subtitle="Each month's VAT charged to customers, less VAT charged by vendors: what is owed to the tax authority or carried forward"
      />
      <Card>
        <CardHeader
          title={monthTitle(month)}
          subtitle="Output VAT on invoices sent, less credit notes, against input VAT on vendor bills approved"
          action={
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <Label htmlFor="vat-month">Month</Label>
                <Input
                  id="vat-month"
                  type="month"
                  value={month}
                  max={todayInLagos().slice(0, 7)}
                  onChange={(event) => {
                    if (MONTH.test(event.target.value)) router.replace(`/vat-report?month=${event.target.value}`);
                  }}
                />
              </div>
              <Link
                href={`/print/vat-report?month=${month}`}
                className="inline-flex items-center rounded-btn border border-border bg-surface px-[22px] py-[11px] text-[13px] font-extrabold text-ink hover:bg-bg"
              >
                Print
              </Link>
              <Button variant="secondary" onClick={downloadPdf} disabled={downloading}>
                {downloading ? "Downloading…" : "PDF"}
              </Button>
            </div>
          }
        />
        {report.loading ? <LoadingState /> : null}
        {report.error ? <ErrorState message={report.error} /> : null}
        {report.data && !report.loading ? <VatReportView report={report.data} variant="screen" /> : null}
      </Card>
    </div>
  );
}
