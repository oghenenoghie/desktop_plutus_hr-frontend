// Whole naira, en-NG grouping, no decimals — per the Ledger design system.
export function formatNaira(minor: number): string {
  return `₦${Math.round(minor / 100).toLocaleString("en-NG")}`;
}

// Inverse of formatNaira, for form inputs collecting a whole-naira amount.
export function nairaToMinor(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

// A trial balance line's balance_minor is signed (total debit - total
// credit), so a credit-normal account (liability/equity/revenue) with more
// credits than debits is negative — formatNaira would render that as
// "₦-50,000". Standard trial balance convention instead shows the unsigned
// amount with a Dr/Cr suffix for which side is larger.
export function formatLedgerBalance(balanceMinor: number): string {
  const side = balanceMinor < 0 ? "Cr" : "Dr";
  return `${formatNaira(Math.abs(balanceMinor))} ${side}`;
}

// The backend expresses statutory rates in parts-per-million (1,000,000 =
// 100%) so PAYE band boundaries stay exact integers — 150000 ppm = 15%.
export function formatPpmAsPercent(ppm: number): string {
  const percent = ppm / 10_000;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
