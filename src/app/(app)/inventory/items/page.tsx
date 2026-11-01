"use client";

import { useState } from "react";

import { InventoryError, MoneyOrHidden } from "@/components/inventory/inventory-ui";
import { ItemFormModal } from "@/components/inventory/item-form-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { inventoryApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { useApiResource } from "@/lib/hooks";
import {
  ITEM_TYPE_LABELS,
  TRACKED_ITEM_TYPES,
  canManageInventory,
  formatQuantity,
  isLowStock,
} from "@/lib/inventory";
import type { InventoryItem, InventoryItemType, InventoryUnit } from "@/lib/types";

const ITEM_TYPES = Object.keys(ITEM_TYPE_LABELS) as InventoryItemType[];

function errorText(err: unknown): string {
  return err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.";
}

export default function InventoryItemsPage() {
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemType, setItemType] = useState<InventoryItemType | "">("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const items = useApiResource(
    () => inventoryApi.items({ q: query, categoryId, itemType, includeInactive }),
    [query, categoryId, itemType, includeInactive],
  );
  const categories = useApiResource(() => inventoryApi.categories());
  const units = useApiResource(() => inventoryApi.units());
  const [editing, setEditing] = useState<InventoryItem | "new" | null>(null);
  const [editingUnits, setEditingUnits] = useState<InventoryItem | null>(null);

  const showValues = (items.data ?? []).some((item) => item.value_minor !== null);

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle="Everything the organisation stocks or consumes, with stock on hand across all warehouses"
        action={
          canManage && !items.error ? <Button onClick={() => setEditing("new")}>New Item</Button> : undefined
        }
      />

      {items.error ? (
        <InventoryError message={items.error} canManage={canManage} />
      ) : (
        <Card>
          <form
            className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(search);
            }}
          >
            <div className="lg:col-span-2">
              <Label htmlFor="item-search">Search</Label>
              <Input
                id="item-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onBlur={() => setQuery(search)}
                placeholder="SKU, name or barcode"
              />
            </div>
            <div>
              <Label htmlFor="item-category-filter">Category</Label>
              <Select
                id="item-category-filter"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="item-type-filter">Type</Label>
              <Select
                id="item-type-filter"
                value={itemType}
                onChange={(event) => setItemType(event.target.value as InventoryItemType | "")}
              >
                <option value="">All types</option>
                {ITEM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ITEM_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="item-inactive-filter">Show</Label>
              <Select
                id="item-inactive-filter"
                value={includeInactive ? "all" : "active"}
                onChange={(event) => setIncludeInactive(event.target.value === "all")}
              >
                <option value="active">Active items</option>
                <option value="all">Active and archived</option>
              </Select>
            </div>
          </form>

          {items.loading ? <LoadingState /> : null}
          {items.data && items.data.length === 0 ? (
            <EmptyState label={query || categoryId || itemType ? "No items match." : "No items yet."} />
          ) : null}
          {items.data && items.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>SKU</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Category</Th>
                  <Th align="right">On hand</Th>
                  {showValues ? <Th align="right">Avg cost</Th> : null}
                  {showValues ? <Th align="right">Value</Th> : null}
                  <Th>Status</Th>
                  {canManage ? <Th align="right">Actions</Th> : null}
                </tr>
              </Thead>
              <tbody>
                {items.data.map((item) => {
                  const tracked = TRACKED_ITEM_TYPES.includes(item.item_type);
                  return (
                    <tr key={item.id}>
                      <Td className="font-bold">{item.sku}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          {item.name}
                          {item.track_lots ? (
                            <Badge tone="neutral">{item.track_expiry ? "Lots + expiry" : "Lots"}</Badge>
                          ) : null}
                        </div>
                        {item.units.length > 0 ? (
                          <div className="text-[11px] text-ink-soft">
                            {item.units
                              .map((unit) => `1 ${unit.unit_code} = ${formatQuantity(unit.factor_to_base)} ${item.base_unit_code}`)
                              .join(" · ")}
                          </div>
                        ) : null}
                      </Td>
                      <Td>{ITEM_TYPE_LABELS[item.item_type]}</Td>
                      <Td>{item.category_name ?? "—"}</Td>
                      <Td align="right">
                        {tracked ? (
                          <div className="flex items-center justify-end gap-2">
                            {Number(item.quantity_on_hand) === 0 ? <Badge tone="bad">Out</Badge> : null}
                            {isLowStock(item.quantity_on_hand, item.reorder_level) ? (
                              <Badge tone="warn">Low</Badge>
                            ) : null}
                            <span className="font-bold">{formatQuantity(item.quantity_on_hand)}</span>
                            <span className="text-[11px] text-ink-soft">{item.base_unit_code}</span>
                          </div>
                        ) : (
                          <span className="text-ink-soft">Not tracked</span>
                        )}
                      </Td>
                      {showValues ? (
                        <Td align="right">
                          <MoneyOrHidden minor={item.average_cost_minor} />
                        </Td>
                      ) : null}
                      {showValues ? (
                        <Td align="right">
                          <MoneyOrHidden minor={item.value_minor} />
                        </Td>
                      ) : null}
                      <Td>
                        <Badge tone={item.is_active ? "good" : "neutral"}>
                          {item.is_active ? "Active" : "Archived"}
                        </Badge>
                      </Td>
                      {canManage ? (
                        <Td align="right">
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setEditingUnits(item)}>
                              Units
                            </Button>
                            <Button variant="secondary" onClick={() => setEditing(item)}>
                              Edit
                            </Button>
                          </div>
                        </Td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : null}
        </Card>
      )}

      {editing ? (
        <ItemFormModal
          item={editing === "new" ? undefined : editing}
          categories={categories.data ?? []}
          units={units.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            items.reload();
          }}
        />
      ) : null}
      {editingUnits ? (
        <ItemUnitsDrawer
          item={editingUnits}
          units={units.data ?? []}
          onClose={() => setEditingUnits(null)}
          onSaved={() => {
            setEditingUnits(null);
            items.reload();
          }}
        />
      ) : null}
    </div>
  );
}

interface ConversionRow {
  key: number;
  unitId: string;
  factor: string;
}

function ItemUnitsDrawer({
  item,
  units,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  units: InventoryUnit[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ConversionRow[]>(
    item.units.map((unit, index) => ({
      key: index,
      unitId: unit.unit_id,
      factor: String(Number(unit.factor_to_base)),
    })),
  );
  const [nextKey, setNextKey] = useState(item.units.length);
  const [submitting, setSubmitting] = useState(false);
  const choices = units.filter((unit) => unit.id !== item.base_unit_id);

  function update(key: number, patch: Partial<ConversionRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await inventoryApi.replaceItemUnits(
        item.id,
        rows.filter((row) => row.unitId).map((row) => ({ unit_id: row.unitId, factor_to_base: row.factor })),
      );
      showToast("Units saved", "good");
      onSaved();
    } catch (err) {
      showToast(errorText(err), "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Units for ${item.sku}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Stock is always held in the base unit, <span className="font-bold text-ink">{item.base_unit_code}</span>.
          Add the other units this item is counted or bought in, and how many {item.base_unit_code} each holds.
          Changing a factor never changes stock already posted.
        </p>
        {rows.length === 0 ? <EmptyState label="No alternative units." /> : null}
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <div>
              <Label htmlFor={`conv-unit-${row.key}`}>Unit</Label>
              <Select
                id={`conv-unit-${row.key}`}
                value={row.unitId}
                onChange={(event) => update(row.key, { unitId: event.target.value })}
                required
              >
                <option value="">Choose…</option>
                {choices.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} — {unit.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`conv-factor-${row.key}`}>{item.base_unit_code} per unit</Label>
              <Input
                id={`conv-factor-${row.key}`}
                inputMode="decimal"
                value={row.factor}
                onChange={(event) => update(row.key, { factor: event.target.value })}
                placeholder="e.g. 24"
                required
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRows((current) => current.filter((other) => other.key !== row.key))}
              aria-label="Remove unit"
            >
              ✕
            </Button>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setRows((current) => [...current, { key: nextKey, unitId: "", factor: "" }]);
              setNextKey((key) => key + 1);
            }}
          >
            Add unit
          </Button>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save Units"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
