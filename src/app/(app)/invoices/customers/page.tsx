"use client";

import Link from "next/link";
import { useState } from "react";

import { CustomerCreateModal } from "@/components/accounting/customer-create-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
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
        <CustomerCreateModal
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

