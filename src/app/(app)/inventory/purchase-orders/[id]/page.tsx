"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { ApprovalCard, Field, ReasonDrawer, errorText } from "@/components/inventory/document-ui";
import { InventoryError } from "@/components/inventory/inventory-ui";
import { PurchaseOrderForm } from "@/components/inventory/purchase-order-form";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { purchaseOrdersApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { ITEM_TYPE_LABELS, canManageInventory, canOperateInventory, formatQuantity } from "@/lib/inventory";

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canAct = canOperateInventory(user?.role);
  const order = useApiResource(() => purchaseOrdersApi.get(id), [id]);
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState<"cancel" | "close" | null>(null);

  async function act(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      showToast(label, "good");
      order.reload();
    } catch (err) {
      showToast(errorText(err), "bad");
    }
  }

  if (order.loading && !order.data) return <LoadingState />;
  if (order.error) return <InventoryError message={order.error} canManage={canManageInventory(user?.role)} />;
  const po = order.data;
  if (!po) return null;

  if (editing) {
    return (
      <div>
        <PageHeader title={`Edit ${po.po_number}`} subtitle="Only a draft can be edited" />
        <PurchaseOrderForm
          order={po}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            showToast(`${po.po_number} saved`, "good");
            order.reload();
          }}
        />
      </div>
    );
  }

  const nothingReceived = (po.lines ?? []).every((line) => Number(line.received_quantity_base) === 0);
  const receivable = po.status === "issued" || po.status === "partially_received";

  return (
    <div>
      <PageHeader
        title={po.po_number}
        subtitle={`${po.vendor_name}${po.vendor_reference ? ` · ref ${po.vendor_reference}` : ""}`}
        action={
          canAct ? (
            <div className="flex flex-wrap gap-2">
              {po.status === "draft" ? (
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <ConfirmActionButton
                    label="Delete"
                    confirmTitle={`Delete ${po.po_number}?`}
                    confirmMessage="The draft order is removed."
                    confirmLabel="Delete"
                    action={async () => {
                      try {
                        await purchaseOrdersApi.remove(po.id);
                        showToast(`${po.po_number} deleted`, "good");
                        router.push("/inventory/purchase-orders");
                      } catch (err) {
                        showToast(errorText(err), "bad");
                      }
                    }}
                  />
                  <Button onClick={() => act(`${po.po_number} submitted for approval`, () => purchaseOrdersApi.submit(po.id))}>
                    Submit for approval
                  </Button>
                </>
              ) : null}
              {po.status === "approved" ? (
                <Button onClick={() => act(`${po.po_number} issued to the vendor`, () => purchaseOrdersApi.issue(po.id))}>
                  Issue to vendor
                </Button>
              ) : null}
              {receivable ? (
                <Link
                  href={`/inventory/goods-receipts/new?po=${po.id}`}
                  className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
                >
                  Receive goods
                </Link>
              ) : null}
              {["pending_approval", "approved", "issued"].includes(po.status) && nothingReceived ? (
                <Button variant="secondary" onClick={() => setAsking("cancel")}>
                  Cancel order
                </Button>
              ) : null}
              {po.status === "partially_received" ? (
                <Button variant="secondary" onClick={() => setAsking("close")}>
                  Close short
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
              <StatusBadge status={po.status} />
            </Field>
            <Field label="Ordered">{formatDate(po.order_date)}</Field>
            <Field label="Expected">{formatDate(po.expected_date)}</Field>
            <Field label="Deliver to">{po.warehouse_code ?? "Decided on receipt"}</Field>
            <Field label="Net">{formatNaira(po.subtotal_minor)}</Field>
            <Field label="Tax">{formatNaira(po.tax_minor)}</Field>
            <Field label="Total">{formatNaira(po.total_minor)}</Field>
            <Field label="Issued">{formatDateTime(po.issued_at)}</Field>
            {po.close_reason ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label={po.status === "cancelled" ? "Cancelled because" : "Closed because"}>{po.close_reason}</Field>
              </div>
            ) : null}
            {po.notes ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label="Notes">{po.notes}</Field>
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Lines" subtitle="Received and outstanding quantities are in each item's base unit" />
          <Table>
            <Thead>
              <tr>
                <Th>Item</Th>
                <Th align="right">Ordered</Th>
                <Th align="right">Unit price</Th>
                <Th align="right">Net</Th>
                <Th align="right">Tax</Th>
                <Th align="right">Received</Th>
                <Th align="right">Outstanding</Th>
              </tr>
            </Thead>
            <tbody>
              {(po.lines ?? []).map((line) => (
                <tr key={line.id}>
                  <Td>
                    <div className="font-bold">{line.item_sku}</div>
                    <div className="text-[11px] text-ink-soft">
                      {line.item_name} · {ITEM_TYPE_LABELS[line.item_type]}
                    </div>
                  </Td>
                  <Td align="right">
                    {formatQuantity(line.quantity)} {line.unit_code}
                  </Td>
                  <Td align="right">{formatNaira(line.unit_price_minor)}</Td>
                  <Td align="right">{formatNaira(line.net_minor)}</Td>
                  <Td align="right">{formatNaira(line.tax_minor)}</Td>
                  <Td align="right">
                    {formatQuantity(line.received_quantity_base)} {line.base_unit_code}
                  </Td>
                  <Td align="right">
                    {formatQuantity(line.outstanding_quantity_base)} {line.base_unit_code}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Goods receipts" />
          {(po.receipts ?? []).length === 0 ? (
            <EmptyState label="Nothing received yet." />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Date</Th>
                  <Th>Warehouse</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {(po.receipts ?? []).map((receipt) => (
                  <tr key={receipt.id}>
                    <Td>
                      <Link href={`/inventory/goods-receipts/${receipt.id}`} className="font-bold text-primary hover:underline">
                        {receipt.grn_number}
                      </Link>
                    </Td>
                    <Td>{formatDate(receipt.receipt_date)}</Td>
                    <Td>{receipt.warehouse_code}</Td>
                    <Td>
                      <StatusBadge status={receipt.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {po.status !== "draft" ? (
          <ApprovalCard
            requestType="purchase_order"
            requestId={po.id}
            pending={po.status === "pending_approval"}
            canDecide={canAct}
            onDecide={async (approve, comment) => {
              try {
                await (approve ? purchaseOrdersApi.approve(po.id, comment) : purchaseOrdersApi.reject(po.id, comment));
                showToast(approve ? "Approval recorded" : `${po.po_number} rejected`, "good");
                order.reload();
              } catch (err) {
                showToast(errorText(err), "bad");
              }
            }}
          />
        ) : null}
      </div>

      {asking ? (
        <ReasonDrawer
          title={asking === "cancel" ? `Cancel ${po.po_number}` : `Close ${po.po_number}`}
          explanation={
            asking === "cancel"
              ? "Cancelling stops the order; nothing has been received against it."
              : "Closing short means the outstanding quantities won't be delivered. Receipts already posted are unaffected."
          }
          actionLabel={asking === "cancel" ? "Cancel order" : "Close order"}
          onClose={() => setAsking(null)}
          onConfirm={async (reason) => {
            try {
              await (asking === "cancel" ? purchaseOrdersApi.cancel(po.id, reason) : purchaseOrdersApi.close(po.id, reason));
              showToast(asking === "cancel" ? `${po.po_number} cancelled` : `${po.po_number} closed`, "good");
              setAsking(null);
              order.reload();
            } catch (err) {
              showToast(errorText(err), "bad");
            }
          }}
        />
      ) : null}
    </div>
  );
}
