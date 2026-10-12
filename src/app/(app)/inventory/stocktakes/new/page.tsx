"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorText } from "@/components/inventory/document-ui";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { inventoryApi, stocktakesApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import { todayInLagos } from "@/lib/inventory";

export default function NewStocktakePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const warehouses = useApiResource(() => inventoryApi.warehouses());
  const categories = useApiResource(() => inventoryApi.categories());
  const [warehouseId, setWarehouseId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [countDate, setCountDate] = useState(todayInLagos());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const options = warehouses.data ?? [];
  const effectiveWarehouse = warehouseId || options[0]?.id || "";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!effectiveWarehouse) return showToast("Choose a warehouse.", "bad");
    setSaving(true);
    try {
      const created = await stocktakesApi.create({
        warehouse_id: effectiveWarehouse,
        count_date: countDate,
        category_id: categoryId || null,
        notes: notes || null,
      });
      showToast(`${created.stocktake_number} created`, "good");
      router.push(`/inventory/stocktakes/${created.id}`);
    } catch (err) {
      showToast(errorText(err, "Could not create the stocktake."), "bad");
      setSaving(false);
    }
  }

  if (warehouses.loading || categories.loading) return <LoadingState />;
  const error = warehouses.error ?? categories.error;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="New Stocktake"
        subtitle="Starting the count takes a snapshot of the books; documents posted afterwards still count"
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader title="What to count" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="stocktake-warehouse">Warehouse</Label>
              <Select
                id="stocktake-warehouse"
                value={effectiveWarehouse}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                {options.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} — {warehouse.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="stocktake-category">Items</Label>
              <Select id="stocktake-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Every item</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} only
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="stocktake-date">Count date</Label>
              <Input
                id="stocktake-date"
                type="date"
                value={countDate}
                max={todayInLagos()}
                onChange={(e) => setCountDate(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="stocktake-notes">Notes</Label>
              <Textarea
                id="stocktake-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                rows={2}
              />
            </div>
          </div>
        </Card>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/inventory/stocktakes")} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Create stocktake"}
          </Button>
        </div>
      </form>
    </div>
  );
}
