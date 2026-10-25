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
import { purchaseOrdersApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory, canOperateInventory, statusLabel } from "@/lib/inventory";
import type { PurchaseOrderStatus } from "@/lib/types";

const STATUSES: PurchaseOrderStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "issued",
  "partially_received",
  "received",
  "closed",
  "cancelled",
  "rejected",
];

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PurchaseOrderStatus | "">("");
  const orders = useApiResource(() => purchaseOrdersApi.list({ status }), [status]);

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Orders to vendors: approved, issued, then received in one or more goods receipts"
        action={
          canOperateInventory(user?.role) && !orders.error ? (
            <Link
              href="/inventory/purchase-orders/new"
              className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
            >
              New Purchase Order
            </Link>
          ) : undefined
        }
      />
      {orders.error ? (
        <InventoryError message={orders.error} canManage={canManageInventory(user?.role)} />
      ) : (
        <Card>
          <div className="mb-4 max-w-xs">
            <Label htmlFor="po-status">Status</Label>
            <Select id="po-status" value={status} onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | "")}>
              <option value="">All</option>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {statusLabel(option)}
                </option>
              ))}
            </Select>
          </div>
          {orders.loading ? <LoadingState /> : null}
          {orders.data && orders.data.length === 0 ? <EmptyState label="No purchase orders yet." /> : null}
          {orders.data && orders.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Vendor</Th>
                  <Th>Ordered</Th>
                  <Th>Expected</Th>
                  <Th align="right">Lines</Th>
                  <Th align="right">Total</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {orders.data.map((order) => (
                  <tr key={order.id}>
                    <Td>
                      <Link href={`/inventory/purchase-orders/${order.id}`} className="font-bold text-primary hover:underline">
                        {order.po_number}
                      </Link>
                    </Td>
                    <Td>{order.vendor_name}</Td>
                    <Td>{formatDate(order.order_date)}</Td>
                    <Td>{formatDate(order.expected_date)}</Td>
                    <Td align="right">{order.line_count}</Td>
                    <Td align="right">{formatMoney(order.total_minor)}</Td>
                    <Td>
                      <StatusBadge status={order.status} />
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
