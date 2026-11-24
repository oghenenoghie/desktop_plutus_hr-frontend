"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { GoodsReceiptForm } from "@/components/inventory/goods-receipt-form";
import { InventoryError } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { purchaseOrdersApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory, statusLabel } from "@/lib/inventory";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/types";

// Orders whose goods can still arrive: approved (the first delivery issues
// the order on the way), issued, or partly received.
const PENDING: PurchaseOrderStatus[] = ["approved", "issued", "partially_received"];

export default function NewGoodsReceiptPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewGoodsReceipt />
    </Suspense>
  );
}

function NewGoodsReceipt() {
  const router = useRouter();
  const poId = useSearchParams().get("po") ?? "";
  return (
    <div>
      <PageHeader
        title="Receive Goods"
        subtitle="Select the purchase order the goods arrived against. Receive into stock adds accepted quantities to stock on hand. Do not enter VAT here: record the supplier invoice and its VAT under Vendor Bills after checking the delivery."
      />
      <div className="flex flex-col gap-6">
        <ChooseOrder
          selected={poId}
          onSelect={(id) =>
            router.replace(id ? `/inventory/goods-receipts/new?po=${id}` : "/inventory/goods-receipts/new")
          }
        />
        {poId ? <ReceiveAgainst key={poId} poId={poId} /> : null}
      </div>
    </div>
  );
}

function orderLabel(order: PurchaseOrder): string {
  const expected = order.expected_date ? ` · expected ${formatDate(order.expected_date)}` : "";
  return `${order.po_number} · ${order.vendor_name} · ${statusLabel(order.status)}${expected}`;
}

// The dropdown of every purchase order still waiting for goods.
function ChooseOrder({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const { user } = useAuth();
  const pending = useApiResource(() =>
    Promise.all(PENDING.map((status) => purchaseOrdersApi.list({ status }))).then((lists) =>
      lists.flat().sort((a, b) => a.po_number.localeCompare(b.po_number)),
    ),
  );
  if (pending.loading) return <LoadingState />;
  if (pending.error) return <InventoryError message={pending.error} canManage={canManageInventory(user?.role)} />;
  const orders = pending.data ?? [];
  return (
    <Card>
      <CardHeader
        title="Purchase order"
        subtitle="Every approved order whose goods haven't all arrived is listed"
      />
      {orders.length === 0 && !selected ? (
        <div className="pb-6 text-center">
          <EmptyState label="No purchase orders are waiting for goods. Approve a purchase order first, then receive its goods here." />
          <Link href="/inventory/purchase-orders" className="text-[13px] font-bold text-primary hover:underline">
            Go to Purchase Orders
          </Link>
        </div>
      ) : (
        <div className="max-w-xl">
          <Label htmlFor="receipt-po">Select purchase order</Label>
          <Select id="receipt-po" value={selected} onChange={(event) => onSelect(event.target.value)}>
            <option value="">Select purchase order</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {orderLabel(order)}
              </option>
            ))}
          </Select>
        </div>
      )}
    </Card>
  );
}

function ReceiveAgainst({ poId }: { poId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const order = useApiResource(() => purchaseOrdersApi.get(poId), [poId]);
  if (order.loading) return <LoadingState />;
  if (order.error) return <InventoryError message={order.error} canManage={canManageInventory(user?.role)} />;
  if (!order.data) return null;
  if (!PENDING.includes(order.data.status)) {
    return (
      <Card>
        <EmptyState
          label={`${order.data.po_number} is ${statusLabel(order.data.status).toLowerCase()}: there's nothing to receive against it.`}
        />
      </Card>
    );
  }
  return (
    <GoodsReceiptForm
      po={order.data}
      onCancel={() => router.push(`/inventory/purchase-orders/${poId}`)}
      onSaved={(saved, posted) => {
        showToast(
          posted
            ? `${saved.grn_number} received: stock on hand updated`
            : `${saved.grn_number} saved as a draft: not in stock until it's posted`,
          posted ? "good" : "neutral",
        );
        router.push(`/inventory/goods-receipts/${saved.id}`);
      }}
    />
  );
}
