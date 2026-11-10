"use client";

import { useState } from "react";

import { type StatementRow, StatementTable, sectionRows } from "@/components/accounting/statement-table";
import { EmailPdfDrawer } from "@/components/email-pdf-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { financialStatementsApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { IncomeStatement } from "@/lib/types";

// Sales less cost of sales is gross profit; plus other income, less
// overheads, is net profit — the same layout as the PDF.
function profitRows(statement: IncomeStatement): StatementRow[] {
  return [
    ...sectionRows(statement.sales, "Total sales"),
    ...sectionRows(statement.cost_of_sales, "Total cost of sales", { less: true }),
    { key: "gross-profit", label: "Gross profit", figure: statement.gross_profit_minor, kind: "result" },
    ...(statement.other_income.lines.length > 0 ? sectionRows(statement.other_income, "Total other income") : []),
    ...sectionRows(statement.overheads, "Total overheads", { less: true }),
    {
      key: "net-profit",
      label: statement.net_income_minor >= 0 ? "Net profit" : "Net loss",
      figure: statement.net_income_minor,
      kind: "grand",
    },
  ];
}

export default function FinancialStatementsPage() {
  const { showToast } = useToast();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [downloadingIncomeStatement, setDownloadingIncomeStatement] =
    useState(false);
  const [emailingIncomeStatement, setEmailingIncomeStatement] = useState(false);

  const incomeStatement = useApiResource(
    () =>
      financialStatementsApi.incomeStatement({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    [fromDate, toDate],
  );

  async function downloadIncomeStatementPdf() {
    setDownloadingIncomeStatement(true);
    try {
      await financialStatementsApi.downloadIncomeStatementPdf(
        { fromDate: fromDate || undefined, toDate: toDate || undefined },
        "income-statement.pdf",
      );
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Download failed.",
        "bad",
      );
    } finally {
      setDownloadingIncomeStatement(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Profit and Loss Account"
        subtitle="Income Statement, computed live from the general ledger"
      />

      <Card>
        <CardHeader
          title="Profit and Loss Account"
          subtitle="Sales, less cost of sales, is gross profit; less overheads, net profit. The account ranges set where each account appears."
          action={
            <div className="flex items-end gap-3">
              <div className="w-40">
                <Label htmlFor="fromDate">From</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </div>
              <div className="w-40">
                <Label htmlFor="toDate">To</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                onClick={downloadIncomeStatementPdf}
                disabled={downloadingIncomeStatement}
              >
                {downloadingIncomeStatement ? "Downloading…" : "PDF"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEmailingIncomeStatement(true)}
              >
                Email
              </Button>
            </div>
          }
        />
        {incomeStatement.loading ? <LoadingState /> : null}
        {incomeStatement.error ? (
          <ErrorState message={incomeStatement.error} />
        ) : null}
        {incomeStatement.data ? (
          <div className="mx-auto max-w-[760px]">
            <StatementTable rows={profitRows(incomeStatement.data)} />
          </div>
        ) : null}
      </Card>

      {emailingIncomeStatement ? (
        <EmailPdfDrawer
          title="Email Income Statement"
          description="No default recipient exists for an internal financial statement — enter the address to send it to."
          onClose={() => setEmailingIncomeStatement(false)}
          onSend={(to) =>
            financialStatementsApi.emailIncomeStatement(to, {
              fromDate: fromDate || undefined,
              toDate: toDate || undefined,
            })
          }
        />
      ) : null}
    </div>
  );
}
