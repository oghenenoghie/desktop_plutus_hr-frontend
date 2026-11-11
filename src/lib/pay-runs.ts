import type { PayRun } from "@/lib/types";

// What a pay run's status means to the people running it: the API's
// "locked" is a run posted to the books, and a posted run whose net pay
// has gone out is paid.
export function payRunStatusLabel(run: Pick<PayRun, "status" | "disbursed_at">): string {
  if (run.status === "locked") return run.disbursed_at ? "paid" : "posted";
  return run.status;
}
