"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

import { AccountCreateModal } from "@/components/accounting/account-create-modal";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ACCOUNT_CATEGORIES, byNumber } from "@/lib/accounting";
import { ApiError } from "@/lib/api/client";
import { chartAccountsApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { AccountType, ChartAccount } from "@/lib/types";

const TYPE_LABELS: Record<AccountType, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expense",
};

export default function ChartOfAccountsPage() {
  const accounts = useApiResource(() => chartAccountsApi.list());
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function seedDefaults() {
    setSeeding(true);
    try {
      await chartAccountsApi.seedDefaults();
      showToast("Default chart of accounts created", "good");
      accounts.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSeeding(false);
    }
  }

  async function toggleActive(account: ChartAccount) {
    try {
      await chartAccountsApi.update(account.id, { is_active: !account.is_active });
      accounts.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  const grouped = ACCOUNT_CATEGORIES.map((category) => ({
    ...category,
    accounts: [...(accounts.data ?? [])].filter((account) => account.category === category.value).sort(byNumber),
  }));

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        subtitle="Numbered by range: 1000–3999 balance sheet, 4000–4999 sales and other income, 5000–5999 cost of sales, 6000–7999 overheads"
        action={
          <div className="flex gap-3">
            <Link href="/general-ledger">
              <Button variant="secondary">Back to Ledger</Button>
            </Link>
            <Button onClick={() => setCreating(true)}>New Account</Button>
          </div>
        }
      />

      <Card>
        {accounts.loading ? <LoadingState /> : null}
        {accounts.error ? <ErrorState message={accounts.error} /> : null}
        {accounts.data && accounts.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <EmptyState label="No chart of accounts yet." />
            <Button onClick={seedDefaults} disabled={seeding}>
              {seeding ? "Seeding…" : "Seed Default Accounts"}
            </Button>
          </div>
        ) : null}
        {accounts.data && accounts.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Number</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Source</Th>
                <Th align="right">Status</Th>
              </tr>
            </Thead>
            <tbody>
              {grouped.map((group, index) => (
                <Fragment key={group.value}>
                  {index === 0 || group.value === "revenue" ? (
                    <tr>
                      <td colSpan={5} className="bg-surface px-3 pb-1 pt-4 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">
                        {group.value === "revenue" ? "Profit and Loss" : "Balance Sheet"}
                      </td>
                    </tr>
                  ) : null}
                  <tr>
                    <td colSpan={5} className="px-3 pb-1 pt-3 text-[12px] font-bold text-ink-soft">
                      {group.label} · {group.from}–{group.to}
                    </td>
                  </tr>
                  {group.accounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-[12px] text-ink-soft">
                        No accounts yet.
                      </td>
                    </tr>
                  ) : null}
                  {group.accounts.map((account) => (
                    <tr key={account.id}>
                      <Td className="font-mono text-[13px] font-bold">{account.account_number}</Td>
                      <Td>
                        <span className="font-bold">{account.name}</span>
                        <span className="ml-2 font-mono text-[11px] text-ink-soft">{account.code}</span>
                      </Td>
                      <Td>{TYPE_LABELS[account.type]}</Td>
                      <Td>{account.is_system ? "Default" : "Custom"}</Td>
                      <Td align="right">
                        <button type="button" onClick={() => toggleActive(account)} className="inline-flex">
                          <Badge tone={account.is_active ? "good" : "neutral"}>
                            {account.is_active ? "active" : "inactive"}
                          </Badge>
                        </button>
                      </Td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <AccountCreateModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            accounts.reload();
          }}
        />
      ) : null}
    </div>
  );
}
