// Mirrors the backend's app/schemas/analytics.py. Money is integer minor
// units of `currency`, like everywhere else in the API.

export type Unit = "count" | "percent" | "money" | "days" | "hours" | "years" | "rating" | "text";
export type CompareMode = "previous_period" | "previous_year" | "none";
export type Section =
  | "workforce"
  | "payroll"
  | "attendance"
  | "leave"
  | "recruitment"
  | "performance"
  | "compliance"
  | "financial";

export interface Metric {
  key: string;
  label: string;
  unit: Unit;
  value: number | null;
  previous_value: number | null;
  change: number | null;
  change_pct: number | null;
  currency: string | null;
  higher_is_better: boolean | null;
  text_value: string | null;
  definition: string;
  href: string | null;
  dataset: string | null;
  note: string | null;
}

export interface SeriesPoint {
  period: string; // YYYY-MM
  value: number | null;
}

export interface Series {
  key: string;
  label: string;
  points: SeriesPoint[];
}

export interface Trend {
  key: string;
  title: string;
  unit: Unit;
  currency: string | null;
  stacked: boolean;
  series: Series[];
  definition: string;
  dataset: string | null;
}

export interface BreakdownRow {
  key: string;
  label: string;
  value: number | null;
  count: number | null;
  suppressed: boolean;
}

export interface Breakdown {
  key: string;
  title: string;
  unit: Unit;
  currency: string | null;
  rows: BreakdownRow[];
  definition: string;
  dataset: string | null;
}

export interface Unsupported {
  key: string;
  label: string;
  reason: string;
}

export interface Meta {
  section: string;
  period: {
    date_from: string;
    date_to: string;
    compare: CompareMode;
    compare_from: string | null;
    compare_to: string | null;
    months: string[];
  };
  filters: {
    department_ids: string[];
    location_ids: string[];
    employment_types: string[];
    statuses: string[];
    payroll_status: string;
    country: string;
  };
  currency: string;
  department_scope: string[] | null;
  generated_at: string;
  notes: string[];
  unsupported: Unsupported[];
}

interface SectionBase {
  meta: Meta;
  kpis: Metric[];
}

export interface WorkforceAnalytics extends SectionBase {
  headcount_trend: Trend;
  hires_vs_departures: Trend;
  turnover_trend: Trend;
  by_department: Breakdown;
  by_job_title: Breakdown;
  by_status: Breakdown;
  by_location: Breakdown;
  by_employment_type: Breakdown;
  tenure_bands: Breakdown;
  age_bands: Breakdown;
}

export interface PayrollAnalytics extends SectionBase {
  cost_trend: Trend;
  gross_net_trend: Trend;
  employer_contribution_trend: Trend;
  deduction_trend: Trend;
  overtime_trend: Trend;
  cost_by_department: Breakdown;
  average_gross_by_department: Breakdown;
  cost_by_employment_type: Breakdown;
  runs_by_status: Breakdown;
}

export interface AttendanceAnalytics extends SectionBase {
  rate_trend: Trend;
  late_trend: Trend;
  hours_trend: Trend;
  overtime_hours_trend: Trend;
  rate_by_department: Breakdown;
  rate_by_location: Breakdown;
  rate_by_weekday: Breakdown;
}

export interface LeaveAnalytics extends SectionBase {
  by_status: Breakdown;
  days_by_type: Breakdown;
  monthly_trend: Trend;
  utilisation_by_department: Breakdown;
  balance_bands: Breakdown;
}

export interface RecruitmentAnalytics extends SectionBase {
  applications_trend: Trend;
  candidates_by_stage: Breakdown;
  vacancies_by_department: Breakdown;
}

export interface PerformanceAnalytics extends SectionBase {
  completion_trend: Trend;
  reviews_by_status: Breakdown;
  rating_distribution: Breakdown;
  rating_by_department: Breakdown;
  training_by_status: Breakdown;
}

export interface Deadline {
  id: string;
  scheme: string;
  category: string;
  authority: string;
  period_start: string;
  period_end: string;
  due_date: string;
  amount_minor: number;
  status: string;
  overdue: boolean;
}

export interface ComplianceAnalytics extends SectionBase {
  country_name: string;
  obligations_trend: Trend;
  obligations_by_category: Breakdown;
  obligations_by_status: Breakdown;
  input_vat_trend: Trend;
  deadlines: Deadline[];
}

export interface BudgetActual {
  budget_id: string;
  name: string;
  department_name: string | null;
  period_start: string;
  period_end: string;
  budgeted_minor: number;
  actual_minor: number;
  variance_minor: number;
}

export interface FinancialAnalytics extends SectionBase {
  revenue_expense_trend: Trend;
  payroll_share_trend: Trend;
  cash_movement_trend: Trend;
  expenses_by_department: Breakdown;
  expenses_by_account: Breakdown;
  budget_vs_actual: BudgetActual[];
}

export interface OverviewAnalytics extends SectionBase {
  headcount_trend: Trend | null;
  payroll_cost_trend: Trend | null;
  headcount_by_department: Breakdown | null;
  deadlines: Deadline[] | null;
  restricted_sections: Section[];
}

export interface AnalyticsAccess {
  can_view: boolean;
  sections: { section: Section; allowed: boolean }[];
  can_export: boolean;
  can_view_individual_pay: boolean;
  department_scope: string[] | null;
}

export interface Option {
  value: string;
  label: string;
}

export interface FilterOptions {
  departments: Option[];
  locations: Option[];
  employment_types: Option[];
  statuses: Option[];
  payroll_statuses: Option[];
  countries: { code: string; name: string; currency: string; status: string }[];
  default_from: string;
  default_to: string;
  max_range_months: number;
}

export interface RecordColumn {
  key: string;
  label: string;
  kind: "text" | "date" | "count" | "money" | "hours" | "days" | "percent";
}

export interface RecordsPage {
  dataset: string;
  title: string;
  currency: string;
  columns: RecordColumn[];
  rows: Record<string, string | number | null>[];
  page: number;
  page_size: number;
  total: number;
}

export type ExportFormat = "csv" | "xlsx" | "pdf";
