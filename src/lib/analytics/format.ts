import type { Unit } from "@/lib/analytics/types";

// Every analytics figure is formatted here, by its unit, so a KPI card, a
// chart tooltip and a table cell always agree. Money arrives as integer
// minor units of its own currency; the currency's own number of decimals
// (from Intl) converts it, so a currency without minor units is never
// divided by 100.

const LOCALE = "en-NG";

function minorDigits(currency: string): number {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
}

export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** minorDigits(currency);
}

export function formatMoney(minor: number, currency: string, options: { compact?: boolean } = {}): string {
  const major = toMajor(minor, currency);
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.compact ? 1 : minorDigits(currency),
    minimumFractionDigits: options.compact ? 0 : minorDigits(currency),
  }).format(major);
}

function number(value: number, digits = 1): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits }).format(value);
}

export function formatValue(
  value: number | null,
  unit: Unit,
  currency: string | null,
  options: { compact?: boolean } = {},
): string {
  if (value === null || Number.isNaN(value)) return "—";
  switch (unit) {
    case "money":
      return formatMoney(value, currency ?? "NGN", options);
    case "percent":
      return `${number(value, 1)}%`;
    case "days":
      return `${number(value, 1)} ${value === 1 ? "day" : "days"}`;
    case "hours":
      return `${number(value, 1)} h`;
    case "years":
      return `${number(value, 1)} yrs`;
    case "rating":
      return number(value, 2);
    case "count":
      return options.compact
        ? new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(value)
        : number(value, 2);
    default:
      return String(value);
  }
}

// Axis ticks: compact, and the unit only where it reads naturally.
export function formatTick(value: number, unit: Unit, currency: string | null): string {
  if (unit === "money") return formatMoney(value, currency ?? "NGN", { compact: true });
  if (unit === "percent") return `${number(value, 0)}%`;
  return new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatChangePct(pct: number): string {
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${number(Math.abs(pct), 1)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-01" → "Jan 2026" (or "Jan" with short).
export function formatPeriod(period: string, short = false): string {
  const [year, month] = period.split("-");
  const label = MONTHS[Number(month) - 1] ?? period;
  return short ? label : `${label} ${year}`;
}

// A whole calendar month reads as "Jan 2026"; anything else as a date range.
export function formatPeriodRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const lastDay = new Date(Date.UTC(ey!, em!, 0)).getUTCDate();
  if (sy === ey && sm === em && sd === 1 && ed === lastDay) return `${MONTHS[sm! - 1]} ${sy}`;
  if (sy === ey && sm === 1 && sd === 1 && em === 12 && ed === 31) return `${sy}`;
  return `${formatIsoDate(start)} – ${formatIsoDate(end)}`;
}

export function formatIsoDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

// Clean axis ticks from 0 (or the negative minimum) up to the first tick at
// or above the maximum, so no mark ever runs past the top of the axis.
// Whole-number steps for counts: there is no half an employee.
export function niceTicks(min: number, max: number, count = 4, integer = false): number[] {
  const low = Math.min(0, min);
  const high = Math.max(0, max);
  if (high === low) return [0];
  const raw = (high - low) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const multiples = integer && magnitude < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  let step = multiples.map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  if (integer) step = Math.max(1, Math.round(step));
  const start = Math.floor(low / step) * step;
  const ticks: number[] = [];
  for (let tick = start; ; tick += step) {
    ticks.push(Number(tick.toFixed(10)));
    if (tick >= high || ticks.length > 50) break;
  }
  return ticks;
}

export function isWholeUnit(unit: Unit): boolean {
  return unit === "count" || unit === "days";
}
