"use client";

import { useRouter } from "next/navigation";

import { StockIssueForm } from "@/components/inventory/stock-issue-form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/auth-context";
import { isRequesterOnly } from "@/lib/inventory";

export default function NewStockIssuePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  return (
    <div>
      <PageHeader
        title={isRequesterOnly(user?.role) ? "Request Stock" : "New Stock Issue"}
        subtitle="Saved as a draft; submit it for approval when it's ready"
      />
      <StockIssueForm
        onCancel={() => router.push("/inventory/issues")}
        onSaved={(saved) => {
          showToast(`${saved.issue_number} saved as a draft`, "good");
          router.push(`/inventory/issues/${saved.id}`);
        }}
      />
    </div>
  );
}
