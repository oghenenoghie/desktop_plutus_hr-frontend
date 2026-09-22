"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { chartAccountsApi, customersApi, recurringInvoicesApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, nairaToMinor, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { RecurrenceFrequency } from "@/lib/types";

const FREQUENCIES: RecurrenceFrequency[] = ["monthly", "quarterly", "annually"];

export default function RecurringInvoicesPage() {
  const templates = useApiResource(() => recurringInvoicesApi.list());
  const customers = useApiResource(() => customersApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);

  const customerNameById = new Map((customers.data ?? []).map((customer) => [customer.id, customer.name]));

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await recurringInvoicesApi.setActive(id, isActive);
      templates.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function generateDue() {
    try {
      const generated = await recurringInvoicesApi.generateDue();
      showToast(`Generated ${generated.length} customer invoice(s)`, "good");
      templates.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Recurring Customer Invoices"
        subtitle="Templates that generate a new customer invoice automatically on their schedule"
        action={
          <div className="flex gap-3">
            <ConfirmActionButton
              action={generateDue}
              label="Generate Due Customer Invoices"
              tone="primary"
              confirmTitle="Generate all due customer invoices now?"
              confirmMessage="Creates a new customer invoice for every active template whose next run date has arrived."
              confirmLabel="Generate"
            />
            <Button onClick={() => setCreating(true)}>New Template</Button>
          </div>
        }
      />

      <Card>
        {templates.loading ? <LoadingState /> : null}
        {templates.error ? <ErrorState message={templates.error} /> : null}
        {templates.data && templates.data.length === 0 ? (
          <EmptyState label="No recurring customer invoice templates yet." />
        ) : null}
        {templates.data && templates.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Prefix</Th>
                <Th>Customer</Th>
                <Th align="right">Amount</Th>
                <Th>Frequency</Th>
                <Th>Next Run</Th>
                <Th>Active</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {templates.data.map((template) => (
                <tr key={template.id}>
                  <Td className="font-bold">{template.invoice_number_prefix}</Td>
                  <Td>{customerNameById.get(template.customer_id) ?? "—"}</Td>
                  <Td align="right">{formatNaira(template.amount_minor)}</Td>
                  <Td>{titleCase(template.frequency)}</Td>
                  <Td>{formatDate(template.next_run_date)}</Td>
                  <Td>
                    <Badge tone={template.is_active ? "good" : "neutral"}>
                      {template.is_active ? "Active" : "Paused"}
                    </Badge>
                  </Td>
                  <Td align="right">
                    <Button
                      size="md"
                      variant="secondary"
                      onClick={() => toggleActive(template.id, !template.is_active)}
                    >
                      {template.is_active ? "Pause" : "Resume"}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewRecurringInvoiceDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            templates.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function NewRecurringInvoiceDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const customers = useApiResource(() => customersApi.list());
  const accounts = useApiResource(() => chartAccountsApi.list());
  const { showToast } = useToast();
  const [customerId, setCustomerId] = useState("");
  const [invoiceNumberPrefix, setInvoiceNumberPrefix] = useState("");
  const [revenueAccountCode, setRevenueAccountCode] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [nextRunDate, setNextRunDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const revenueAccounts = (accounts.data ?? []).filter(
    (account) => account.type === "revenue" && account.is_active,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await recurringInvoicesApi.create({
        customer_id: customerId,
        invoice_number_prefix: invoiceNumberPrefix,
        revenue_account_code: revenueAccountCode,
        amount_minor: nairaToMinor(amount),
        frequency,
        next_run_date: nextRunDate,
      });
      showToast("Recurring customer invoice template created", "good");
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Recurring Customer Invoice Template" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="customer">Customer</Label>
          <Select id="customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required>
            <option value="">Select customer</option>
            {(customers.data ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="invoiceNumberPrefix">Customer Invoice Number Prefix</Label>
          <Input
            id="invoiceNumberPrefix"
            value={invoiceNumberPrefix}
            onChange={(event) => setInvoiceNumberPrefix(event.target.value)}
            placeholder="e.g. RETAINER"
            required
          />
        </div>
        <div>
          <Label htmlFor="revenueAccount">Revenue Account</Label>
          <Select
            id="revenueAccount"
            value={revenueAccountCode}
            onChange={(event) => setRevenueAccountCode(event.target.value)}
            required
          >
            <option value="">Select revenue account</option>
            {revenueAccounts.map((account) => (
              <option key={account.id} value={account.code}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="amount">Amount (₦)</Label>
          <Input id="amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              id="frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency)}
            >
              {FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {titleCase(freq)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="nextRunDate">Next Run Date</Label>
            <Input
              id="nextRunDate"
              type="date"
              value={nextRunDate}
              onChange={(event) => setNextRunDate(event.target.value)}
              required
            />
          </div>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Template"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
