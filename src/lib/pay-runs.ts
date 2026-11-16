import type { PayRun } from "@/lib/types";

// What a pay run's status means to the people running it: the API's
// "locked" is a run posted to the books, and a posted run whose net pay
// has gone out is paid.
export function payRunStatusLabel(run: Pick<PayRun, "status" | "disbursed_at">): string {
  if (run.status === "locked") return run.disbursed_at ? "paid" : "posted";
  return run.status;
}

// Who a statutory charge is paid to, as people say it: PAYE goes to the
// revenue service of the employee's state of residence; other authorities
// are shown by their code ("PFA", "FMBN", "NSITF").
export function authorityLabel(authority: string | null, state: string | null): string {
  if (!authority) return "—";
  if (authority === "STATE_IRS") return state ? `${state} State Internal Revenue Service` : "State Internal Revenue Service";
  return authority.replace(/_/g, " ");
}
