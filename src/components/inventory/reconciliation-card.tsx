"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { inventoryApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

// Inventory against the general ledger (Phase 3): stock value against the
// inventory account, and unbilled receipts against goods received not
// invoiced. Both differences are zero while every stock change has posted
// its journal; anything else needs looking into.
export function ReconciliationCard() {
  const report = useApiResource(() => inventoryApi.reconciliation());
  const data = report.data;

  return (
    <Card>
      <CardHeader
        title="Ledger reconciliation"
        subtitle="The stock ledger against the general ledger"
        action={
          data && data.post_to_gl ? (
            <Badge
              tone={
                data.inventory_difference_minor === 0 && data.grni_difference_minor === 0 ? "good" : "bad"
              }
            >
              {data.inventory_difference_minor === 0 && data.grni_difference_minor === 0
                ? "Reconciled"
                : "Difference"}
            </Badge>
          ) : undefined
        }
      />
      {report.loading && !data ? <LoadingState /> : null}
      {report.error ? <ErrorState message={report.error} /> : null}
      {data && !data.post_to_gl ? (
        <p className="text-[13px] text-ink-soft">
          Inventory isn&apos;t posting to the ledger yet.{" "}
          <Link href="/inventory/settings" className="font-bold text-primary hover:underline">
            Start inventory accounting
          </Link>{" "}
          to bring your stock onto the books.
        </p>
      ) : null}
      {data && data.post_to_gl ? (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>Measure</Th>
                <Th align="right">Stock ledger</Th>
                <Th align="right">General ledger</Th>
                <Th align="right">Difference</Th>
              </tr>
            </Thead>
            <tbody>
              <tr>
                <Td>
                  <div className="font-bold">Inventory value</div>
                  <div className="text-[11px] text-ink-soft">Stock on hand and in transit, at average cost</div>
                </Td>
                <Td align="right">{formatMoney(data.stock_value_minor)}</Td>
                <Td align="right">{formatMoney(data.gl_inventory_minor)}</Td>
                <Td align="right">
                  <span className={data.inventory_difference_minor ? "font-bold text-bad" : ""}>
                    {formatMoney(data.inventory_difference_minor)}
                  </span>
                </Td>
              </tr>
              <tr>
                <Td>
                  <div className="font-bold">Goods received, not invoiced</div>
                  <div className="text-[11px] text-ink-soft">
                    {data.unbilled_receipts} receipt{data.unbilled_receipts === 1 ? "" : "s"} awaiting a vendor bill
                  </div>
                </Td>
                <Td align="right">{formatMoney(data.unbilled_receipts_minor)}</Td>
                <Td align="right">{formatMoney(data.gl_grni_minor)}</Td>
                <Td align="right">
                  <span className={data.grni_difference_minor ? "font-bold text-bad" : ""}>
                    {formatMoney(data.grni_difference_minor)}
                  </span>
                </Td>
              </tr>
            </tbody>
          </Table>
          <p className="mt-3 text-[12px] text-ink-soft">
            {data.lock_date
              ? `The books are locked up to ${formatDate(data.lock_date)}: nothing can be posted on or before it.`
              : "No accounting lock date is set."}{" "}
            <Link href="/accounting-settings" className="font-bold text-primary hover:underline">
              Accounting settings
            </Link>
          </p>
        </>
      ) : null}
    </Card>
  );
}
