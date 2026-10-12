"use client";

import Link from "next/link";

import { InventoryError } from "@/components/inventory/inventory-ui";
import { ExportButtons } from "@/components/inventory/report-ui";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { inventoryReportsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory, canOperateInventory, formatQuantity } from "@/lib/inventory";

export default function ReorderPage() {
  const { user } = useAuth();
  const suggestions = useApiResource(() => inventoryReportsApi.reorder());
  const rows = suggestions.data ?? [];
  const showValues = rows.some((row) => row.last_unit_cost_minor !== null);
  const total = rows.reduce((sum, row) => sum + (row.estimated_cost_minor ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Reorder"
        subtitle="Items at or below their reorder level once stock already on order is counted"
        action={
          canOperateInventory(user?.role) && !suggestions.error ? (
            <Link
              href="/inventory/purchase-orders/new"
              className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
            >
              New Purchase Order
            </Link>
          ) : undefined
        }
      />
      {suggestions.error ? (
        <InventoryError message={suggestions.error} canManage={canManageInventory(user?.role)} />
      ) : (
        <Card>
          <CardHeader
            title="Suggestions"
            subtitle="Usable stock excludes expired lots. Each item is topped up to its maximum level, or to its reorder level when it has none."
            action={
              <ExportButtons
                onDownload={(format) =>
                  inventoryReportsApi.download("reorder-suggestions", {}, format, "reorder-suggestions")
                }
              />
            }
          />
          {suggestions.loading ? <LoadingState /> : null}
          {suggestions.data && rows.length === 0 ? (
            <EmptyState label="Nothing to reorder: every item with a reorder level has enough stock or is on order." />
          ) : null}
          {rows.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Item</Th>
                  <Th>Vendor</Th>
                  <Th align="right">Reorder level</Th>
                  <Th align="right">On hand</Th>
                  <Th align="right">Expired</Th>
                  <Th align="right">On order</Th>
                  <Th align="right">Suggested</Th>
                  {showValues ? <Th align="right">Estimated cost</Th> : null}
                </tr>
              </Thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.item_id}>
                    <Td>
                      <div className="font-bold">{row.sku}</div>
                      <div className="text-[11px] text-ink-soft">{row.item_name}</div>
                    </Td>
                    <Td>{row.preferred_vendor_name ?? <span className="text-ink-soft">No preferred vendor</span>}</Td>
                    <Td align="right">{formatQuantity(row.reorder_level)}</Td>
                    <Td align="right">{formatQuantity(row.on_hand)}</Td>
                    <Td align="right">
                      {Number(row.expired) > 0 ? (
                        <span className="font-bold text-bad">{formatQuantity(row.expired)}</span>
                      ) : (
                        "0"
                      )}
                    </Td>
                    <Td align="right">{formatQuantity(row.on_order)}</Td>
                    <Td align="right">
                      <span className="font-bold">{formatQuantity(row.suggested_quantity)}</span>{" "}
                      <span className="text-[11px] text-ink-soft">{row.base_unit_code}</span>
                    </Td>
                    {showValues ? (
                      <Td align="right">
                        {row.estimated_cost_minor === null ? "—" : formatNaira(row.estimated_cost_minor)}
                        {row.last_unit_cost_minor !== null ? (
                          <div className="text-[11px] text-ink-soft">
                            at {formatNaira(row.last_unit_cost_minor)} / {row.base_unit_code}
                          </div>
                        ) : null}
                      </Td>
                    ) : null}
                  </tr>
                ))}
                {showValues ? (
                  <tr>
                    <Td>
                      <span className="font-bold">Total</span>
                    </Td>
                    <Td> </Td>
                    <Td> </Td>
                    <Td> </Td>
                    <Td> </Td>
                    <Td> </Td>
                    <Td> </Td>
                    <Td align="right">
                      <span className="font-bold">{formatNaira(total)}</span>
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          ) : null}
        </Card>
      )}
    </div>
  );
}
