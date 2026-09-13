// Mirrors app/schemas/* and app/models/* in the plutus-hr-system (FastAPI) backend.
// Money fields are minor units (kobo); dates are ISO date strings; datetimes are ISO strings.

export type Role = "admin" | "payroll_manager" | "manager" | "employee";

export type PayFrequency = "monthly" | "weekly" | "biweekly";
export type EmploymentType =
  | "permanent"
  | "fixed_term"
  | "part_time"
  | "intern"
  | "consultant";
export type LifecycleState = "active" | "suspended" | "terminated";
export type LifecycleStage = "onboarding" | "active" | "suspended" | "terminated";
export type PayRunStatus = "draft" | "processing" | "completed" | "failed" | "reversed";
export type LeaveType = "annual" | "sick" | "maternity" | "paternity" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ExpenseStatus = "pending" | "approved" | "rejected" | "reimbursed";
export type LoanStatus = "active" | "paid_off" | "cancelled";
export type BenefitFrequency = "one_time" | "monthly" | "annual";
export type LiabilityScheme = "paye" | "pension" | "nhf" | "nsitf" | "itf" | "wht";
export type LiabilityStatus = "pending" | "filed" | "remitted";

// --- auth ---

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeResponse {
  account_id: string;
  org_id: string;
  role: Role;
  org_name: string;
}

// --- employees ---

export interface Employee {
  id: string;
  org_id: string;
  account_id: string | null;
  employee_number: string;
  login_code: string | null;
  full_name: string;
  state_of_residence: string;
  state_of_origin: string | null;
  employment_type: EmploymentType;
  lifecycle_state: LifecycleState;
  lifecycle_stage: LifecycleStage;
  date_of_joining: string;
  contract_end_date: string | null;
  job_title: string | null;
  photo_url: string | null;
  manager_id: string | null;
  department_id: string | null;
  branch_id: string | null;
  job_grade_id: string | null;
  shift_id: string | null;
  tin: string | null;
  // null when salary_masked is true and the viewer is a manager (not the
  // employee themselves, and not admin/payroll_manager) — never null for
  // any other viewer.
  basic_minor: number | null;
  housing_minor: number | null;
  transport_minor: number | null;
  other_earnings_minor: number | null;
  annual_rent_paid_minor: number | null;
  pay_frequency: PayFrequency;
  annual_leave_entitlement_days: number;
  salary_masked: boolean;
  created_at: string;
}

export interface EmployeeCreateBody {
  employee_number: string;
  full_name: string;
  state_of_residence: string;
  state_of_origin?: string;
  employment_type: EmploymentType;
  date_of_joining: string;
  contract_end_date?: string;
  basic_minor: number;
  housing_minor: number;
  transport_minor: number;
  other_earnings_minor?: number;
  annual_rent_paid_minor?: number;
  pay_frequency?: PayFrequency;
  annual_leave_entitlement_days?: number;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  marital_status?: string;
  email?: string;
  phone?: string;
  residential_address?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  tin?: string;
  pfa_name?: string;
  rsa_pin?: string;
  nhf_number?: string;
  job_title?: string;
  photo_url?: string;
  manager_id?: string;
  department_id?: string;
  branch_id?: string;
  job_grade_id?: string;
  shift_id?: string;
}

// PATCH /employees/{id} — mirrors app.schemas.employees.EmployeeUpdate. Every
// field optional and independently settable; the UI only exercises the
// subset a given drawer edits.
export interface EmployeeUpdateBody {
  full_name?: string;
  state_of_residence?: string;
  state_of_origin?: string | null;
  job_title?: string;
  photo_url?: string | null;
  contract_end_date?: string | null;
  manager_id?: string | null;
  department_id?: string | null;
  branch_id?: string | null;
  job_grade_id?: string | null;
  shift_id?: string | null;
  tin?: string;
  pfa_name?: string;
  rsa_pin?: string;
  nhf_number?: string;
  basic_minor?: number;
  housing_minor?: number;
  transport_minor?: number;
  other_earnings_minor?: number;
  annual_rent_paid_minor?: number;
  pay_frequency?: PayFrequency;
  annual_leave_entitlement_days?: number;
  salary_masked?: boolean;
}

// POST /employees/bulk-import — csv_content is the raw CSV text, header row
// included, with column names matching EmployeeCreateBody's own field names.
export interface EmployeeBulkImportRequest {
  csv_content: string;
}

export interface EmployeeBulkImportRowError {
  row: number;
  employee_number: string | null;
  error: string;
}

export interface EmployeeBulkImportResult {
  created: Employee[];
  row_errors: EmployeeBulkImportRowError[];
}

export interface BankAccount {
  id: string;
  employee_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  verified: boolean;
  created_at: string;
}

export interface BankAccountInput {
  bank_name: string;
  account_number: string;
  account_name: string;
}

// --- departments ---

export interface Department {
  id: string;
  org_id: string;
  name: string;
  manager_id: string | null;
  created_at: string;
}

export interface DepartmentCreateBody {
  name: string;
  manager_id?: string | null;
}

export interface DepartmentUpdateBody {
  name?: string;
  manager_id?: string | null;
}

// --- branches ---

export interface Branch {
  id: string;
  org_id: string;
  name: string;
  state: string | null;
  address: string | null;
  manager_id: string | null;
  created_at: string;
}

export interface BranchCreateBody {
  name: string;
  state?: string | null;
  address?: string | null;
  manager_id?: string | null;
}

export interface BranchUpdateBody {
  name?: string;
  state?: string | null;
  address?: string | null;
  manager_id?: string | null;
}

// --- public holidays ---
// Org-scoped calendar excluded (alongside weekends) from working-days
// proration. Only long-standing fixed-date Nigerian holidays are ever
// seed-able server-side; movable Islamic/Easter-based ones must be added
// here by an admin for the years they need — never invented client-side.

export interface PublicHoliday {
  id: string;
  org_id: string;
  holiday_date: string;
  name: string;
  created_at: string;
}

export interface PublicHolidayCreateBody {
  holiday_date: string;
  name: string;
}

// --- job grades ---

export interface JobGrade {
  id: string;
  org_id: string;
  name: string;
  level: number | null;
  min_salary_minor: number | null;
  max_salary_minor: number | null;
  created_at: string;
}

export interface JobGradeCreateBody {
  name: string;
  level?: number | null;
  min_salary_minor?: number | null;
  max_salary_minor?: number | null;
}

export interface JobGradeUpdateBody {
  name?: string;
  level?: number | null;
  min_salary_minor?: number | null;
  max_salary_minor?: number | null;
}

// --- shifts ---
// start_time/end_time are "HH:MM:SS" wall-clock strings, no date component.

export interface Shift {
  id: string;
  org_id: string;
  name: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface ShiftCreateBody {
  name: string;
  start_time: string;
  end_time: string;
}

export interface ShiftUpdateBody {
  name?: string;
  start_time?: string;
  end_time?: string;
}

// --- recruitment ---

export type JobPostingStatus = "open" | "closed";
export type CandidateStatus = "applied" | "interviewing" | "offered" | "hired" | "rejected";

export interface JobPosting {
  id: string;
  org_id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  status: JobPostingStatus;
  opened_date: string;
  closed_date: string | null;
  created_at: string;
}

export interface JobPostingCreateBody {
  title: string;
  department_id?: string | null;
  description?: string | null;
  opened_date: string;
}

export interface JobPostingUpdateBody {
  title?: string;
  department_id?: string | null;
  description?: string | null;
  status?: JobPostingStatus;
  closed_date?: string | null;
}

export interface Candidate {
  id: string;
  org_id: string;
  job_posting_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: CandidateStatus;
  applied_date: string;
  created_at: string;
}

export interface CandidateCreateBody {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  applied_date: string;
}

export interface CandidateUpdateBody {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  status?: CandidateStatus;
}

// --- performance reviews ---

export type PerformanceReviewStatus = "draft" | "submitted" | "acknowledged";

export interface PerformanceReview {
  id: string;
  org_id: string;
  employee_id: string;
  reviewer_id: string | null;
  period_start: string;
  period_end: string;
  status: PerformanceReviewStatus;
  rating: number | null;
  goals: string | null;
  manager_comments: string | null;
  employee_comments: string | null;
  submitted_date: string | null;
  acknowledged_date: string | null;
  created_at: string;
}

export interface PerformanceReviewCreateBody {
  employee_id: string;
  reviewer_id?: string | null;
  period_start: string;
  period_end: string;
  goals?: string | null;
}

export interface PerformanceReviewSubmitBody {
  rating?: number | null;
  manager_comments?: string | null;
}

export interface PerformanceReviewAcknowledgeBody {
  employee_comments?: string | null;
}

// --- learning & development ---

export type TrainingEnrollmentStatus = "enrolled" | "in_progress" | "completed" | "failed";

export interface TrainingCourse {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  provider: string | null;
  duration_hours: number | null;
  created_at: string;
}

export interface TrainingCourseCreateBody {
  title: string;
  description?: string | null;
  provider?: string | null;
  duration_hours?: number | null;
}

export interface TrainingCourseUpdateBody {
  title?: string;
  description?: string | null;
  provider?: string | null;
  duration_hours?: number | null;
}

export interface TrainingEnrollment {
  id: string;
  org_id: string;
  course_id: string;
  employee_id: string;
  status: TrainingEnrollmentStatus;
  enrolled_date: string;
  completed_date: string | null;
  score: number | null;
  created_at: string;
}

export interface TrainingEnrollmentCreateBody {
  employee_id: string;
  enrolled_date: string;
}

export interface TrainingEnrollmentUpdateBody {
  status?: TrainingEnrollmentStatus;
  completed_date?: string | null;
  score?: number | null;
}

// --- employee relations ---

export type DisciplinaryCaseCategory =
  | "misconduct"
  | "attendance"
  | "policy_violation"
  | "harassment"
  | "other";
export type DisciplinaryCaseStatus = "open" | "under_review" | "resolved" | "dismissed";
export type DisciplinaryCaseAction =
  | "none"
  | "verbal_warning"
  | "written_warning"
  | "suspension"
  | "termination";

export interface DisciplinaryCase {
  id: string;
  org_id: string;
  employee_id: string;
  reported_by_id: string | null;
  category: DisciplinaryCaseCategory;
  description: string;
  status: DisciplinaryCaseStatus;
  incident_date: string;
  action_taken: DisciplinaryCaseAction | null;
  resolution_notes: string | null;
  resolution_date: string | null;
  created_at: string;
}

export interface DisciplinaryCaseCreateBody {
  employee_id: string;
  reported_by_id?: string | null;
  category: DisciplinaryCaseCategory;
  description: string;
  incident_date: string;
}

export interface DisciplinaryCaseUpdateBody {
  category?: DisciplinaryCaseCategory;
  description?: string;
  status?: DisciplinaryCaseStatus;
}

export interface DisciplinaryCaseResolveBody {
  action_taken: DisciplinaryCaseAction;
  resolution_notes?: string | null;
}

// --- notifications ---

export interface Notification {
  id: string;
  org_id: string;
  account_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationBroadcastBody {
  title: string;
  body?: string | null;
  link?: string | null;
}

export interface NotificationUnreadCount {
  unread_count: number;
}

// --- union dues ---

export type UnionMembershipStatus = "active" | "suspended" | "terminated";

export interface UnionMembership {
  id: string;
  org_id: string;
  employee_id: string;
  union_name: string;
  membership_number: string | null;
  monthly_dues_minor: number;
  status: UnionMembershipStatus;
  joined_date: string;
  terminated_date: string | null;
  created_at: string;
}

export interface UnionMembershipCreateBody {
  union_name: string;
  monthly_dues_minor: number;
  joined_date: string;
  membership_number?: string | null;
}

export interface UnionMembershipUpdateBody {
  union_name?: string;
  membership_number?: string | null;
  monthly_dues_minor?: number;
  status?: UnionMembershipStatus;
}

export interface UnionMembershipTerminateBody {
  terminated_date: string;
}

// --- company assets ---

export type CompanyAssetCategory = "laptop" | "phone" | "vehicle" | "furniture" | "other";
export type CompanyAssetStatus = "available" | "assigned" | "maintenance" | "retired";

export interface CompanyAsset {
  id: string;
  org_id: string;
  name: string;
  asset_tag: string;
  category: CompanyAssetCategory;
  status: CompanyAssetStatus;
  purchase_date: string | null;
  purchase_value_minor: number | null;
  created_at: string;
}

export interface CompanyAssetCreateBody {
  name: string;
  asset_tag: string;
  category: CompanyAssetCategory;
  purchase_date?: string | null;
  purchase_value_minor?: number | null;
}

export interface CompanyAssetUpdateBody {
  name?: string;
  category?: CompanyAssetCategory;
  status?: CompanyAssetStatus;
  purchase_date?: string | null;
  purchase_value_minor?: number | null;
}

export interface AssetAssignment {
  id: string;
  org_id: string;
  asset_id: string;
  employee_id: string;
  assigned_date: string;
  returned_date: string | null;
  condition_notes: string | null;
  created_at: string;
}

export interface AssetAssignmentCreateBody {
  employee_id: string;
  assigned_date: string;
}

export interface AssetAssignmentReturnBody {
  returned_date: string;
  condition_notes?: string | null;
}

// --- api keys ---

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_prefix: string;
  revoked_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export interface ApiKeyCreateBody {
  name: string;
}

// --- policies ---

export interface Policy {
  id: string;
  org_id: string;
  title: string;
  category: string | null;
  body: string;
  effective_date: string | null;
  created_at: string;
}

export interface PolicyCreateBody {
  title: string;
  body: string;
  category?: string | null;
  effective_date?: string | null;
}

export interface PolicyUpdateBody {
  title?: string;
  body?: string;
  category?: string | null;
  effective_date?: string | null;
}

// --- payroll ---

export interface PayRunCreateBody {
  period_start: string;
  period_end: string;
  frequency: PayFrequency;
  employee_ids?: string[];
}

export interface PayRun {
  id: string;
  org_id: string;
  period_start: string;
  period_end: string;
  frequency: PayFrequency;
  status: PayRunStatus;
  rule_version_id: string | null;
  employee_count: number;
  gross_minor: number;
  net_minor: number;
  created_at: string;
  completed_at: string | null;
  reversed_at: string | null;
}

export interface Payslip {
  id: string;
  pay_run_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  gross_minor: number;
  pensionable_pay_minor: number;
  pension_employee_minor: number;
  pension_employer_minor: number;
  nhf_minor: number;
  paye_minor: number;
  net_minor: number;
  cumulative_chargeable_income_minor: number;
  rule_version_id: string;
  derivation: Record<string, unknown>;
  created_at: string;
}

export interface Disbursement {
  csv_content: string;
  total_minor: number;
  skipped_employee_numbers: string[];
}

export type PayslipDeliveryStatus = "sent" | "failed";

export interface PayslipDelivery {
  id: string;
  payslip_id: string;
  status: PayslipDeliveryStatus;
  recipient_email: string;
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
}

// --- dashboard ---

export interface OrgSummary {
  active_employee_count: number;
  last_completed_pay_run: PayRun | null;
  outstanding_liability_minor: number;
  pending_leave_request_count: number;
  pending_expense_count: number;
  expiring_contract_count: number;
  cash_balance_minor: number;
  accounts_payable_minor: number;
  accounts_receivable_minor: number;
}

// --- leave ---

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  status: LeaveStatus;
  reason: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface LeaveBalance {
  entitlement_days: number;
  taken_days: number;
  remaining_days: number;
}

// --- expenses ---

export interface Expense {
  id: string;
  employee_id: string;
  category: string;
  description: string;
  amount_minor: number;
  expense_date: string;
  status: ExpenseStatus;
  created_at: string;
  decided_at: string | null;
  reimbursed_at: string | null;
}

// --- loans ---

export interface Loan {
  id: string;
  employee_id: string;
  principal_minor: number;
  num_installments: number;
  installment_minor: number;
  start_date: string;
  status: LoanStatus;
  outstanding_minor: number;
  created_at: string;
}

// --- benefits ---

export interface BenefitCreateBody {
  name: string;
  frequency: BenefitFrequency;
  effective_date: string;
  description?: string | null;
  value_minor?: number | null;
  end_date?: string | null;
}

export interface Benefit {
  id: string;
  employee_id: string;
  name: string;
  description: string | null;
  value_minor: number | null;
  frequency: BenefitFrequency;
  effective_date: string;
  end_date: string | null;
  created_at: string;
}

// --- contractors ---

export interface Contractor {
  id: string;
  org_id: string;
  name: string;
  tin: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  email: string | null;
  phone: string | null;
  engagement_start_date: string | null;
  engagement_end_date: string | null;
  created_at: string;
}

export interface ContractorCreateBody {
  name: string;
  tin?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  email?: string | null;
  phone?: string | null;
  engagement_start_date?: string | null;
  engagement_end_date?: string | null;
}

// --- contractor invoices ---
// draft -> submitted -> paid; paying one records the actual withholding-tax
// payment for its amount (a WhtPayment) and links back to it here.

export type ContractorInvoiceStatus = "draft" | "submitted" | "paid";

export interface ContractorInvoice {
  id: string;
  org_id: string;
  contractor_id: string;
  wht_payment_id: string | null;
  invoice_number: string;
  description: string | null;
  amount_minor: number;
  invoice_date: string;
  due_date: string | null;
  status: ContractorInvoiceStatus;
  created_at: string;
}

export interface ContractorInvoiceCreateBody {
  invoice_number: string;
  amount_minor: number;
  invoice_date: string;
  description?: string | null;
  due_date?: string | null;
}

export interface ContractorInvoicePayRequest {
  category: WhtCategory;
  payment_date: string;
}

export type WhtCategory = "goods" | "services";

export interface WhtPaymentCreateBody {
  category: WhtCategory;
  gross_amount_minor: number;
  payment_date: string;
}

export interface WhtPayment {
  id: string;
  contractor_id: string;
  category: string;
  gross_amount_minor: number;
  wht_amount_minor: number;
  net_amount_minor: number;
  payment_date: string;
  due_date: string;
  certificate_number: string;
  rule_version_id: string;
  created_at: string;
}

// --- statutory liabilities ---

export interface StatutoryLiability {
  id: string;
  pay_run_id: string | null;
  scheme: LiabilityScheme;
  state: string | null;
  authority: string;
  base_minor: number;
  amount_minor: number;
  period_start: string;
  period_end: string;
  due_date: string;
  status: LiabilityStatus;
  filed_at: string | null;
  remitted_at: string | null;
  remittance_reference: string | null;
  created_at: string;
}

// --- final settlement ---

export interface FinalSettlementCreateBody {
  termination_date: string;
  gratuity_minor: number;
  leave_days_paid_out: number;
  leave_payout_minor: number;
}

export interface FinalSettlement {
  id: string;
  employee_id: string;
  payslip_id: string;
  termination_date: string;
  leave_days_paid_out: number;
  leave_payout_minor: number;
  gratuity_minor: number;
  outstanding_loan_recovered_minor: number;
  net_settlement_minor: number;
  created_at: string;
}

// --- simulation ---

export interface SimulationRequestBody {
  period_end: string;
  basic_minor?: number;
  housing_minor?: number;
  transport_minor?: number;
  other_earnings_minor?: number;
  annual_rent_paid_minor?: number;
  frequency?: PayFrequency;
  include_active_loan_deduction?: boolean;
}

export interface SimulationOut {
  gross_minor: number;
  pensionable_pay_minor: number;
  pension_employee_minor: number;
  pension_employer_minor: number;
  nhf_minor: number;
  cumulative_rent_relief_minor: number;
  cumulative_chargeable_income_minor: number;
  paye_minor: number;
  loan_deduction_minor: number;
  benefit_deduction_minor: number;
  union_dues_deduction_minor: number;
  net_pay_minor: number;
}

export interface PayRunSimulationRequestBody {
  period_end: string;
  overrides?: Record<string, SimulationRequestBody>;
}

export interface PayRunSimulationOut {
  by_employee_id: Record<string, SimulationOut>;
  total_gross_minor: number;
  total_employer_cost_minor: number;
  total_net_minor: number;
}

// --- chart of accounts / general ledger ---

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface ChartAccount {
  id: string;
  org_id: string;
  code: string;
  name: string;
  type: AccountType;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ChartAccountCreateBody {
  code: string;
  name: string;
  type: AccountType;
}

export interface ChartAccountUpdateBody {
  name?: string;
  is_active?: boolean;
}

export interface LedgerEntry {
  id: string;
  org_id: string;
  journal_entry_id: string;
  pay_run_id: string | null;
  employee_id: string | null;
  department_id: string | null;
  account: string;
  account_name: string | null;
  debit_minor: number;
  credit_minor: number;
  description: string | null;
  created_at: string;
}

export interface TrialBalanceLine {
  account: string;
  account_name: string | null;
  account_type: AccountType | null;
  total_debit_minor: number;
  total_credit_minor: number;
  balance_minor: number;
}

export interface JournalEntryLineCreateBody {
  account_code: string;
  debit_minor?: number;
  credit_minor?: number;
  description?: string | null;
}

export interface JournalEntryCreateBody {
  description: string;
  lines: JournalEntryLineCreateBody[];
}

// --- vendors / bills ---

export interface Vendor {
  id: string;
  org_id: string;
  contractor_id: string | null;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  tin: string | null;
  created_at: string;
}

export interface VendorCreateBody {
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  tin?: string | null;
  contractor_id?: string | null;
}

export interface VendorUpdateBody {
  name?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  tin?: string | null;
}

export type BillStatus = "draft" | "approved" | "paid" | "void";

export type WhtCategoryCode = "goods" | "services";

export interface Bill {
  id: string;
  org_id: string;
  vendor_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  expense_account_code: string;
  amount_minor: number;
  vat_minor: number;
  wht_category: WhtCategoryCode | null;
  wht_amount_minor: number;
  net_payable_minor: number;
  description: string | null;
  status: BillStatus;
  paid_at: string | null;
  created_at: string;
}

export interface BillCreateBody {
  vendor_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  expense_account_code: string;
  amount_minor: number;
  vat_minor?: number;
  wht_category?: WhtCategoryCode | null;
  description?: string | null;
}

// --- customers / invoices ---

export interface Customer {
  id: string;
  org_id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  tin: string | null;
  created_at: string;
}

export interface CustomerCreateBody {
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  tin?: string | null;
}

export interface CustomerUpdateBody {
  name?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  tin?: string | null;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface Invoice {
  id: string;
  org_id: string;
  customer_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  revenue_account_code: string;
  amount_minor: number;
  description: string | null;
  status: InvoiceStatus;
  paid_at: string | null;
  created_at: string;
}

export interface InvoiceCreateBody {
  customer_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  revenue_account_code: string;
  amount_minor: number;
  description?: string | null;
}

// --- financial statements ---

export interface StatementLine {
  account: string;
  account_name: string;
  balance_minor: number;
}

export interface BalanceSheet {
  as_of: string | null;
  assets: StatementLine[];
  total_assets_minor: number;
  liabilities: StatementLine[];
  total_liabilities_minor: number;
  equity: StatementLine[];
  total_equity_minor: number;
}

export interface IncomeStatement {
  from_date: string | null;
  to_date: string | null;
  revenue: StatementLine[];
  total_revenue_minor: number;
  expenses: StatementLine[];
  total_expenses_minor: number;
  net_income_minor: number;
}

// --- fixed assets ---

export type FixedAssetStatus = "active" | "disposed";

export interface FixedAsset {
  id: string;
  org_id: string;
  department_id: string | null;
  name: string;
  asset_tag: string;
  acquisition_date: string;
  cost_minor: number;
  salvage_value_minor: number;
  useful_life_months: number;
  accumulated_depreciation_minor: number;
  book_value_minor: number;
  status: FixedAssetStatus;
  disposed_at: string | null;
  disposal_proceeds_minor: number | null;
  created_at: string;
}

export interface FixedAssetCreateBody {
  name: string;
  asset_tag: string;
  acquisition_date: string;
  cost_minor: number;
  salvage_value_minor?: number;
  useful_life_months: number;
}

export interface FixedAssetDisposeBody {
  proceeds_minor?: number;
}

// --- budgets ---

export interface BudgetLineCreateBody {
  account_code: string;
  amount_minor: number;
}

export interface BudgetCreateBody {
  name: string;
  department_id?: string | null;
  period_start: string;
  period_end: string;
  lines: BudgetLineCreateBody[];
}

export interface BudgetLine {
  account_code: string;
  account_name: string;
  amount_minor: number;
}

export interface Budget {
  id: string;
  org_id: string;
  department_id: string | null;
  name: string;
  period_start: string;
  period_end: string;
  lines: BudgetLine[];
  total_budgeted_minor: number;
  created_at: string;
}

export interface BudgetLineActual {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  budgeted_minor: number;
  actual_minor: number;
  variance_minor: number;
}

export interface BudgetVsActual {
  budget_id: string;
  name: string;
  period_start: string;
  period_end: string;
  lines: BudgetLineActual[];
  total_budgeted_minor: number;
  total_actual_minor: number;
  total_variance_minor: number;
}

// --- bank reconciliation ---

export interface CompanyBankAccountCreateBody {
  bank_name: string;
  account_number: string;
  account_name: string;
  chart_account_code: string;
}

export interface CompanyBankAccount {
  id: string;
  org_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  chart_account_code: string;
  created_at: string;
}

export interface BankStatementLineCreateBody {
  statement_date: string;
  description: string;
  amount_minor: number;
}

export interface BankStatementLine {
  id: string;
  org_id: string;
  bank_account_id: string;
  statement_date: string;
  description: string;
  amount_minor: number;
  matched_ledger_entry_id: string | null;
  created_at: string;
}

export interface BankStatementLineMatchBody {
  ledger_entry_id: string;
}

export interface ReconciliationSummary {
  bank_account_id: string;
  bank_balance_minor: number;
  ledger_balance_minor: number;
  difference_minor: number;
  unmatched_statement_lines: BankStatementLine[];
  unmatched_ledger_entries: LedgerEntry[];
}

// --- approval workflows ---

export type ApprovalRequestType = "leave_request" | "expense" | "bill";
export type ApprovalStepEligibilityType =
  | "role"
  | "direct_manager"
  | "department_head"
  | "specific_person";
export type ApprovalInstanceStatus = "pending" | "approved" | "rejected";
export type ApprovalDecisionType = "approve" | "reject";

export interface ApprovalWorkflowStepInput {
  eligibility_type: ApprovalStepEligibilityType;
  eligible_role?: Role | null;
  eligible_account_id?: string | null;
}

export interface ApprovalWorkflowStep extends ApprovalWorkflowStepInput {
  id: string;
  request_type: ApprovalRequestType;
  step_order: number;
  created_at: string;
}

export interface ApprovalInstanceDecision {
  id: string;
  step_order: number;
  decision: ApprovalDecisionType;
  decided_by_account_id: string | null;
  decided_by_role: string | null;
  comment: string | null;
  created_at: string;
}

export interface ApprovalInstance {
  id: string;
  request_type: ApprovalRequestType;
  request_id: string;
  current_step: number;
  status: ApprovalInstanceStatus;
  created_at: string;
  decided_at: string | null;
  decisions: ApprovalInstanceDecision[];
}

// --- audit log ---

export interface AuditLogEntry {
  id: string;
  account_id: string | null;
  role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  event_metadata: Record<string, unknown>;
  created_at: string;
}

// --- employee history events ---

export type EmployeeHistoryEventType = "status_change" | "compensation_change";

export interface EmployeeHistoryEvent {
  id: string;
  employee_id: string;
  event_type: EmployeeHistoryEventType;
  effective_date: string;
  detail: Record<string, unknown>;
  recorded_by: string | null;
  created_at: string;
}

// --- employee checklists ---

export type ChecklistType = "onboarding" | "offboarding";
export type ChecklistItemStatus = "pending" | "done";

export interface ChecklistItem {
  id: string;
  org_id: string;
  employee_id: string;
  checklist_type: ChecklistType;
  title: string;
  status: ChecklistItemStatus;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

export interface ChecklistItemCreateBody {
  checklist_type: ChecklistType;
  title: string;
  due_date?: string | null;
}

// --- probation periods ---

export type ProbationStatus = "in_progress" | "confirmed" | "failed";

export interface ProbationPeriod {
  id: string;
  org_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: ProbationStatus;
  decided_date: string | null;
  decided_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProbationPeriodCreateBody {
  start_date: string;
  end_date: string;
}

export interface ProbationExtendBody {
  new_end_date: string;
  notes?: string | null;
}

export interface ProbationDecisionBody {
  outcome: ProbationStatus;
  notes?: string | null;
}

// --- employee documents ---

export type DocumentCategory =
  | "identification"
  | "contract"
  | "certificate"
  | "offer_letter"
  | "other";

export interface EmployeeDocument {
  id: string;
  org_id: string;
  employee_id: string;
  category: DocumentCategory;
  title: string;
  storage_url: string;
  expiry_date: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface EmployeeDocumentCreateBody {
  category: DocumentCategory;
  title: string;
  storage_url: string;
  expiry_date?: string | null;
}

export interface EmployeeDocumentUpdateBody {
  category?: DocumentCategory;
  title?: string;
  expiry_date?: string | null;
}

// --- shift roster ---

export interface ShiftRosterEntry {
  id: string;
  org_id: string;
  employee_id: string;
  shift_id: string;
  work_date: string;
  created_at: string;
}

export interface ShiftRosterEntryCreateBody {
  employee_id: string;
  shift_id: string;
  start_date: string;
  end_date: string;
}

// --- attendance ---

export interface AttendanceRecord {
  id: string;
  org_id: string;
  employee_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  created_at: string;
}

// --- aging / vendor statement reports ---

export type AgingBucket = "current" | "1_30" | "31_60" | "61_90" | "over_90";

export interface AgingLine {
  entity_id: string;
  counterparty_name: string;
  reference_number: string;
  due_date: string;
  amount_minor: number;
  bucket: AgingBucket;
}

export interface VendorStatementLine {
  bill_id: string;
  bill_number: string;
  bill_date: string;
  amount_minor: number;
  status: BillStatus;
  running_balance_minor: number;
}

// --- credit notes ---

export interface CreditNoteCreateBody {
  credit_note_number: string;
  issue_date: string;
  amount_minor: number;
  reason: string;
}

export interface CreditNote {
  id: string;
  org_id: string;
  invoice_id: string;
  credit_note_number: string;
  issue_date: string;
  amount_minor: number;
  reason: string;
  created_at: string;
}

// --- ledger bank reconciliation (by chart-of-accounts code, org-wide) ---

export interface LedgerStatementLineImport {
  transaction_date: string;
  description: string;
  amount_minor: number;
  external_reference?: string | null;
}

export interface LedgerStatementLine {
  id: string;
  org_id: string;
  account_code: string;
  transaction_date: string;
  description: string;
  amount_minor: number;
  external_reference: string | null;
  matched_ledger_entry_id: string | null;
  matched_at: string | null;
  matched_by: string | null;
  created_at: string;
}

export interface LedgerReconciliationLedgerEntry {
  id: string;
  account: string;
  debit_minor: number;
  credit_minor: number;
  description: string | null;
  created_at: string;
}

export interface LedgerReconciliationStatus {
  unmatched_statement_lines: LedgerStatementLine[];
  unmatched_ledger_entries: LedgerReconciliationLedgerEntry[];
}

// --- fixed asset transfers / revaluations ---

export interface FixedAssetTransferBody {
  to_department_id: string | null;
  transfer_date: string;
  note?: string | null;
}

export interface FixedAssetTransfer {
  id: string;
  fixed_asset_id: string;
  from_department_id: string | null;
  to_department_id: string | null;
  transfer_date: string;
  note: string | null;
  created_at: string;
}

export interface FixedAssetRevalueBody {
  new_value_minor: number;
  revaluation_date: string;
  reason: string;
}

export interface FixedAssetRevaluation {
  id: string;
  fixed_asset_id: string;
  revaluation_date: string;
  old_book_value_minor: number;
  new_book_value_minor: number;
  reason: string;
  created_at: string;
}

// --- recurring bills / invoices ---

export type RecurrenceFrequency = "monthly" | "quarterly" | "annually";

export interface RecurringBillCreateBody {
  vendor_id: string;
  bill_number_prefix: string;
  expense_account_code: string;
  amount_minor: number;
  frequency: RecurrenceFrequency;
  next_run_date: string;
  vat_minor?: number;
  wht_category?: WhtCategoryCode | null;
  description?: string | null;
  due_in_days?: number;
}

export interface RecurringBill {
  id: string;
  org_id: string;
  vendor_id: string;
  bill_number_prefix: string;
  expense_account_code: string;
  amount_minor: number;
  vat_minor: number;
  wht_category: WhtCategoryCode | null;
  description: string | null;
  due_in_days: number;
  frequency: RecurrenceFrequency;
  next_run_date: string;
  is_active: boolean;
  created_at: string;
}

export interface RecurringInvoiceCreateBody {
  customer_id: string;
  invoice_number_prefix: string;
  revenue_account_code: string;
  amount_minor: number;
  frequency: RecurrenceFrequency;
  next_run_date: string;
  description?: string | null;
  due_in_days?: number;
}

export interface RecurringInvoice {
  id: string;
  org_id: string;
  customer_id: string;
  invoice_number_prefix: string;
  revenue_account_code: string;
  amount_minor: number;
  description: string | null;
  due_in_days: number;
  frequency: RecurrenceFrequency;
  next_run_date: string;
  is_active: boolean;
  created_at: string;
}

// --- payroll reports ---

export interface PayrollRegisterLine {
  employee_id: string;
  employee_number: string;
  full_name: string;
  gross_minor: number;
  pension_employee_minor: number;
  pension_employer_minor: number;
  nhf_minor: number;
  paye_minor: number;
  loan_deduction_minor: number;
  benefit_deduction_minor: number;
  union_dues_deduction_minor: number;
  net_minor: number;
}

export interface PayeByStateLine {
  state_of_residence: string;
  employee_count: number;
  total_paye_minor: number;
}

export interface AnnualTaxReconciliationLine {
  employee_id: string;
  employee_number: string;
  full_name: string;
  tin: string | null;
  tax_year: number;
  total_gross_minor: number;
  total_pension_employee_minor: number;
  total_nhf_minor: number;
  total_paye_minor: number;
  payslip_count: number;
}

// --- document generation ---

export type DocumentType =
  | "offer_letter"
  | "confirmation_letter"
  | "employment_contract"
  | "salary_certificate"
  | "other";

export interface DocumentTemplateCreateBody {
  document_type: DocumentType;
  name: string;
  body_template: string;
}

export interface DocumentTemplate {
  id: string;
  org_id: string;
  document_type: DocumentType;
  name: string;
  body_template: string;
  created_at: string;
}

export type GeneratedDocumentStatus = "draft" | "sent_for_signature" | "signed";

export interface GenerateDocumentRequestBody {
  template_id: string;
  extra_context?: Record<string, string>;
}

export interface SignDocumentBody {
  signed_by_name: string;
}

export interface GeneratedDocument {
  id: string;
  org_id: string;
  template_id: string;
  employee_id: string;
  document_type: DocumentType;
  rendered_content: string;
  status: GeneratedDocumentStatus;
  sent_at: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
  created_at: string;
}

// --- reminders ---

export interface RemindersSummary {
  deadline_count: number;
  stale_approval_count: number;
  expiring_contract_count: number;
  notifications_created: number;
}

// --- fine-grained permissions ---

export type Permission =
  | "employees.view"
  | "employees.manage"
  | "payroll.run"
  | "payroll.approve"
  | "accounting.manage"
  | "recruitment.manage"
  | "performance.manage"
  | "reports.view"
  | "settings.manage";

export interface MembershipOut {
  id: string;
  account_id: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface MembershipCreateBody {
  email: string;
  password: string;
  role: Role;
}

export interface MembershipCreateOut extends MembershipOut {
  totp_secret: string | null;
  totp_provisioning_uri: string | null;
}

export interface EffectivePermissions {
  membership_id: string;
  role: string;
  permissions: Permission[];
}

export interface PermissionOverrideBody {
  permission: Permission;
  granted: boolean;
}

// --- subscription / usage ---

export type PlanCode = "free" | "starter" | "professional" | "enterprise";
export type SubscriptionStatus = "active" | "past_due" | "canceled";

export interface Subscription {
  id: string;
  org_id: string;
  plan_code: PlanCode;
  status: SubscriptionStatus;
  current_period_end: string;
  created_at: string;
}

export interface UsageSummary {
  plan_code: PlanCode;
  plan_name: string;
  employee_count: number;
  employee_limit: number | null;
  over_limit: boolean;
  monthly_price_minor: number;
}

export interface ChangePlanBody {
  plan_code: PlanCode;
}

// --- quizzes ---

export interface QuizCreateBody {
  title: string;
  passing_score?: number;
}

export interface Quiz {
  id: string;
  org_id: string;
  course_id: string;
  title: string;
  passing_score: number;
  created_at: string;
}

export interface QuizQuestionCreateBody {
  question_text: string;
  options: string[];
  correct_option_index: number;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  created_at: string;
}

export interface QuizQuestionForAttempt {
  id: string;
  question_text: string;
  options: string[];
}

export interface QuizAttemptSubmitBody {
  answers: number[];
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  employee_id: string;
  enrollment_id: string;
  answers: number[];
  score: number;
  passed: boolean;
  created_at: string;
}

// --- training course attachments ---

export interface TrainingCourseAttachmentCreateBody {
  title: string;
  storage_url: string;
}

export interface TrainingCourseAttachment {
  id: string;
  org_id: string;
  course_id: string;
  title: string;
  storage_url: string;
  created_at: string;
}
