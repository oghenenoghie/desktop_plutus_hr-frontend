"use client";

import { Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { NAV_ICONS } from "@/components/layout/sidebar";
import { employeesApi } from "@/lib/api/endpoints";
import { navGroupsForRole, type CountryAccess, type NavItem } from "@/lib/nav";
import type { Employee, Role } from "@/lib/types";

interface Result {
  id: string;
  kind: "page" | "employee";
  label: string;
  context: string;
  href: string;
  icon: NavItem["icon"] | null;
}

const MAX_PAGES = 6;

// The platform never changes while the page is open.
function noSubscription(): () => void {
  return () => {};
}
const MAX_EMPLOYEES = 5;

// Every page the role can open, with where it sits in the menu.
function pagesFor(role: Role, access: CountryAccess): Result[] {
  const seen = new Set<string>();
  const results: Result[] = [];
  for (const group of navGroupsForRole(role, access)) {
    const sections = group.subgroups
      ? group.subgroups.map((subgroup) => ({ context: `${group.heading} › ${subgroup.heading}`, items: subgroup.items }))
      : [{ context: group.heading, items: group.items ?? [] }];
    for (const section of sections) {
      for (const item of section.items) {
        if (seen.has(item.href)) continue;
        seen.add(item.href);
        results.push({
          id: `page:${item.href}`,
          kind: "page",
          label: item.label,
          context: section.context,
          href: item.href,
          icon: item.icon,
        });
      }
    }
  }
  return results;
}

function matches(term: string, ...fields: (string | null | undefined)[]): boolean {
  return fields.some((field) => field?.toLocaleLowerCase().includes(term));
}

// The top bar's search: pages this role can open, and employees by name or
// number for roles that can see the employee list. Opens with Ctrl+K (⌘K on
// a Mac); arrow keys move through the results, Enter opens one.
export function GlobalSearch({ role, access }: { role: Role; access: CountryAccess }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const isMac = useSyncExternalStore(
    noSubscription,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
  const pages = useMemo(() => pagesFor(role, access), [role, access]);
  const canSearchEmployees = pages.some((page) => page.href === "/employees");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // The employee list loads the first time someone types, not on every page.
  const loadEmployees = useCallback(() => {
    if (!canSearchEmployees || employees !== null) return;
    setEmployees([]);
    employeesApi
      .list()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [canSearchEmployees, employees]);

  const term = query.trim().toLocaleLowerCase();
  const results = useMemo<Result[]>(() => {
    if (!term) return [];
    // Pages named for the search come before pages that only sit in a
    // matching section of the menu.
    const byName = pages.filter((page) => matches(term, page.label));
    const bySection = pages.filter((page) => !matches(term, page.label) && matches(term, page.context));
    const pageResults = [...byName, ...bySection].slice(0, MAX_PAGES);
    const employeeResults: Result[] = (employees ?? [])
      .filter((employee) => matches(term, employee.full_name, employee.employee_number, employee.job_title))
      .slice(0, MAX_EMPLOYEES)
      .map((employee) => ({
        id: `employee:${employee.id}`,
        kind: "employee",
        label: employee.full_name,
        context: [employee.employee_number, employee.job_title].filter(Boolean).join(" · "),
        href: `/employees/${employee.id}`,
        icon: null,
      }));
    return [...pageResults, ...employeeResults];
  }, [term, pages, employees]);

  const showList = open && term.length > 0;
  const activeResult = results[Math.min(active, results.length - 1)];

  function go(result: Result) {
    setOpen(false);
    setQuery("");
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    router.push(result.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && activeResult) {
      event.preventDefault();
      go(activeResult);
    } else if (event.key === "Escape") {
      if (query) {
        setQuery("");
      } else {
        inputRef.current?.blur();
      }
      setOpen(false);
    }
  }

  return (
    <div className="relative w-full max-w-xl">
      <Search
        size={17}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search pages and employees"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeResult ? `${listId}-${activeResult.id}` : undefined}
        value={query}
        placeholder={canSearchEmployees ? "Search employees, pages or anything…" : "Search pages…"}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
          loadEmployees();
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-panel border border-border bg-surface-muted pl-10 pr-14 text-sm text-ink placeholder:text-ink-soft focus:border-primary focus:bg-surface focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-chip border border-border bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft sm:block"
      >
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-12 z-40 max-h-[70vh] overflow-y-auto rounded-panel border border-border bg-surface p-1.5 shadow-lg"
        >
          {results.length === 0 ? (
            <li role="presentation" className="px-3 py-3 text-sm text-ink-soft">
              {employees === null || !canSearchEmployees ? "No pages match" : "No pages or employees match"} “{query.trim()}”.
            </li>
          ) : (
            results.map((result, index) => {
              const Icon = result.icon ? NAV_ICONS[result.icon] : UserRound;
              const selected = activeResult?.id === result.id;
              const firstEmployee = result.kind === "employee" && results[index - 1]?.kind !== "employee";
              return (
                <li key={result.id} role="presentation">
                  {index === 0 && result.kind === "page" ? (
                    <div className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Pages</div>
                  ) : null}
                  {firstEmployee ? (
                    <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Employees</div>
                  ) : null}
                  <div
                    id={`${listId}-${result.id}`}
                    role="option"
                    aria-selected={selected}
                    // Keep focus in the input so the list doesn't close before the click lands.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => go(result)}
                    onMouseEnter={() => setActive(index)}
                    className={`flex cursor-pointer items-center gap-3 rounded-btn px-3 py-2 ${selected ? "bg-primary-tint" : ""}`}
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-btn bg-surface-muted text-primary">
                      <Icon size={16} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{result.label}</span>
                      {result.context ? (
                        <span className="block truncate text-xs text-ink-soft">{result.context}</span>
                      ) : null}
                    </span>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
