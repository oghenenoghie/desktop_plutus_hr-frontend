"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { GoodsReceiptForm } from "@/components/inventory/goods-receipt-form";
import { InventoryError } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { purchaseOrdersApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory } from "@/lib/inventory";

export default function NewGoodsReceiptPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewGoodsReceipt />
    </Suspense>
  );
}

function NewGoodsReceipt() {
  const poId = useSearchParams().get("po");
  return (
    <div>
      <PageHeader title="Receive Goods" subtitle="Saved as a draft; post it to put the accepted goods into stock" />
      {poId ? <ReceiveAgainst poId={poId} /> : <ChooseOrder />}
    </div>
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
  return (
    <GoodsReceiptForm
      po={order.data}
      onCancel={() => router.push(`/inventory/purchase-orders/${poId}`)}
      onSaved={(saved) => {
        showToast(`${saved.grn_number} saved as a draft`, "good");
        router.push(`/inventory/goods-receipts/${saved.id}`);
      }}
    />
  );
}

// Without ?po=, list the orders that can still be received against.
function ChooseOrder() {
  const { user } = useAuth();
  const issued = useApiResource(() => purchaseOrdersApi.list({ status: "issued" }));
  const partial = useApiResource(() => purchaseOrdersApi.list({ status: "partially_received" }));
  if (issued.loading || partial.loading) return <LoadingState />;
  const error = issued.error ?? partial.error;
  if (error) return <InventoryError message={error} canManage={canManageInventory(user?.role)} />;
  const orders = [...(issued.data ?? []), ...(partial.data ?? [])].sort((a, b) =>
    a.po_number.localeCompare(b.po_number),
  );
  return (
    <Card>
      <CardHeader title="Choose the purchase order" subtitle="Only issued orders with something still to receive are listed" />
      {orders.length === 0 ? (
        <EmptyState label="No issued purchase orders are waiting for delivery." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Order</Th>
              <Th>Vendor</Th>
              <Th>Expected</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <Td>
                  <Link href={`/inventory/goods-receipts/new?po=${order.id}`} className="font-bold text-primary hover:underline">
                    {order.po_number}
                  </Link>
                </Td>
                <Td>{order.vendor_name}</Td>
                <Td>{formatDate(order.expected_date)}</Td>
                <Td>
                  <StatusBadge status={order.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
