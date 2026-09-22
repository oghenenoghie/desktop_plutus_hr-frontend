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
import { customersApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";

export default function CustomersPage() {
  const customers = useApiResource(() => customersApi.list());
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Customer List"
        subtitle="Who owes this org money for goods and services rendered"
        action={
          <div className="flex gap-3">
            <Link href="/invoices">
              <Button variant="secondary">Back to Customers</Button>
            </Link>
            <Button onClick={() => setCreating(true)}>New Customer</Button>
          </div>
        }
      />

      <Card>
        {customers.loading ? <LoadingState /> : null}
        {customers.error ? <ErrorState message={customers.error} /> : null}
        {customers.data && customers.data.length === 0 ? (
          <EmptyState label="No customers yet." />
        ) : null}
        {customers.data && customers.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>TIN</Th>
              </tr>
            </Thead>
            <tbody>
              {customers.data.map((customer) => (
                <tr key={customer.id}>
                  <Td className="font-bold">{customer.name}</Td>
                  <Td>
                    {customer.contact_email ?? customer.contact_phone ?? (
                      <span className="text-ink-soft">—</span>
                    )}
                  </Td>
                  <Td>{customer.tin ?? <span className="text-ink-soft">—</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewCustomerDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            customers.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function NewCustomerDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
      await customersApi.create({
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
    <Drawer title="New Customer" onClose={onClose}>
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
            {submitting ? "Creating…" : "Create Customer"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
