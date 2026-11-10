"use client";

import { useState } from "react";

import { type StatementRow, StatementTable, numbered, sectionRows } from "@/components/accounting/statement-table";
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
import type { BalanceSheet, StatementLine } from "@/lib/types";

// Fixed assets at cost, less their accumulated depreciation (a contra-asset
// carried with a credit, i.e. negative, balance), then net book value — the
// same grouping as the PDF. Without both accounts the lines stand as they are.
function fixedAssetRows(lines: StatementLine[]): StatementRow[] {
  const cost = lines.find((line) => line.account === "fixed_assets");
  const depreciation = lines.find((line) => line.account === "accumulated_depreciation");
  return lines.flatMap((line): StatementRow[] => {
    if (cost && depreciation && line === depreciation) return [];
    if (!cost || !depreciation || line !== cost) {
      return [{ key: line.account, label: numbered(line), figure: line.balance_minor, kind: "line" }];
    }
    return [
      { key: "fixed_assets", label: `${numbered(cost)} at cost`, figure: cost.balance_minor, kind: "line" },
      {
        key: "accumulated_depreciation",
        label: `Less: ${numbered(depreciation)}`,
        figure: depreciation.balance_minor,
        kind: "less",
      },
      {
        key: "fixed_assets_net",
        label: "Net book value",
        figure: cost.balance_minor + depreciation.balance_minor,
        kind: "total",
      },
    ];
  });
}

// The vertical form, top to bottom, as the PDF prints it.
function sheetRows(sheet: BalanceSheet): StatementRow[] {
  return [
    ...sectionRows(sheet.non_current_assets, "Total fixed assets", {
      lines: fixedAssetRows(sheet.non_current_assets.lines),
    }),
    ...sectionRows(sheet.current_assets, "Total current assets"),
    ...sectionRows(sheet.current_liabilities, "Total current liabilities", { less: true }),
    { key: "net-current-assets", label: "Net current assets", figure: sheet.net_current_assets_minor, kind: "result" },
    {
      key: "assets-less-current-liabilities",
      label: "Total assets less current liabilities",
      figure: sheet.total_assets_less_current_liabilities_minor,
      kind: "result",
    },
    ...(sheet.non_current_liabilities.lines.length > 0
      ? sectionRows(sheet.non_current_liabilities, "Total non-current liabilities", { less: true })
      : []),
    { key: "net-assets", label: "Net assets", figure: sheet.net_assets_minor, kind: "grand" },
    ...sectionRows(sheet.capital_and_reserves, "Total capital and reserves").map((row): StatementRow =>
      row.kind === "total" ? { ...row, kind: "grand" } : row,
    ),
  ];
}

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
        subtitle="As at a date, computed live from the general ledger"
      />

      <Card>
        <CardHeader
          title="Balance Sheet"
          subtitle="Fixed assets, current assets and current liabilities, then capital and reserves. The Profit and Loss Reserve carries the result to date, so net assets always equal capital and reserves."
          action={
            <div className="flex items-end gap-3">
              <div className="w-44">
                <Label htmlFor="asOf">As At</Label>
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
          <div className="mx-auto max-w-[760px]">
            {!balanceSheet.data.balanced ? (
              <p className="mb-4 rounded-md bg-bad-tint px-3 py-2 text-[12px] text-bad-ink">
                Net assets and capital and reserves differ, which means the ledger holds an unbalanced entry.
              </p>
            ) : null}
            {balanceSheet.data.unclassified_accounts.length > 0 ? (
              <p className="mb-4 rounded-md bg-warn-tint px-3 py-2 text-[12px] text-warn-ink">
                Postings to accounts not in the chart of accounts ({balanceSheet.data.unclassified_accounts.join(", ")})
                are shown as one line. Add them to the chart to report them in their place.
              </p>
            ) : null}
            <StatementTable rows={sheetRows(balanceSheet.data)} />
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
