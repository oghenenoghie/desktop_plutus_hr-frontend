"use client";

import Link from "next/link";
import { useState } from "react";

import { EmailPdfDrawer } from "@/components/email-pdf-drawer";
import { AccountCreateModal } from "@/components/accounting/account-create-modal";
import { CustomerCreateModal } from "@/components/accounting/customer-create-modal";
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
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { accountLabel, byNumber, canCreateCounterparties } from "@/lib/accounting";
import { ApiError } from "@/lib/api/client";
import {
  chartAccountsApi,
  creditNotesApi,
  customersApi,
  invoicesApi,
} from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { currencyLabel, formatDate, formatMoney, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { withCreated } from "@/lib/records";
import type { ChartAccount, Customer, Invoice } from "@/lib/types";

export default function InvoicesPage() {
  const invoices = useApiResource(() => invoicesApi.list());
  const customers = useApiResource(() => customersApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [creditingInvoice, setCreditingInvoice] = useState<Invoice | null>(
    null,
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [emailingInvoice, setEmailingInvoice] = useState<Invoice | null>(null);

  const customerNameById = new Map(
    (customers.data ?? []).map((customer) => [customer.id, customer.name]),
  );
  const customerById = new Map(
    (customers.data ?? []).map((customer) => [customer.id, customer]),
  );

  async function act(
    action: (id: string) => Promise<Invoice>,
    invoice: Invoice,
  ) {
    try {
      await action(invoice.id);
      invoices.reload();
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Action failed.",
        "bad",
      );
    }
  }

  async function downloadPdf(invoice: Invoice) {
    setDownloadingId(invoice.id);
    try {
      await invoicesApi.downloadPdf(
        invoice.id,
        `invoice-${invoice.invoice_number}.pdf`,
      );
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Download failed.",
        "bad",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Accounts receivable — money owed to this org by its customers"
        action={
          <div className="flex gap-3">
            <Link href="/invoices/customers">
              <Button variant="secondary">Customer List</Button>
            </Link>
            <Link href="/invoices/recurring">
              <Button variant="secondary">Recurring</Button>
            </Link>
            <Button onClick={() => setCreating(true)}>New Customer Invoice</Button>
          </div>
        }
      />

      <Card>
        {invoices.loading ? <LoadingState /> : null}
        {invoices.error ? <ErrorState message={invoices.error} /> : null}
        {invoices.data && invoices.data.length === 0 ? (
          <EmptyState label="No customer invoices yet." />
        ) : null}
        {invoices.data && invoices.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Customer Invoice #</Th>
                <Th>Customer</Th>
                <Th>Due</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {invoices.data.map((invoice) => (
                <tr key={invoice.id}>
                  <Td className="font-bold">{invoice.invoice_number}</Td>
                  <Td>{customerNameById.get(invoice.customer_id) ?? "—"}</Td>
                  <Td>{formatDate(invoice.due_date)}</Td>
                  <Td align="right">{formatMoney(invoice.amount_minor)}</Td>
                  <Td>
                    <StatusBadge status={invoice.status} />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-2">
                      {invoice.status === "draft" ? (
                        <>
                          <ConfirmActionButton
                            action={() => act(invoicesApi.send, invoice)}
                            label="Send"
                            tone="primary"
                            confirmTitle="Send this customer invoice?"
                            confirmMessage={`This posts ${formatMoney(invoice.amount_minor)} as revenue and a receivable against "${customerNameById.get(invoice.customer_id) ?? "this customer"}".`}
                            confirmLabel="Send"
                          />
                          <ConfirmActionButton
                            action={() => act(invoicesApi.void, invoice)}
                            label="Void"
                            tone="danger"
                            confirmTitle="Void this customer invoice?"
                            confirmMessage="This can't be undone."
                            confirmLabel="Void"
                          />
                        </>
                      ) : null}
                      {invoice.status === "sent" ? (
                        <ConfirmActionButton
                          action={() => act(invoicesApi.pay, invoice)}
                          label="Mark Paid"
                          tone="primary"
                          confirmTitle="Mark this customer invoice as paid?"
                          confirmMessage={`This clears ${formatMoney(invoice.amount_minor)} from accounts receivable against Cash and Bank.`}
                          confirmLabel="Mark Paid"
                        />
                      ) : null}
                      {invoice.status === "sent" ||
                      invoice.status === "paid" ? (
                        <Button
                          size="md"
                          variant="secondary"
                          onClick={() => setCreditingInvoice(invoice)}
                        >
                          Credit Note
                        </Button>
                      ) : null}
                      {invoice.status === "void" ? (
                        <span className="text-ink-soft">—</span>
                      ) : null}
                      <Link href={`/print/invoices/${invoice.id}`}>
                        <Button size="md" variant="secondary">
                          View &amp; Print
                        </Button>
                      </Link>
                      <Button
                        size="md"
                        variant="secondary"
                        onClick={() => downloadPdf(invoice)}
                        disabled={downloadingId === invoice.id}
                      >
                        {downloadingId === invoice.id ? "Downloading…" : "PDF"}
                      </Button>
                      <Button
                        size="md"
                        variant="secondary"
                        onClick={() => setEmailingInvoice(invoice)}
                      >
                        Email
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {emailingInvoice ? (
        <EmailPdfDrawer
          title={`Email Customer Invoice ${emailingInvoice.invoice_number}`}
          description={`Sends customer invoice ${emailingInvoice.invoice_number} (${formatMoney(emailingInvoice.amount_minor)}) as a PDF attachment.`}
          defaultTo={
            customerById.get(emailingInvoice.customer_id)?.contact_email
          }
          onClose={() => setEmailingInvoice(null)}
          onSend={(to) => invoicesApi.email(emailingInvoice.id, to)}
        />
      ) : null}

      {creating ? (
        <NewInvoiceDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            invoices.reload();
          }}
        />
      ) : null}

      {creditingInvoice ? (
        <CreditNoteDrawer
          invoice={creditingInvoice}
          onClose={() => setCreditingInvoice(null)}
          onIssued={() => {
            setCreditingInvoice(null);
            invoices.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function CreditNoteDrawer({
  invoice,
  onClose,
  onIssued,
}: {
  invoice: Invoice;
  onClose: () => void;
  onIssued: () => void;
}) {
  const { showToast } = useToast();
  const creditNotes = useApiResource(
    () => creditNotesApi.forInvoice(invoice.id),
    [invoice.id],
  );
  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const alreadyCredited = (creditNotes.data ?? []).reduce(
    (sum, note) => sum + note.amount_minor,
    0,
  );
  const remaining = invoice.amount_minor - alreadyCredited;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await creditNotesApi.create(invoice.id, {
        credit_note_number: creditNoteNumber,
        issue_date: issueDate,
        amount_minor: toMinorUnits(amount),
        reason,
      });
      showToast("Credit note issued", "good");
      onIssued();
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
    <Drawer title={`Credit Note — ${invoice.invoice_number}`} onClose={onClose}>
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Invoice total {formatMoney(invoice.amount_minor)}, already credited{" "}
          {formatMoney(alreadyCredited)}, remaining balance{" "}
          <span className="font-bold text-ink">{formatMoney(remaining)}</span>.
        </p>

        {creditNotes.data && creditNotes.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Number</Th>
                <Th>Date</Th>
                <Th align="right">Amount</Th>
              </tr>
            </Thead>
            <tbody>
              {creditNotes.data.map((note) => (
                <tr key={note.id}>
                  <Td className="font-bold">{note.credit_note_number}</Td>
                  <Td>{formatDate(note.issue_date)}</Td>
                  <Td align="right">{formatMoney(note.amount_minor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}

        {remaining > 0 ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="creditNoteNumber">Credit Note Number</Label>
              <Input
                id="creditNoteNumber"
                value={creditNoteNumber}
                onChange={(event) => setCreditNoteNumber(event.target.value)}
                placeholder="e.g. CN-1001"
                required
              />
            </div>
            <div>
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount ({currencyLabel()})</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
              />
            </div>
            <div className="mt-auto flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Issuing…" : "Issue Credit Note"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-auto flex justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function NewInvoiceDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const customers = useApiResource(() => customersApi.list());
  const accounts = useApiResource(() => chartAccountsApi.list());
  const { showToast } = useToast();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  // Customers added from this form, kept as options alongside the list.
  const [createdCustomers, setCreatedCustomers] = useState<Customer[]>([]);
  const customerOptions = withCreated(customers.data, createdCustomers);
  const nextNumber = useApiResource(() => invoicesApi.nextNumber());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState<ChartAccount[]>([]);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [revenueAccountCode, setRevenueAccountCode] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [postNow, setPostNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const revenueAccounts = withCreated(accounts.data, createdAccounts)
    .filter((account) => account.type === "revenue" && account.is_active)
    .sort(byNumber);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const invoice = await invoicesApi.create({
        customer_id: customerId,
        invoice_number: invoiceNumber.trim() || null,
        issue_date: issueDate,
        due_date: dueDate,
        revenue_account_code: revenueAccountCode,
        amount_minor: toMinorUnits(amount),
        description: description || null,
      });
      if (postNow) {
        try {
          await invoicesApi.send(invoice.id);
          showToast(`Invoice ${invoice.invoice_number} posted: revenue and accounts receivable`, "good");
        } catch (err) {
          showToast(
            `Invoice ${invoice.invoice_number} saved as a draft, not posted: ${err instanceof ApiError ? String(err.detail ?? err.message) : "posting failed"}`,
            "bad",
          );
        }
      } else {
        showToast(`Invoice ${invoice.invoice_number} saved as a draft`, "good");
      }
      onCreated();
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
    <Drawer title="New Customer Invoice" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <Label htmlFor="customer">Customer</Label>
            {canCreateCounterparties(user?.role) ? (
              <Button type="button" size="md" variant="secondary" onClick={() => setCreatingCustomer(true)}>
                + New Customer
              </Button>
            ) : null}
          </div>
          <Select
            id="customer"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
          >
            <option value="">Select customer</option>
            {customerOptions.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            placeholder={nextNumber.data?.invoice_number ?? "INV-0001"}
          />
          <p className="mt-1 text-[11px] text-ink-soft">
            Left blank, the invoice is numbered {nextNumber.data?.invoice_number ?? "automatically"}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="issueDate">Issue Date</Label>
            <Input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <Label htmlFor="revenueAccount">Revenue Account</Label>
            {canCreateCounterparties(user?.role) ? (
              <Button type="button" size="md" variant="secondary" onClick={() => setCreatingAccount(true)}>
                + New Account
              </Button>
            ) : null}
          </div>
          <Select
            id="revenueAccount"
            value={revenueAccountCode}
            onChange={(event) => setRevenueAccountCode(event.target.value)}
            required
          >
            <option value="">Select revenue account</option>
            {revenueAccounts.map((account) => (
              <option key={account.id} value={account.code}>
                {accountLabel(account)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="amount">Amount ({currencyLabel()})</Label>
          <Input
            id="amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
          />
        </div>
        <label className="flex items-start gap-2 text-[13px]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={postNow}
            onChange={(event) => setPostNow(event.target.checked)}
          />
          <span>
            Post to the books now
            <span className="block text-[11px] text-ink-soft">
              Records the revenue in the profit and loss account and the amount in accounts receivable. Untick to keep it as a draft and post it later with Send.
            </span>
          </span>
        </label>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Customer Invoice"}
          </Button>
        </div>
      </form>
      {creatingCustomer ? (
        <CustomerCreateModal
          onClose={() => setCreatingCustomer(false)}
          onCreated={(customer) => {
            setCreatedCustomers((current) => [...current, customer]);
            setCustomerId(customer.id);
            setCreatingCustomer(false);
          }}
        />
      ) : null}
      {creatingAccount ? (
        <AccountCreateModal
          categories={["revenue", "other_income"]}
          onClose={() => setCreatingAccount(false)}
          onCreated={(account) => {
            setCreatedAccounts((current) => [...current, account]);
            setRevenueAccountCode(account.code);
            setCreatingAccount(false);
          }}
        />
      ) : null}
    </Drawer>
  );
}
