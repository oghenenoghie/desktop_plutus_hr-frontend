"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { chartAccountsApi, companyBankAccountsApi, ledgerReconciliationApi } from "@/lib/api/endpoints";
import { currencyLabel, formatDate, formatMoney, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type {
  BankStatementLine,
  ChartAccount,
  CompanyBankAccount,
  LedgerEntry,
  LedgerReconciliationLedgerEntry,
  LedgerStatementLine,
} from "@/lib/types";

export default function BankReconciliationPage() {
  return (
    <div>
      <PageHeader
        title="Bank Reconciliation"
        subtitle="Match the org's bank statement against General Ledger cash activity"
      />
      <Tabs
        tabs={[
          { id: "by-bank-account", label: "By Bank Account", content: <ByBankAccountTab /> },
          { id: "by-ledger-account", label: "By Ledger Account", content: <ByLedgerAccountTab /> },
        ]}
      />
    </div>
  );
}

function ByBankAccountTab() {
  const bankAccounts = useApiResource(() => companyBankAccountsApi.list());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const selectedAccount =
    (bankAccounts.data ?? []).find((account) => account.id === selectedId) ??
    (bankAccounts.data ?? [])[0] ??
    null;

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setCreatingAccount(true)}>New Bank Account</Button>
      </div>

      <Card className="mb-6">
        {bankAccounts.loading ? <LoadingState /> : null}
        {bankAccounts.error ? <ErrorState message={bankAccounts.error} /> : null}
        {bankAccounts.data && bankAccounts.data.length === 0 ? (
          <EmptyState label="No bank accounts yet." />
        ) : null}
        {bankAccounts.data && bankAccounts.data.length > 0 ? (
          <div>
            <Label htmlFor="bankAccount">Bank Account</Label>
            <Select
              id="bankAccount"
              value={selectedAccount?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {bankAccounts.data.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bank_name} — {account.account_number} ({account.account_name})
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </Card>

      {selectedAccount ? <ReconciliationView bankAccount={selectedAccount} /> : null}

      {creatingAccount ? (
        <NewBankAccountDrawer
          onClose={() => setCreatingAccount(false)}
          onCreated={(account) => {
            setCreatingAccount(false);
            setSelectedId(account.id);
            bankAccounts.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function ReconciliationView({ bankAccount }: { bankAccount: CompanyBankAccount }) {
  const summary = useApiResource(
    () => companyBankAccountsApi.reconciliation(bankAccount.id),
    [bankAccount.id],
  );
  const [addingLine, setAddingLine] = useState(false);
  const [matching, setMatching] = useState<BankStatementLine | null>(null);

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Bank Balance"
          value={summary.data ? formatMoney(summary.data.bank_balance_minor) : "—"}
        />
        <StatTile
          label="Ledger Balance"
          value={summary.data ? formatMoney(summary.data.ledger_balance_minor) : "—"}
        />
        <StatTile
          label="Difference"
          value={summary.data ? formatMoney(summary.data.difference_minor) : "—"}
          tone={summary.data && summary.data.difference_minor !== 0 ? "warn" : "good"}
        />
      </div>

      {summary.loading ? <LoadingState /> : null}
      {summary.error ? <ErrorState message={summary.error} /> : null}

      {summary.data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Unmatched Statement Lines"
              action={<Button onClick={() => setAddingLine(true)}>Add Statement Line</Button>}
            />
            {summary.data.unmatched_statement_lines.length === 0 ? (
              <EmptyState label="Nothing outstanding — every statement line is matched." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th align="right">Amount</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </Thead>
                <tbody>
                  {summary.data.unmatched_statement_lines.map((line) => (
                    <tr key={line.id}>
                      <Td>{formatDate(line.statement_date)}</Td>
                      <Td>{line.description}</Td>
                      <Td align="right">{formatMoney(line.amount_minor)}</Td>
                      <Td align="right">
                        <Button variant="secondary" onClick={() => setMatching(line)}>
                          Match
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Unmatched Ledger Entries" />
            {summary.data.unmatched_ledger_entries.length === 0 ? (
              <EmptyState label="Nothing outstanding — every ledger entry is matched." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th align="right">Debit</Th>
                    <Th align="right">Credit</Th>
                  </tr>
                </Thead>
                <tbody>
                  {summary.data.unmatched_ledger_entries.map((entry) => (
                    <tr key={entry.id}>
                      <Td>{formatDate(entry.created_at)}</Td>
                      <Td>{entry.description ?? "—"}</Td>
                      <Td align="right">{entry.debit_minor ? formatMoney(entry.debit_minor) : "—"}</Td>
                      <Td align="right">
                        {entry.credit_minor ? formatMoney(entry.credit_minor) : "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      ) : null}

      {addingLine ? (
        <NewStatementLineDrawer
          bankAccount={bankAccount}
          onClose={() => setAddingLine(false)}
          onCreated={() => {
            setAddingLine(false);
            summary.reload();
          }}
        />
      ) : null}

      {matching ? (
        <MatchDrawer
          bankAccount={bankAccount}
          line={matching}
          candidates={summary.data?.unmatched_ledger_entries ?? []}
          onClose={() => setMatching(null)}
          onMatched={() => {
            setMatching(null);
            summary.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <Card padding="compact">
      <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
        {label}
      </div>
      <div className={`mt-1 text-[20px] font-extrabold ${toneClass}`}>{value}</div>
    </Card>
  );
}

function NewBankAccountDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (account: CompanyBankAccount) => void;
}) {
  const accounts = useApiResource(() => chartAccountsApi.list());
  const { showToast } = useToast();
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [chartAccountCode, setChartAccountCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const assetAccounts = (accounts.data ?? []).filter(
    (account: ChartAccount) => account.type === "asset" && account.is_active,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await companyBankAccountsApi.create({
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        chart_account_code: chartAccountCode,
      });
      onCreated(created);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Bank Account" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="bankName">Bank Name</Label>
          <Input id="bankName" value={bankName} onChange={(event) => setBankName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input
            id="accountNumber"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="accountName">Account Name</Label>
          <Input
            id="accountName"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="chartAccount">Ledger Account</Label>
          <Select
            id="chartAccount"
            value={chartAccountCode}
            onChange={(event) => setChartAccountCode(event.target.value)}
            required
          >
            <option value="">Select account</option>
            {assetAccounts.map((account) => (
              <option key={account.id} value={account.code}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Account"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function NewStatementLineDrawer({
  bankAccount,
  onClose,
  onCreated,
}: {
  bankAccount: CompanyBankAccount;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [statementDate, setStatementDate] = useState("");
  const [description, setDescription] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const minor = toMinorUnits(amount);
      await companyBankAccountsApi.addStatementLine(bankAccount.id, {
        statement_date: statementDate,
        description,
        amount_minor: direction === "in" ? minor : -minor,
      });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Statement Line" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="statementDate">Statement Date</Label>
          <Input
            id="statementDate"
            type="date"
            value={statementDate}
            onChange={(event) => setStatementDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Customer deposit"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="direction">Direction</Label>
            <Select
              id="direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value as "in" | "out")}
            >
              <option value="in">Money In</option>
              <option value="out">Money Out</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="amount">Amount ({currencyLabel()})</Label>
            <Input id="amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required />
          </div>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add Line"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function MatchDrawer({
  bankAccount,
  line,
  candidates,
  onClose,
  onMatched,
}: {
  bankAccount: CompanyBankAccount;
  line: BankStatementLine;
  candidates: LedgerEntry[];
  onClose: () => void;
  onMatched: () => void;
}) {
  const { showToast } = useToast();
  const [matchingId, setMatchingId] = useState<string | null>(null);

  const signedAmount = (entry: LedgerEntry) => entry.debit_minor - entry.credit_minor;
  const eligible = candidates.filter((entry) => signedAmount(entry) === line.amount_minor);

  async function match(entryId: string) {
    setMatchingId(entryId);
    try {
      await companyBankAccountsApi.matchStatementLine(bankAccount.id, line.id, {
        ledger_entry_id: entryId,
      });
      onMatched();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setMatchingId(null);
    }
  }

  return (
    <Drawer title={`Match "${line.description}"`} onClose={onClose}>
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Statement amount: <span className="font-bold text-ink">{formatMoney(line.amount_minor)}</span>.
          Only ledger entries with a matching amount are shown.
        </p>
        {eligible.length === 0 ? (
          <EmptyState label="No unmatched ledger entry has this exact amount yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {eligible.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => match(entry.id)}
                disabled={matchingId !== null}
                className="flex items-center justify-between rounded-panel border border-border px-3 py-2.5 text-left text-[13px] hover:bg-bg disabled:opacity-50"
              >
                <span>
                  <span className="font-bold">{entry.description ?? "—"}</span>
                  <span className="block text-[11px] text-ink-soft">{formatDate(entry.created_at)}</span>
                </span>
                <span className="font-bold">{formatMoney(signedAmount(entry))}</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function ByLedgerAccountTab() {
  const accounts = useApiResource(() => chartAccountsApi.list());
  const [accountCode, setAccountCode] = useState("");
  const status = useApiResource(
    () => (accountCode ? ledgerReconciliationApi.status(accountCode) : Promise.resolve(null)),
    [accountCode],
  );
  const [addingLine, setAddingLine] = useState(false);
  const [matching, setMatching] = useState<LedgerStatementLine | null>(null);

  const assetAccounts = (accounts.data ?? []).filter(
    (account) => account.type === "asset" && account.is_active,
  );

  return (
    <div>
      <Card className="mb-6">
        <Label htmlFor="accountCode">Ledger Account</Label>
        <Select id="accountCode" value={accountCode} onChange={(event) => setAccountCode(event.target.value)}>
          <option value="">Select an account</option>
          {assetAccounts.map((account) => (
            <option key={account.id} value={account.code}>
              {account.name} ({account.code})
            </option>
          ))}
        </Select>
      </Card>

      {accountCode ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Unmatched Statement Lines"
              action={<Button onClick={() => setAddingLine(true)}>Import Lines</Button>}
            />
            {status.loading ? <LoadingState /> : null}
            {status.error ? <ErrorState message={status.error} /> : null}
            {status.data && status.data.unmatched_statement_lines.length === 0 ? (
              <EmptyState label="Nothing outstanding — every statement line is matched." />
            ) : null}
            {status.data && status.data.unmatched_statement_lines.length > 0 ? (
              <Table>
                <Thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th align="right">Amount</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </Thead>
                <tbody>
                  {status.data.unmatched_statement_lines.map((line) => (
                    <tr key={line.id}>
                      <Td>{formatDate(line.transaction_date)}</Td>
                      <Td>{line.description}</Td>
                      <Td align="right">{formatMoney(line.amount_minor)}</Td>
                      <Td align="right">
                        <Button variant="secondary" onClick={() => setMatching(line)}>
                          Match
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Unmatched Ledger Entries" />
            {status.data && status.data.unmatched_ledger_entries.length === 0 ? (
              <EmptyState label="Nothing outstanding — every ledger entry is matched." />
            ) : null}
            {status.data && status.data.unmatched_ledger_entries.length > 0 ? (
              <Table>
                <Thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th align="right">Debit</Th>
                    <Th align="right">Credit</Th>
                  </tr>
                </Thead>
                <tbody>
                  {status.data.unmatched_ledger_entries.map((entry) => (
                    <tr key={entry.id}>
                      <Td>{formatDate(entry.created_at)}</Td>
                      <Td>{entry.description ?? "—"}</Td>
                      <Td align="right">{entry.debit_minor ? formatMoney(entry.debit_minor) : "—"}</Td>
                      <Td align="right">{entry.credit_minor ? formatMoney(entry.credit_minor) : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </Card>
        </div>
      ) : null}

      {addingLine ? (
        <ImportLedgerStatementLinesDrawer
          accountCode={accountCode}
          onClose={() => setAddingLine(false)}
          onImported={() => {
            setAddingLine(false);
            status.reload();
          }}
        />
      ) : null}

      {matching ? (
        <LedgerMatchDrawer
          line={matching}
          candidates={status.data?.unmatched_ledger_entries ?? []}
          onClose={() => setMatching(null)}
          onMatched={() => {
            setMatching(null);
            status.reload();
          }}
        />
      ) : null}

    </div>
  );
}

function ImportLedgerStatementLinesDrawer({
  accountCode,
  onClose,
  onImported,
}: {
  accountCode: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const { showToast } = useToast();
  const [transactionDate, setTransactionDate] = useState("");
  const [description, setDescription] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const minor = toMinorUnits(amount);
      await ledgerReconciliationApi.importLines(accountCode, [
        {
          transaction_date: transactionDate,
          description,
          amount_minor: direction === "in" ? minor : -minor,
        },
      ]);
      onImported();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Import Statement Line" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="transactionDate">Transaction Date</Label>
          <Input
            id="transactionDate"
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Customer deposit"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="direction">Direction</Label>
            <Select id="direction" value={direction} onChange={(event) => setDirection(event.target.value as "in" | "out")}>
              <option value="in">Money In</option>
              <option value="out">Money Out</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="amount">Amount ({currencyLabel()})</Label>
            <Input id="amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required />
          </div>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Importing…" : "Import Line"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function LedgerMatchDrawer({
  line,
  candidates,
  onClose,
  onMatched,
}: {
  line: LedgerStatementLine;
  candidates: LedgerReconciliationLedgerEntry[];
  onClose: () => void;
  onMatched: () => void;
}) {
  const { showToast } = useToast();
  const [matchingId, setMatchingId] = useState<string | null>(null);

  const signedAmount = (entry: LedgerReconciliationLedgerEntry) => entry.debit_minor - entry.credit_minor;
  const eligible = candidates.filter((entry) => signedAmount(entry) === line.amount_minor);

  async function match(entryId: string) {
    setMatchingId(entryId);
    try {
      await ledgerReconciliationApi.match(line.id, entryId);
      onMatched();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setMatchingId(null);
    }
  }

  return (
    <Drawer title={`Match "${line.description}"`} onClose={onClose}>
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Statement amount: <span className="font-bold text-ink">{formatMoney(line.amount_minor)}</span>.
          Only ledger entries with a matching amount are shown.
        </p>
        {eligible.length === 0 ? (
          <EmptyState label="No unmatched ledger entry has this exact amount yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {eligible.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => match(entry.id)}
                disabled={matchingId !== null}
                className="flex items-center justify-between rounded-panel border border-border px-3 py-2.5 text-left text-[13px] hover:bg-bg disabled:opacity-50"
              >
                <span>
                  <span className="font-bold">{entry.description ?? "—"}</span>
                  <span className="block text-[11px] text-ink-soft">{formatDate(entry.created_at)}</span>
                </span>
                <span className="font-bold">{formatMoney(signedAmount(entry))}</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
