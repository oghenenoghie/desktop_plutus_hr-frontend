"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { DocumentJournals, DocumentMovements, Field, ReasonDrawer, errorText } from "@/components/inventory/document-ui";
import { GoodsReceiptForm } from "@/components/inventory/goods-receipt-form";
import { InventoryError } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { goodsReceiptsApi, purchaseOrdersApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory, canOperateInventory, canSeeInventoryValues, formatQuantity } from "@/lib/inventory";

export default function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canAct = canOperateInventory(user?.role);
  const receipt = useApiResource(() => goodsReceiptsApi.get(id), [id]);
  const [editing, setEditing] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [posting, setPosting] = useState(false);

  if (receipt.loading && !receipt.data) return <LoadingState />;
  if (receipt.error) return <InventoryError message={receipt.error} canManage={canManageInventory(user?.role)} />;
  const grn = receipt.data;
  if (!grn) return null;

  if (editing) {
    return (
      <div>
        <PageHeader title={`Edit ${grn.grn_number}`} subtitle="Only a draft can be edited" />
        <EditReceipt
          purchaseOrderId={grn.purchase_order_id}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            showToast(`${grn.grn_number} saved`, "good");
            receipt.reload();
          }}
          receiptId={grn.id}
        />
      </div>
    );
  }

  async function post() {
    if (!grn) return;
    setPosting(true);
    try {
      await goodsReceiptsApi.post(grn.id);
      showToast(`${grn.grn_number} posted — stock updated`, "good");
      receipt.reload();
    } catch (err) {
      showToast(errorText(err), "bad");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={grn.grn_number}
        subtitle={`${grn.vendor_name} · ${grn.po_number}`}
        action={
          canAct ? (
            <div className="flex flex-wrap gap-2">
              {grn.status === "draft" ? (
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <ConfirmActionButton
                    label="Delete"
                    confirmTitle={`Delete ${grn.grn_number}?`}
                    confirmMessage="The draft receipt is removed; nothing has been put into stock."
                    confirmLabel="Delete"
                    action={async () => {
                      try {
                        await goodsReceiptsApi.remove(grn.id);
                        showToast(`${grn.grn_number} deleted`, "good");
                        router.push("/inventory/goods-receipts");
                      } catch (err) {
                        showToast(errorText(err), "bad");
                      }
                    }}
                  />
                  <Button onClick={post} disabled={posting}>
                    {posting ? "Posting…" : "Post receipt"}
                  </Button>
                </>
              ) : null}
              {grn.status === "posted" ? (
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Status">
              <StatusBadge status={grn.status} />
            </Field>
            <Field label="Purchase order">
              <Link href={`/inventory/purchase-orders/${grn.purchase_order_id}`} className="font-bold text-primary hover:underline">
                {grn.po_number}
              </Link>
            </Field>
            <Field label="Received">{formatDate(grn.receipt_date)}</Field>
            <Field label="Warehouse">
              {grn.warehouse_code} — {grn.warehouse_name}
            </Field>
            <Field label="Delivery note">{grn.supplier_reference ?? "—"}</Field>
            <Field label="Stock value">{grn.value_minor === null ? "—" : formatMoney(grn.value_minor)}</Field>
            <Field label="Posted">{formatDateTime(grn.posted_at)}</Field>
            {grn.accrued_minor !== null ? (
              <Field label="Accrued to GRNI">{formatMoney(grn.accrued_minor)}</Field>
            ) : null}
            {grn.bill_number ? (
              <Field label="Invoiced by">
                <Link href="/bills" className="font-bold text-primary hover:underline">
                  {grn.bill_number}
                </Link>{" "}
                <span className="text-[11px] text-ink-soft">({grn.bill_status})</span>
              </Field>
            ) : null}
            {grn.reversed_at ? <Field label="Reversed">{formatDateTime(grn.reversed_at)}</Field> : null}
            {grn.reversal_reason ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label="Reversed because">{grn.reversal_reason}</Field>
              </div>
            ) : null}
            {grn.notes ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label="Notes">{grn.notes}</Field>
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Lines" subtitle="Accepted and rejected quantities are in the unit ordered" />
          <Table>
            <Thead>
              <tr>
                <Th>Item</Th>
                <Th align="right">Accepted</Th>
                <Th align="right">Into stock</Th>
                <Th align="right">Rejected</Th>
                <Th>Rejection reason</Th>
              </tr>
            </Thead>
            <tbody>
              {(grn.lines ?? []).map((line) => (
                <tr key={line.id}>
                  <Td>
                    <div className="font-bold">{line.item_sku}</div>
                    <div className="text-[11px] text-ink-soft">{line.item_name}</div>
                    {line.lot_number ? (
                      <div className="text-[11px] text-ink-soft">
                        Lot {line.lot_number}
                        {line.expiry_date ? ` · expires ${formatDate(line.expiry_date)}` : ""}
                      </div>
                    ) : null}
                  </Td>
                  <Td align="right">
                    {formatQuantity(line.accepted_quantity)} {line.unit_code}
                  </Td>
                  <Td align="right">
                    {formatQuantity(line.accepted_quantity_base)} {line.base_unit_code}
                  </Td>
                  <Td align="right">
                    {formatQuantity(line.rejected_quantity)} {line.unit_code}
                  </Td>
                  <Td>{line.rejection_reason ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {grn.status !== "draft" ? <DocumentMovements sourceId={grn.id} version={grn.status} /> : null}
        {grn.status !== "draft" && canSeeInventoryValues(user?.role) ? (
          <DocumentJournals documentType="goods_receipt" documentId={grn.id} version={grn.status} />
        ) : null}
      </div>

      {reversing ? (
        <ReasonDrawer
          title={`Reverse ${grn.grn_number}`}
          explanation="Reversing takes the received goods back out of stock at the current average cost and reopens the quantities on the purchase order. It is refused once the stock has been used or the order has been closed."
          actionLabel="Reverse receipt"
          onClose={() => setReversing(false)}
          onConfirm={async (reason) => {
            try {
              await goodsReceiptsApi.reverse(grn.id, reason);
              showToast(`${grn.grn_number} reversed`, "good");
              setReversing(false);
              receipt.reload();
            } catch (err) {
              showToast(errorText(err), "bad");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function EditReceipt({
  purchaseOrderId,
  receiptId,
  onSaved,
  onCancel,
}: {
  purchaseOrderId: string;
  receiptId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const order = useApiResource(() => purchaseOrdersApi.get(purchaseOrderId), [purchaseOrderId]);
  const receipt = useApiResource(() => goodsReceiptsApi.get(receiptId), [receiptId]);
  if (order.loading || receipt.loading) return <LoadingState />;
  const error = order.error ?? receipt.error;
  if (error) return <InventoryError message={error} canManage={canManageInventory(user?.role)} />;
  if (!order.data || !receipt.data) return null;
  return <GoodsReceiptForm po={order.data} receipt={receipt.data} onSaved={onSaved} onCancel={onCancel} />;
}
