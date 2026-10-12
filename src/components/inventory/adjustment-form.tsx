"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { inventoryApi } from "@/lib/api/endpoints";
import { formatNaira, nairaToMinor } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import {
  REASON_DIRECTION,
  REASON_LABELS,
  TRACKED_ITEM_TYPES,
  formatQuantity,
  isValidQuantityInput,
  todayInLagos,
} from "@/lib/inventory";
import type {
  InventoryAdjustment,
  InventoryAdjustmentBody,
  InventoryAdjustmentReason,
  InventoryItem,
} from "@/lib/types";

const REASONS = Object.keys(REASON_LABELS) as InventoryAdjustmentReason[];

interface LineDraft {
  key: number;
  itemId: string;
  unitId: string;
  direction: "add" | "remove";
  quantity: string;
  cost: string; // naira, per unit of the line
  notes: string;
}

function linesFrom(adjustment: InventoryAdjustment | undefined): LineDraft[] {
  if (!adjustment?.lines?.length) {
    return [{ key: 0, itemId: "", unitId: "", direction: "add", quantity: "", cost: "", notes: "" }];
  }
  return adjustment.lines.map((line, index) => {
    const quantity = Number(line.quantity);
    return {
      key: index,
      itemId: line.item_id,
      unitId: line.unit_id,
      direction: quantity < 0 ? "remove" : "add",
      quantity: String(Math.abs(quantity)),
      cost: line.unit_cost_minor === null ? "" : String(line.unit_cost_minor / 100),
      notes: line.notes ?? "",
    };
  });
}

// Create or edit a draft adjustment. Quantities are typed as positive
// numbers; the reason (or, for a correction, each line's direction)
// decides whether stock goes in or out.
export function AdjustmentForm({
  adjustment,
  onSaved,
  onCancel,
}: {
  adjustment?: InventoryAdjustment;
  onSaved: (saved: InventoryAdjustment, postNow: boolean) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const warehouses = useApiResource(() => inventoryApi.warehouses());
  const items = useApiResource(() => inventoryApi.items());
  const [warehouseId, setWarehouseId] = useState(adjustment?.warehouse_id ?? "");
  const [reason, setReason] = useState<InventoryAdjustmentReason>(adjustment?.reason ?? "opening_balance");
  const [date, setDate] = useState(adjustment?.adjustment_date ?? todayInLagos());
  const [notes, setNotes] = useState(adjustment?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(() => linesFrom(adjustment));
  const [nextKey, setNextKey] = useState(lines.length);
  const [submitting, setSubmitting] = useState(false);

  const trackedItems = (items.data ?? []).filter((item) => TRACKED_ITEM_TYPES.includes(item.item_type));
  const itemsById = new Map(trackedItems.map((item) => [item.id, item]));
  const fixedDirection = REASON_DIRECTION[reason];
  const effectiveWarehouse = warehouseId || warehouses.data?.[0]?.id || "";

  function directionOf(line: LineDraft): "add" | "remove" {
    return fixedDirection === "either" ? line.direction : fixedDirection;
  }

  function update(key: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function unitOptions(item: InventoryItem | undefined) {
    if (!item) return [];
    return [
      { id: item.base_unit_id, label: `${item.base_unit_code} (base)` },
      ...item.units.map((unit) => ({
        id: unit.unit_id,
        label: `${unit.unit_code} (${formatQuantity(unit.factor_to_base)} ${item.base_unit_code})`,
      })),
    ];
  }

  function lineValue(line: LineDraft): number | null {
    if (directionOf(line) !== "add" || !line.cost || !isValidQuantityInput(line.quantity)) return null;
    return Math.round(Number(line.quantity) * nairaToMinor(line.cost));
  }

  async function submit(postNow: boolean) {
    const filled = lines.filter((line) => line.itemId);
    if (!effectiveWarehouse) {
      showToast("Add a warehouse first.", "bad");
      return;
    }
    if (filled.length === 0) {
      showToast("Add at least one item.", "bad");
      return;
    }
    const invalid = filled.find((line) => !isValidQuantityInput(line.quantity));
    if (invalid) {
      showToast("Each quantity must be a positive number with at most 4 decimal places.", "bad");
      return;
    }
    const body: InventoryAdjustmentBody = {
      warehouse_id: effectiveWarehouse,
      reason,
      adjustment_date: date,
      notes: notes || null,
      lines: filled.map((line) => {
        const adding = directionOf(line) === "add";
        return {
          item_id: line.itemId,
          unit_id: line.unitId || null,
          quantity: adding ? line.quantity.trim() : `-${line.quantity.trim()}`,
          unit_cost_minor: adding && line.cost ? nairaToMinor(line.cost) : null,
          notes: line.notes || null,
        };
      }),
    };
    setSubmitting(true);
    try {
      const saved = adjustment
        ? await inventoryApi.updateAdjustment(adjustment.id, body)
        : await inventoryApi.createAdjustment(body);
      onSaved(saved, postNow);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not save.", "bad");
      setSubmitting(false);
    }
  }

  if (warehouses.loading || items.loading) return <LoadingState />;
  if (warehouses.error) return <ErrorState message={warehouses.error} />;
  if (items.error) return <ErrorState message={items.error} />;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(false);
      }}
    >
      <Card>
        <CardHeader title="Details" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="adj-warehouse">Warehouse</Label>
            <Select
              id="adj-warehouse"
              value={effectiveWarehouse}
              onChange={(event) => setWarehouseId(event.target.value)}
              required
            >
              {(warehouses.data ?? []).length === 0 ? <option value="">No active warehouse</option> : null}
              {(warehouses.data ?? []).map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="adj-reason">Reason</Label>
            <Select
              id="adj-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value as InventoryAdjustmentReason)}
            >
              {REASONS.map((option) => (
                <option key={option} value={option}>
                  {REASON_LABELS[option]}
                  {REASON_DIRECTION[option] === "add" ? " (adds stock)" : ""}
                  {REASON_DIRECTION[option] === "remove" ? " (removes stock)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="adj-date">Date</Label>
            <Input
              id="adj-date"
              type="date"
              value={date}
              max={todayInLagos()}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="adj-notes">Notes</Label>
            <Textarea
              id="adj-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Optional — e.g. reference to the count sheet or incident report"
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Lines"
          subtitle={
            fixedDirection === "remove"
              ? "Stock removed leaves at each item's average cost."
              : fixedDirection === "add"
                ? "Enter the cost per unit; leave it blank to use the item's default cost."
                : "Choose for each line whether stock comes in or goes out."
          }
        />
        {trackedItems.length === 0 ? (
          <ErrorState message="No stock or consumable items yet. Add items first." />
        ) : null}
        <div className="flex flex-col gap-4">
          {lines.map((line, index) => {
            const item = itemsById.get(line.itemId);
            const adding = directionOf(line) === "add";
            const value = lineValue(line);
            return (
              <div
                key={line.key}
                className="grid grid-cols-1 items-end gap-3 rounded-panel border border-border p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
              >
                <div>
                  <Label htmlFor={`line-item-${line.key}`}>Item {index + 1}</Label>
                  <Select
                    id={`line-item-${line.key}`}
                    value={line.itemId}
                    onChange={(event) => update(line.key, { itemId: event.target.value, unitId: "" })}
                  >
                    <option value="">Choose an item…</option>
                    {trackedItems.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.sku} — {option.name} ({formatQuantity(option.quantity_on_hand)}{" "}
                        {option.base_unit_code} on hand)
                      </option>
                    ))}
                  </Select>
                </div>
                {fixedDirection === "either" ? (
                  <div>
                    <Label htmlFor={`line-dir-${line.key}`}>Direction</Label>
                    <Select
                      id={`line-dir-${line.key}`}
                      value={line.direction}
                      onChange={(event) => update(line.key, { direction: event.target.value as "add" | "remove" })}
                    >
                      <option value="add">Add stock</option>
                      <option value="remove">Remove stock</option>
                    </Select>
                  </div>
                ) : (
                  <div className="text-[12px] font-bold text-ink-soft sm:pb-3">
                    {adding ? "Adds stock" : "Removes stock"}
                  </div>
                )}
                <div>
                  <Label htmlFor={`line-qty-${line.key}`}>Quantity</Label>
                  <Input
                    id={`line-qty-${line.key}`}
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(event) => update(line.key, { quantity: event.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor={`line-unit-${line.key}`}>Unit</Label>
                  <Select
                    id={`line-unit-${line.key}`}
                    value={line.unitId || item?.base_unit_id || ""}
                    onChange={(event) => update(line.key, { unitId: event.target.value })}
                    disabled={!item}
                  >
                    {unitOptions(item).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`line-cost-${line.key}`}>Unit cost (₦)</Label>
                  <Input
                    id={`line-cost-${line.key}`}
                    inputMode="decimal"
                    value={adding ? line.cost : ""}
                    onChange={(event) => update(line.key, { cost: event.target.value })}
                    placeholder={
                      !adding
                        ? "Average cost"
                        : item?.default_cost_minor != null
                          ? `Default ${formatNaira(item.default_cost_minor)}`
                          : "Required"
                    }
                    disabled={!adding}
                  />
                  {value !== null ? (
                    <div className="mt-1 text-[11px] text-ink-soft">Line value {formatNaira(value)}</div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((other) => other.key !== line.key))}
                >
                  ✕
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setLines((current) => [
                ...current,
                { key: nextKey, itemId: "", unitId: "", direction: "add", quantity: "", cost: "", notes: "" },
              ]);
              setNextKey((key) => key + 1);
            }}
          >
            Add line
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="secondary" disabled={submitting}>
          {submitting ? "Saving…" : "Save draft"}
        </Button>
        <Button type="button" disabled={submitting} onClick={() => void submit(true)}>
          {submitting ? "Saving…" : "Save and post"}
        </Button>
      </div>
    </form>
  );
}
