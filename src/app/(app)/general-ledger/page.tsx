"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { chartAccountsApi, departmentsApi, generalLedgerApi } from "@/lib/api/endpoints";
import { formatDateTime, formatNaira, nairaToMinor } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { ChartAccount } from "@/lib/types";

export default function GeneralLedgerPage() {
  const trialBalance = useApiResource(() => generalLedgerApi.trialBalance());
  const departments = useApiResource(() => departmentsApi.list());
  const [departmentFilter, setDepartmentFilter] = useState("");
  const entries = useApiResource(
    () => generalLedgerApi.entries({ departmentId: departmentFilter || undefined }),
    [departmentFilter],
  );
  const departmentsById = new Map((departments.data ?? []).map((department) => [department.id, department]));
  const [posting, setPosting] = useState(false);

  return (
    <div>
      <PageHeader
        title="General Ledger"
        subtitle="Every double-entry posting from payroll, WHT, and manual journal entries"
        action={
          <div className="flex gap-3">
            <Link href="/general-ledger/chart-of-accounts">
              <Button variant="secondary">Chart of Accounts</Button>
            </Link>
            <Button onClick={() => setPosting(true)}>New Journal Entry</Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader title="Trial Balance" />
        {trialBalance.loading ? <LoadingState /> : null}
        {trialBalance.error ? <ErrorState message={trialBalance.error} /> : null}
        {trialBalance.data && trialBalance.data.length === 0 ? (
          <EmptyState label="No ledger activity yet." />
        ) : null}
        {trialBalance.data && trialBalance.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Account</Th>
                <Th align="right">Debit</Th>
                <Th align="right">Credit</Th>
                <Th align="right">Balance</Th>
              </tr>
            </Thead>
            <tbody>
              {trialBalance.data.map((line) => (
                <tr key={line.account}>
                  <Td className="font-bold">{line.account_name ?? line.account}</Td>
                  <Td align="right">{formatNaira(line.total_debit_minor)}</Td>
                  <Td align="right">{formatNaira(line.total_credit_minor)}</Td>
                  <Td align="right" className="font-bold">
                    {formatNaira(line.balance_minor)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Ledger Entries"
          subtitle="Filter by cost centre to see one department's share of payroll postings"
          action={
            <div className="w-56">
              <Select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
              >
                <option value="">All departments</option>
                {(departments.data ?? []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
          }
        />
        {entries.loading ? <LoadingState /> : null}
        {entries.error ? <ErrorState message={entries.error} /> : null}
        {entries.data && entries.data.length === 0 ? (
          <EmptyState label="No ledger entries yet." />
        ) : null}
        {entries.data && entries.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Account</Th>
                <Th>Department</Th>
                <Th align="right">Debit</Th>
                <Th align="right">Credit</Th>
              </tr>
            </Thead>
            <tbody>
              {entries.data.map((entry) => (
                <tr key={entry.id}>
                  <Td>{formatDateTime(entry.created_at)}</Td>
                  <Td>{entry.description ?? "—"}</Td>
                  <Td className="font-bold">{entry.account_name ?? entry.account}</Td>
                  <Td>{entry.department_id ? (departmentsById.get(entry.department_id)?.name ?? "—") : "—"}</Td>
                  <Td align="right">{entry.debit_minor ? formatNaira(entry.debit_minor) : "—"}</Td>
                  <Td align="right">{entry.credit_minor ? formatNaira(entry.credit_minor) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {posting ? (
        <NewJournalEntryDrawer
          onClose={() => setPosting(false)}
          onPosted={() => {
            setPosting(false);
            trialBalance.reload();
            entries.reload();
          }}
        />
      ) : null}
    </div>
  );
}

interface DraftLine {
  accountCode: string;
  side: "debit" | "credit";
  amount: string;
}

function emptyLine(): DraftLine {
  return { accountCode: "", side: "debit", amount: "" };
}

function NewJournalEntryDrawer({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: () => void;
}) {
  const accounts = useApiResource(() => chartAccountsApi.list());
  const { showToast } = useToast();
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  const activeAccounts = (accounts.data ?? []).filter((account: ChartAccount) => account.is_active);
  const totalDebit = lines.reduce(
    (sum, line) => sum + (line.side === "debit" ? nairaToMinor(line.amount) : 0),
    0,
  );
  const totalCredit = lines.reduce(
    (sum, line) => sum + (line.side === "credit" ? nairaToMinor(line.amount) : 0),
    0,
  );
  const balanced = totalDebit > 0 && totalDebit === totalCredit;

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!balanced) return;
    setSubmitting(true);
    try {
      await generalLedgerApi.postJournalEntry({
        description,
        lines: lines
          .filter((line) => line.accountCode && nairaToMinor(line.amount) > 0)
          .map((line) => ({
            account_code: line.accountCode,
            debit_minor: line.side === "debit" ? nairaToMinor(line.amount) : 0,
            credit_minor: line.side === "credit" ? nairaToMinor(line.amount) : 0,
          })),
      });
      showToast("Journal entry posted", "good");
      onPosted();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Journal Entry" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Opening balance"
            required
          />
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((line, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Account</Label>
                <Select
                  value={line.accountCode}
                  onChange={(event) => updateLine(index, { accountCode: event.target.value })}
                  required
                >
                  <option value="">Select account</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.code}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Side</Label>
                <Select
                  value={line.side}
                  onChange={(event) =>
                    updateLine(index, { side: event.target.value as "debit" | "credit" })
                  }
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </Select>
              </div>
              <div className="w-32">
                <Label>Amount (₦)</Label>
                <Input
                  value={line.amount}
                  onChange={(event) => updateLine(index, { amount: event.target.value })}
                  placeholder="0"
                  inputMode="decimal"
                  required
                />
              </div>
              {lines.length > 2 ? (
                <Button type="button" variant="secondary" onClick={() => removeLine(index)}>
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addLine}>
            Add Line
          </Button>
        </div>

        <div className="rounded-panel border border-border bg-bg px-3 py-2.5 text-[12px]">
          <div className="flex justify-between">
            <span>Total debits</span>
            <span className="font-bold">{formatNaira(totalDebit)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total credits</span>
            <span className="font-bold">{formatNaira(totalCredit)}</span>
          </div>
          {!balanced ? (
            <p className="mt-1 font-bold text-bad">Debits and credits must balance to post.</p>
          ) : null}
        </div>

        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !balanced}>
            {submitting ? "Posting…" : "Post Entry"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
