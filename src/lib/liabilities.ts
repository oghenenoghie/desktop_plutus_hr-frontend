import type { StatutoryLiability } from "@/lib/types";

// What a statutory liability is for: Nigeria's scheme ("PAYE", "NHF"), or
// for a country on the country rule engine the line codes it totals
// ("PENSION+PENSION-ER").
export function liabilityLabel(liability: Pick<StatutoryLiability, "scheme" | "line_code">): string {
  if (liability.scheme === "country" && liability.line_code) return liability.line_code;
  return liability.scheme.toUpperCase();
}
