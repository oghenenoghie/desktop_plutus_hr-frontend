"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { vendorsApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";

export default function VendorsPage() {
  const vendors = useApiResource(() => vendorsApi.list());
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Vendor List"
        subtitle="Who this org owes money to for goods and services"
        action={
          <div className="flex gap-3">
            <Link href="/bills">
              <Button variant="secondary">Back to Vendors</Button>
            </Link>
            <Button onClick={() => setCreating(true)}>New Vendor</Button>
          </div>
        }
      />

      <Card>
        {vendors.loading ? <LoadingState /> : null}
        {vendors.error ? <ErrorState message={vendors.error} /> : null}
        {vendors.data && vendors.data.length === 0 ? (
          <EmptyState label="No vendors yet." />
        ) : null}
        {vendors.data && vendors.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>TIN</Th>
              </tr>
            </Thead>
            <tbody>
              {vendors.data.map((vendor) => (
                <tr key={vendor.id}>
                  <Td className="font-bold">{vendor.name}</Td>
                  <Td>
                    {vendor.contact_email ?? vendor.contact_phone ?? (
                      <span className="text-ink-soft">—</span>
                    )}
                  </Td>
                  <Td>{vendor.tin ?? <span className="text-ink-soft">—</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewVendorDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            vendors.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function NewVendorDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
      await vendorsApi.create({
        name,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        tin: tin || null,
      });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Vendor" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="tin">TIN</Label>
          <Input id="tin" value={tin} onChange={(event) => setTin(event.target.value)} />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Vendor"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
