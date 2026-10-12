"use client";

import { useState } from "react";

import {
  StockLinesEditor,
  errorText,
  stockLinesBody,
  stockLinesFrom,
  type StockLineDraft,
} from "@/components/inventory/document-ui";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { inventoryApi, stockTransfersApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import { todayInLagos } from "@/lib/inventory";
import type { StockTransfer, StockTransferBody } from "@/lib/types";

// Create or edit a draft transfer between two warehouses.
export function StockTransferForm({
  transfer,
  onSaved,
  onCancel,
}: {
  transfer?: StockTransfer;
  onSaved: (saved: StockTransfer) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const warehouses = useApiResource(() => inventoryApi.warehouses());
  const items = useApiResource(() => inventoryApi.items());
  const [fromId, setFromId] = useState(transfer?.from_warehouse_id ?? "");
  const [toId, setToId] = useState(transfer?.to_warehouse_id ?? "");
  const [transferDate, setTransferDate] = useState(transfer?.transfer_date ?? todayInLagos());
  const [notes, setNotes] = useState(transfer?.notes ?? "");
  const [lines, setLines] = useState<StockLineDraft[]>(() => stockLinesFrom(transfer?.lines));
  const [submitting, setSubmitting] = useState(false);

  const options = warehouses.data ?? [];
  const effectiveFrom = fromId || options[0]?.id || "";
  const effectiveTo = toId || options.find((warehouse) => warehouse.id !== effectiveFrom)?.id || "";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const body = stockLinesBody(lines);
    if (typeof body === "string") return showToast(body, "bad");
    if (!effectiveFrom || !effectiveTo) return showToast("Choose both warehouses.", "bad");
    if (effectiveFrom === effectiveTo) return showToast("The two warehouses must differ.", "bad");
    const payload: StockTransferBody = {
      from_warehouse_id: effectiveFrom,
      to_warehouse_id: effectiveTo,
      transfer_date: transferDate,
      notes: notes || null,
      lines: body,
    };
    setSubmitting(true);
    try {
      const saved = transfer
        ? await stockTransfersApi.update(transfer.id, payload)
        : await stockTransfersApi.create(payload);
      onSaved(saved);
    } catch (err) {
      showToast(errorText(err, "Could not save."), "bad");
      setSubmitting(false);
    }
  }

  if (warehouses.loading || items.loading) return <LoadingState />;
  const error = items.error ?? warehouses.error;
  if (error) return <ErrorState message={error} />;
  if (options.length < 2) return <ErrorState message="A transfer needs at least two active warehouses." />;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader title="Transfer" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="transfer-from">From</Label>
            <Select id="transfer-from" value={effectiveFrom} onChange={(e) => setFromId(e.target.value)} required>
              {options.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="transfer-to">To</Label>
            <Select id="transfer-to" value={effectiveTo} onChange={(e) => setToId(e.target.value)} required>
              {options
                .filter((warehouse) => warehouse.id !== effectiveFrom)
                .map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} — {warehouse.name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="transfer-date">Transfer date</Label>
            <Input id="transfer-date" type="date" value={transferDate} max={todayInLagos()} onChange={(e) => setTransferDate(e.target.value)} required />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="transfer-notes">Notes</Label>
            <Textarea id="transfer-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Items"
          subtitle="Dispatching moves the stock into transit at its average cost; receiving moves it into the destination at the same value."
        />
        <StockLinesEditor items={items.data ?? []} lines={lines} onChange={setLines} idPrefix="transfer" />
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : transfer ? "Save changes" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
