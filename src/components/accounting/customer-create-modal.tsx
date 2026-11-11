"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { customersApi } from "@/lib/api/endpoints";
import type { Customer } from "@/lib/types";

export function CustomerCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [tin, setTin] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const customer = await customersApi.create({
        name,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        tin: tin || null,
        address: address.trim() || null,
      });
      showToast("Customer created", "good");
      onCreated(customer);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Customer" onClose={onClose} size="sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div><Label htmlFor="new-customer-name">Name</Label><Input id="new-customer-name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
        <div><Label htmlFor="new-customer-email">Contact Email</Label><Input id="new-customer-email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></div>
        <div><Label htmlFor="new-customer-phone">Contact Phone</Label><Input id="new-customer-phone" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} /></div>
        <div><Label htmlFor="new-customer-tin">Tax ID</Label><Input id="new-customer-tin" value={tin} onChange={(event) => setTin(event.target.value)} /></div>
        <div><Label htmlFor="new-customer-address">Address</Label><Textarea id="new-customer-address" rows={3} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, city, state" /></div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create Customer"}</Button>
        </div>
      </form>
    </Modal>
  );
}
