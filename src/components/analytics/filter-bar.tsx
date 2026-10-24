"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Select } from "@/components/ui/select";
import {
  PRESET_LABELS,
  activeFilterCount,
  activePreset,
  presetRange,
  type AnalyticsFilterState,
  type PresetKey,
} from "@/lib/analytics/filters";
import type { FilterOptions, Option } from "@/lib/analytics/types";

// One row of filters above everything they scope. Each page shows only the
// filters that apply to it; every change lands in the URL and every chart
// and KPI on the page re-reads it. The API validates all of it again.

export type FilterKey =
  | "compare"
  | "department"
  | "location"
  | "employment_type"
  | "status"
  | "payroll_status"
  | "country";

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  useEffect(() => {
    if (!open) return;
    function onDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? "1 selected")
        : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        disabled={options.length === 0}
        className={`flex w-full items-center justify-between gap-2 rounded-panel border px-3 py-[9px] text-left text-[12.5px] disabled:opacity-50 ${
          selected.length ? "border-primary bg-primary-tint text-primary-dark" : "border-border bg-surface text-ink"
        }`}
      >
        <span className="truncate">
          <span className="font-bold">{label}:</span> {summary}
        </span>
        <ChevronDown size={14} aria-hidden className="shrink-0" />
      </button>
      {open ? (
        <div
          id={listId}
          className="absolute left-0 top-full z-30 mt-1 max-h-72 w-64 overflow-y-auto rounded-panel border border-border bg-surface p-2 shadow-sm"
        >
          <fieldset>
            <legend className="sr-only">{label}</legend>
            {options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-chip px-2 py-1.5 text-[12.5px] text-ink hover:bg-bg"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange(checked ? selected.filter((v) => v !== option.value) : [...selected, option.value])
                    }
                    className="accent-[var(--color-primary)]"
                  />
                  {option.label}
                </label>
              );
            })}
          </fieldset>
          {selected.length ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-chip border-t border-border px-2 pt-2 text-left text-[12px] font-bold text-ink-soft hover:text-ink"
            >
              Clear {label.toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function FilterBar({
  filters,
  options,
  show,
  onChange,
  onReset,
}: {
  filters: AnalyticsFilterState;
  options: FilterOptions | null;
  show: FilterKey[];
  onChange: (patch: Partial<AnalyticsFilterState>) => void;
  onReset: () => void;
}) {
  const preset = activePreset(filters);
  const [customOpen, setCustomOpen] = useState(preset === "custom");
  const fromId = useId();
  const toId = useId();
  const rangeHint = options ? `Up to ${options.max_range_months} months.` : "";
  const touched = activeFilterCount(filters) > 0 || preset !== "last_12_months" || filters.compare !== "previous_period";

  function choosePreset(key: PresetKey) {
    if (key === "custom") {
      setCustomOpen(true);
      if (!filters.from || !filters.to) {
        onChange({ from: options?.default_from ?? null, to: options?.default_to ?? null });
      }
      return;
    }
    setCustomOpen(false);
    onChange(presetRange(key));
  }

  return (
    <section aria-label="Filters" className="mb-6 rounded-card border border-border bg-surface p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-wrap xl:items-center">
        <label className="flex items-center gap-2 xl:w-56">
          <span className="sr-only">Reporting period</span>
          <Select
            value={customOpen ? "custom" : preset}
            onChange={(event) => choosePreset(event.target.value as PresetKey)}
            className="!py-[9px] !text-[12.5px] font-bold"
          >
            {(Object.keys(PRESET_LABELS) as PresetKey[]).map((key) => (
              <option key={key} value={key}>
                {PRESET_LABELS[key]}
              </option>
            ))}
          </Select>
        </label>
        {customOpen ? (
          <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-1">
            <label htmlFor={fromId} className="sr-only">
              From
            </label>
            <input
              id={fromId}
              type="date"
              value={filters.from ?? ""}
              max={filters.to ?? undefined}
              onChange={(event) => event.target.value && onChange({ from: event.target.value })}
              className="w-full rounded-panel border border-border bg-surface px-3 py-[8px] text-[12.5px] text-ink"
            />
            <span className="text-[12px] text-ink-soft">to</span>
            <label htmlFor={toId} className="sr-only">
              To
            </label>
            <input
              id={toId}
              type="date"
              value={filters.to ?? ""}
              min={filters.from ?? undefined}
              onChange={(event) => event.target.value && onChange({ to: event.target.value })}
              className="w-full rounded-panel border border-border bg-surface px-3 py-[8px] text-[12.5px] text-ink"
            />
          </div>
        ) : null}
        {show.includes("compare") ? (
          <label className="xl:w-52">
            <span className="sr-only">Compare with</span>
            <Select
              value={filters.compare}
              onChange={(event) => onChange({ compare: event.target.value as AnalyticsFilterState["compare"] })}
              className="!py-[9px] !text-[12.5px]"
            >
              <option value="previous_period">vs previous period</option>
              <option value="previous_year">vs same period last year</option>
              <option value="none">No comparison</option>
            </Select>
          </label>
        ) : null}
        {show.includes("department") ? (
          <div className="xl:w-48">
            <MultiSelect
              label="Department"
              options={options?.departments ?? []}
              selected={filters.departments}
              onChange={(departments) => onChange({ departments })}
            />
          </div>
        ) : null}
        {show.includes("location") ? (
          <div className="xl:w-44">
            <MultiSelect
              label="Location"
              options={options?.locations ?? []}
              selected={filters.locations}
              onChange={(locations) => onChange({ locations })}
            />
          </div>
        ) : null}
        {show.includes("employment_type") ? (
          <div className="xl:w-48">
            <MultiSelect
              label="Type"
              options={options?.employment_types ?? []}
              selected={filters.employmentTypes}
              onChange={(employmentTypes) => onChange({ employmentTypes })}
            />
          </div>
        ) : null}
        {show.includes("status") ? (
          <div className="xl:w-44">
            <MultiSelect
              label="Status"
              options={options?.statuses ?? []}
              selected={filters.statuses}
              onChange={(statuses) => onChange({ statuses })}
            />
          </div>
        ) : null}
        {show.includes("payroll_status") ? (
          <label className="xl:w-56">
            <span className="sr-only">Pay runs included</span>
            <Select
              value={filters.payrollStatus}
              onChange={(event) =>
                onChange({ payrollStatus: event.target.value as AnalyticsFilterState["payrollStatus"] })
              }
              className="!py-[9px] !text-[12.5px]"
            >
              {(options?.payroll_statuses ?? [{ value: "locked", label: "Locked runs only" }]).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        {show.includes("country") ? (
          <label className="xl:w-48">
            <span className="sr-only">Country</span>
            <Select
              value={filters.country}
              onChange={(event) => onChange({ country: event.target.value })}
              className="!py-[9px] !text-[12.5px]"
            >
              {(options?.countries ?? [{ code: "NG", name: "Nigeria", currency: "NGN", status: "active" }]).map(
                (country) => (
                  <option key={country.code} value={country.code} disabled={country.status !== "active"}>
                    {country.name}
                    {country.status !== "active" ? " (setup required)" : ` · ${country.currency}`}
                  </option>
                ),
              )}
            </Select>
          </label>
        ) : null}
        {touched ? (
          <button
            type="button"
            onClick={() => {
              setCustomOpen(false);
              onReset();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-panel px-3 py-[9px] text-[12.5px] font-bold text-ink-soft hover:bg-bg hover:text-ink"
          >
            <RotateCcw size={13} aria-hidden /> Reset filters
          </button>
        ) : null}
      </div>
      {customOpen && rangeHint ? <p className="mt-2 px-1 text-[11.5px] text-ink-soft">{rangeHint}</p> : null}
    </section>
  );
}
