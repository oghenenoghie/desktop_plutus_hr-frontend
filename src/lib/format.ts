// Every amount the API returns is in integer minor units of the
// organisation's currency, which follows its country. The signed-in
// organisation's currency is set once from /auth/me (see auth-context.tsx)
// before any screen renders, so every formatter below uses it.
let displayCurrency = "NGN";

export function setDisplayCurrency(currency: string): void {
  displayCurrency = currency;
}

export function getDisplayCurrency(): string {
  return displayCurrency;
}

// The currency's own number of decimal places (ISO 4217): 2 for NGN or
// KES, 0 for RWF or XOF, so an amount is never divided by 100 when the
// currency has no minor unit.
function minorDigits(currency: string): number {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

// How amounts are labelled in form fields: "₦" for naira, the ISO code
// ("KES", "RWF") for every other currency.
export function currencyLabel(currency: string = displayCurrency): string {
  return currency === "NGN" ? "₦" : currency;
}

// Whole units, en-NG grouping, no decimals, per the Ledger design system:
// "₦1,250,000" in Nigeria, "KES 1,250,000" in Kenya.
export function formatMoney(minor: number, currency: string = displayCurrency): string {
  const whole = Math.round(minor / 10 ** minorDigits(currency)).toLocaleString("en-NG");
  return currency === "NGN" ? `₦${whole}` : `${currency} ${whole}`;
}

// Inverse of formatMoney, for form inputs collecting an amount in whole or
// decimal units of the organisation's currency.
export function toMinorUnits(value: string, currency: string = displayCurrency): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 10 ** minorDigits(currency)) : 0;
}

// The inverse, for pre-filling an input with a stored amount.
export function fromMinorUnits(minor: number, currency: string = displayCurrency): number {
  return minor / 10 ** minorDigits(currency);
}

// A trial balance line's balance_minor is signed (total debit - total
// credit), so a credit-normal account (liability/equity/revenue) with more
// credits than debits is negative — formatMoney would render that as
// "₦-50,000". Standard trial balance convention instead shows the unsigned
// amount with a Dr/Cr suffix for which side is larger.
export function formatLedgerBalance(balanceMinor: number): string {
  const side = balanceMinor < 0 ? "Cr" : "Dr";
  return `${formatMoney(Math.abs(balanceMinor))} ${side}`;
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
