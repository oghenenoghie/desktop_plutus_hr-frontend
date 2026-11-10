"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

import { ApprovalHistoryPanel } from "@/components/approval-history-panel";
import { AccountCreateModal } from "@/components/accounting/account-create-modal";
import { VendorCreateModal } from "@/components/accounting/vendor-create-modal";
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
import { accountLabel, byNumber, canCreateCounterparties } from "@/lib/accounting";
import { ApiError } from "@/lib/api/client";
import {
  approvalInstancesApi,
  billsApi,
  chartAccountsApi,
  goodsReceiptsApi,
  vendorsApi,
} from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { currencyLabel, formatDate, formatMoney, fromMinorUnits, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { withCreated } from "@/lib/records";
import type { ApprovalInstance, Bill, ChartAccount, GoodsReceipt, Vendor } from "@/lib/types";

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
              <Button variant="secondary">Vendor List</Button>
            </Link>
            <Link href="/bills/recurring">
              <Button variant="secondary">Recurring</Button>
            </Link>
            <Button onClick={() => setCreating(true)}>New Vendor Bill</Button>
          </div>
        }
      />

      <Card>
        {bills.loading ? <LoadingState /> : null}
        {bills.error ? <ErrorState message={bills.error} /> : null}
        {bills.data && bills.data.length === 0 ? (
          <EmptyState label="No vendor bills yet." />
        ) : null}
        {bills.data && bills.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Vendor Bill #</Th>
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
                    <Td>
                      <div className="font-bold">{bill.bill_number}</div>
                      {bill.goods_receipt_id ? (
                        <Link
                          href={`/inventory/goods-receipts/${bill.goods_receipt_id}`}
                          className="text-[11px] font-bold text-primary hover:underline"
                        >
                          For a goods receipt
                        </Link>
                      ) : null}
                    </Td>
                    <Td>{vendorNameById.get(bill.vendor_id) ?? "—"}</Td>
                    <Td>{formatDate(bill.due_date)}</Td>
                    <Td align="right">{formatMoney(bill.amount_minor)}</Td>
                    <Td align="right">
                      <div className="font-bold">
                        {formatMoney(bill.net_payable_minor)}
                      </div>
                      {bill.vat_minor > 0 || bill.wht_amount_minor > 0 ? (
                        <div className="text-[11px] text-ink-soft">
                          {bill.vat_minor > 0
                            ? `VAT ${formatMoney(bill.vat_minor)}`
                            : ""}
                          {bill.vat_minor > 0 && bill.wht_amount_minor > 0
                            ? " · "
                            : ""}
                          {bill.wht_amount_minor > 0
                            ? `WHT -${formatMoney(bill.wht_amount_minor)}`
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
                              confirmTitle="Approve this vendor bill?"
                              confirmMessage={
                                bill.goods_receipt_id
                                  ? `This clears the goods receipt's accrual, posts any price difference to the expense account, and records ${formatMoney(bill.amount_minor)} as payable to "${vendorNameById.get(bill.vendor_id) ?? "this vendor"}".`
                                  : `This posts ${formatMoney(bill.amount_minor)} as an expense and a payable against "${vendorNameById.get(bill.vendor_id) ?? "this vendor"}".`
                              }
                              confirmLabel="Approve"
                            />
                            <ConfirmActionButton
                              action={() => act(billsApi.void, bill)}
                              label="Void"
                              tone="danger"
                              confirmTitle="Void this vendor bill?"
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
                            confirmTitle="Mark this vendor bill as paid?"
                            confirmMessage={`This clears ${formatMoney(bill.amount_minor)} from accounts payable against Cash and Bank.`}
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
                        <Link href={`/print/bills/${bill.id}`}>
                          <Button size="md" variant="secondary">
                            View &amp; Print
                          </Button>
                        </Link>
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
          title={`Email Vendor Bill ${emailingBill.bill_number}`}
          description={`Sends vendor bill ${emailingBill.bill_number} (${formatMoney(emailingBill.amount_minor)}) as a PDF attachment.`}
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
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState("");
  const [creatingVendor, setCreatingVendor] = useState(false);
  // Vendors added from this form, kept as options alongside the list.
  const [createdVendors, setCreatedVendors] = useState<Vendor[]>([]);
  const vendorOptions = withCreated(vendors.data, createdVendors);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState<ChartAccount[]>([]);
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [expenseAccountCode, setExpenseAccountCode] = useState("");
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("");
  const [whtCategory, setWhtCategory] = useState<"" | "goods" | "services">("");
  const [description, setDescription] = useState("");
  const [goodsReceiptId, setGoodsReceiptId] = useState("");
  const [postNow, setPostNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // D2: posted goods receipts from this vendor that no bill invoices yet.
  // Fails (and the field hides) when inventory is off or not visible.
  const receipts = useApiResource(
    () =>
      vendorId
        ? goodsReceiptsApi.list({ vendorId, unbilled: true })
        : Promise.resolve([] as GoodsReceipt[]),
    [vendorId],
  );
  const linkable = (receipts.data ?? []).filter((receipt) => receipt.accrued_minor);
  const linked = linkable.find((receipt) => receipt.id === goodsReceiptId);

  const expenseAccounts = withCreated(accounts.data, createdAccounts)
    .filter((account) => account.type === "expense" && account.is_active)
    .sort(byNumber);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const bill = await billsApi.create({
        vendor_id: vendorId,
        bill_number: billNumber,
        bill_date: billDate,
        due_date: dueDate,
        expense_account_code: expenseAccountCode,
        amount_minor: toMinorUnits(amount),
        vat_minor: vat ? toMinorUnits(vat) : 0,
        wht_category: whtCategory || null,
        description: description || null,
        goods_receipt_id: goodsReceiptId || null,
      });
      if (postNow) {
        try {
          const approved = await billsApi.approve(bill.id);
          showToast(
            approved.status === "approved"
              ? `Bill ${bill.bill_number} posted: the expense and accounts payable`
              : `Bill ${bill.bill_number} saved; it posts once its approvals are complete`,
            "good",
          );
        } catch (err) {
          showToast(
            `Bill ${bill.bill_number} saved as a draft, not posted: ${err instanceof ApiError ? String(err.detail ?? err.message) : "approval failed"}`,
            "bad",
          );
        }
      } else {
        showToast(`Bill ${bill.bill_number} saved as a draft`, "good");
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
    <Drawer title="New Vendor Bill" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <Label htmlFor="vendor">Vendor</Label>
            {canCreateCounterparties(user?.role) ? (
              <Button type="button" size="md" variant="secondary" onClick={() => setCreatingVendor(true)}>
                + New Vendor
              </Button>
            ) : null}
          </div>
          <Select
            id="vendor"
            value={vendorId}
            onChange={(event) => {
              setVendorId(event.target.value);
              setGoodsReceiptId("");
            }}
            required
          >
            <option value="">Select vendor</option>
            {vendorOptions.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </div>
        {vendorId && !receipts.error && linkable.length > 0 ? (
          <div>
            <Label htmlFor="goodsReceipt">Goods receipt</Label>
            <Select
              id="goodsReceipt"
              value={goodsReceiptId}
              onChange={(event) => {
                const receipt = linkable.find((option) => option.id === event.target.value);
                setGoodsReceiptId(event.target.value);
                if (receipt?.accrued_minor && !amount) setAmount(String(fromMinorUnits(receipt.accrued_minor)));
              }}
            >
              <option value="">Not for a goods receipt</option>
              {linkable.map((receipt) => (
                <option key={receipt.id} value={receipt.id}>
                  {receipt.grn_number} · {receipt.po_number} · {formatMoney(receipt.accrued_minor ?? 0)}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-ink-soft">
              {linked
                ? `Approving clears the ${formatMoney(linked.accrued_minor ?? 0)} accrued as goods received not invoiced. Any difference from the amount below (a price change, delivery or non-stock lines) goes to the expense account.`
                : "Link the delivery this bill invoices so approving it clears goods received not invoiced instead of expensing the stock twice."}
            </p>
          </div>
        ) : null}
        <div>
          <Label htmlFor="billNumber">Vendor Bill Number</Label>
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
            <Label htmlFor="billDate">Vendor Bill Date</Label>
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
          <div className="mb-1 flex items-center justify-between gap-3">
            <Label htmlFor="expenseAccount">{linked ? "Price Difference Account" : "Expense Account"}</Label>
            {canCreateCounterparties(user?.role) ? (
              <Button type="button" size="md" variant="secondary" onClick={() => setCreatingAccount(true)}>
                + New Account
              </Button>
            ) : null}
          </div>
          <Select
            id="expenseAccount"
            value={expenseAccountCode}
            onChange={(event) => setExpenseAccountCode(event.target.value)}
            required
          >
            <option value="">Select expense account</option>
            {expenseAccounts.map((account) => (
              <option key={account.id} value={account.code}>
                {accountLabel(account)} · {account.category === "cost_of_sales" ? "cost of sales" : "overheads"}
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="vat">VAT ({currencyLabel()})</Label>
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
        <label className="flex items-start gap-2 text-[13px]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={postNow}
            onChange={(event) => setPostNow(event.target.checked)}
          />
          <span>
            Post to the books now (approve)
            <span className="block text-[11px] text-ink-soft">
              Records the expense in the profit and loss account and the amount in accounts payable until it&apos;s paid. Untick to keep it as a draft for someone else to approve.
            </span>
          </span>
        </label>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Vendor Bill"}
          </Button>
        </div>
      </form>
      {creatingVendor ? (
        <VendorCreateModal
          onClose={() => setCreatingVendor(false)}
          onCreated={(vendor) => {
            setCreatedVendors((current) => [...current, vendor]);
            // Same as picking a vendor from the list: a receipt belongs to
            // one vendor, and a vendor created just now has none to link.
            setVendorId(vendor.id);
            setGoodsReceiptId("");
            setCreatingVendor(false);
          }}
        />
      ) : null}
      {creatingAccount ? (
        <AccountCreateModal
          categories={["operating_expense", "cost_of_sales"]}
          onClose={() => setCreatingAccount(false)}
          onCreated={(account) => {
            setCreatedAccounts((current) => [...current, account]);
            setExpenseAccountCode(account.code);
            setCreatingAccount(false);
          }}
        />
      ) : null}
    </Drawer>
  );
}
