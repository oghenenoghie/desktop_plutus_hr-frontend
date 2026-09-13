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
  const [asOf, setAsOf] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [downloadingBalanceSheet, setDownloadingBalanceSheet] = useState(false);
  const [downloadingIncomeStatement, setDownloadingIncomeStatement] =
    useState(false);
  const [emailingBalanceSheet, setEmailingBalanceSheet] = useState(false);
  const [emailingIncomeStatement, setEmailingIncomeStatement] = useState(false);

  const balanceSheet = useApiResource(
    () => financialStatementsApi.balanceSheet(asOf || undefined),
    [asOf],
  );
  const incomeStatement = useApiResource(
    () =>
      financialStatementsApi.incomeStatement({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    [fromDate, toDate],
  );

  async function downloadBalanceSheetPdf() {
    setDownloadingBalanceSheet(true);
    try {
      await financialStatementsApi.downloadBalanceSheetPdf(
        asOf || undefined,
        "balance-sheet.pdf",
      );
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Download failed.",
        "bad",
      );
    } finally {
      setDownloadingBalanceSheet(false);
    }
  }

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
        title="Financial Statements"
        subtitle="Balance Sheet and Income Statement, computed live from the general ledger"
      />

      <Card className="mb-6">
        <CardHeader
          title="Balance Sheet"
          subtitle="A snapshot as of a point in time. No equity account or period-end closing exists yet, so assets will not equal liabilities + equity."
          action={
            <div className="flex items-end gap-3">
              <div className="w-44">
                <Label htmlFor="asOf">As Of</Label>
                <Input
                  id="asOf"
                  type="date"
                  value={asOf}
                  onChange={(event) => setAsOf(event.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                onClick={downloadBalanceSheetPdf}
                disabled={downloadingBalanceSheet}
              >
                {downloadingBalanceSheet ? "Downloading…" : "PDF"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEmailingBalanceSheet(true)}
              >
                Email
              </Button>
            </div>
          }
        />
        {balanceSheet.loading ? <LoadingState /> : null}
        {balanceSheet.error ? (
          <ErrorState message={balanceSheet.error} />
        ) : null}
        {balanceSheet.data ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.03em] text-ink-soft">
                Assets
              </h3>
              <Table>
                <Thead>
                  <tr>
                    <Th>Account</Th>
                    <Th align="right">Balance</Th>
                  </tr>
                </Thead>
                <tbody>
                  {balanceSheet.data.assets.map((line) => (
                    <tr key={line.account}>
                      <Td>{line.account_name}</Td>
                      <Td align="right">{formatNaira(line.balance_minor)}</Td>
                    </tr>
                  ))}
                  <tr>
                    <Td className="font-bold">Total Assets</Td>
                    <Td align="right" className="font-bold">
                      {formatNaira(balanceSheet.data.total_assets_minor)}
                    </Td>
                  </tr>
                </tbody>
              </Table>
            </div>
            <div>
              <h3 className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.03em] text-ink-soft">
                Liabilities &amp; Equity
              </h3>
              <Table>
                <Thead>
                  <tr>
                    <Th>Account</Th>
                    <Th align="right">Balance</Th>
                  </tr>
                </Thead>
                <tbody>
                  {balanceSheet.data.liabilities.map((line) => (
                    <tr key={line.account}>
                      <Td>{line.account_name}</Td>
                      <Td align="right">{formatNaira(line.balance_minor)}</Td>
                    </tr>
                  ))}
                  {balanceSheet.data.equity.map((line) => (
                    <tr key={line.account}>
                      <Td>{line.account_name}</Td>
                      <Td align="right">{formatNaira(line.balance_minor)}</Td>
                    </tr>
                  ))}
                  {balanceSheet.data.equity.length === 0 ? (
                    <tr>
                      <Td className="text-ink-soft">No equity accounts</Td>
                      <Td align="right">—</Td>
                    </tr>
                  ) : null}
                  <tr>
                    <Td className="font-bold">
                      Total Liabilities &amp; Equity
                    </Td>
                    <Td align="right" className="font-bold">
                      {formatNaira(
                        balanceSheet.data.total_liabilities_minor +
                          balanceSheet.data.total_equity_minor,
                      )}
                    </Td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>
        ) : null}
      </Card>

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

      {emailingBalanceSheet ? (
        <EmailPdfDrawer
          title="Email Balance Sheet"
          description="No default recipient exists for an internal financial statement — enter the address to send it to."
          onClose={() => setEmailingBalanceSheet(false)}
          onSend={(to) =>
            financialStatementsApi.emailBalanceSheet(to, asOf || undefined)
          }
        />
      ) : null}

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
