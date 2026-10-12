"use client";

import { useState } from "react";

import { InventoryError, MoneyOrHidden } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { inventoryApi, inventoryLotsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory, formatQuantity, isLowStock } from "@/lib/inventory";

export default function StockOnHandPage() {
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);
  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeZero, setIncludeZero] = useState(false);

  const stock = useApiResource(
    () => inventoryApi.stock({ warehouseId, q: query, includeZero }),
    [warehouseId, query, includeZero],
  );
  const warehouses = useApiResource(() => inventoryApi.warehouses(true));

  const rows = stock.data ?? [];
  const showValues = rows.some((row) => row.value_minor !== null);
  const totalValue = rows.reduce((sum, row) => sum + (row.value_minor ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Stock on Hand"
        subtitle="Quantity per item and warehouse. Value is quantity at the item's weighted-average cost."
      />

      {stock.error ? (
        <InventoryError message={stock.error} canManage={canManage} />
      ) : (
        <Card>
          <form
            className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(search);
            }}
          >
            <div>
              <Label htmlFor="stock-search">Search</Label>
              <Input
                id="stock-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onBlur={() => setQuery(search)}
                placeholder="SKU or name"
              />
            </div>
            <div>
              <Label htmlFor="stock-warehouse">Warehouse</Label>
              <Select id="stock-warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
                <option value="">All warehouses</option>
                {(warehouses.data ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} — {warehouse.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="stock-zero">Show</Label>
              <Select
                id="stock-zero"
                value={includeZero ? "all" : "nonzero"}
                onChange={(event) => setIncludeZero(event.target.value === "all")}
              >
                <option value="nonzero">Items in stock</option>
                <option value="all">Include zero balances</option>
              </Select>
            </div>
          </form>

          {stock.loading ? <LoadingState /> : null}
          {stock.data && rows.length === 0 ? <EmptyState label="No stock on hand." /> : null}
          {rows.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Item</Th>
                  <Th>Warehouse</Th>
                  <Th align="right">Quantity</Th>
                  <Th align="right">Reorder level</Th>
                  {showValues ? <Th align="right">Value</Th> : null}
                </tr>
              </Thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.item_id}-${row.warehouse_id}`}>
                    <Td className="font-bold">{row.sku}</Td>
                    <Td>{row.item_name}</Td>
                    <Td>
                      <div>{row.warehouse_code}</div>
                      <div className="text-[11px] text-ink-soft">{row.warehouse_name}</div>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        {Number(row.quantity) === 0 ? <Badge tone="bad">Out</Badge> : null}
                        {isLowStock(row.quantity, row.reorder_level) ? <Badge tone="warn">Low</Badge> : null}
                        <span className="font-bold">{formatQuantity(row.quantity)}</span>
                        <span className="text-[11px] text-ink-soft">{row.base_unit_code}</span>
                      </div>
                    </Td>
                    <Td align="right">{formatQuantity(row.reorder_level)}</Td>
                    {showValues ? (
                      <Td align="right">
                        <MoneyOrHidden minor={row.value_minor} />
                      </Td>
                    ) : null}
                  </tr>
                ))}
                {showValues ? (
                  <tr>
                    <Td className="font-extrabold">Total</Td>
                    <Td>{""}</Td>
                    <Td>{""}</Td>
                    <Td>{""}</Td>
                    <Td>{""}</Td>
                    <Td align="right" className="font-extrabold">
                      {formatNaira(totalValue)}
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          ) : null}
        </Card>
      )}
      {stock.error ? null : <LotStockCard warehouseId={warehouseId} />}
    </div>
  );
}

// Lot-tracked items, lot by lot (D9): soonest expiry first. Shown only when
// some item tracks lots.
function LotStockCard({ warehouseId }: { warehouseId: string }) {
  const lots = useApiResource(() => inventoryLotsApi.list({ warehouseId }), [warehouseId]);
  const rows = lots.data ?? [];
  if (rows.length === 0) return null;
  const showValues = rows.some((row) => row.value_minor !== null);
  return (
    <Card className="mt-6">
      <CardHeader
        title="By lot"
        subtitle="Lot-tracked items, soonest expiry first. Expired lots aren't issued; write them off with an Expiry adjustment."
      />
      <Table>
        <Thead>
          <tr>
            <Th>Item</Th>
            <Th>Lot</Th>
            <Th>Expiry</Th>
            <Th>Warehouse</Th>
            <Th align="right">Quantity</Th>
            {showValues ? <Th align="right">Value</Th> : null}
          </tr>
        </Thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.lot_id}-${row.warehouse_id}`}>
              <Td>
                <div className="font-bold">{row.sku}</div>
                <div className="text-[11px] text-ink-soft">{row.item_name}</div>
              </Td>
              <Td>{row.lot_number}</Td>
              <Td>
                {row.expiry_date ? formatDate(row.expiry_date) : "—"}{" "}
                {row.expired ? (
                  <Badge tone="bad">Expired</Badge>
                ) : row.days_to_expiry !== null && row.days_to_expiry <= 30 ? (
                  <Badge tone="warn">{row.days_to_expiry} days</Badge>
                ) : null}
              </Td>
              <Td>{row.warehouse_code}</Td>
              <Td align="right">
                {formatQuantity(row.quantity)} <span className="text-[11px] text-ink-soft">{row.base_unit_code}</span>
              </Td>
              {showValues ? (
                <Td align="right">
                  <MoneyOrHidden minor={row.value_minor} />
                </Td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
