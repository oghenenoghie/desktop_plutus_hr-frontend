import type { Role } from "@/lib/types";

// Mirrors the backend's require_roles() on POST /customers and POST /vendors
// (app/api/v1/customers.py, app/api/v1/vendors.py). The API is the real
// check; this only decides whether a form elsewhere (an invoice, a bill, a
// purchase order) offers "+ New Customer" / "+ New Vendor", so nobody fills
// one in only to have it refused.
const COUNTERPARTY_WRITERS: Role[] = ["admin", "payroll_manager", "accountant"];

export function canCreateCounterparties(role: Role | undefined): boolean {
  return role !== undefined && COUNTERPARTY_WRITERS.includes(role);
}
