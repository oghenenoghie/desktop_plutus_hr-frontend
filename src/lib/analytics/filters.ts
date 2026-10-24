"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { CompareMode } from "@/lib/analytics/types";

// The filter bar lives in the URL query string, using the API's own
// parameter names, so a view can be bookmarked or shared and the same
// string goes straight to the API (which validates it again: nothing here
// is trusted). Moving between analytics pages keeps the query string.

export interface AnalyticsFilterState {
  from: string | null;
  to: string | null;
  compare: CompareMode;
  departments: string[];
  locations: string[];
  employmentTypes: string[];
  statuses: string[];
  payrollStatus: "locked" | "validated";
  country: string;
}

const LIST_KEYS = {
  departments: "department_id",
  locations: "location_id",
  employmentTypes: "employment_type",
  statuses: "status",
} as const;

export function parseFilters(params: URLSearchParams): AnalyticsFilterState {
  const compare = params.get("compare");
  return {
    from: params.get("date_from"),
    to: params.get("date_to"),
    compare:
      compare === "previous_year" || compare === "none" ? compare : "previous_period",
    departments: params.getAll(LIST_KEYS.departments),
    locations: params.getAll(LIST_KEYS.locations),
    employmentTypes: params.getAll(LIST_KEYS.employmentTypes),
    statuses: params.getAll(LIST_KEYS.statuses),
    payrollStatus: params.get("payroll_status") === "validated" ? "validated" : "locked",
    country: params.get("country") ?? "NG",
  };
}

export function toQueryString(state: AnalyticsFilterState): string {
  const params = new URLSearchParams();
  if (state.from) params.set("date_from", state.from);
  if (state.to) params.set("date_to", state.to);
  if (state.compare !== "previous_period") params.set("compare", state.compare);
  for (const [field, key] of Object.entries(LIST_KEYS)) {
    for (const value of state[field as keyof typeof LIST_KEYS]) params.append(key, value);
  }
  if (state.payrollStatus !== "locked") params.set("payroll_status", state.payrollStatus);
  if (state.country !== "NG") params.set("country", state.country);
  return params.toString();
}

export function activeFilterCount(state: AnalyticsFilterState): number {
  return (
    state.departments.length +
    state.locations.length +
    state.employmentTypes.length +
    state.statuses.length +
    (state.payrollStatus !== "locked" ? 1 : 0) +
    (state.country !== "NG" ? 1 : 0)
  );
}

// --- date presets (Lagos calendar) ------------------------------------------

function lagosToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = parts.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

function monthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0));
}

export type PresetKey =
  | "last_12_months"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export const PRESET_LABELS: Record<PresetKey, string> = {
  last_12_months: "Last 12 months",
  this_month: "This month",
  last_month: "Last month",
  this_quarter: "This quarter",
  last_quarter: "Last quarter",
  this_year: "This year",
  last_year: "Last year",
  custom: "Custom range",
};

export function presetRange(key: Exclude<PresetKey, "custom">): { from: string | null; to: string | null } {
  if (key === "last_12_months") return { from: null, to: null }; // the API's default
  const today = lagosToday();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const quarter = Math.floor(month / 3) * 3;
  switch (key) {
    case "this_month":
      return { from: iso(monthStart(year, month)), to: iso(monthEnd(year, month)) };
    case "last_month":
      return { from: iso(monthStart(year, month - 1)), to: iso(monthEnd(year, month - 1)) };
    case "this_quarter":
      return { from: iso(monthStart(year, quarter)), to: iso(monthEnd(year, quarter + 2)) };
    case "last_quarter":
      return { from: iso(monthStart(year, quarter - 3)), to: iso(monthEnd(year, quarter - 1)) };
    case "this_year":
      return { from: iso(monthStart(year, 0)), to: iso(monthEnd(year, 11)) };
    case "last_year":
      return { from: iso(monthStart(year - 1, 0)), to: iso(monthEnd(year - 1, 11)) };
  }
}

export function activePreset(state: AnalyticsFilterState): PresetKey {
  if (!state.from && !state.to) return "last_12_months";
  for (const key of Object.keys(PRESET_LABELS) as PresetKey[]) {
    if (key === "custom" || key === "last_12_months") continue;
    const range = presetRange(key);
    if (range.from === state.from && range.to === state.to) return key;
  }
  return "custom";
}

// --- hook ---------------------------------------------------------------------

export function useAnalyticsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const query = useMemo(() => toQueryString(filters), [filters]);

  const update = useCallback(
    (patch: Partial<AnalyticsFilterState>) => {
      const next = toQueryString({ ...filters, ...patch });
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );
  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  return { filters, query, update, reset };
}
