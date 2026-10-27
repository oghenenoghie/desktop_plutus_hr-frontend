"use client";

import { AnalyticsPage, type PageContext } from "@/components/analytics/analytics-shell";
import { ExportButtons } from "@/components/analytics/records-drawer";
import { Card, CardHeader } from "@/components/ui/card";
import { analyticsApi } from "@/lib/analytics/api";
import type { Section } from "@/lib/analytics/types";

// Custom reports: any dashboard, or the records behind it, as CSV, XLSX or
// PDF for the filters above. Each file carries its organisation, period,
// filters, currency, generation time and metric definitions, and every
// download is written to the audit log.

interface ReportDefinition {
  key: string;
  title: string;
  description: string;
  section: Section | null; // null: the overview, open to anyone with analytics
  kind: "section" | "records";
  individual?: boolean;
}

const REPORTS: ReportDefinition[] = [
  { key: "overview", title: "Executive overview", description: "Headline KPIs and charts from the sections you can see.", section: null, kind: "section" },
  { key: "workforce", title: "Workforce summary", description: "Headcount, hires, departures, turnover and workforce breakdowns.", section: "workforce", kind: "section" },
  { key: "employees", title: "Employees in headcount", description: "One row per employee in headcount on the last day; no pay figures.", section: "workforce", kind: "records" },
  { key: "hires", title: "New hires", description: "Employees who joined in the period.", section: "workforce", kind: "records" },
  { key: "departures", title: "Leavers", description: "Employees whose termination date falls in the period.", section: "workforce", kind: "records" },
  { key: "payroll", title: "Payroll summary", description: "Payroll cost, pay, deductions and contributions by month and group.", section: "payroll", kind: "section" },
  { key: "pay_runs", title: "Pay runs", description: "Each pay run's totals for runs ending in the period.", section: "payroll", kind: "records" },
  { key: "payslips", title: "Payslip register", description: "One row per payslip: gross, statutory deductions and net.", section: "payroll", kind: "records", individual: true },
  { key: "statutory_lines", title: "Payslip statutory lines", description: "One row per statutory line on each payslip, for countries on the country rule engine (not Nigeria).", section: "payroll", kind: "records", individual: true },
  { key: "attendance", title: "Attendance summary", description: "Rates, punctuality and hours against rostered shifts.", section: "attendance", kind: "section" },
  { key: "attendance", title: "Rostered shifts", description: "Each rostered shift with its clock-in, clock-out and outcome.", section: "attendance", kind: "records" },
  { key: "leave", title: "Leave summary", description: "Requests, approved days, utilisation and balances.", section: "leave", kind: "section" },
  { key: "leave_requests", title: "Leave requests", description: "Every request starting in the period.", section: "leave", kind: "records" },
  { key: "recruitment", title: "Recruitment summary", description: "Vacancies, applications and current stages.", section: "recruitment", kind: "section" },
  { key: "candidates", title: "Candidates", description: "Candidates who applied in the period and their stage today.", section: "recruitment", kind: "records" },
  { key: "performance", title: "Performance summary", description: "Review completion, ratings and training completion.", section: "performance", kind: "section" },
  { key: "reviews", title: "Performance reviews", description: "Reviews whose period ends in the range.", section: "performance", kind: "records" },
  { key: "compliance", title: "Tax & compliance summary", description: "Obligations by category and status, deadlines and input VAT.", section: "compliance", kind: "section" },
  { key: "liabilities", title: "Statutory liabilities", description: "Each liability for periods ending in the range.", section: "compliance", kind: "records" },
  { key: "financial", title: "Financial summary", description: "Revenue, expenses, payroll share, cash and budgets.", section: "financial", kind: "section" },
  { key: "journal_lines", title: "Ledger lines", description: "Every ledger line by accounting date.", section: "financial", kind: "records" },
];

export default function AnalyticsReportsPage() {
  return (
    <AnalyticsPage
      section="reports"
      title="Custom Reports"
      subtitle="Download any analytics view, or the records behind it, for the filters below"
      filters={["compare", "department", "location", "employment_type", "status", "payroll_status", "country"]}
    >
      {(context) => <Reports {...context} />}
    </AnalyticsPage>
  );
}

function Reports({ query, access }: PageContext) {
  const allowed = REPORTS.filter((report) => {
    if (report.section && !access.sections.find((s) => s.section === report.section)?.allowed) return false;
    if (report.individual && !access.can_view_individual_pay) return false;
    return true;
  });
  return (
    <Card>
      <CardHeader
        title="Available reports"
        subtitle="Each file uses the filters above and records who downloaded it. Filters that don't apply to a report are ignored by it."
      />
      <ul className="divide-y divide-border">
        {allowed.map((report) => (
          <li
            key={`${report.kind}-${report.key}`}
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="text-[13px] font-bold text-ink">
                {report.title}
                <span className="ml-2 rounded-badge border border-border px-2 py-[1px] text-[10.5px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                  {report.kind === "section" ? "Summary" : "Records"}
                </span>
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">{report.description}</p>
            </div>
            <ExportButtons
              label={`Download ${report.title}`}
              onExport={(format) =>
                report.kind === "section"
                  ? analyticsApi.exportSection(report.key, query, format)
                  : analyticsApi.exportRecords(report.key, query, format)
              }
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
