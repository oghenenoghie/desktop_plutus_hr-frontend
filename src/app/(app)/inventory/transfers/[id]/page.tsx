"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { ApprovalCard, DocumentMovements, Field, errorText } from "@/components/inventory/document-ui";
import { InventoryError } from "@/components/inventory/inventory-ui";
import { StockTransferForm } from "@/components/inventory/stock-transfer-form";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { inventoryApi, stockTransfersApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatDateTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory, canOperateInventory, formatQuantity, todayInLagos } from "@/lib/inventory";
import type { StockTransfer } from "@/lib/types";

export default function StockTransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canAct = canOperateInventory(user?.role);
  const transfer = useApiResource(() => stockTransfersApi.get(id), [id]);
  const settings = useApiResource(
    () => (canAct ? inventoryApi.settings() : Promise.resolve(null)),
    [canAct],
  );
  const [editing, setEditing] = useState(false);
  const [receiving, setReceiving] = useState(false);

  async function act(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      showToast(label, "good");
      transfer.reload();
    } catch (err) {
      showToast(errorText(err), "bad");
    }
  }

  if (transfer.loading && !transfer.data) return <LoadingState />;
  if (transfer.error) return <InventoryError message={transfer.error} canManage={canManageInventory(user?.role)} />;
  const doc = transfer.data;
  if (!doc) return null;

  if (editing) {
    return (
      <div>
        <PageHeader title={`Edit ${doc.transfer_number}`} subtitle="Only a draft can be edited" />
        <StockTransferForm
          transfer={doc}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            showToast(`${doc.transfer_number} saved`, "good");
            transfer.reload();
          }}
        />
      </div>
    );
  }

  const approvalOff = settings.data ? !settings.data.require_transfer_approval : false;
  const canDispatch = doc.status === "approved" || (doc.status === "draft" && approvalOff);
  const dispatched = doc.status === "in_transit" || doc.status === "received";

  return (
    <div>
      <PageHeader
        title={doc.transfer_number}
        subtitle={`${doc.from_warehouse_code} → ${doc.to_warehouse_code}`}
        action={
          canAct ? (
            <div className="flex flex-wrap gap-2">
              {doc.status === "draft" ? (
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  {approvalOff ? null : (
                    <Button onClick={() => act(`${doc.transfer_number} submitted for approval`, () => stockTransfersApi.submit(doc.id))}>
                      Submit for approval
                    </Button>
                  )}
                </>
              ) : null}
              {doc.status === "draft" || doc.status === "rejected" ? (
                <ConfirmActionButton
                  label="Delete"
                  confirmTitle={`Delete ${doc.transfer_number}?`}
                  confirmMessage="The transfer is removed; no stock has moved."
                  confirmLabel="Delete"
                  action={async () => {
                    try {
                      await stockTransfersApi.remove(doc.id);
                      showToast(`${doc.transfer_number} deleted`, "good");
                      router.push("/inventory/transfers");
                    } catch (err) {
                      showToast(errorText(err), "bad");
                    }
                  }}
                />
              ) : null}
              {["draft", "pending_approval", "approved"].includes(doc.status) ? (
                <ConfirmActionButton
                  label="Cancel transfer"
                  confirmTitle={`Cancel ${doc.transfer_number}?`}
                  confirmMessage="The transfer is closed without any stock moving."
                  confirmLabel="Cancel transfer"
                  action={() => act(`${doc.transfer_number} cancelled`, () => stockTransfersApi.cancel(doc.id))}
                />
              ) : null}
              {canDispatch ? (
                <ConfirmActionButton
                  label="Dispatch"
                  confirmTitle={`Dispatch ${doc.transfer_number}?`}
                  confirmMessage={`The stock leaves ${doc.from_warehouse_code} today and sits in transit until ${doc.to_warehouse_code} receives it.`}
                  confirmLabel="Dispatch"
                  action={() => act(`${doc.transfer_number} dispatched`, () => stockTransfersApi.dispatch(doc.id))}
                />
              ) : null}
              {doc.status === "in_transit" ? (
                <Button onClick={() => setReceiving(true)}>Receive at {doc.to_warehouse_code}</Button>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-6">
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Status">
              <StatusBadge status={doc.status} />
            </Field>
            <Field label="Transfer date">{formatDate(doc.transfer_date)}</Field>
            <Field label="From">
              {doc.from_warehouse_code} — {doc.from_warehouse_name}
            </Field>
            <Field label="To">
              {doc.to_warehouse_code} — {doc.to_warehouse_name}
            </Field>
            <Field label="Dispatched">{formatDateTime(doc.dispatched_at)}</Field>
            <Field label="Received">{formatDateTime(doc.received_at)}</Field>
            {doc.cancelled_at ? <Field label="Cancelled">{formatDateTime(doc.cancelled_at)}</Field> : null}
            {doc.discrepancy_reason ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label="Shortfall written off because">{doc.discrepancy_reason}</Field>
              </div>
            ) : null}
            {doc.notes ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label="Notes">{doc.notes}</Field>
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Items" subtitle={dispatched ? "Dispatched and received quantities are in each item's base unit" : undefined} />
          <Table>
            <Thead>
              <tr>
                <Th>Item</Th>
                <Th align="right">Quantity</Th>
                {dispatched ? <Th align="right">Dispatched</Th> : null}
                {dispatched ? <Th align="right">Received</Th> : null}
              </tr>
            </Thead>
            <tbody>
              {(doc.lines ?? []).map((line) => (
                <tr key={line.id}>
                  <Td>
                    <div className="font-bold">{line.item_sku}</div>
                    <div className="text-[11px] text-ink-soft">{line.item_name}</div>
                  </Td>
                  <Td align="right">
                    {formatQuantity(line.quantity)} {line.unit_code}
                  </Td>
                  {dispatched ? (
                    <Td align="right">
                      {formatQuantity(line.dispatched_quantity_base)} {line.base_unit_code}
                    </Td>
                  ) : null}
                  {dispatched ? (
                    <Td align="right">
                      {line.received_quantity_base === null
                        ? "—"
                        : `${formatQuantity(line.received_quantity_base)} ${line.base_unit_code}`}
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {dispatched ? <DocumentMovements sourceId={doc.id} version={doc.status} /> : null}

        {doc.submitted_at ? (
          <ApprovalCard
            requestType="stock_transfer"
            requestId={doc.id}
            pending={doc.status === "pending_approval"}
            canDecide={canAct}
            onDecide={async (approve, comment) => {
              try {
                await (approve ? stockTransfersApi.approve(doc.id, comment) : stockTransfersApi.reject(doc.id, comment));
                showToast(approve ? "Approval recorded" : `${doc.transfer_number} rejected`, "good");
                transfer.reload();
              } catch (err) {
                showToast(errorText(err), "bad");
              }
            }}
          />
        ) : null}
      </div>

      {receiving ? (
        <ReceiveDrawer
          transfer={doc}
          onClose={() => setReceiving(false)}
          onReceived={() => {
            setReceiving(false);
            showToast(`${doc.transfer_number} received`, "good");
            transfer.reload();
          }}
        />
      ) : null}
    </div>
  );
}

const QUANTITY = /^\d+(\.\d{1,4})?$/;

// Confirms what arrived. Every line must be accounted for; anything short
// of what was dispatched is written off from transit as a loss, with a reason.
function ReceiveDrawer({
  transfer,
  onClose,
  onReceived,
}: {
  transfer: StockTransfer;
  onClose: () => void;
  onReceived: () => void;
}) {
  const { showToast } = useToast();
  const lines = transfer.lines ?? [];
  const [received, setReceived] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((line) => [line.id, String(Number(line.dispatched_quantity_base ?? 0))])),
  );
  const [receiptDate, setReceiptDate] = useState(todayInLagos());
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const short = lines.some(
    (line) => QUANTITY.test(received[line.id] ?? "") && Number(received[line.id]) < Number(line.dispatched_quantity_base ?? 0),
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    for (const line of lines) {
      const value = (received[line.id] ?? "").trim();
      if (!QUANTITY.test(value)) {
        return showToast(`${line.item_sku}: enter the quantity received (0 if none arrived).`, "bad");
      }
      if (Number(value) > Number(line.dispatched_quantity_base ?? 0)) {
        return showToast(`${line.item_sku}: more than was dispatched.`, "bad");
      }
    }
    if (short && !reason.trim()) return showToast("Say why some of the stock didn't arrive.", "bad");
    setBusy(true);
    try {
      await stockTransfersApi.receive(transfer.id, {
        receipt_date: receiptDate,
        lines: lines.map((line) => ({ line_id: line.id, received_quantity_base: received[line.id].trim() })),
        discrepancy_reason: short ? reason.trim() : null,
      });
      onReceived();
    } catch (err) {
      showToast(errorText(err), "bad");
      setBusy(false);
    }
  }

  return (
    <Drawer title={`Receive ${transfer.transfer_number}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Enter what arrived at {transfer.to_warehouse_code}, in each item&apos;s base unit. Anything short of what was
          dispatched is written off from transit as a loss.
        </p>
        <div>
          <Label htmlFor="receive-date">Received on</Label>
          <Input
            id="receive-date"
            type="date"
            value={receiptDate}
            min={transfer.transfer_date}
            max={todayInLagos()}
            onChange={(e) => setReceiptDate(e.target.value)}
            required
          />
        </div>
        {lines.map((line) => (
          <div key={line.id}>
            <Label htmlFor={`receive-${line.id}`}>
              {line.item_sku} — dispatched {formatQuantity(line.dispatched_quantity_base)} {line.base_unit_code}
            </Label>
            <Input
              id={`receive-${line.id}`}
              inputMode="decimal"
              value={received[line.id] ?? ""}
              onChange={(e) => setReceived((current) => ({ ...current, [line.id]: e.target.value }))}
            />
          </div>
        ))}
        {short ? (
          <div>
            <Label htmlFor="receive-reason">Why is it short?</Label>
            <Textarea id="receive-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} required />
          </div>
        ) : null}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Receiving…" : "Receive"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
