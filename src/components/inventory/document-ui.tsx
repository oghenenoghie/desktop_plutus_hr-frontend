"use client";

import { useState } from "react";

import { ApprovalHistoryPanel } from "@/components/approval-history-panel";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { MovementsTable } from "@/components/inventory/inventory-ui";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { approvalInstancesApi, inventoryApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { TRACKED_ITEM_TYPES, formatQuantity, isValidQuantityInput } from "@/lib/inventory";
import type {
  ApprovalRequestType,
  InventoryDocumentType,
  InventoryItem,
  JournalEntry,
  StockLineInput,
} from "@/lib/types";

export function errorText(err: unknown, fallback = "Action failed."): string {
  return err instanceof ApiError ? String(err.detail ?? err.message) : fallback;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">{label}</div>
      <div className="mt-1 text-[13px] text-ink">{children}</div>
    </div>
  );
}

// Approval history for a document, plus approve / reject buttons while it
// waits for a decision. The API decides whether this user may sign the
// current step; a refusal comes back as a toast.
export function ApprovalCard({
  requestType,
  requestId,
  pending,
  canDecide,
  onDecide,
}: {
  requestType: ApprovalRequestType;
  requestId: string;
  pending: boolean;
  canDecide: boolean;
  onDecide: (approve: boolean, comment: string) => Promise<void>;
}) {
  const history = useApiResource(
    () => approvalInstancesApi.forRequest(requestType, requestId),
    [requestType, requestId, pending],
  );
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      await onDecide(approve, comment);
      setComment("");
      history.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Approval"
        subtitle={
          pending
            ? `Waiting for a decision${history.data ? ` at step ${history.data.current_step}` : ""}`
            : "Decisions recorded for this document"
        }
      />
      <ApprovalHistoryPanel loading={history.loading} instance={history.data} />
      {pending && canDecide ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor={`decision-comment-${requestId}`}>Comment</Label>
            <Input
              id={`decision-comment-${requestId}`}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
              placeholder="Optional"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => void decide(false)}>
              Reject
            </Button>
            <Button disabled={busy} onClick={() => void decide(true)}>
              Approve
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

// What a document wrote to the stock ledger, including any reversal.
// `version` changes whenever the document does, so the list refreshes.
export function DocumentMovements({ sourceId, version }: { sourceId: string; version: string }) {
  const movements = useApiResource(
    () => inventoryApi.movements({ sourceId, limit: 500 }),
    [sourceId, version],
  );
  return (
    <Card>
      <CardHeader title="Stock movements" subtitle="What this document wrote to the stock ledger, including any reversal" />
      {movements.loading && !movements.data ? <LoadingState /> : null}
      {movements.data ? <MovementsTable movements={movements.data.items} /> : null}
    </Card>
  );
}

const JOURNAL_EVENTS: Record<string, string> = {
  posted: "Posted",
  reversal_variance: "Cost variance on reversal",
  reversed: "Reversed",
  transit_loss: "Transit loss",
  "journal.reversed": "Reversal",
};

function JournalCard({ journal }: { journal: JournalEntry }) {
  return (
    <div className="rounded-panel border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink">{JOURNAL_EVENTS[journal.source_event] ?? journal.source_event}</span>
          {journal.reversal_of_id ? <Badge tone="warn">Reversal</Badge> : null}
        </div>
        <span className="text-ink-soft">{formatDate(journal.entry_date)}</span>
      </div>
      <p className="mb-2 text-[12px] text-ink-soft">{journal.description}</p>
      <Table>
        <Thead>
          <tr>
            <Th>Account</Th>
            <Th align="right">Debit</Th>
            <Th align="right">Credit</Th>
          </tr>
        </Thead>
        <tbody>
          {journal.lines.map((line) => (
            <tr key={line.id}>
              <Td>
                <div className="font-bold">{line.account_name ?? line.account}</div>
                <div className="text-[11px] text-ink-soft">{line.account}</div>
              </Td>
              <Td align="right">{line.debit_minor ? formatMoney(line.debit_minor) : ""}</Td>
              <Td align="right">{line.credit_minor ? formatMoney(line.credit_minor) : ""}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

// The journals a document posted to the general ledger (Phase 3), with any
// reversal. Values are financial: render this only for inventory.valuation
// holders. `version` changes whenever the document does.
export function DocumentJournals({
  documentType,
  documentId,
  version,
}: {
  documentType: InventoryDocumentType;
  documentId: string;
  version: string;
}) {
  const journals = useApiResource(
    () => inventoryApi.journals(documentType, documentId),
    [documentType, documentId, version],
  );
  return (
    <Card>
      <CardHeader title="Accounting" subtitle="The journals this document posted to the general ledger" />
      {journals.loading && !journals.data ? <LoadingState /> : null}
      {journals.error ? <p className="text-[13px] text-ink-soft">{journals.error}</p> : null}
      {journals.data && journals.data.length === 0 ? (
        <p className="text-[13px] text-ink-soft">
          No journal: nothing of value moved, or the document was posted before inventory accounting started.
        </p>
      ) : null}
      {journals.data && journals.data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {journals.data.map((journal) => (
            <JournalCard key={journal.id} journal={journal} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

// A drawer asking for the reason behind a consequential action (reverse,
// cancel, close). The reason is recorded on the document and in the audit
// trail.
export function ReasonDrawer({
  title,
  explanation,
  actionLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  explanation: string;
  actionLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer title={title} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">{explanation}</p>
        <div>
          <Label htmlFor="action-reason">Reason</Label>
          <Textarea
            id="action-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !reason.trim()}>
            {busy ? "Working…" : actionLabel}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

export interface StockLineDraft {
  key: number;
  itemId: string;
  unitId: string;
  quantity: string;
}

export function blankStockLine(key: number): StockLineDraft {
  return { key, itemId: "", unitId: "", quantity: "" };
}

export function stockLinesFrom(
  lines: { item_id: string; unit_id: string; quantity: string }[] | null | undefined,
): StockLineDraft[] {
  if (!lines?.length) return [blankStockLine(0)];
  return lines.map((line, index) => ({
    key: index,
    itemId: line.item_id,
    unitId: line.unit_id,
    quantity: String(Number(line.quantity)),
  }));
}

// Validates and converts drafted lines; returns an error message instead
// when something is missing or malformed.
export function stockLinesBody(lines: StockLineDraft[]): StockLineInput[] | string {
  const filled = lines.filter((line) => line.itemId);
  if (filled.length === 0) return "Add at least one item.";
  if (filled.some((line) => !isValidQuantityInput(line.quantity))) {
    return "Each quantity must be a positive number with at most 4 decimal places.";
  }
  return filled.map((line) => ({
    item_id: line.itemId,
    unit_id: line.unitId || null,
    quantity: line.quantity.trim(),
  }));
}

// Item / unit / quantity rows for issues and transfers: stock and
// consumable items only, in their base unit or one of their conversions.
export function StockLinesEditor({
  items,
  lines,
  onChange,
  idPrefix,
}: {
  items: InventoryItem[];
  lines: StockLineDraft[];
  onChange: (lines: StockLineDraft[]) => void;
  idPrefix: string;
}) {
  const tracked = items.filter((item) => TRACKED_ITEM_TYPES.includes(item.item_type));
  const byId = new Map(tracked.map((item) => [item.id, item]));
  const nextKey = lines.reduce((max, line) => Math.max(max, line.key), -1) + 1;

  function update(key: number, patch: Partial<StockLineDraft>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, index) => {
        const item = byId.get(line.itemId);
        return (
          <div
            key={line.key}
            className="grid grid-cols-1 items-end gap-3 rounded-panel border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
          >
            <div>
              <Label htmlFor={`${idPrefix}-item-${line.key}`}>Item {index + 1}</Label>
              <Select
                id={`${idPrefix}-item-${line.key}`}
                value={line.itemId}
                onChange={(event) => update(line.key, { itemId: event.target.value, unitId: "" })}
              >
                <option value="">Choose an item…</option>
                {tracked.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.sku} — {option.name} ({formatQuantity(option.quantity_on_hand)}{" "}
                    {option.base_unit_code} on hand)
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`${idPrefix}-qty-${line.key}`}>Quantity</Label>
              <Input
                id={`${idPrefix}-qty-${line.key}`}
                inputMode="decimal"
                value={line.quantity}
                onChange={(event) => update(line.key, { quantity: event.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor={`${idPrefix}-unit-${line.key}`}>Unit</Label>
              <Select
                id={`${idPrefix}-unit-${line.key}`}
                value={line.unitId || item?.base_unit_id || ""}
                onChange={(event) => update(line.key, { unitId: event.target.value })}
                disabled={!item}
              >
                {item ? (
                  <>
                    <option value={item.base_unit_id}>{item.base_unit_code} (base)</option>
                    {item.units.map((unit) => (
                      <option key={unit.unit_id} value={unit.unit_id}>
                        {unit.unit_code} ({formatQuantity(unit.factor_to_base)} {item.base_unit_code})
                      </option>
                    ))}
                  </>
                ) : null}
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              aria-label={`Remove line ${index + 1}`}
              disabled={lines.length === 1}
              onClick={() => onChange(lines.filter((other) => other.key !== line.key))}
            >
              ✕
            </Button>
          </div>
        );
      })}
      <div>
        <Button type="button" variant="secondary" onClick={() => onChange([...lines, blankStockLine(nextKey)])}>
          Add line
        </Button>
      </div>
    </div>
  );
}
