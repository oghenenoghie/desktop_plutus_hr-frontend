import { Badge } from "@/components/ui/badge";
import type { CountryTaxStatus } from "@/lib/types";

// How far a country's tax rules have got, in the same words on every screen.
// Only "active" rules are ever calculated or posted with; the backend
// refuses every other state whatever this screen shows.
const STATUS: Record<CountryTaxStatus, { label: string; tone: "good" | "warn" | "neutral" }> = {
  active: { label: "Active", tone: "good" },
  in_review: { label: "Awaiting review", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
  configuration_required: { label: "Setup required", tone: "warn" },
};

export function countryStatusLabel(status: CountryTaxStatus): string {
  return STATUS[status]?.label ?? status;
}

export function CountryStatusBadge({ status }: { status: CountryTaxStatus }) {
  const { label, tone } = STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={tone}>{label}</Badge>;
}

// An option label for a country picker. Every country can be chosen; one
// whose rules aren't approved yet says payroll isn't available there.
export function countryOptionLabel(country: {
  name: string;
  currency: string;
  payroll_available: boolean;
}): string {
  return country.payroll_available
    ? `${country.name} (${country.currency})`
    : `${country.name} (${country.currency}) — payroll not available yet`;
}
