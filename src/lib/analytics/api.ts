import { apiFetch, downloadAuthenticatedFile } from "@/lib/api/client";
import type {
  AnalyticsAccess,
  AttendanceAnalytics,
  ComplianceAnalytics,
  ExportFormat,
  FilterOptions,
  FinancialAnalytics,
  LeaveAnalytics,
  OverviewAnalytics,
  PayrollAnalytics,
  PerformanceAnalytics,
  RecordsPage,
  RecruitmentAnalytics,
  WorkforceAnalytics,
} from "@/lib/analytics/types";

// `query` is the filter bar's query string (lib/analytics/filters.ts), sent
// as-is: the API validates every value itself.
function withQuery(path: string, query: string, extra?: Record<string, string | number>): string {
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, String(value));
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

export const analyticsApi = {
  access: () => apiFetch<AnalyticsAccess>("/analytics/access"),
  filterOptions: () => apiFetch<FilterOptions>("/analytics/filter-options"),
  overview: (query: string) => apiFetch<OverviewAnalytics>(withQuery("/analytics/overview", query)),
  workforce: (query: string) => apiFetch<WorkforceAnalytics>(withQuery("/analytics/workforce", query)),
  payroll: (query: string) => apiFetch<PayrollAnalytics>(withQuery("/analytics/payroll", query)),
  attendance: (query: string) =>
    apiFetch<AttendanceAnalytics>(withQuery("/analytics/attendance", query)),
  leave: (query: string) => apiFetch<LeaveAnalytics>(withQuery("/analytics/leave", query)),
  recruitment: (query: string) =>
    apiFetch<RecruitmentAnalytics>(withQuery("/analytics/recruitment", query)),
  performance: (query: string) =>
    apiFetch<PerformanceAnalytics>(withQuery("/analytics/performance", query)),
  compliance: (query: string) =>
    apiFetch<ComplianceAnalytics>(withQuery("/analytics/compliance", query)),
  financial: (query: string) =>
    apiFetch<FinancialAnalytics>(withQuery("/analytics/financial", query)),
  records: (dataset: string, query: string, page: number, pageSize = 25) =>
    apiFetch<RecordsPage>(
      withQuery(`/analytics/records/${encodeURIComponent(dataset)}`, query, { page, page_size: pageSize }),
    ),
  exportSection: (report: string, query: string, format: ExportFormat) =>
    downloadAuthenticatedFile(
      withQuery(`/analytics/sections/${encodeURIComponent(report)}/export`, query, { format }),
      `analytics-${report}.${format}`,
    ),
  exportRecords: (dataset: string, query: string, format: ExportFormat) =>
    downloadAuthenticatedFile(
      withQuery(`/analytics/records/${encodeURIComponent(dataset)}/export`, query, { format }),
      `analytics-${dataset}.${format}`,
    ),
};
