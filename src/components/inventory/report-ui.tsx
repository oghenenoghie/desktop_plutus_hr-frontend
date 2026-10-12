"use client";

import { useState } from "react";

import { errorText } from "@/components/inventory/document-ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { InventoryReportFormat } from "@/lib/types";

// CSV and PDF download buttons for an inventory report. The files carry the
// same figures as the screen (the API lays both out from one table).
export function ExportButtons({
  onDownload,
}: {
  onDownload: (format: InventoryReportFormat) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<InventoryReportFormat | null>(null);

  async function run(format: InventoryReportFormat) {
    setBusy(format);
    try {
      await onDownload(format);
    } catch (err) {
      showToast(errorText(err, "Download failed."), "bad");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" disabled={busy !== null} onClick={() => void run("csv")}>
        {busy === "csv" ? "Preparing…" : "Download CSV"}
      </Button>
      <Button variant="secondary" disabled={busy !== null} onClick={() => void run("pdf")}>
        {busy === "pdf" ? "Preparing…" : "Download PDF"}
      </Button>
    </div>
  );
}
