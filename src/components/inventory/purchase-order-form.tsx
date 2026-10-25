"use client";

import { useState } from "react";

import { errorText } from "@/components/inventory/document-ui";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { inventoryApi, purchaseOrdersApi, vendorsApi } from "@/lib/api/endpoints";
import { currencyLabel, formatMoney, fromMinorUnits, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { formatQuantity, isValidQuantityInput, todayInLagos } from "@/lib/inventory";
import type { InventoryItem, PurchaseOrder, PurchaseOrderBody } from "@/lib/types";

interface LineDraft {
  key: number;
  itemId: string;
  unitId: string;
  quantity: string;
  price: string; // naira per unit
  discount: string; // naira, whole line
  tax: string; // naira, whole line
}

function blank(key: number): LineDraft {
  return { key, itemId: "", unitId: "", quantity: "", price: "", discount: "", tax: "" };
}

function naira(minor: number): string {
  return minor ? String(fromMinorUnits(minor)) : "";
}

function linesFrom(order: PurchaseOrder | undefined): LineDraft[] {
  if (!order?.lines?.length) return [blank(0)];
  return order.lines.map((line, index) => ({
    key: index,
    itemId: line.item_id,
    unitId: line.unit_id,
    quantity: String(Number(line.quantity)),
    price: String(fromMinorUnits(line.unit_price_minor)),
    discount: naira(line.discount_minor),
    tax: naira(line.tax_minor),
  }));
}

function lineNet(line: LineDraft): number {
  if (!isValidQuantityInput(line.quantity) || !line.price) return 0;
  return Math.max(
    Math.round(Number(line.quantity) * toMinorUnits(line.price)) - toMinorUnits(line.discount || "0"),
    0,
  );
}

// Create or edit a draft purchase order. Any active item can be ordered —
// non-stock items and services too; only stock and consumables are counted
// into stock when received.
export function PurchaseOrderForm({
  order,
  onSaved,
  onCancel,
}: {
  order?: PurchaseOrder;
  onSaved: (saved: PurchaseOrder) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const vendors = useApiResource(() => vendorsApi.list());
  const warehouses = useApiResource(() => inventoryApi.warehouses());
  const items = useApiResource(() => inventoryApi.items());
  const [vendorId, setVendorId] = useState(order?.vendor_id ?? "");
  const [warehouseId, setWarehouseId] = useState(order?.warehouse_id ?? "");
  const [orderDate, setOrderDate] = useState(order?.order_date ?? todayInLagos());
  const [expectedDate, setExpectedDate] = useState(order?.expected_date ?? "");
  const [reference, setReference] = useState(order?.vendor_reference ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(() => linesFrom(order));
  const [submitting, setSubmitting] = useState(false);

  const itemsById = new Map((items.data ?? []).map((item) => [item.id, item]));
  const effectiveVendor = vendorId || vendors.data?.[0]?.id || "";
  const nextKey = lines.reduce((max, line) => Math.max(max, line.key), -1) + 1;
  const subtotal = lines.reduce((sum, line) => sum + lineNet(line), 0);
  const tax = lines.reduce((sum, line) => sum + toMinorUnits(line.tax || "0"), 0);

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

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const filled = lines.filter((line) => line.itemId);
    if (!effectiveVendor) return showToast("Add a vendor first (Accounts → Vendors).", "bad");
    if (filled.length === 0) return showToast("Add at least one item.", "bad");
    if (filled.some((line) => !isValidQuantityInput(line.quantity) || line.price === "")) {
      return showToast("Each line needs a quantity and a unit price.", "bad");
    }
    const body: PurchaseOrderBody = {
      vendor_id: effectiveVendor,
      warehouse_id: warehouseId || null,
      order_date: orderDate,
      expected_date: expectedDate || null,
      vendor_reference: reference || null,
      notes: notes || null,
      lines: filled.map((line) => ({
        item_id: line.itemId,
        unit_id: line.unitId || null,
        quantity: line.quantity.trim(),
        unit_price_minor: toMinorUnits(line.price),
        discount_minor: toMinorUnits(line.discount || "0"),
        tax_minor: toMinorUnits(line.tax || "0"),
      })),
    };
    setSubmitting(true);
    try {
      const saved = order
        ? await purchaseOrdersApi.update(order.id, body)
        : await purchaseOrdersApi.create(body);
      onSaved(saved);
    } catch (err) {
      showToast(errorText(err, "Could not save."), "bad");
      setSubmitting(false);
    }
  }

  if (vendors.loading || items.loading || warehouses.loading) return <LoadingState />;
  if (items.error) return <ErrorState message={items.error} />;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader title="Order" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="po-vendor">Vendor</Label>
            <Select id="po-vendor" value={effectiveVendor} onChange={(e) => setVendorId(e.target.value)} required>
              {(vendors.data ?? []).length === 0 ? <option value="">No vendors yet</option> : null}
              {(vendors.data ?? []).map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="po-order-date">Order date</Label>
            <Input id="po-order-date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="po-expected">Expected delivery</Label>
            <Input id="po-expected" type="date" value={expectedDate} min={orderDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="po-warehouse">Deliver to</Label>
            <Select id="po-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Decide on receipt</option>
              {(warehouses.data ?? []).map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="po-reference">Vendor reference</Label>
            <Input id="po-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={64} placeholder="Quote or proforma no." />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="po-notes">Notes</Label>
            <Textarea id="po-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Lines"
          subtitle="Prices are per unit; discount and tax are amounts for the whole line. Stock is valued at the price after discount — tax is settled on the vendor's bill."
        />
        <div className="flex flex-col gap-3">
          {lines.map((line, index) => {
            const item = itemsById.get(line.itemId);
            return (
              <div
                key={line.key}
                className="grid grid-cols-1 items-end gap-3 rounded-panel border border-border p-3 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]"
              >
                <div>
                  <Label htmlFor={`po-item-${line.key}`}>Item {index + 1}</Label>
                  <Select id={`po-item-${line.key}`} value={line.itemId} onChange={(e) => update(line.key, { itemId: e.target.value, unitId: "" })}>
                    <option value="">Choose an item…</option>
                    {(items.data ?? []).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.sku} — {option.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`po-qty-${line.key}`}>Quantity</Label>
                  <Input id={`po-qty-${line.key}`} inputMode="decimal" value={line.quantity} onChange={(e) => update(line.key, { quantity: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`po-unit-${line.key}`}>Unit</Label>
                  <Select id={`po-unit-${line.key}`} value={line.unitId || item?.base_unit_id || ""} onChange={(e) => update(line.key, { unitId: e.target.value })} disabled={!item}>
                    {unitOptions(item).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`po-price-${line.key}`}>Unit price ({currencyLabel()})</Label>
                  <Input id={`po-price-${line.key}`} inputMode="decimal" value={line.price} onChange={(e) => update(line.key, { price: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`po-discount-${line.key}`}>Discount ({currencyLabel()})</Label>
                  <Input id={`po-discount-${line.key}`} inputMode="decimal" value={line.discount} onChange={(e) => update(line.key, { discount: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label htmlFor={`po-tax-${line.key}`}>Tax ({currencyLabel()})</Label>
                  <Input id={`po-tax-${line.key}`} inputMode="decimal" value={line.tax} onChange={(e) => update(line.key, { tax: e.target.value })} placeholder="0" />
                </div>
                <Button type="button" variant="secondary" aria-label={`Remove line ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((other) => other.key !== line.key))}>
                  ✕
                </Button>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => setLines((current) => [...current, blank(nextKey)])}>
              Add line
            </Button>
            <div className="text-right text-[13px]">
              <div className="text-ink-soft">
                Net {formatMoney(subtotal)} · Tax {formatMoney(tax)}
              </div>
              <div className="font-extrabold text-ink">Total {formatMoney(subtotal + tax)}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : order ? "Save changes" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
