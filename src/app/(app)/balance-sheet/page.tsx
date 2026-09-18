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

export default function BalanceSheetPage() {
  const { showToast } = useToast();
  const [asOf, setAsOf] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const balanceSheet = useApiResource(
    () => financialStatementsApi.balanceSheet(asOf || undefined),
    [asOf],
  );

  async function downloadPdf() {
    setDownloading(true);
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
      setDownloading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Balance Sheet"
        subtitle="Assets, liabilities and equity as of a point in time, computed live from the general ledger"
      />

      <Card>
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
              <Button variant="secondary" onClick={downloadPdf} disabled={downloading}>
                {downloading ? "Downloading…" : "PDF"}
              </Button>
              <Button variant="secondary" onClick={() => setEmailing(true)}>
                Email
              </Button>
            </div>
          }
        />
        {balanceSheet.loading ? <LoadingState /> : null}
        {balanceSheet.error ? <ErrorState message={balanceSheet.error} /> : null}
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
                    <Td className="font-bold">Total Liabilities &amp; Equity</Td>
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

      {emailing ? (
        <EmailPdfDrawer
          title="Email Balance Sheet"
          description="No default recipient exists for an internal financial statement — enter the address to send it to."
          onClose={() => setEmailing(false)}
          onSend={(to) => financialStatementsApi.emailBalanceSheet(to, asOf || undefined)}
        />
      ) : null}
    </div>
  );
}
