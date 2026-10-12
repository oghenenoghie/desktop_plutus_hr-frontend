"use client";

import { useRouter } from "next/navigation";

import { AdjustmentForm, postOrSubmit } from "@/components/inventory/adjustment-form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";

export default function NewStockAdjustmentPage() {
  const router = useRouter();
  const { showToast } = useToast();

  return (
    <div>
      <PageHeader
        title="New Stock Adjustment"
        subtitle="Saved as a draft first; stock only changes when the adjustment is posted, after approval where it needs one"
      />
      <AdjustmentForm
        onCancel={() => router.push("/inventory/adjustments")}
        onSaved={async (saved, postNow) => {
          if (postNow) {
            try {
              showToast(await postOrSubmit(saved), "good");
            } catch (err) {
              showToast(
                `${saved.adjustment_number} was saved as a draft but not posted: ${
                  err instanceof ApiError ? String(err.detail ?? err.message) : "posting failed"
                }`,
                "bad",
              );
            }
          } else {
            showToast(`${saved.adjustment_number} saved as a draft`, "good");
          }
          router.push(`/inventory/adjustments/${saved.id}`);
        }}
      />
    </div>
  );
}
