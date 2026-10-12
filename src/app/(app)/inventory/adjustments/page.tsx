"use client";

import Link from "next/link";
import { useState } from "react";

import { InventoryError, MoneyOrHidden } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { inventoryApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { REASON_LABELS, canAdjustInventory, canManageInventory } from "@/lib/inventory";
import type { InventoryAdjustmentStatus } from "@/lib/types";

export default function StockAdjustmentsPage() {
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);
  const canAdjust = canAdjustInventory(user?.role);
  const [status, setStatus] = useState<InventoryAdjustmentStatus | "">("");
  const [warehouseId, setWarehouseId] = useState("");

  const adjustments = useApiResource(
    () => inventoryApi.adjustments({ status, warehouseId }),
    [status, warehouseId],
  );
  const warehouses = useApiResource(() => inventoryApi.warehouses(true));
  const showValues = (adjustments.data ?? []).some((adjustment) => adjustment.value_minor !== null);

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        subtitle="Opening balances, stock found, damage, expiry, losses, write-offs and corrections"
        action={
          canAdjust && !adjustments.error ? (
            <Link
              href="/inventory/adjustments/new"
              className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
            >
              New Adjustment
            </Link>
          ) : undefined
        }
      />

      {adjustments.error ? (
        <InventoryError message={adjustments.error} canManage={canManage} />
      ) : (
        <Card>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="adj-status">Status</Label>
              <Select
                id="adj-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as InventoryAdjustmentStatus | "")}
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="posted">Posted</option>
                <option value="reversed">Reversed</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="adj-warehouse-filter">Warehouse</Label>
              <Select
                id="adj-warehouse-filter"
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
              >
                <option value="">All warehouses</option>
                {(warehouses.data ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {adjustments.loading ? <LoadingState /> : null}
          {adjustments.data && adjustments.data.length === 0 ? (
            <EmptyState label="No adjustments yet." />
          ) : null}
          {adjustments.data && adjustments.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Date</Th>
                  <Th>Warehouse</Th>
                  <Th>Reason</Th>
                  <Th align="right">Lines</Th>
                  {showValues ? <Th align="right">Value</Th> : null}
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {adjustments.data.map((adjustment) => (
                  <tr key={adjustment.id}>
                    <Td>
                      <Link
                        href={`/inventory/adjustments/${adjustment.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {adjustment.adjustment_number}
                      </Link>
                    </Td>
                    <Td>{formatDate(adjustment.adjustment_date)}</Td>
                    <Td>{adjustment.warehouse_code}</Td>
                    <Td>{REASON_LABELS[adjustment.reason]}</Td>
                    <Td align="right">{adjustment.line_count}</Td>
                    {showValues ? (
                      <Td align="right">
                        <MoneyOrHidden minor={adjustment.value_minor} />
                      </Td>
                    ) : null}
                    <Td>
                      <StatusBadge status={adjustment.status} />
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
