"use client";

import { useState } from "react";

import { EmailPdfDrawer } from "@/components/email-pdf-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  agingReportsApi,
  customersApi,
  statutoryLiabilitiesApi,
  vendorsApi,
} from "@/lib/api/endpoints";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { AgingBucket, AgingLine, StatutoryLiability } from "@/lib/types";

const BUCKET_LABELS: Record<AgingBucket, string> = {
  current: "Current",
  "1_30": "1-30 days",
  "31_60": "31-60 days",
  "61_90": "61-90 days",
  over_90: "Over 90 days",
};

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Financial Reports"
        subtitle="Statutory liabilities, AP/AR aging, and vendor statements"
      />
      <Tabs
        tabs={[
          {
            id: "statutory",
            label: "Statutory Liabilities",
            content: <StatutoryLiabilitiesTab />,
          },
          {
            id: "ap-aging",
            label: "AP Aging",
            content: <AgingTab type="ap" />,
          },
          {
            id: "ar-aging",
            label: "AR Aging",
            content: <AgingTab type="ar" />,
          },
          {
            id: "vendor-statement",
            label: "Vendor Statement",
            content: <VendorStatementTab />,
          },
          {
            id: "customer-statement",
            label: "Customer Statement",
            content: <CustomerStatementTab />,
          },
        ]}
      />
    </div>
  );
}

function StatutoryLiabilitiesTab() {
  const liabilities = useApiResource(() => statutoryLiabilitiesApi.list());
  const { showToast } = useToast();
  const [remitting, setRemitting] = useState<StatutoryLiability | null>(null);

  async function file(liability: StatutoryLiability) {
    try {
      await statutoryLiabilitiesApi.file(liability.id);
      showToast(`${liability.scheme.toUpperCase()} marked filed`, "good");
      liabilities.reload();
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Action failed.",
        "bad",
      );
    }
  }

  return (
    <div>
      <Card>
        {liabilities.loading ? <LoadingState /> : null}
        {liabilities.error ? <ErrorState message={liabilities.error} /> : null}
        {liabilities.data && liabilities.data.length === 0 ? (
          <EmptyState label="No statutory liabilities recorded yet." />
        ) : null}
        {liabilities.data && liabilities.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Scheme</Th>
                <Th>Authority</Th>
                <Th>State</Th>
                <Th>Period</Th>
                <Th align="right">Amount</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {liabilities.data.map((liability) => (
                <tr key={liability.id}>
                  <Td>{liability.scheme.toUpperCase()}</Td>
                  <Td>{liability.authority}</Td>
                  <Td>{liability.state ?? "—"}</Td>
                  <Td>
                    {formatDate(liability.period_start)} –{" "}
                    {formatDate(liability.period_end)}
                  </Td>
                  <Td align="right">{formatNaira(liability.amount_minor)}</Td>
                  <Td>{formatDate(liability.due_date)}</Td>
                  <Td>
                    <StatusBadge status={liability.status} />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-2">
                      {liability.status === "pending" ? (
                        <ConfirmActionButton
                          action={() => file(liability)}
                          label="Mark Filed"
                          tone="primary"
                          confirmTitle="Mark this liability as filed?"
                          confirmMessage={`${liability.scheme.toUpperCase()} for ${formatDate(liability.period_start)} – ${formatDate(liability.period_end)} (${formatNaira(liability.amount_minor)}) will be marked filed with ${liability.authority}.`}
                          confirmLabel="Mark Filed"
                        />
                      ) : null}
                      {liability.status === "filed" ? (
                        <Button
                          size="md"
                          onClick={() => setRemitting(liability)}
                        >
                          Mark Remitted
                        </Button>
                      ) : null}
                      {liability.status === "remitted" ? (
                        <span className="text-ink-soft">—</span>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {remitting ? (
        <RemitDrawer
          liability={remitting}
          onClose={() => setRemitting(null)}
          onRemitted={() => {
            setRemitting(null);
            liabilities.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function RemitDrawer({
  liability,
  onClose,
  onRemitted,
}: {
  liability: StatutoryLiability;
  onClose: () => void;
  onRemitted: () => void;
}) {
  const { showToast } = useToast();
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await statutoryLiabilitiesApi.remit(liability.id, reference || undefined);
      showToast(`${liability.scheme.toUpperCase()} marked remitted`, "good");
      onRemitted();
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Action failed.",
        "bad",
      );
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Mark as Remitted" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          {liability.scheme.toUpperCase()} for{" "}
          {formatDate(liability.period_start)} –{" "}
          {formatDate(liability.period_end)} (
          {formatNaira(liability.amount_minor)}), payable to{" "}
          {liability.authority}.
        </p>
        <div>
          <Label htmlFor="reference">Remittance Reference</Label>
          <Input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Marking…" : "Mark Remitted"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function AgingTab({ type }: { type: "ap" | "ar" }) {
  const lines = useApiResource(
    () =>
      type === "ap" ? agingReportsApi.apAging() : agingReportsApi.arAging(),
    [type],
  );
  const totalByBucket = new Map<AgingBucket, number>();
  for (const line of lines.data ?? []) {
    totalByBucket.set(
      line.bucket,
      (totalByBucket.get(line.bucket) ?? 0) + line.amount_minor,
    );
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(Object.keys(BUCKET_LABELS) as AgingBucket[]).map((bucket) => (
          <Card key={bucket} padding="compact">
            <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
              {BUCKET_LABELS[bucket]}
            </div>
            <div className="mt-1 text-[16px] font-extrabold text-ink">
              {formatNaira(totalByBucket.get(bucket) ?? 0)}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        {lines.loading ? <LoadingState /> : null}
        {lines.error ? <ErrorState message={lines.error} /> : null}
        {lines.data && lines.data.length === 0 ? (
          <EmptyState
            label={`No ${type === "ap" ? "outstanding bills" : "outstanding invoices"}.`}
          />
        ) : null}
        {lines.data && lines.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>{type === "ap" ? "Vendor" : "Customer"}</Th>
                <Th>Reference</Th>
                <Th>Due</Th>
                <Th>Bucket</Th>
                <Th align="right">Amount</Th>
              </tr>
            </Thead>
            <tbody>
              {lines.data.map((line: AgingLine) => (
                <tr key={line.entity_id + line.reference_number}>
                  <Td className="font-bold">{line.counterparty_name}</Td>
                  <Td>{line.reference_number}</Td>
                  <Td>{formatDate(line.due_date)}</Td>
                  <Td>{BUCKET_LABELS[line.bucket]}</Td>
                  <Td align="right">{formatNaira(line.amount_minor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}

function VendorStatementTab() {
  const { showToast } = useToast();
  const vendors = useApiResource(() => vendorsApi.list());
  const [vendorId, setVendorId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const statement = useApiResource(
    () =>
      vendorId
        ? agingReportsApi.vendorStatement(vendorId)
        : Promise.resolve([]),
    [vendorId],
  );
  const vendor = (vendors.data ?? []).find((v) => v.id === vendorId);

  async function downloadPdf() {
    if (!vendor) return;
    setDownloading(true);
    try {
      await agingReportsApi.downloadVendorStatementPdf(
        vendor.id,
        undefined,
        `statement-${vendor.name}.pdf`,
      );
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Download failed.",
        "bad",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <Card className="mb-6">
        <Label htmlFor="vendor">Vendor</Label>
        <Select
          id="vendor"
          value={vendorId}
          onChange={(event) => setVendorId(event.target.value)}
        >
          <option value="">Select a vendor</option>
          {(vendors.data ?? []).map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </Card>

      {vendorId ? (
        <Card>
          <div className="mb-4 flex justify-end gap-2">
            <Button
              size="md"
              variant="secondary"
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? "Downloading…" : "PDF"}
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() => setEmailing(true)}
            >
              Email
            </Button>
          </div>
          {statement.loading ? <LoadingState /> : null}
          {statement.error ? <ErrorState message={statement.error} /> : null}
          {statement.data && statement.data.length === 0 ? (
            <EmptyState label="No bills recorded for this vendor." />
          ) : null}
          {statement.data && statement.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Bill #</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Running Balance</Th>
                </tr>
              </Thead>
              <tbody>
                {statement.data.map((line) => (
                  <tr key={line.bill_id}>
                    <Td className="font-bold">{line.bill_number}</Td>
                    <Td>{formatDate(line.bill_date)}</Td>
                    <Td>
                      <StatusBadge status={line.status} />
                    </Td>
                    <Td align="right">{formatNaira(line.amount_minor)}</Td>
                    <Td align="right" className="font-bold">
                      {formatNaira(line.running_balance_minor)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>
      ) : null}

      {emailing && vendor ? (
        <EmailPdfDrawer
          title={`Email Statement — ${vendor.name}`}
          description="Sends this vendor's statement of account as a PDF attachment."
          defaultTo={vendor.contact_email}
          onClose={() => setEmailing(false)}
          onSend={(to) => agingReportsApi.emailVendorStatement(vendor.id, to)}
        />
      ) : null}
    </div>
  );
}

function CustomerStatementTab() {
  const { showToast } = useToast();
  const customers = useApiResource(() => customersApi.list());
  const [customerId, setCustomerId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const statement = useApiResource(
    () =>
      customerId
        ? agingReportsApi.customerStatement(customerId)
        : Promise.resolve([]),
    [customerId],
  );
  const customer = (customers.data ?? []).find((c) => c.id === customerId);

  async function downloadPdf() {
    if (!customer) return;
    setDownloading(true);
    try {
      await agingReportsApi.downloadCustomerStatementPdf(
        customer.id,
        undefined,
        `statement-${customer.name}.pdf`,
      );
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Download failed.",
        "bad",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <Card className="mb-6">
        <Label htmlFor="customer">Customer</Label>
        <Select
          id="customer"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        >
          <option value="">Select a customer</option>
          {(customers.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Card>

      {customerId ? (
        <Card>
          <div className="mb-4 flex justify-end gap-2">
            <Button
              size="md"
              variant="secondary"
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? "Downloading…" : "PDF"}
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() => setEmailing(true)}
            >
              Email
            </Button>
          </div>
          {statement.loading ? <LoadingState /> : null}
          {statement.error ? <ErrorState message={statement.error} /> : null}
          {statement.data && statement.data.length === 0 ? (
            <EmptyState label="No invoices recorded for this customer." />
          ) : null}
          {statement.data && statement.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Invoice #</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Running Balance</Th>
                </tr>
              </Thead>
              <tbody>
                {statement.data.map((line) => (
                  <tr key={line.invoice_id}>
                    <Td className="font-bold">{line.invoice_number}</Td>
                    <Td>{formatDate(line.issue_date)}</Td>
                    <Td>
                      <StatusBadge status={line.status} />
                    </Td>
                    <Td align="right">{formatNaira(line.amount_minor)}</Td>
                    <Td align="right" className="font-bold">
                      {formatNaira(line.running_balance_minor)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>
      ) : null}

      {emailing && customer ? (
        <EmailPdfDrawer
          title={`Email Statement — ${customer.name}`}
          description="Sends this customer's statement of account as a PDF attachment."
          defaultTo={customer.contact_email}
          onClose={() => setEmailing(false)}
          onSend={(to) =>
            agingReportsApi.emailCustomerStatement(customer.id, to)
          }
        />
      ) : null}
    </div>
  );
}
