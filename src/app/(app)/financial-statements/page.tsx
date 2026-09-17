"use client";

import { useState } from "react";

import { EmailPdfDrawer } from "@/components/email-pdf-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { financialStatementsApi } from "@/lib/api/endpoints";
import { formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

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
          title="Income Statement"
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
          <Table>
            <Thead>
              <tr>
                <Th>Account</Th>
                <Th align="right">Amount</Th>
              </tr>
            </Thead>
            <tbody>
              <tr>
                <Td className="font-extrabold uppercase tracking-[0.03em] text-ink-soft">
                  Revenue
                </Td>
                <Td>{null}</Td>
              </tr>
              {incomeStatement.data.revenue.map((line) => (
                <tr key={line.account}>
                  <Td>{line.account_name}</Td>
                  <Td align="right">{formatNaira(line.balance_minor)}</Td>
                </tr>
              ))}
              <tr>
                <Td className="font-bold">Total Revenue</Td>
                <Td align="right" className="font-bold">
                  {formatNaira(incomeStatement.data.total_revenue_minor)}
                </Td>
              </tr>
              <tr>
                <Td className="pt-5 font-extrabold uppercase tracking-[0.03em] text-ink-soft">
                  Expenses
                </Td>
                <Td className="pt-5">{null}</Td>
              </tr>
              {incomeStatement.data.expenses.map((line) => (
                <tr key={line.account}>
                  <Td>{line.account_name}</Td>
                  <Td align="right">{formatNaira(line.balance_minor)}</Td>
                </tr>
              ))}
              <tr>
                <Td className="font-bold">Total Expenses</Td>
                <Td align="right" className="font-bold">
                  {formatNaira(incomeStatement.data.total_expenses_minor)}
                </Td>
              </tr>
              <tr>
                <Td className="pt-5 text-[14px] font-extrabold">Net Income</Td>
                <Td align="right" className="pt-5 text-[14px] font-extrabold">
                  {formatNaira(incomeStatement.data.net_income_minor)}
                </Td>
              </tr>
            </tbody>
          </Table>
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
