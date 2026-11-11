import type { AccountCategory, AccountType, ChartAccount, Role } from "@/lib/types";

// Mirrors the backend's require_roles() on POST /customers, POST /vendors and
// POST /chart-of-accounts (app/api/v1/customers.py, vendors.py,
// chart_accounts.py). The API is the real
// check; this only decides whether a form elsewhere (an invoice, a bill, a
// purchase order) offers "+ New Customer" / "+ New Vendor", so nobody fills
// one in only to have it refused. The same roles add accounts to the chart
// ("+ New Account" on an invoice or a bill).
const COUNTERPARTY_WRITERS: Role[] = ["admin", "payroll_manager", "accountant"];

export function canCreateCounterparties(role: Role | undefined): boolean {
  return role !== undefined && COUNTERPARTY_WRITERS.includes(role);
}

// The chart's number ranges, as the backend checks them
// (app/domain/accounting/numbering.py): balance sheet 1000–3999, profit and
// loss 4000–7999, with sales, cost of sales and overheads in their own ranges.
export const ACCOUNT_CATEGORIES: { value: AccountCategory; label: string; type: AccountType; from: number; to: number }[] = [
  { value: "current_asset", label: "Current assets", type: "asset", from: 1000, to: 1499 },
  { value: "non_current_asset", label: "Fixed (non-current) assets", type: "asset", from: 1500, to: 1999 },
  { value: "current_liability", label: "Current liabilities", type: "liability", from: 2000, to: 2499 },
  { value: "non_current_liability", label: "Non-current liabilities", type: "liability", from: 2500, to: 2999 },
  { value: "equity", label: "Capital and reserves", type: "equity", from: 3000, to: 3999 },
  { value: "revenue", label: "Sales / revenue", type: "revenue", from: 4000, to: 4799 },
  { value: "other_income", label: "Other income", type: "revenue", from: 4800, to: 4999 },
  { value: "cost_of_sales", label: "Cost of sales", type: "expense", from: 5000, to: 5999 },
  { value: "operating_expense", label: "Overheads", type: "expense", from: 6000, to: 7999 },
];

export function categoryInfo(category: AccountCategory) {
  return ACCOUNT_CATEGORIES.find((entry) => entry.value === category)!;
}

// How an account appears wherever one is picked: "4000 · Revenue".
export function accountLabel(account: Pick<ChartAccount, "account_number" | "name">): string {
  return account.account_number ? `${account.account_number} · ${account.name}` : account.name;
}

export function byNumber(a: ChartAccount, b: ChartAccount): number {
  return (a.account_number ?? "").localeCompare(b.account_number ?? "");
}
