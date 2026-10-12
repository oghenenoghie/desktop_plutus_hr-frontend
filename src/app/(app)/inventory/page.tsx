"use client";

import Link from "next/link";

import { MovementsTable, InventoryError, InventoryOffNotice } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/data-state";
import { KpiTile } from "@/components/ui/kpi-tile";
import { inventoryApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canAdjustInventory, canManageInventory } from "@/lib/inventory";

export default function InventoryOverviewPage() {
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);
  const canAdjust = canAdjustInventory(user?.role);
  const summary = useApiResource(() => inventoryApi.summary());

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock on hand, its value and every stock movement, across all warehouses"
        action={
          canAdjust && summary.data?.enabled ? (
            <Link
              href="/inventory/adjustments/new"
              className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
            >
              New Adjustment
            </Link>
          ) : undefined
        }
      />

      {summary.loading ? <LoadingState /> : null}
      {summary.error ? <InventoryError message={summary.error} canManage={canManage} /> : null}
      {summary.data && !summary.data.enabled ? <InventoryOffNotice canManage={canManage} /> : null}

      {summary.data && summary.data.enabled ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <KpiTile label="Tracked items" value={String(summary.data.tracked_items)} />
            <KpiTile
              label="Stock value"
              value={
                summary.data.total_value_minor === null
                  ? "Hidden"
                  : formatNaira(summary.data.total_value_minor)
              }
              caption="At weighted-average cost"
            />
            <KpiTile
              label="Low stock"
              value={String(summary.data.low_stock)}
              caption="At or below reorder level"
            />
            <KpiTile label="Out of stock" value={String(summary.data.out_of_stock)} />
            <KpiTile label="Warehouses" value={String(summary.data.active_warehouses)} />
            <KpiTile
              label="Draft adjustments"
              value={String(summary.data.draft_adjustments)}
              caption="Not yet posted"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiTile
              label="Awaiting approval"
              value={String(summary.data.pending_approvals)}
              caption="Orders, issues, transfers and adjustments"
            />
            <KpiTile
              label="Open purchase orders"
              value={String(summary.data.open_purchase_orders)}
              caption="Issued, not yet fully received"
            />
            <KpiTile
              label="Transfers in transit"
              value={String(summary.data.transfers_in_transit)}
              caption="Dispatched, not yet received"
            />
          </div>

          <Card>
            <CardHeader
              title="Recent stock movements"
              subtitle="The latest entries in the stock ledger"
              action={
                <Link href="/inventory/movements" className="text-[13px] font-bold text-primary hover:underline">
                  View all
                </Link>
              }
            />
            <MovementsTable movements={summary.data.recent_movements} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
