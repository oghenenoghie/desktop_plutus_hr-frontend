"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { AdjustmentForm, postOrSubmit } from "@/components/inventory/adjustment-form";
import { ApprovalCard, DocumentJournals } from "@/components/inventory/document-ui";
import { InventoryError, MoneyOrHidden, MovementsTable } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Label, Textarea } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { inventoryApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatDateTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import {
  REASON_LABELS,
  canAdjustInventory,
  canManageInventory,
  canOperateInventory,
  canSeeInventoryValues,
  formatQuantity,
  formatSignedQuantity,
} from "@/lib/inventory";
import type { InventoryAdjustment } from "@/lib/types";

function errorText(err: unknown): string {
  return err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.";
}

export default function StockAdjustmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = canManageInventory(user?.role);
  const canAdjust = canAdjustInventory(user?.role);
  const adjustment = useApiResource(() => inventoryApi.adjustment(id), [id]);
  const movements = useApiResource(() => inventoryApi.movements({ sourceId: id, limit: 500 }), [id]);
  const [editing, setEditing] = useState(false);
  const [reversing, setReversing] = useState(false);

  function reload() {
    adjustment.reload();
    movements.reload();
  }

  async function post(target: InventoryAdjustment) {
    try {
      showToast(await postOrSubmit(target), "good");
      reload();
    } catch (err) {
      showToast(errorText(err), "bad");
    }
  }

  async function remove(target: InventoryAdjustment) {
    try {
      await inventoryApi.deleteAdjustment(target.id);
      showToast(`${target.adjustment_number} deleted`, "good");
      router.push("/inventory/adjustments");
    } catch (err) {
      showToast(errorText(err), "bad");
    }
  }

  if (adjustment.loading && !adjustment.data) return <LoadingState />;
  if (adjustment.error) return <InventoryError message={adjustment.error} canManage={canManage} />;
  const data = adjustment.data;
  if (!data) return null;

  if (editing) {
    return (
      <div>
        <PageHeader title={`Edit ${data.adjustment_number}`} subtitle="Only a draft can be edited" />
        <AdjustmentForm
          adjustment={data}
          onCancel={() => setEditing(false)}
          onSaved={async (saved, postNow) => {
            setEditing(false);
            if (postNow) {
              await post(saved);
            } else {
              showToast(`${saved.adjustment_number} saved`, "good");
              reload();
            }
          }}
        />
      </div>
    );
  }

  const isDraft = data.status === "draft";
  const hasMovements = data.status === "posted" || data.status === "reversed";
  const showCost = (data.lines ?? []).some((line) => line.unit_cost_minor !== null);

  return (
    <div>
      <PageHeader
        title={data.adjustment_number}
        subtitle={`${REASON_LABELS[data.reason]} · ${data.warehouse_code} — ${data.warehouse_name}`}
        action={
          canAdjust ? (
            <div className="flex flex-wrap gap-2">
              {isDraft ? (
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <ConfirmActionButton
                    label="Delete"
                    confirmTitle={`Delete ${data.adjustment_number}?`}
                    confirmMessage="The draft and its lines are removed. Nothing has been posted, so stock is unaffected."
                    confirmLabel="Delete"
                    action={() => remove(data)}
                  />
                  {data.requires_approval ? (
                    <ConfirmActionButton
                      label="Submit for approval"
                      pendingLabel="Submitting…"
                      tone="primary"
                      confirmTitle={`Submit ${data.adjustment_number} for approval?`}
                      confirmMessage="It can't be edited while it waits. Once approved, it can be posted."
                      confirmLabel="Submit"
                      action={() => post(data)}
                    />
                  ) : (
                    <ConfirmActionButton
                      label="Post"
                      pendingLabel="Posting…"
                      tone="primary"
                      confirmTitle={`Post ${data.adjustment_number}?`}
                      confirmMessage="Stock changes immediately and the adjustment can no longer be edited — only reversed."
                      confirmLabel="Post"
                      action={() => post(data)}
                    />
                  )}
                </>
              ) : null}
              {data.status === "rejected" ? (
                <ConfirmActionButton
                  label="Delete"
                  confirmTitle={`Delete ${data.adjustment_number}?`}
                  confirmMessage="The rejected adjustment and its lines are removed. Stock is unaffected."
                  confirmLabel="Delete"
                  action={() => remove(data)}
                />
              ) : null}
              {data.status === "approved" ? (
                <ConfirmActionButton
                  label="Post"
                  pendingLabel="Posting…"
                  tone="primary"
                  confirmTitle={`Post ${data.adjustment_number}?`}
                  confirmMessage="Stock changes immediately and the adjustment can no longer be edited — only reversed."
                  confirmLabel="Post"
                  action={() => post(data)}
                />
              ) : null}
              {data.status === "posted" ? (
                <Button variant="secondary" onClick={() => setReversing(true)}>
                  Reverse
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-6">
        <Card>
          <div className="grid grid-cols-2 gap-4 text-[13px] sm:grid-cols-4">
            <Field label="Status">
              <StatusBadge status={data.status} />
            </Field>
            <Field label="Date">{formatDate(data.adjustment_date)}</Field>
            <Field label="Reason">{REASON_LABELS[data.reason]}</Field>
            <Field label="Net value">
              {hasMovements ? <MoneyOrHidden minor={data.value_minor} /> : <span className="text-ink-soft">On posting</span>}
            </Field>
            <Field label="Created">{formatDateTime(data.created_at)}</Field>
            {data.submitted_at ? <Field label="Submitted">{formatDateTime(data.submitted_at)}</Field> : null}
            {data.decided_at ? <Field label="Decided">{formatDateTime(data.decided_at)}</Field> : null}
            <Field label="Posted">{formatDateTime(data.posted_at)}</Field>
            {data.reversed_at ? <Field label="Reversed">{formatDateTime(data.reversed_at)}</Field> : null}
            {data.reversal_reason ? <Field label="Reversal reason">{data.reversal_reason}</Field> : null}
            {data.notes ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label="Notes">{data.notes}</Field>
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Lines" />
          <Table>
            <Thead>
              <tr>
                <Th>#</Th>
                <Th>Item</Th>
                <Th align="right">Quantity</Th>
                <Th align="right">In base unit</Th>
                {showCost ? <Th align="right">Unit cost</Th> : null}
              </tr>
            </Thead>
            <tbody>
              {(data.lines ?? []).map((line) => (
                <tr key={line.id}>
                  <Td>{line.line_no}</Td>
                  <Td>
                    <div className="font-bold">{line.item_sku}</div>
                    <div className="text-[11px] text-ink-soft">{line.item_name}</div>
                  </Td>
                  <Td align="right">
                    <span className={Number(line.quantity) > 0 ? "font-bold text-good" : "font-bold text-bad"}>
                      {formatSignedQuantity(line.quantity)}
                    </span>{" "}
                    <span className="text-[11px] text-ink-soft">{line.unit_code}</span>
                  </Td>
                  <Td align="right">{formatQuantity(line.quantity_base)}</Td>
                  {showCost ? (
                    <Td align="right">
                      {line.unit_cost_minor === null ? (
                        <span className="text-ink-soft">Average</span>
                      ) : (
                        <MoneyOrHidden minor={line.unit_cost_minor} />
                      )}
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {data.submitted_at ? (
          <ApprovalCard
            requestType="stock_adjustment"
            requestId={data.id}
            pending={data.status === "pending_approval"}
            canDecide={canOperateInventory(user?.role)}
            onDecide={async (approve, comment) => {
              try {
                await (approve
                  ? inventoryApi.approveAdjustment(data.id, comment)
                  : inventoryApi.rejectAdjustment(data.id, comment));
                showToast(approve ? "Approval recorded" : `${data.adjustment_number} rejected`, "good");
                reload();
              } catch (err) {
                showToast(errorText(err), "bad");
              }
            }}
          />
        ) : null}

        {hasMovements ? (
          <Card>
            <CardHeader
              title="Stock movements"
              subtitle="What this adjustment wrote to the stock ledger, including any reversal"
            />
            {movements.loading ? <LoadingState /> : null}
            {movements.data ? <MovementsTable movements={movements.data.items} /> : null}
          </Card>
        ) : null}

        {hasMovements && canSeeInventoryValues(user?.role) ? (
          <DocumentJournals documentType="stock_adjustment" documentId={data.id} version={data.status} />
        ) : null}
      </div>

      {reversing ? (
        <ReverseDrawer
          adjustment={data}
          onClose={() => setReversing(false)}
          onReversed={() => {
            setReversing(false);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">{label}</div>
      <div className="mt-1 text-ink">{children}</div>
    </div>
  );
}

function ReverseDrawer({
  adjustment,
  onClose,
  onReversed,
}: {
  adjustment: InventoryAdjustment;
  onClose: () => void;
  onReversed: () => void;
}) {
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await inventoryApi.reverseAdjustment(adjustment.id, reason);
      showToast(`${adjustment.adjustment_number} reversed`, "good");
      onReversed();
    } catch (err) {
      showToast(errorText(err), "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Reverse ${adjustment.adjustment_number}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Reversal writes compensating stock movements dated today. The original movements stay in the
          ledger. Stock this adjustment removed comes back at the value it left at; stock it added leaves
          at today&apos;s average cost. It can&apos;t be reversed if that stock has already been used.
        </p>
        <div>
          <Label htmlFor="reverse-reason">Reason</Label>
          <Textarea
            id="reverse-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            required
            placeholder="e.g. Counted in the wrong warehouse"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !reason.trim()}>
            {submitting ? "Reversing…" : "Reverse adjustment"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
