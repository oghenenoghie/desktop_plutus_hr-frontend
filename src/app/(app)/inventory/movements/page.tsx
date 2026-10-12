"use client";

import { useState } from "react";

import { InventoryError, MovementsTable } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { inventoryApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { useApiResource } from "@/lib/hooks";
import { MOVEMENT_LABELS, canManageInventory } from "@/lib/inventory";
import type { StockMovementType } from "@/lib/types";

const PAGE_SIZE = 50;

interface Filters {
  itemId: string;
  warehouseId: string;
  movementType: string;
  dateFrom: string;
  dateTo: string;
}

const NO_FILTERS: Filters = { itemId: "", warehouseId: "", movementType: "", dateFrom: "", dateTo: "" };

export default function StockMovementsPage() {
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [offset, setOffset] = useState(0);

  const movements = useApiResource(
    () => inventoryApi.movements({ ...filters, limit: PAGE_SIZE, offset }),
    [filters, offset],
  );
  const items = useApiResource(() => inventoryApi.items({ includeInactive: true }));
  const warehouses = useApiResource(() => inventoryApi.warehouses(true));

  function setFilter(patch: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setOffset(0);
  }

  const total = movements.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Stock Movements"
        subtitle="The stock ledger: every change to stock, append-only. Mistakes are reversed, never edited."
      />

      {movements.error ? (
        <InventoryError message={movements.error} canManage={canManage} />
      ) : (
        <Card>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="mv-item">Item</Label>
              <Select id="mv-item" value={filters.itemId} onChange={(event) => setFilter({ itemId: event.target.value })}>
                <option value="">All items</option>
                {(items.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} — {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="mv-warehouse">Warehouse</Label>
              <Select
                id="mv-warehouse"
                value={filters.warehouseId}
                onChange={(event) => setFilter({ warehouseId: event.target.value })}
              >
                <option value="">All warehouses</option>
                {(warehouses.data ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="mv-type">Type</Label>
              <Select
                id="mv-type"
                value={filters.movementType}
                onChange={(event) => setFilter({ movementType: event.target.value })}
              >
                <option value="">All types</option>
                {(Object.keys(MOVEMENT_LABELS) as StockMovementType[]).map((type) => (
                  <option key={type} value={type}>
                    {MOVEMENT_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="mv-from">From</Label>
              <Input
                id="mv-from"
                type="date"
                value={filters.dateFrom}
                onChange={(event) => setFilter({ dateFrom: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="mv-to">To</Label>
              <Input
                id="mv-to"
                type="date"
                value={filters.dateTo}
                onChange={(event) => setFilter({ dateTo: event.target.value })}
              />
            </div>
          </div>

          {movements.loading ? <LoadingState /> : null}
          {movements.data ? <MovementsTable movements={movements.data.items} emptyLabel="No movements match." /> : null}

          {total > PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-between text-[13px] text-ink-soft">
              <span>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={offset === 0}
                  onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset((value) => value + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
