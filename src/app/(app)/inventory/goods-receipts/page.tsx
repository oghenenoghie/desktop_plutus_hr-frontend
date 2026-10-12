"use client";

import Link from "next/link";
import { useState } from "react";

import { InventoryError } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { goodsReceiptsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory, canOperateInventory, statusLabel } from "@/lib/inventory";
import type { GoodsReceiptStatus } from "@/lib/types";

const STATUSES: GoodsReceiptStatus[] = ["draft", "posted", "reversed"];

export default function GoodsReceiptsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GoodsReceiptStatus | "">("");
  const receipts = useApiResource(() => goodsReceiptsApi.list({ status }), [status]);

  return (
    <div>
      <PageHeader
        title="Goods Receipts"
        subtitle="Deliveries received against purchase orders; posting one puts the accepted goods into stock"
        action={
          canOperateInventory(user?.role) && !receipts.error ? (
            <Link
              href="/inventory/goods-receipts/new"
              className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
            >
              Receive Goods
            </Link>
          ) : undefined
        }
      />
      {receipts.error ? (
        <InventoryError message={receipts.error} canManage={canManageInventory(user?.role)} />
      ) : (
        <Card>
          <div className="mb-4 max-w-xs">
            <Label htmlFor="grn-status">Status</Label>
            <Select id="grn-status" value={status} onChange={(e) => setStatus(e.target.value as GoodsReceiptStatus | "")}>
              <option value="">All</option>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {statusLabel(option)}
                </option>
              ))}
            </Select>
          </div>
          {receipts.loading ? <LoadingState /> : null}
          {receipts.data && receipts.data.length === 0 ? <EmptyState label="No goods receipts yet." /> : null}
          {receipts.data && receipts.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Order</Th>
                  <Th>Vendor</Th>
                  <Th>Date</Th>
                  <Th>Warehouse</Th>
                  <Th align="right">Value</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {receipts.data.map((receipt) => (
                  <tr key={receipt.id}>
                    <Td>
                      <Link href={`/inventory/goods-receipts/${receipt.id}`} className="font-bold text-primary hover:underline">
                        {receipt.grn_number}
                      </Link>
                    </Td>
                    <Td>
                      <Link href={`/inventory/purchase-orders/${receipt.purchase_order_id}`} className="text-primary hover:underline">
                        {receipt.po_number}
                      </Link>
                    </Td>
                    <Td>{receipt.vendor_name}</Td>
                    <Td>{formatDate(receipt.receipt_date)}</Td>
                    <Td>{receipt.warehouse_code}</Td>
                    <Td align="right">{receipt.value_minor === null ? "—" : formatNaira(receipt.value_minor)}</Td>
                    <Td>
                      <StatusBadge status={receipt.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>
      )}
    </div>
  );
}
