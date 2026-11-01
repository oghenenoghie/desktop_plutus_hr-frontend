"use client";

import { useState } from "react";

import { errorText } from "@/components/inventory/document-ui";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { inventoryApi, vendorsApi } from "@/lib/api/endpoints";
import { currencyLabel, fromMinorUnits, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { ITEM_TYPE_LABELS, TRACKED_ITEM_TYPES } from "@/lib/inventory";
import type {
  InventoryCategory,
  InventoryItem,
  InventoryItemBody,
  InventoryItemType,
  InventoryUnit,
} from "@/lib/types";

const ITEM_TYPES = Object.keys(ITEM_TYPE_LABELS) as InventoryItemType[];

function minorToNairaInput(minor: number | null): string {
  return minor === null ? "" : String(fromMinorUnits(minor));
}

// The one item create/edit form — the Items page uses it, and so does any
// form that lets someone add an item without leaving it (a purchase order
// line, a stock adjustment line). `onSaved` gets the saved item back so the
// caller can select it.
export function ItemFormModal({
  item,
  categories: categoriesProp,
  units: unitsProp,
  itemTypes = ITEM_TYPES,
  onClose,
  onSaved,
}: {
  item?: InventoryItem;
  // The Items page already holds these; anywhere else leaves them out and
  // the form loads its own.
  categories?: InventoryCategory[];
  units?: InventoryUnit[];
  // Limits the Type choice when the caller can only use some types — a
  // stock adjustment only takes stock and consumable items.
  itemTypes?: InventoryItemType[];
  onClose: () => void;
  onSaved: (saved: InventoryItem) => void;
}) {
  const { showToast } = useToast();
  const vendors = useApiResource(() => vendorsApi.list());
  const loadedCategories = useApiResource(() => (categoriesProp ? Promise.resolve(null) : inventoryApi.categories()));
  const loadedUnits = useApiResource(() => (unitsProp ? Promise.resolve(null) : inventoryApi.units()));
  const categories = categoriesProp ?? loadedCategories.data ?? [];
  const units = unitsProp ?? loadedUnits.data ?? [];
  const typeOptions = item && !itemTypes.includes(item.item_type) ? [...itemTypes, item.item_type] : itemTypes;
  const [sku, setSku] = useState(item?.sku ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [itemType, setItemType] = useState<InventoryItemType>(item?.item_type ?? typeOptions[0] ?? "stock");
  const [chosenBaseUnitId, setBaseUnitId] = useState(item?.base_unit_id ?? "");
  // The units may still be loading when the form opens, so the default
  // (PCS, else the first unit) is worked out on every render.
  const baseUnitId =
    chosenBaseUnitId || units.find((unit) => unit.code === "PCS")?.id || units[0]?.id || "";
  const [categoryId, setCategoryId] = useState(item?.category_id ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [reorderLevel, setReorderLevel] = useState(item?.reorder_level ? String(Number(item.reorder_level)) : "");
  const [maxLevel, setMaxLevel] = useState(item?.max_level ? String(Number(item.max_level)) : "");
  const [defaultCost, setDefaultCost] = useState(minorToNairaInput(item?.default_cost_minor ?? null));
  const [vendorId, setVendorId] = useState(item?.preferred_vendor_id ?? "");
  const [barcode, setBarcode] = useState(item?.barcode ?? "");
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [trackLots, setTrackLots] = useState(item?.track_lots ?? false);
  const [trackExpiry, setTrackExpiry] = useState(item?.track_expiry ?? false);
  const [submitting, setSubmitting] = useState(false);
  const holdsStock = TRACKED_ITEM_TYPES.includes(itemType);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const body: InventoryItemBody = {
      sku,
      name,
      item_type: itemType,
      base_unit_id: baseUnitId,
      description: description || null,
      category_id: categoryId || null,
      reorder_level: reorderLevel || null,
      max_level: maxLevel || null,
      default_cost_minor: defaultCost ? toMinorUnits(defaultCost) : null,
      preferred_vendor_id: vendorId || null,
      barcode: barcode || null,
      track_lots: holdsStock && trackLots,
      track_expiry: holdsStock && trackLots && trackExpiry,
    };
    try {
      let saved: InventoryItem;
      if (item) {
        saved = await inventoryApi.updateItem(item.id, { ...body, is_active: isActive });
        showToast("Item updated", "good");
      } else {
        saved = await inventoryApi.createItem(body);
        showToast("Item created", "good");
      }
      onSaved(saved);
    } catch (err) {
      showToast(errorText(err), "bad");
      setSubmitting(false);
    }
  }

  const unitOptions = units.filter((unit) => unit.is_active || unit.id === item?.base_unit_id);

  return (
    <Modal title={item ? `Edit ${item.sku}` : "New Item"} onClose={onClose} size="lg">
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="item-sku">SKU</Label>
            <Input id="item-sku" value={sku} onChange={(event) => setSku(event.target.value)} maxLength={64} required />
          </div>
          <div>
            <Label htmlFor="item-type">Type</Label>
            <Select
              id="item-type"
              value={itemType}
              onChange={(event) => setItemType(event.target.value as InventoryItemType)}
            >
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {ITEM_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="item-name">Name</Label>
          <Input id="item-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required />
        </div>
        <p className="-mt-2 text-[11px] text-ink-soft">
          Stock and consumable items hold stock; non-stock items and services don&apos;t.
          {item ? " Type and base unit are fixed once the item has stock history." : ""}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="item-unit">Base unit</Label>
            <Select id="item-unit" value={baseUnitId} onChange={(event) => setBaseUnitId(event.target.value)} required>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code} — {unit.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="item-category">Category</Label>
            <Select id="item-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="item-reorder">Reorder level</Label>
            <Input
              id="item-reorder"
              inputMode="decimal"
              value={reorderLevel}
              onChange={(event) => setReorderLevel(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="item-max">Maximum level</Label>
            <Input
              id="item-max"
              inputMode="decimal"
              value={maxLevel}
              onChange={(event) => setMaxLevel(event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="item-cost">Default unit cost ({currencyLabel()})</Label>
            <Input
              id="item-cost"
              inputMode="decimal"
              value={defaultCost}
              onChange={(event) => setDefaultCost(event.target.value)}
              placeholder="Per base unit"
            />
          </div>
          <div>
            <Label htmlFor="item-barcode">Barcode</Label>
            <Input
              id="item-barcode"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              maxLength={64}
              placeholder="Optional"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="item-vendor">Preferred vendor</Label>
          <Select id="item-vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
            <option value="">None</option>
            {(vendors.data ?? []).map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </div>
        {holdsStock ? (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                id="item-track-lots"
                type="checkbox"
                checked={trackLots}
                onChange={(event) => {
                  setTrackLots(event.target.checked);
                  if (!event.target.checked) setTrackExpiry(false);
                }}
              />
              Track lot (batch) numbers
            </label>
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                id="item-track-expiry"
                type="checkbox"
                checked={trackExpiry}
                disabled={!trackLots}
                onChange={(event) => setTrackExpiry(event.target.checked)}
              />
              Record an expiry date for each lot
            </label>
            <p className="text-[11px] text-ink-soft">
              Stock is then received and counted by lot, issued first-expiry-first-out, and expired lots are never
              issued. These can&apos;t change once the item has stock movements.
            </p>
          </div>
        ) : null}
        <div>
          <Label htmlFor="item-description">Description</Label>
          <Textarea
            id="item-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            rows={3}
          />
        </div>
        {item ? (
          <div>
            <Label htmlFor="item-active">Status</Label>
            <Select
              id="item-active"
              value={isActive ? "active" : "archived"}
              onChange={(event) => setIsActive(event.target.value === "active")}
            >
              <option value="active">Active</option>
              <option value="archived">Archived (hidden from new adjustments)</option>
            </Select>
          </div>
        ) : null}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !baseUnitId}>
            {submitting ? "Saving…" : item ? "Save Changes" : "Create Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
