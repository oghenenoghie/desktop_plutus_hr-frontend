"use client";

import { useRouter } from "next/navigation";

import { PurchaseOrderForm } from "@/components/inventory/purchase-order-form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { showToast } = useToast();
  return (
    <div>
      <PageHeader
        title="New Purchase Order"
        subtitle="Saved as a draft; submit it for approval, then issue it to the vendor"
      />
      <PurchaseOrderForm
        onCancel={() => router.push("/inventory/purchase-orders")}
        onSaved={(saved) => {
          showToast(`${saved.po_number} saved as a draft`, "good");
          router.push(`/inventory/purchase-orders/${saved.id}`);
        }}
      />
    </div>
  );
}
