"use client";

import { Fragment, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { contractorInvoicesApi, contractorsApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, nairaToMinor, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Contractor, ContractorInvoice, WhtCategory, WhtPayment } from "@/lib/types";

export default function ContractorsPage() {
  const contractors = useApiResource(() => contractorsApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, WhtPayment[]>>({});
  const [loadingPaymentsId, setLoadingPaymentsId] = useState<string | null>(null);
  const [recordingFor, setRecordingFor] = useState<Contractor | null>(null);
  const [invoices, setInvoices] = useState<Record<string, ContractorInvoice[]>>({});
  const [loadingInvoicesId, setLoadingInvoicesId] = useState<string | null>(null);
  const [creatingInvoiceFor, setCreatingInvoiceFor] = useState<Contractor | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<{
    contractor: Contractor;
    invoice: ContractorInvoice;
  } | null>(null);

  async function loadPayments(contractorId: string) {
    setLoadingPaymentsId(contractorId);
    try {
      const result = await contractorsApi.payments(contractorId);
      setPayments((prev) => ({ ...prev, [contractorId]: result }));
    } catch (err) {
      showToast(
        err instanceof ApiError ? String(err.detail ?? err.message) : "Failed to load payments.",
        "bad",
      );
    } finally {
      setLoadingPaymentsId(null);
    }
  }

  async function loadInvoices(contractorId: string) {
    setLoadingInvoicesId(contractorId);
    try {
      const result = await contractorInvoicesApi.list(contractorId);
      setInvoices((prev) => ({ ...prev, [contractorId]: result }));
    } catch (err) {
      showToast(
        err instanceof ApiError ? String(err.detail ?? err.message) : "Failed to load invoices.",
        "bad",
      );
    } finally {
      setLoadingInvoicesId(null);
    }
  }

  function toggleExpand(contractor: Contractor) {
    if (expandedId === contractor.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(contractor.id);
    if (!payments[contractor.id]) {
      loadPayments(contractor.id);
    }
    if (!invoices[contractor.id]) {
      loadInvoices(contractor.id);
    }
  }

  async function submitInvoice(contractor: Contractor, invoice: ContractorInvoice) {
    try {
      await contractorInvoicesApi.submit(contractor.id, invoice.id);
      loadInvoices(contractor.id);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Contractors"
        subtitle="Vendor withholding tax and payment records"
        action={<Button onClick={() => setCreating(true)}>New Contractor</Button>}
      />

      <Card>
        {contractors.loading ? <LoadingState /> : null}
        {contractors.error ? <ErrorState message={contractors.error} /> : null}
        {contractors.data && contractors.data.length === 0 ? (
          <EmptyState label="No contractors on record yet." />
        ) : null}
        {contractors.data && contractors.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>TIN</Th>
                <Th>Bank</Th>
                <Th>Account</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {contractors.data.map((contractor) => (
                <Fragment key={contractor.id}>
                  <tr>
                    <Td className="font-bold">{contractor.name}</Td>
                    <Td>{contractor.tin ?? "—"}</Td>
                    <Td>{contractor.bank_name ?? "—"}</Td>
                    <Td>
                      {contractor.account_number
                        ? `${contractor.account_number}${contractor.account_name ? ` · ${contractor.account_name}` : ""}`
                        : "—"}
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="md" variant="secondary" onClick={() => toggleExpand(contractor)}>
                          {expandedId === contractor.id ? "Hide" : "Details"}
                        </Button>
                        <Button size="md" variant="secondary" onClick={() => setCreatingInvoiceFor(contractor)}>
                          New Invoice
                        </Button>
                        <Button size="md" onClick={() => setRecordingFor(contractor)}>
                          Record Payment
                        </Button>
                      </div>
                    </Td>
                  </tr>
                  {expandedId === contractor.id ? (
                    <tr>
                      <td colSpan={5} className="border-b border-border bg-bg px-4 py-5">
                        <div className="flex flex-col gap-5">
                          {contractor.email || contractor.phone || contractor.engagement_start_date ? (
                            <div className="text-[12.5px] text-ink-soft">
                              {[
                                contractor.email,
                                contractor.phone,
                                contractor.engagement_start_date
                                  ? `Engaged ${formatDate(contractor.engagement_start_date)} – ${formatDate(contractor.engagement_end_date)}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          ) : null}
                          <div>
                            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                              WHT Payments
                            </h3>
                            {loadingPaymentsId === contractor.id ? <LoadingState /> : null}
                            {payments[contractor.id] && payments[contractor.id]!.length === 0 ? (
                              <p className="text-[13px] text-ink-soft">No WHT payments recorded yet.</p>
                            ) : null}
                            {payments[contractor.id] && payments[contractor.id]!.length > 0 ? (
                              <Table>
                                <Thead>
                                  <tr>
                                    <Th>Category</Th>
                                    <Th align="right">Gross</Th>
                                    <Th align="right">WHT</Th>
                                    <Th align="right">Net</Th>
                                    <Th>Payment Date</Th>
                                    <Th>Certificate</Th>
                                  </tr>
                                </Thead>
                                <tbody>
                                  {payments[contractor.id]!.map((payment) => (
                                    <tr key={payment.id}>
                                      <Td>{titleCase(payment.category)}</Td>
                                      <Td align="right">{formatNaira(payment.gross_amount_minor)}</Td>
                                      <Td align="right">{formatNaira(payment.wht_amount_minor)}</Td>
                                      <Td align="right">{formatNaira(payment.net_amount_minor)}</Td>
                                      <Td>{formatDate(payment.payment_date)}</Td>
                                      <Td>{payment.certificate_number}</Td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            ) : null}
                          </div>

                          <div>
                            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                              Invoices
                            </h3>
                            {loadingInvoicesId === contractor.id ? <LoadingState /> : null}
                            {invoices[contractor.id] && invoices[contractor.id]!.length === 0 ? (
                              <p className="text-[13px] text-ink-soft">No invoices raised yet.</p>
                            ) : null}
                            {invoices[contractor.id] && invoices[contractor.id]!.length > 0 ? (
                              <Table>
                                <Thead>
                                  <tr>
                                    <Th>Invoice #</Th>
                                    <Th align="right">Amount</Th>
                                    <Th>Invoice Date</Th>
                                    <Th>Due</Th>
                                    <Th>Status</Th>
                                    <Th align="right">Actions</Th>
                                  </tr>
                                </Thead>
                                <tbody>
                                  {invoices[contractor.id]!.map((invoice) => (
                                    <tr key={invoice.id}>
                                      <Td className="font-bold">{invoice.invoice_number}</Td>
                                      <Td align="right">{formatNaira(invoice.amount_minor)}</Td>
                                      <Td>{formatDate(invoice.invoice_date)}</Td>
                                      <Td>{formatDate(invoice.due_date)}</Td>
                                      <Td>
                                        <StatusBadge status={invoice.status} />
                                      </Td>
                                      <Td align="right">
                                        {invoice.status === "draft" ? (
                                          <Button
                                            size="md"
                                            variant="secondary"
                                            onClick={() => submitInvoice(contractor, invoice)}
                                          >
                                            Submit
                                          </Button>
                                        ) : null}
                                        {invoice.status === "submitted" ? (
                                          <Button
                                            size="md"
                                            onClick={() => setPayingInvoice({ contractor, invoice })}
                                          >
                                            Pay
                                          </Button>
                                        ) : null}
                                        {invoice.status === "paid" ? (
                                          <span className="text-ink-soft">—</span>
                                        ) : null}
                                      </Td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewContractorDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            contractors.reload();
          }}
        />
      ) : null}

      {recordingFor ? (
        <RecordPaymentDrawer
          contractor={recordingFor}
          onClose={() => setRecordingFor(null)}
          onRecorded={() => {
            const contractorId = recordingFor.id;
            setRecordingFor(null);
            setExpandedId(contractorId);
            loadPayments(contractorId);
          }}
        />
      ) : null}

      {creatingInvoiceFor ? (
        <NewInvoiceDrawer
          contractor={creatingInvoiceFor}
          onClose={() => setCreatingInvoiceFor(null)}
          onCreated={() => {
            const contractorId = creatingInvoiceFor.id;
            setCreatingInvoiceFor(null);
            setExpandedId(contractorId);
            loadInvoices(contractorId);
          }}
        />
      ) : null}

      {payingInvoice ? (
        <PayInvoiceDrawer
          contractor={payingInvoice.contractor}
          invoice={payingInvoice.invoice}
          onClose={() => setPayingInvoice(null)}
          onPaid={() => {
            const contractorId = payingInvoice.contractor.id;
            setPayingInvoice(null);
            loadInvoices(contractorId);
            loadPayments(contractorId);
          }}
        />
      ) : null}
    </div>
  );
}

function NewContractorDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [tin, setTin] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [engagementEndDate, setEngagementEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await contractorsApi.create({
        name,
        tin: tin || null,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        account_name: accountName || null,
        email: email || null,
        phone: phone || null,
        engagement_start_date: engagementStartDate || null,
        engagement_end_date: engagementEndDate || null,
      });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Contractor" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="tin">TIN (optional)</Label>
          <Input id="tin" value={tin} onChange={(event) => setTin(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="engagement-start-date">Engagement Start (optional)</Label>
            <Input
              id="engagement-start-date"
              type="date"
              value={engagementStartDate}
              onChange={(event) => setEngagementStartDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="engagement-end-date">Engagement End (optional)</Label>
            <Input
              id="engagement-end-date"
              type="date"
              value={engagementEndDate}
              onChange={(event) => setEngagementEndDate(event.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="bank-name">Bank Name (optional)</Label>
          <Input id="bank-name" value={bankName} onChange={(event) => setBankName(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="account-number">Account Number (optional)</Label>
          <Input
            id="account-number"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="account-name">Account Name (optional)</Label>
          <Input
            id="account-name"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !name}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function RecordPaymentDrawer({
  contractor,
  onClose,
  onRecorded,
}: {
  contractor: Contractor;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const { showToast } = useToast();
  const [category, setCategory] = useState<WhtCategory>("services");
  const [grossAmount, setGrossAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await contractorsApi.recordPayment(contractor.id, {
        category,
        gross_amount_minor: nairaToMinor(grossAmount),
        payment_date: paymentDate,
      });
      showToast("Payment recorded", "good");
      onRecorded();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Record Payment — ${contractor.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="category">Service Category</Label>
          <Select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as WhtCategory)}
          >
            <option value="services">Services (10%)</option>
            <option value="goods">Goods (5%)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="gross-amount">Gross Amount (₦)</Label>
          <Input
            id="gross-amount"
            inputMode="decimal"
            value={grossAmount}
            onChange={(event) => setGrossAmount(event.target.value)}
            placeholder="e.g. 1200000"
            required
          />
        </div>
        <div>
          <Label htmlFor="payment-date">Payment Date</Label>
          <Input
            id="payment-date"
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || nairaToMinor(grossAmount) <= 0}>
            {submitting ? "Recording…" : "Record Payment"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function NewInvoiceDrawer({
  contractor,
  onClose,
  onCreated,
}: {
  contractor: Contractor;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await contractorInvoicesApi.create(contractor.id, {
        invoice_number: invoiceNumber,
        amount_minor: nairaToMinor(amount),
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        description: description || null,
      });
      showToast("Invoice created (draft)", "good");
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`New Invoice — ${contractor.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="invoice-number">Invoice Number</Label>
          <Input
            id="invoice-number"
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            placeholder="INV-001"
            required
          />
        </div>
        <div>
          <Label htmlFor="invoice-amount">Amount (₦)</Label>
          <Input
            id="invoice-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 1200000"
            required
          />
        </div>
        <div>
          <Label htmlFor="invoice-date">Invoice Date</Label>
          <Input
            id="invoice-date"
            type="date"
            value={invoiceDate}
            onChange={(event) => setInvoiceDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="invoice-due-date">Due Date (optional)</Label>
          <Input id="invoice-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="invoice-description">Description (optional)</Label>
          <Input
            id="invoice-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !invoiceNumber || nairaToMinor(amount) <= 0}>
            {submitting ? "Creating…" : "Create Draft"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function PayInvoiceDrawer({
  contractor,
  invoice,
  onClose,
  onPaid,
}: {
  contractor: Contractor;
  invoice: ContractorInvoice;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { showToast } = useToast();
  const [category, setCategory] = useState<WhtCategory>("services");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await contractorInvoicesApi.pay(contractor.id, invoice.id, { category, payment_date: paymentDate });
      showToast("Invoice paid — WHT withheld and posted", "good");
      onPaid();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Pay Invoice ${invoice.invoice_number}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Paying withholds tax at source on {formatNaira(invoice.amount_minor)} and posts the ledger
          entries the same way a direct WHT payment would — the invoice links to the resulting
          certificate once paid.
        </p>
        <div>
          <Label htmlFor="invoice-pay-category">Service Category</Label>
          <Select
            id="invoice-pay-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as WhtCategory)}
          >
            <option value="services">Services (10%)</option>
            <option value="goods">Goods (5%)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="invoice-pay-date">Payment Date</Label>
          <Input
            id="invoice-pay-date"
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Paying…" : "Pay Invoice"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
