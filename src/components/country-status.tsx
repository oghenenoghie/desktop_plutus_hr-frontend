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

// An option label for a country picker: an organisation can only choose a
// country whose rules are approved, so the others say why they're disabled.
export function countryOptionLabel(country: {
  name: string;
  currency: string;
  status: CountryTaxStatus;
  selectable: boolean;
}): string {
  return country.selectable
    ? `${country.name} (${country.currency})`
    : `${country.name} (${country.currency}) — not available yet: ${countryStatusLabel(country.status).toLowerCase()}`;
}
