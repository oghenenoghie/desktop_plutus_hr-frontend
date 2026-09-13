"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";

// Shared by every "share this document as PDF" action (invoices, bills,
// vendor/customer statements, financial statements) — a single recipient
// field pre-filled with the counterparty's contact_email where one exists,
// editable/required where it doesn't (financial statements have no
// natural counterparty to default to).
export function EmailPdfDrawer({
  title,
  description,
  defaultTo,
  onClose,
  onSend,
}: {
  title: string;
  description?: string;
  defaultTo?: string | null;
  onClose: () => void;
  onSend: (to: string) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [to, setTo] = useState(defaultTo ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSend(to);
      showToast("Email sent.", "good");
      onClose();
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Failed to send email.",
        "bad",
      );
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={title} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        {description ? (
          <p className="text-[13px] text-ink-soft">{description}</p>
        ) : null}
        <div>
          <Label htmlFor="emailPdfTo">Recipient Email</Label>
          <Input
            id="emailPdfTo"
            type="email"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
