"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

import { ApprovalHistoryPanel } from "@/components/approval-history-panel";
import { EmailPdfDrawer } from "@/components/email-pdf-drawer";
import { PageHeader } from "@/components/layout/page-header";
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
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  approvalInstancesApi,
  billsApi,
  chartAccountsApi,
  vendorsApi,
} from "@/lib/api/endpoints";
import { formatDate, formatNaira, nairaToMinor } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { ApprovalInstance, Bill } from "@/lib/types";

export default function BillsPage() {
  const bills = useApiResource(() => billsApi.list());
  const vendors = useApiResource(() => vendorsApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Record<string, ApprovalInstance | null>
  >({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [emailingBill, setEmailingBill] = useState<Bill | null>(null);

  const vendorNameById = new Map(
    (vendors.data ?? []).map((vendor) => [vendor.id, vendor.name]),
  );
  const vendorById = new Map(
    (vendors.data ?? []).map((vendor) => [vendor.id, vendor]),
  );

  async function act(action: (id: string) => Promise<Bill>, bill: Bill) {
    try {
      await action(bill.id);
      bills.reload();
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? String(err.detail ?? err.message)
          : "Action failed.",
        "bad",
      );
    }
  }

  async function downloadPdf(bill: Bill) {
    setDownloadingId(bill.id);
    try {
      await billsApi.downloadPdf(bill.id, `bill-${bill.bill_number}.pdf`);
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

  async function toggleHistory(billId: string) {
    if (expandedId === billId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(billId);
    if (history[billId] === undefined) {
      setLoadingHistoryId(billId);
      try {
        const result = await approvalInstancesApi.forRequest("bill", billId);
        setHistory((prev) => ({ ...prev, [billId]: result }));
      } catch (err) {
        showToast(
          err instanceof ApiError
            ? String(err.detail ?? err.message)
            : "Failed to load history.",
          "bad",
        );
      } finally {
        setLoadingHistoryId(null);
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Accounts payable — money this org owes its vendors"
        action={
          <div className="flex gap-3">
            <Link href="/bills/vendors">
              <Button variant="secondary">Vendors</Button>
            </Link>
            <Link href="/bills/recurring">
              <Button variant="secondary">Recurring</Button>
            </Link>
            <Button onClick={() => setCreating(true)}>New Bill</Button>
          </div>
        }
      />

      <Card>
        {bills.loading ? <LoadingState /> : null}
        {bills.error ? <ErrorState message={bills.error} /> : null}
        {bills.data && bills.data.length === 0 ? (
          <EmptyState label="No bills yet." />
        ) : null}
        {bills.data && bills.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Bill #</Th>
                <Th>Vendor</Th>
                <Th>Due</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Net Payable</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {bills.data.map((bill) => (
                <Fragment key={bill.id}>
                  <tr>
                    <Td className="font-bold">{bill.bill_number}</Td>
                    <Td>{vendorNameById.get(bill.vendor_id) ?? "—"}</Td>
                    <Td>{formatDate(bill.due_date)}</Td>
                    <Td align="right">{formatNaira(bill.amount_minor)}</Td>
                    <Td align="right">
                      <div className="font-bold">
                        {formatNaira(bill.net_payable_minor)}
                      </div>
                      {bill.vat_minor > 0 || bill.wht_amount_minor > 0 ? (
                        <div className="text-[11px] text-ink-soft">
                          {bill.vat_minor > 0
                            ? `VAT ${formatNaira(bill.vat_minor)}`
                            : ""}
                          {bill.vat_minor > 0 && bill.wht_amount_minor > 0
                            ? " · "
                            : ""}
                          {bill.wht_amount_minor > 0
                            ? `WHT -${formatNaira(bill.wht_amount_minor)}`
                            : ""}
                        </div>
                      ) : null}
                    </Td>
                    <Td>
                      <StatusBadge status={bill.status} />
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        {bill.status === "draft" ? (
                          <>
                            <ConfirmActionButton
                              action={() => act(billsApi.approve, bill)}
                              label="Approve"
                              tone="primary"
                              confirmTitle="Approve this bill?"
                              confirmMessage={`This posts ${formatNaira(bill.amount_minor)} as an expense and a payable against "${vendorNameById.get(bill.vendor_id) ?? "this vendor"}".`}
                              confirmLabel="Approve"
                            />
                            <ConfirmActionButton
                              action={() => act(billsApi.void, bill)}
                              label="Void"
                              tone="danger"
                              confirmTitle="Void this bill?"
                              confirmMessage="This can't be undone."
                              confirmLabel="Void"
                            />
                          </>
                        ) : null}
                        {bill.status === "approved" ? (
                          <ConfirmActionButton
                            action={() => act(billsApi.pay, bill)}
                            label="Mark Paid"
                            tone="primary"
                            confirmTitle="Mark this bill as paid?"
                            confirmMessage={`This clears ${formatNaira(bill.amount_minor)} from accounts payable against cash.`}
                            confirmLabel="Mark Paid"
                          />
                        ) : null}
                        <Button
                          size="md"
                          variant="secondary"
                          onClick={() => toggleHistory(bill.id)}
                        >
                          {expandedId === bill.id ? "Hide" : "History"}
                        </Button>
                        <Button
                          size="md"
                          variant="secondary"
                          onClick={() => downloadPdf(bill)}
                          disabled={downloadingId === bill.id}
                        >
                          {downloadingId === bill.id ? "Downloading…" : "PDF"}
                        </Button>
                        <Button
                          size="md"
                          variant="secondary"
                          onClick={() => setEmailingBill(bill)}
                        >
                          Email
                        </Button>
                      </div>
                    </Td>
                  </tr>
                  {expandedId === bill.id ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="border-b border-border bg-bg px-4 py-5"
                      >
                        <ApprovalHistoryPanel
                          loading={loadingHistoryId === bill.id}
                          instance={history[bill.id]}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {emailingBill ? (
        <EmailPdfDrawer
          title={`Email Bill ${emailingBill.bill_number}`}
          description={`Sends bill ${emailingBill.bill_number} (${formatNaira(emailingBill.amount_minor)}) as a PDF attachment.`}
          defaultTo={vendorById.get(emailingBill.vendor_id)?.contact_email}
          onClose={() => setEmailingBill(null)}
          onSend={(to) => billsApi.email(emailingBill.id, to)}
        />
      ) : null}

      {creating ? (
        <NewBillDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            bills.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function NewBillDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const vendors = useApiResource(() => vendorsApi.list());
  const accounts = useApiResource(() => chartAccountsApi.list());
  const { showToast } = useToast();
  const [vendorId, setVendorId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [expenseAccountCode, setExpenseAccountCode] = useState("");
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("");
  const [whtCategory, setWhtCategory] = useState<"" | "goods" | "services">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const expenseAccounts = (accounts.data ?? []).filter(
    (account) => account.type === "expense" && account.is_active,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await billsApi.create({
        vendor_id: vendorId,
        bill_number: billNumber,
        bill_date: billDate,
        due_date: dueDate,
        expense_account_code: expenseAccountCode,
        amount_minor: nairaToMinor(amount),
        vat_minor: vat ? nairaToMinor(vat) : 0,
        wht_category: whtCategory || null,
        description: description || null,
      });
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
    <Drawer title="New Bill" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="vendor">Vendor</Label>
          <Select
            id="vendor"
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            required
          >
            <option value="">Select vendor</option>
            {(vendors.data ?? []).map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="billNumber">Bill Number</Label>
          <Input
            id="billNumber"
            value={billNumber}
            onChange={(event) => setBillNumber(event.target.value)}
            placeholder="e.g. INV-1004"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="billDate">Bill Date</Label>
            <Input
              id="billDate"
              type="date"
              value={billDate}
              onChange={(event) => setBillDate(event.target.value)}
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
          <Input
            id="amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="vat">VAT (₦)</Label>
            <Input
              id="vat"
              value={vat}
              onChange={(event) => setVat(event.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="whtCategory">WHT Category</Label>
            <Select
              id="whtCategory"
              value={whtCategory}
              onChange={(event) =>
                setWhtCategory(event.target.value as "" | "goods" | "services")
              }
            >
              <option value="">None</option>
              <option value="goods">Goods</option>
              <option value="services">Services</option>
            </Select>
          </div>
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
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Bill"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
