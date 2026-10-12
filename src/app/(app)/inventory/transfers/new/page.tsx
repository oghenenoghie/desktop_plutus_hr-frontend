"use client";

import { useRouter } from "next/navigation";

import { StockTransferForm } from "@/components/inventory/stock-transfer-form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";

export default function NewStockTransferPage() {
  const router = useRouter();
  const { showToast } = useToast();
  return (
    <div>
      <PageHeader title="New Transfer" subtitle="Saved as a draft; dispatch it once it's approved" />
      <StockTransferForm
        onCancel={() => router.push("/inventory/transfers")}
        onSaved={(saved) => {
          showToast(`${saved.transfer_number} saved as a draft`, "good");
          router.push(`/inventory/transfers/${saved.id}`);
        }}
      />
    </div>
  );
}
