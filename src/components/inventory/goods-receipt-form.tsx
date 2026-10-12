"use client";

import { useState } from "react";

import { errorText } from "@/components/inventory/document-ui";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/data-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { goodsReceiptsApi, inventoryApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import { formatQuantity, todayInLagos } from "@/lib/inventory";
import type { GoodsReceipt, GoodsReceiptLineInput, PurchaseOrder, PurchaseOrderLine } from "@/lib/types";

interface LineDraft {
  accepted: string;
  rejected: string;
  reason: string;
}

const QUANTITY = /^\d+(\.\d{1,4})?$/;

// What's still due on an order line, expressed in the line's own unit
// (receipts are entered in the unit the goods were ordered in).
function outstandingInLineUnit(line: PurchaseOrderLine): string {
  const outstanding = Number(line.outstanding_quantity_base);
  if (outstanding <= 0) return "";
  const inUnit = (outstanding * Number(line.quantity)) / Number(line.quantity_base);
  return String(Math.round(inUnit * 10_000) / 10_000);
}

function draftsFrom(po: PurchaseOrder, receipt?: GoodsReceipt): Record<string, LineDraft> {
  const drafts: Record<string, LineDraft> = {};
  for (const line of po.lines ?? []) {
    const existing = receipt?.lines?.find((other) => other.po_line_id === line.id);
    drafts[line.id] = existing
      ? {
          accepted: String(Number(existing.accepted_quantity)),
          rejected: Number(existing.rejected_quantity) ? String(Number(existing.rejected_quantity)) : "",
          reason: existing.rejection_reason ?? "",
        }
      : { accepted: receipt ? "" : outstandingInLineUnit(line), rejected: "", reason: "" };
  }
  return drafts;
}

// Records what arrived against an issued purchase order. Saved as a draft;
// stock moves only when the receipt is posted.
export function GoodsReceiptForm({
  po,
  receipt,
  onSaved,
  onCancel,
}: {
  po: PurchaseOrder;
  receipt?: GoodsReceipt;
  onSaved: (saved: GoodsReceipt) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const warehouses = useApiResource(() => inventoryApi.warehouses());
  const [warehouseId, setWarehouseId] = useState(receipt?.warehouse_id ?? po.warehouse_id ?? "");
  const [receiptDate, setReceiptDate] = useState(receipt?.receipt_date ?? todayInLagos());
  const [reference, setReference] = useState(receipt?.supplier_reference ?? "");
  const [notes, setNotes] = useState(receipt?.notes ?? "");
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>(() => draftsFrom(po, receipt));
  const [submitting, setSubmitting] = useState(false);

  const effectiveWarehouse = warehouseId || warehouses.data?.[0]?.id || "";

  function update(lineId: string, patch: Partial<LineDraft>) {
    setDrafts((current) => ({ ...current, [lineId]: { ...current[lineId], ...patch } }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const lines: GoodsReceiptLineInput[] = [];
    for (const line of po.lines ?? []) {
      const draft = drafts[line.id];
      const accepted = draft.accepted.trim() || "0";
      const rejected = draft.rejected.trim() || "0";
      if (!QUANTITY.test(accepted) || !QUANTITY.test(rejected)) {
        return showToast(`${line.item_sku}: quantities must be numbers with at most 4 decimal places.`, "bad");
      }
      if (Number(accepted) === 0 && Number(rejected) === 0) continue;
      if (Number(rejected) > 0 && !draft.reason.trim()) {
        return showToast(`${line.item_sku}: say why goods were rejected.`, "bad");
      }
      lines.push({
        po_line_id: line.id,
        accepted_quantity: accepted,
        rejected_quantity: rejected,
        rejection_reason: draft.reason.trim() || null,
      });
    }
    if (lines.length === 0) return showToast("Enter what was received on at least one line.", "bad");
    if (!effectiveWarehouse) return showToast("Choose the receiving warehouse.", "bad");
    const header = {
      warehouse_id: effectiveWarehouse,
      receipt_date: receiptDate,
      supplier_reference: reference || null,
      notes: notes || null,
      lines,
    };
    setSubmitting(true);
    try {
      const saved = receipt
        ? await goodsReceiptsApi.update(receipt.id, header)
        : await goodsReceiptsApi.create({ ...header, purchase_order_id: po.id });
      onSaved(saved);
    } catch (err) {
      showToast(errorText(err, "Could not save."), "bad");
      setSubmitting(false);
    }
  }

  if (warehouses.loading) return <LoadingState />;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader title="Receipt" subtitle={`Against ${po.po_number} from ${po.vendor_name}`} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="grn-warehouse">Received into</Label>
            <Select id="grn-warehouse" value={effectiveWarehouse} onChange={(e) => setWarehouseId(e.target.value)} required>
              {(warehouses.data ?? []).map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="grn-date">Receipt date</Label>
            <Input id="grn-date" type="date" value={receiptDate} min={po.order_date} max={todayInLagos()} onChange={(e) => setReceiptDate(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="grn-reference">Delivery note / waybill</Label>
            <Input id="grn-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={64} />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="grn-notes">Notes</Label>
            <Textarea id="grn-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="What arrived"
          subtitle="Quantities are in the unit ordered. Accepted goods go into stock when the receipt is posted; rejected goods need a reason and stay with the vendor. Leave a line blank if none of it came."
        />
        <Table>
          <Thead>
            <tr>
              <Th>Item</Th>
              <Th align="right">Ordered</Th>
              <Th align="right">Outstanding</Th>
              <Th>Accepted</Th>
              <Th>Rejected</Th>
              <Th>Rejection reason</Th>
            </tr>
          </Thead>
          <tbody>
            {(po.lines ?? []).map((line) => {
              const draft = drafts[line.id];
              return (
                <tr key={line.id}>
                  <Td>
                    <div className="font-bold">{line.item_sku}</div>
                    <div className="text-[11px] text-ink-soft">{line.item_name}</div>
                  </Td>
                  <Td align="right">
                    {formatQuantity(line.quantity)} {line.unit_code}
                  </Td>
                  <Td align="right">
                    {formatQuantity(line.outstanding_quantity_base)} {line.base_unit_code}
                  </Td>
                  <Td>
                    <Input
                      aria-label={`Accepted ${line.item_sku}`}
                      inputMode="decimal"
                      value={draft.accepted}
                      onChange={(e) => update(line.id, { accepted: e.target.value })}
                    />
                  </Td>
                  <Td>
                    <Input
                      aria-label={`Rejected ${line.item_sku}`}
                      inputMode="decimal"
                      value={draft.rejected}
                      onChange={(e) => update(line.id, { rejected: e.target.value })}
                      placeholder="0"
                    />
                  </Td>
                  <Td>
                    <Input
                      aria-label={`Rejection reason ${line.item_sku}`}
                      value={draft.reason}
                      onChange={(e) => update(line.id, { reason: e.target.value })}
                      maxLength={500}
                      disabled={!Number(draft.rejected)}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : receipt ? "Save changes" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
