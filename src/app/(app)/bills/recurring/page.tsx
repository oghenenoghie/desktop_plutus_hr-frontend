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
import { chartAccountsApi, recurringBillsApi, vendorsApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, nairaToMinor, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { RecurrenceFrequency } from "@/lib/types";

const FREQUENCIES: RecurrenceFrequency[] = ["monthly", "quarterly", "annually"];

export default function RecurringBillsPage() {
  const templates = useApiResource(() => recurringBillsApi.list());
  const vendors = useApiResource(() => vendorsApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);

  const vendorNameById = new Map((vendors.data ?? []).map((vendor) => [vendor.id, vendor.name]));

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await recurringBillsApi.setActive(id, isActive);
      templates.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function generateDue() {
    try {
      const generated = await recurringBillsApi.generateDue();
      showToast(`Generated ${generated.length} vendor bill(s)`, "good");
      templates.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Recurring Vendor Bills"
        subtitle="Templates that generate a new vendor bill automatically on their schedule"
        action={
          <div className="flex gap-3">
            <ConfirmActionButton
              action={generateDue}
              label="Generate Due Vendor Bills"
              tone="primary"
              confirmTitle="Generate all due vendor bills now?"
              confirmMessage="Creates a new vendor bill for every active template whose next run date has arrived."
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
          <EmptyState label="No recurring vendor bill templates yet." />
        ) : null}
        {templates.data && templates.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Prefix</Th>
                <Th>Vendor</Th>
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
                  <Td className="font-bold">{template.bill_number_prefix}</Td>
                  <Td>{vendorNameById.get(template.vendor_id) ?? "—"}</Td>
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
        <NewRecurringBillDrawer
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

function NewRecurringBillDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const vendors = useApiResource(() => vendorsApi.list());
  const accounts = useApiResource(() => chartAccountsApi.list());
  const { showToast } = useToast();
  const [vendorId, setVendorId] = useState("");
  const [billNumberPrefix, setBillNumberPrefix] = useState("");
  const [expenseAccountCode, setExpenseAccountCode] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [nextRunDate, setNextRunDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const expenseAccounts = (accounts.data ?? []).filter(
    (account) => account.type === "expense" && account.is_active,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await recurringBillsApi.create({
        vendor_id: vendorId,
        bill_number_prefix: billNumberPrefix,
        expense_account_code: expenseAccountCode,
        amount_minor: nairaToMinor(amount),
        frequency,
        next_run_date: nextRunDate,
      });
      showToast("Recurring vendor bill template created", "good");
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Recurring Vendor Bill Template" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="vendor">Vendor</Label>
          <Select id="vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)} required>
            <option value="">Select vendor</option>
            {(vendors.data ?? []).map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="billNumberPrefix">Vendor Bill Number Prefix</Label>
          <Input
            id="billNumberPrefix"
            value={billNumberPrefix}
            onChange={(event) => setBillNumberPrefix(event.target.value)}
            placeholder="e.g. RENT"
            required
          />
        </div>
        <div>
          <Label htmlFor="expenseAccount">Expense Account</Label>
          <Select
            id="expenseAccount"
            value={expenseAccountCode}
            onChange={(event) => setExpenseAccountCode(event.target.value)}
            required
          >
            <option value="">Select expense account</option>
            {expenseAccounts.map((account) => (
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
