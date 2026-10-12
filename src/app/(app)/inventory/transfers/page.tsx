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
import { stockTransfersApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory, canOperateInventory, statusLabel } from "@/lib/inventory";
import type { StockTransferStatus } from "@/lib/types";

const STATUSES: StockTransferStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "in_transit",
  "received",
  "rejected",
  "cancelled",
];

export default function StockTransfersPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StockTransferStatus | "">("");
  const transfers = useApiResource(() => stockTransfersApi.list({ status }), [status]);

  return (
    <div>
      <PageHeader
        title="Stock Transfers"
        subtitle="Stock moved between warehouses: dispatched into transit, then received at the destination"
        action={
          canOperateInventory(user?.role) && !transfers.error ? (
            <Link
              href="/inventory/transfers/new"
              className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
            >
              New Transfer
            </Link>
          ) : undefined
        }
      />
      {transfers.error ? (
        <InventoryError message={transfers.error} canManage={canManageInventory(user?.role)} />
      ) : (
        <Card>
          <div className="mb-4 max-w-xs">
            <Label htmlFor="transfer-status">Status</Label>
            <Select id="transfer-status" value={status} onChange={(e) => setStatus(e.target.value as StockTransferStatus | "")}>
              <option value="">All</option>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {statusLabel(option)}
                </option>
              ))}
            </Select>
          </div>
          {transfers.loading ? <LoadingState /> : null}
          {transfers.data && transfers.data.length === 0 ? <EmptyState label="No transfers yet." /> : null}
          {transfers.data && transfers.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Date</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th align="right">Lines</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {transfers.data.map((transfer) => (
                  <tr key={transfer.id}>
                    <Td>
                      <Link href={`/inventory/transfers/${transfer.id}`} className="font-bold text-primary hover:underline">
                        {transfer.transfer_number}
                      </Link>
                    </Td>
                    <Td>{formatDate(transfer.transfer_date)}</Td>
                    <Td>{transfer.from_warehouse_code}</Td>
                    <Td>{transfer.to_warehouse_code}</Td>
                    <Td align="right">{transfer.line_count}</Td>
                    <Td>
                      <StatusBadge status={transfer.status} />
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
