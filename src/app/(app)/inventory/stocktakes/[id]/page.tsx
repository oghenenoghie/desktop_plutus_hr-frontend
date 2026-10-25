"use client";

import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";

import {
  ApprovalCard,
  DocumentJournals,
  DocumentMovements,
  Field,
  errorText,
} from "@/components/inventory/document-ui";
import { InventoryError } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { inventoryApi, stocktakesApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import {
  TRACKED_ITEM_TYPES,
  canAdjustInventory,
  canManageInventory,
  canOperateInventory,
  formatQuantity,
  formatSignedQuantity,
  isPositive,
  isValidQuantityInput,
} from "@/lib/inventory";
import type { InventoryReportFormat, Stocktake, StocktakeLine } from "@/lib/types";

// The count shown for a line: what was typed since the last save, else
// what is stored ("" for not counted yet).
function shownCount(line: StocktakeLine, edits: Record<string, string>): string {
  if (line.id in edits) return edits[line.id];
  return line.counted_quantity === null ? "" : formatQuantity(line.counted_quantity);
}

function sameQuantity(typed: string, stored: string | null): boolean {
  if (typed.trim() === "") return stored === null;
  return stored !== null && Number(typed) === Number(stored);
}

export default function StocktakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canAct = canAdjustInventory(user?.role);
  const stocktake = useApiResource(() => stocktakesApi.get(id), [id]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const doc = stocktake.data;
  const changed = useMemo(
    () =>
      (doc?.lines ?? []).filter(
        (line) => line.id in edits && !sameQuantity(edits[line.id], line.counted_quantity),
      ),
    [doc, edits],
  );

  async function act(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      showToast(label, "good");
      stocktake.reload();
    } catch (err) {
      showToast(errorText(err), "bad");
    }
  }

  async function saveCounts(): Promise<boolean> {
    if (!doc || changed.length === 0) return true;
    const invalid = changed.find((line) => {
      const typed = edits[line.id].trim();
      return typed !== "" && !isValidQuantityInput(typed);
    });
    if (invalid) {
      showToast(`Line ${invalid.line_no}: enter a number of ${invalid.base_unit_code}, or leave it blank.`, "bad");
      return false;
    }
    setSaving(true);
    try {
      await stocktakesApi.recordCounts(
        doc.id,
        changed.map((line) => {
          const typed = edits[line.id].trim();
          return { line_id: line.id, counted_quantity: typed === "" ? null : typed };
        }),
      );
      setEdits({});
      showToast(`${changed.length} count${changed.length === 1 ? "" : "s"} saved`, "good");
      stocktake.reload();
      return true;
    } catch (err) {
      showToast(errorText(err), "bad");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function download(format: InventoryReportFormat) {
    if (!doc) return;
    try {
      await stocktakesApi.download(doc.id, doc.stocktake_number, format);
    } catch (err) {
      showToast(errorText(err, "Download failed."), "bad");
    }
  }

  if (stocktake.loading && !doc) return <LoadingState />;
  if (stocktake.error) return <InventoryError message={stocktake.error} canManage={canManageInventory(user?.role)} />;
  if (!doc) return null;

  const counting = doc.status === "counting";
  const lines = doc.lines ?? [];
  const showValues = doc.gain_value_minor !== null;
  const uncounted = doc.line_count - doc.counted_count;

  return (
    <div>
      <PageHeader
        title={doc.stocktake_number}
        subtitle={`${doc.warehouse_code} — ${doc.category_name ? `${doc.category_name} only` : "every item"}`}
        action={
          <div className="flex flex-wrap gap-2">
            {doc.status !== "draft" ? (
              <>
                <Button variant="secondary" onClick={() => void download("pdf")}>
                  {counting ? "Count sheet (PDF)" : "PDF"}
                </Button>
                <Button variant="secondary" onClick={() => void download("csv")}>
                  CSV
                </Button>
              </>
            ) : null}
            {canAct && doc.status === "draft" ? (
              <>
                <ConfirmActionButton
                  label="Delete"
                  confirmTitle={`Delete ${doc.stocktake_number}?`}
                  confirmMessage="The draft is removed; nothing has been counted."
                  confirmLabel="Delete"
                  action={async () => {
                    try {
                      await stocktakesApi.remove(doc.id);
                      showToast(`${doc.stocktake_number} deleted`, "good");
                      router.push("/inventory/stocktakes");
                    } catch (err) {
                      showToast(errorText(err), "bad");
                    }
                  }}
                />
                <ConfirmActionButton
                  label="Start count"
                  tone="primary"
                  confirmTitle={`Start ${doc.stocktake_number}?`}
                  confirmMessage={`The books for ${doc.warehouse_code} are snapshotted now. Documents can keep posting while you count; only the difference between your count and this snapshot is posted.`}
                  confirmLabel="Start count"
                  action={() => act(`${doc.stocktake_number} started`, () => stocktakesApi.start(doc.id))}
                />
              </>
            ) : null}
            {canAct && counting ? (
              <>
                <Button variant="secondary" onClick={() => setAdding(true)}>
                  Add found item
                </Button>
                <Button variant="secondary" disabled={saving || changed.length === 0} onClick={() => void saveCounts()}>
                  {saving ? "Saving…" : changed.length ? `Save ${changed.length} count${changed.length === 1 ? "" : "s"}` : "Counts saved"}
                </Button>
                <ConfirmActionButton
                  label="Submit"
                  tone="primary"
                  disabled={saving}
                  confirmTitle={`Submit ${doc.stocktake_number}?`}
                  confirmMessage="Counts are locked in. Missing stock, or found stock over the adjustment limit, goes for approval; anything else is approved at once."
                  confirmLabel="Submit"
                  action={async () => {
                    if (!(await saveCounts())) return;
                    await act(`${doc.stocktake_number} submitted`, () => stocktakesApi.submit(doc.id));
                  }}
                />
              </>
            ) : null}
            {canAct && doc.status === "approved" ? (
              <ConfirmActionButton
                label="Post"
                tone="primary"
                confirmTitle={`Post ${doc.stocktake_number}?`}
                confirmMessage={`The differences are posted to stock on ${formatDate(doc.count_date)}${showValues ? ` (found ${formatMoney(doc.gain_value_minor ?? 0)}, missing ${formatMoney(doc.loss_value_minor ?? 0)} at today's average cost)` : ""}. This can't be undone; correct a mistake with an adjustment.`}
                confirmLabel="Post"
                action={() => act(`${doc.stocktake_number} posted`, () => stocktakesApi.post(doc.id))}
              />
            ) : null}
            {canAct && ["counting", "pending_approval", "approved", "rejected"].includes(doc.status) ? (
              <ConfirmActionButton
                label="Cancel stocktake"
                confirmTitle={`Cancel ${doc.stocktake_number}?`}
                confirmMessage="The count is closed without posting anything."
                confirmLabel="Cancel stocktake"
                action={() => act(`${doc.stocktake_number} cancelled`, () => stocktakesApi.cancel(doc.id))}
              />
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Status">
              <StatusBadge status={doc.status} />
            </Field>
            <Field label="Count date">{formatDate(doc.count_date)}</Field>
            <Field label="Warehouse">
              {doc.warehouse_code} — {doc.warehouse_name}
            </Field>
            <Field label="Snapshot taken">{doc.cutoff_at ? formatDateTime(doc.cutoff_at) : "When the count starts"}</Field>
            {doc.status !== "draft" ? (
              <>
                <Field label="Counted">
                  {doc.counted_count} of {doc.line_count}
                </Field>
                <Field label="Differences">{doc.variance_count}</Field>
                {showValues ? <Field label="Found">{formatMoney(doc.gain_value_minor ?? 0)}</Field> : null}
                {showValues ? <Field label="Missing">{formatMoney(doc.loss_value_minor ?? 0)}</Field> : null}
              </>
            ) : null}
            {doc.posted_at ? <Field label="Posted">{formatDateTime(doc.posted_at)}</Field> : null}
            {doc.cancelled_at ? <Field label="Cancelled">{formatDateTime(doc.cancelled_at)}</Field> : null}
            {doc.notes ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label="Notes">{doc.notes}</Field>
              </div>
            ) : null}
          </div>
          {counting && doc.needs_approval !== null ? (
            <p className="mt-4 text-[12px] text-ink-soft">
              {doc.needs_approval
                ? "Submitting will send this count for approval: stock is missing, or the stock found reaches the adjustment approval limit."
                : "Submitting will approve this count at once: nothing is missing and the stock found is under the approval limit."}
            </p>
          ) : null}
          {counting && uncounted > 0 ? (
            <p className="mt-4 text-[12px] text-ink-soft">
              {uncounted} line{uncounted === 1 ? "" : "s"} still to count. Enter 0 for stock that isn&apos;t there.
            </p>
          ) : null}
        </Card>

        {doc.status === "draft" ? (
          <Card>
            <CardHeader
              title="Ready to count"
              subtitle="Start the count to list every item the books hold in this warehouse, with the quantity expected at that moment."
            />
          </Card>
        ) : (
          <Card>
            <CardHeader
              title="Count"
              subtitle="Quantities are in each item's base unit. Expected is the books at the snapshot; posting applies only the difference."
            />
            <Table>
              <Thead>
                <tr>
                  <Th>#</Th>
                  <Th>Item</Th>
                  <Th>Lot</Th>
                  <Th align="right">Expected</Th>
                  <Th align="right">Counted</Th>
                  <Th align="right">Difference</Th>
                  {showValues ? <Th align="right">Value</Th> : null}
                  {counting && canAct ? <Th align="right"> </Th> : null}
                </tr>
              </Thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <Td>{line.line_no}</Td>
                    <Td>
                      <div className="font-bold">{line.sku}</div>
                      <div className="text-[11px] text-ink-soft">
                        {line.item_name}
                        {line.added_during_count ? " · found during the count" : ""}
                      </div>
                    </Td>
                    <Td>
                      {line.lot_number ? (
                        <>
                          <div>{line.lot_number}</div>
                          {line.expiry_date ? (
                            <div className="text-[11px] text-ink-soft">expires {formatDate(line.expiry_date)}</div>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td align="right">
                      {formatQuantity(line.expected_quantity)}{" "}
                      <span className="text-[11px] text-ink-soft">{line.base_unit_code}</span>
                    </Td>
                    <Td align="right">
                      {counting && canAct ? (
                        <Input
                          id={`count-${line.line_no}`}
                          aria-label={`Counted ${line.sku}${line.lot_number ? ` lot ${line.lot_number}` : ""}`}
                          className="ml-auto w-28 text-right"
                          inputMode="decimal"
                          value={shownCount(line, edits)}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [line.id]: e.target.value }))}
                        />
                      ) : line.counted_quantity === null ? (
                        "—"
                      ) : (
                        formatQuantity(line.counted_quantity)
                      )}
                    </Td>
                    <Td align="right">
                      {line.variance === null ? (
                        "—"
                      ) : Number(line.variance) === 0 ? (
                        <span className="text-ink-soft">0</span>
                      ) : (
                        <span className={isPositive(line.variance) ? "font-bold text-good-ink" : "font-bold text-bad"}>
                          {formatSignedQuantity(line.variance)}
                        </span>
                      )}
                    </Td>
                    {showValues ? (
                      <Td align="right">
                        {line.variance_value_minor === null || line.variance === null
                          ? "—"
                          : formatMoney(line.variance_value_minor)}
                      </Td>
                    ) : null}
                    {counting && canAct ? (
                      <Td align="right">
                        {line.added_during_count ? (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              void act(`Line ${line.line_no} removed`, () => stocktakesApi.removeLine(doc.id, line.id))
                            }
                          >
                            Remove
                          </Button>
                        ) : null}
                      </Td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </Table>
            {lines.length === 0 ? (
              <p className="mt-3 text-[12px] text-ink-soft">
                The books held nothing here at the snapshot. Add anything you find on the shelves.
              </p>
            ) : null}
          </Card>
        )}

        {["pending_approval", "approved", "rejected", "posted"].includes(doc.status) && doc.submitted_at ? (
          <ApprovalCard
            requestType="stocktake"
            requestId={doc.id}
            pending={doc.status === "pending_approval"}
            canDecide={canOperateInventory(user?.role)}
            onDecide={async (approve, comment) => {
              try {
                if (approve) await stocktakesApi.approve(doc.id, comment);
                else await stocktakesApi.reject(doc.id, comment);
                showToast(`${doc.stocktake_number} ${approve ? "approved" : "rejected"}`, "good");
                stocktake.reload();
              } catch (err) {
                showToast(errorText(err), "bad");
              }
            }}
          />
        ) : null}

        {doc.status === "posted" ? (
          <>
            <DocumentMovements sourceId={doc.id} version={doc.status} />
            <DocumentJournals documentType="stocktake" documentId={doc.id} version={doc.status} />
          </>
        ) : null}
      </div>

      {adding ? (
        <AddFoundLine
          stocktake={doc}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            stocktake.reload();
          }}
        />
      ) : null}
    </div>
  );
}

// Stock on the shelves that the snapshot didn't list: an item (or a lot)
// the books held none of here at the cutoff.
function AddFoundLine({
  stocktake,
  onClose,
  onAdded,
}: {
  stocktake: Stocktake;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const items = useApiResource(() => inventoryApi.items());
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  const candidates = (items.data ?? []).filter(
    (item) =>
      item.is_active &&
      TRACKED_ITEM_TYPES.includes(item.item_type) &&
      (stocktake.category_id === null || item.category_id === stocktake.category_id),
  );
  const item = candidates.find((candidate) => candidate.id === itemId) ?? null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!item) return showToast("Choose an item.", "bad");
    if (!isValidQuantityInput(quantity)) return showToast(`Enter the quantity counted in ${item.base_unit_code}.`, "bad");
    setSaving(true);
    try {
      await stocktakesApi.addLine(stocktake.id, {
        item_id: item.id,
        counted_quantity: quantity,
        lot_number: item.track_lots ? lotNumber.trim() || null : null,
        expiry_date: item.track_expiry ? expiry || null : null,
      });
      showToast(`${item.sku} added`, "good");
      onAdded();
    } catch (err) {
      showToast(errorText(err), "bad");
      setSaving(false);
    }
  }

  return (
    <Drawer title="Add found item" onClose={onClose}>
      {items.loading ? <LoadingState /> : null}
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="found-item">Item</Label>
          <Select id="found-item" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
            <option value="">Choose…</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.sku} — {candidate.name}
              </option>
            ))}
          </Select>
        </div>
        {item?.track_lots ? (
          <div>
            <Label htmlFor="found-lot">Lot number</Label>
            <Input id="found-lot" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} maxLength={64} required />
          </div>
        ) : null}
        {item?.track_expiry ? (
          <div>
            <Label htmlFor="found-expiry">Expiry date</Label>
            <Input id="found-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            <p className="mt-1 text-[11px] text-ink-soft">Needed for a lot the books don&apos;t know yet.</p>
          </div>
        ) : null}
        <div>
          <Label htmlFor="found-quantity">Counted{item ? ` (${item.base_unit_code})` : ""}</Label>
          <Input id="found-quantity" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add line"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
