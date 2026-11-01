"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { vendorsApi } from "@/lib/api/endpoints";
import type { Vendor } from "@/lib/types";

export function VendorCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (vendor: Vendor) => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [tin, setTin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const vendor = await vendorsApi.create({ name, contact_email: contactEmail || null, contact_phone: contactPhone || null, tin: tin || null });
      showToast("Vendor created", "good");
      onCreated(vendor);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Vendor" onClose={onClose} size="sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div><Label htmlFor="new-vendor-name">Name</Label><Input id="new-vendor-name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
        <div><Label htmlFor="new-vendor-email">Contact Email</Label><Input id="new-vendor-email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></div>
        <div><Label htmlFor="new-vendor-phone">Contact Phone</Label><Input id="new-vendor-phone" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} /></div>
        <div><Label htmlFor="new-vendor-tin">TIN</Label><Input id="new-vendor-tin" value={tin} onChange={(event) => setTin(event.target.value)} /></div>
        <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create Vendor"}</Button></div>
      </form>
    </Modal>
  );
}
