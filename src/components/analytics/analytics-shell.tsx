"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { FilterBar, type FilterKey } from "@/components/analytics/filter-bar";
import { KpiGrid, KpiSkeleton } from "@/components/analytics/kpi-card";
import { DrillProvider, ExportButtons } from "@/components/analytics/records-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { useAnalyticsAccess } from "@/lib/analytics/access";
import { analyticsApi } from "@/lib/analytics/api";
import { useAnalyticsFilters } from "@/lib/analytics/filters";
import { formatIsoDate } from "@/lib/analytics/format";
import type { AnalyticsAccess, Meta, Section } from "@/lib/analytics/types";
import { useApiResource } from "@/lib/hooks";

// The frame every analytics page shares: section tabs, the filter row
// (kept in the URL), drill-down and export. It only offers what the
// member's analytics access allows; the API refuses anything else anyway.

export const SECTION_PAGES: { section: Section | "overview" | "reports"; label: string; href: string }[] = [
  { section: "overview", label: "Overview", href: "/analytics" },
  { section: "workforce", label: "Workforce", href: "/analytics/workforce" },
  { section: "payroll", label: "Payroll", href: "/analytics/payroll" },
  { section: "attendance", label: "Attendance", href: "/analytics/attendance" },
  { section: "leave", label: "Leave", href: "/analytics/leave" },
  { section: "recruitment", label: "Recruitment", href: "/analytics/recruitment" },
  { section: "performance", label: "Performance", href: "/analytics/performance" },
  { section: "compliance", label: "Tax & Compliance", href: "/analytics/compliance" },
  { section: "financial", label: "Financial", href: "/analytics/financial" },
  { section: "reports", label: "Custom Reports", href: "/analytics/reports" },
];

function allowedPage(access: AnalyticsAccess, section: Section | "overview" | "reports"): boolean {
  if (!access.can_view) return false;
  if (section === "overview") return true;
  if (section === "reports") return access.can_export;
  return Boolean(access.sections.find((s) => s.section === section)?.allowed);
}

function SectionTabs({ access, query }: { access: AnalyticsAccess; query: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Analytics sections" className="-mx-1 mb-4 overflow-x-auto px-1">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {SECTION_PAGES.filter((page) => allowedPage(access, page.section)).map((page) => {
          const active = pathname === page.href;
          return (
            <li key={page.href}>
              <Link
                href={query ? `${page.href}?${query}` : page.href}
                aria-current={active ? "page" : undefined}
                className={`block border-b-2 px-3 py-2.5 text-[13px] font-bold transition-colors ${
                  active ? "border-primary text-ink" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {page.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Restricted() {
  return (
    <Card className="flex flex-col items-center gap-2 py-10 text-center">
      <Lock size={20} aria-hidden className="text-ink-soft" />
      <h2 className="text-sm font-extrabold text-ink">This analytics view isn&rsquo;t available to you</h2>
      <p className="max-w-md text-[13px] text-ink-soft">
        Your role doesn&rsquo;t include it. An administrator can grant it from Permissions.
      </p>
    </Card>
  );
}

export interface PageContext {
  query: string;
  compareLabel: string;
  access: AnalyticsAccess;
}

export function AnalyticsPage({
  section,
  title,
  subtitle,
  filters,
  exportReport,
  children,
}: {
  section: Section | "overview" | "reports";
  title: string;
  subtitle: string;
  filters: FilterKey[];
  exportReport?: string;
  children: (context: PageContext) => React.ReactNode;
}) {
  return (
    // useSearchParams needs a Suspense boundary (Next.js prerendering).
    <Suspense fallback={<LoadingState />}>
      <Frame section={section} title={title} subtitle={subtitle} filters={filters} exportReport={exportReport}>
        {children}
      </Frame>
    </Suspense>
  );
}

function Frame({
  section,
  title,
  subtitle,
  filters: shownFilters,
  exportReport,
  children,
}: {
  section: Section | "overview" | "reports";
  title: string;
  subtitle: string;
  filters: FilterKey[];
  exportReport?: string;
  children: (context: PageContext) => React.ReactNode;
}) {
  const { filters, query, update, reset } = useAnalyticsFilters();
  const { access, error } = useAnalyticsAccess();
  const options = useApiResource(() => analyticsApi.filterOptions(), []);

  if (error) return <ErrorState message="Analytics couldn't be loaded. Try again." />;
  if (!access) {
    return (
      <div>
        <PageHeader title={title} subtitle={subtitle} />
        <KpiGrid>
          <KpiSkeleton />
        </KpiGrid>
      </div>
    );
  }
  const allowed = allowedPage(access, section);
  const compareLabel =
    filters.compare === "previous_year" ? "vs last year" : filters.compare === "none" ? "" : "vs previous period";

  return (
    <DrillProvider query={query} canExport={access.can_export}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          allowed && exportReport && access.can_export ? (
            <ExportButtons
              label={`Export ${title}`}
              onExport={(format) => analyticsApi.exportSection(exportReport, query, format)}
            />
          ) : undefined
        }
      />
      <SectionTabs access={access} query={query} />
      {allowed ? (
        <>
          <FilterBar
            filters={filters}
            options={options.data}
            show={shownFilters}
            onChange={update}
            onReset={reset}
          />
          {children({ query, compareLabel, access })}
        </>
      ) : (
        <Restricted />
      )}
    </DrillProvider>
  );
}

// The period, scope, notes and unsupported metrics behind a page's figures.
export function MetaPanel({ meta }: { meta: Meta }) {
  const period = meta.period;
  return (
    <Card className="mt-6" padding="compact">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">About these figures</h2>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[12.5px] leading-relaxed text-ink-soft">
        <li>
          {formatIsoDate(period.date_from)} to {formatIsoDate(period.date_to)}
          {period.compare_from
            ? `, compared with ${formatIsoDate(period.compare_from)} to ${formatIsoDate(period.compare_to)}`
            : ""}
          . Amounts in {meta.currency}.
        </li>
        {meta.department_scope ? <li>Limited to the departments you head.</li> : null}
        {meta.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      {meta.unsupported.length ? (
        <>
          <h3 className="mt-4 text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
            Not measurable from the data held
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-relaxed">
            {meta.unsupported.map((item) => (
              <li key={item.key}>
                <span className="font-bold text-ink">{item.label}.</span>{" "}
                <span className="text-ink-soft">{item.reason}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}

export function ChartGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>;
}
