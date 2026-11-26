"use client";

import { Fragment, useState } from "react";

import { ApprovalHistoryPanel } from "@/components/approval-history-panel";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { approvalInstancesApi, expensesApi } from "@/lib/api/endpoints";
import { currencyLabel, formatDate, formatMoney, toMinorUnits } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-context";
import { useApiResource } from "@/lib/hooks";
import type { ApprovalInstance, Expense, ExpenseCreateBody, ExpenseStatus } from "@/lib/types";

const NEXT_ACTION: Partial<Record<ExpenseStatus, { label: string; run: (id: string) => Promise<unknown> }>> = {
  pending: { label: "Approve", run: (id) => expensesApi.approve(id) },
  approved: { label: "Reimburse", run: (id) => expensesApi.reimburse(id) },
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const canViewAll = ["admin", "payroll_manager", "accountant", "manager", "auditor"].includes(user?.role ?? "");
  const expenses = useApiResource(() => canViewAll ? expensesApi.list() : expensesApi.mine(), [canViewAll]);
  const { showToast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Record<string, ApprovalInstance | null>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);

  async function act(run: (id: string) => Promise<unknown>, id: string, successMessage: string) {
    try {
      await run(id);
      showToast(successMessage, "good");
      expenses.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      showToast("Enter a valid expense amount greater than zero.", "bad");
      return;
    }
    const body: ExpenseCreateBody = {
      category: category.trim(),
      description: description.trim(),
      amount_minor: toMinorUnits(amount),
      expense_date: expenseDate,
      receipt_url: receiptUrl.trim() || null,
    };
    setSubmitting(true);
    try {
      await expensesApi.submit(body);
      showToast("Expense claim submitted for approval.", "good");
      setCategory("");
      setDescription("");
      setAmount("");
      setReceiptUrl("");
      expenses.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not submit expense claim.", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleHistory(expenseId: string) {
    if (expandedId === expenseId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(expenseId);
    if (history[expenseId] === undefined) {
      setLoadingHistoryId(expenseId);
      try {
        const result = await approvalInstancesApi.forRequest("expense", expenseId);
        setHistory((prev) => ({ ...prev, [expenseId]: result }));
      } catch (err) {
        showToast(
          err instanceof ApiError ? String(err.detail ?? err.message) : "Failed to load history.",
          "bad",
        );
      } finally {
        setLoadingHistoryId(null);
      }
    }
  }

  return (
    <div>
      <PageHeader title="Expense Reimbursement" subtitle={canViewAll ? "Claims, approvals and taxable/non-taxable handling" : "Submit and track your expense claims"} />

      <Card>
        {expenses.loading ? <LoadingState /> : null}
        {expenses.error ? <ErrorState message={expenses.error} /> : null}
        {expenses.data && expenses.data.length === 0 ? (
          <EmptyState label="No expense claims yet." />
        ) : null}
        {expenses.data && expenses.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Category</Th>
                <Th>Description</Th>
                <Th>Date</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {expenses.data.map((expense: Expense) => {
                const next = NEXT_ACTION[expense.status];
                return (
                  <Fragment key={expense.id}>
                    <tr>
                      <Td>{expense.category}</Td>
                      <Td className="max-w-xs truncate">{expense.description}</Td>
                      <Td>{formatDate(expense.expense_date)}</Td>
                      <Td align="right">{formatMoney(expense.amount_minor)}</Td>
                      <Td>
                        <StatusBadge status={expense.status} />
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          {canViewAll && expense.status === "pending" ? (
                            <ConfirmActionButton
                              action={() => act(expensesApi.reject, expense.id, "Expense claim rejected")}
                              label="Reject"
                              confirmTitle="Reject this expense claim?"
                              confirmMessage={`${expense.category} — ${formatMoney(expense.amount_minor)} will be rejected.`}
                              confirmLabel="Reject"
                            />
                          ) : null}
                          {canViewAll && next ? (
                            <ConfirmActionButton
                              action={() =>
                                act(
                                  next.run,
                                  expense.id,
                                  next.label === "Approve" ? "Expense claim approved" : "Expense marked reimbursed",
                                )
                              }
                              label={next.label}
                              tone="primary"
                              confirmTitle={`${next.label} this expense claim?`}
                              confirmMessage={`${expense.category} — ${formatMoney(expense.amount_minor)} will be marked ${next.label === "Approve" ? "approved" : "reimbursed"}.`}
                              confirmLabel={next.label}
                            />
                          ) : null}
                          {canViewAll ? <Button size="md" variant="secondary" onClick={() => toggleHistory(expense.id)}>
                            {expandedId === expense.id ? "Hide" : "History"}
                          </Button>
                        </div>
                      </Td>
                    </tr>
                    {expandedId === expense.id ? (
                      <tr>
                        <td colSpan={6} className="border-b border-border bg-bg px-4 py-5">
                          <ApprovalHistoryPanel
                            loading={loadingHistoryId === expense.id}
                            instance={history[expense.id]}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
