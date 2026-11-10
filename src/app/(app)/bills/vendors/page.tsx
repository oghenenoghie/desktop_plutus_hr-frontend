"use client";

import Link from "next/link";
import { useState } from "react";

import { VendorCreateModal } from "@/components/accounting/vendor-create-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
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
                <Th>Tax ID</Th>
                <Th>Address</Th>
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
                  <Td className="max-w-[260px] whitespace-pre-line text-[12px]">{vendor.address ?? <span className="text-ink-soft">—</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <VendorCreateModal
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

