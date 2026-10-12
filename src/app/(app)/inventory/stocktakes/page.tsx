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
import { stocktakesApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canAdjustInventory, canManageInventory, statusLabel } from "@/lib/inventory";
import type { StocktakeStatus } from "@/lib/types";

const STATUSES: StocktakeStatus[] = [
  "draft",
  "counting",
  "pending_approval",
  "approved",
  "posted",
  "rejected",
  "cancelled",
];

export default function StocktakesPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StocktakeStatus | "">("");
  const stocktakes = useApiResource(() => stocktakesApi.list({ status }), [status]);

  return (
    <div>
      <PageHeader
        title="Stocktakes"
        subtitle="Physical counts compared with the books at a cutoff; only the differences are posted"
        action={
          canAdjustInventory(user?.role) && !stocktakes.error ? (
            <Link
              href="/inventory/stocktakes/new"
              className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
            >
              New Stocktake
            </Link>
          ) : undefined
        }
      />
      {stocktakes.error ? (
        <InventoryError message={stocktakes.error} canManage={canManageInventory(user?.role)} />
      ) : (
        <Card>
          <div className="mb-4 max-w-xs">
            <Label htmlFor="stocktake-status">Status</Label>
            <Select
              id="stocktake-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as StocktakeStatus | "")}
            >
              <option value="">All</option>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {statusLabel(option)}
                </option>
              ))}
            </Select>
          </div>
          {stocktakes.loading ? <LoadingState /> : null}
          {stocktakes.data && stocktakes.data.length === 0 ? <EmptyState label="No stocktakes yet." /> : null}
          {stocktakes.data && stocktakes.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Count date</Th>
                  <Th>Warehouse</Th>
                  <Th>Scope</Th>
                  <Th align="right">Counted</Th>
                  <Th align="right">Differences</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {stocktakes.data.map((take) => (
                  <tr key={take.id}>
                    <Td>
                      <Link href={`/inventory/stocktakes/${take.id}`} className="font-bold text-primary hover:underline">
                        {take.stocktake_number}
                      </Link>
                    </Td>
                    <Td>{formatDate(take.count_date)}</Td>
                    <Td>{take.warehouse_code}</Td>
                    <Td>{take.category_name ?? "All items"}</Td>
                    <Td align="right">
                      {take.status === "draft" ? "—" : `${take.counted_count} of ${take.line_count}`}
                    </Td>
                    <Td align="right">{take.status === "draft" ? "—" : take.variance_count}</Td>
                    <Td>
                      <StatusBadge status={take.status} />
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
