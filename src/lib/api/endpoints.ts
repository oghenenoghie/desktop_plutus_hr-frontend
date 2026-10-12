import { apiFetch, downloadAuthenticatedFile, uploadFile } from "@/lib/api/client";
import type {
  AccountingSettings,
  AccountingSettingsUpdateBody,
  AgingLine,
  AnnualTaxReconciliationLine,
  ApiKey,
  ApiKeyCreateBody,
  ApiKeyCreated,
  ApprovalInstance,
  ApprovalRequestType,
  ApprovalWorkflowStep,
  ApprovalWorkflowStepInput,
  AttendanceRecord,
  AuditLogEntry,
  BalanceSheet,
  BankAccount,
  BankAccountInput,
  BankStatementLine,
  BankStatementLineCreateBody,
  BankStatementLineMatchBody,
  Benefit,
  BenefitCreateBody,
  Bill,
  BillCreateBody,
  Branch,
  BranchCreateBody,
  BranchUpdateBody,
  Budget,
  BudgetCreateBody,
  BudgetVsActual,
  Candidate,
  CandidateCreateBody,
  CandidateUpdateBody,
  ChangePlanBody,
  ChartAccount,
  ChartAccountCreateBody,
  ChartAccountUpdateBody,
  ChecklistItem,
  ChecklistItemCreateBody,
  CompanyBankAccount,
  CompanyBankAccountCreateBody,
  Contractor,
  ContractorCreateBody,
  ContractorInvoice,
  ContractorInvoiceCreateBody,
  ContractorInvoicePayRequest,
  CreateEmployeeLoginBody,
  CreateEmployeeLoginOut,
  CreditNote,
  CreditNoteCreateBody,
  Customer,
  CustomerCreateBody,
  CustomerStatementLine,
  CustomerUpdateBody,
  Department,
  DepartmentCreateBody,
  DepartmentUpdateBody,
  Disbursement,
  DisciplinaryCase,
  DisciplinaryCaseCreateBody,
  DisciplinaryCaseResolveBody,
  DisciplinaryCaseUpdateBody,
  DocumentTemplate,
  DocumentTemplateCreateBody,
  EffectivePermissions,
  Employee,
  EmployeeBulkImportRequest,
  EmployeeBulkImportResult,
  EmployeeCreateBody,
  EmployeeDocument,
  EmployeeDocumentCreateBody,
  EmployeeDocumentUpdateBody,
  EmployeeHistoryEvent,
  EmployeeUpdateBody,
  Expense,
  FinalSettlement,
  FinalSettlementCreateBody,
  FixedAsset,
  FixedAssetAssignment,
  FixedAssetAssignmentCreateBody,
  FixedAssetAssignmentReturnBody,
  FixedAssetCreateBody,
  FixedAssetDisposeBody,
  FixedAssetRevalueBody,
  FixedAssetTransferBody,
  GeneratedDocument,
  GenerateDocumentRequestBody,
  GoodsReceipt,
  GoodsReceiptBody,
  GoodsReceiptStatus,
  IncomeStatement,
  InventoryAdjustment,
  InventoryAdjustmentBody,
  InventoryAdjustmentStatus,
  InventoryCategory,
  InventoryCategoryBody,
  InventoryDocumentType,
  InventoryItem,
  InventoryItemBody,
  InventoryItemType,
  InventoryMovementPage,
  InventoryReconciliation,
  InventorySettings,
  InventorySettingsUpdateBody,
  InventoryStockRow,
  InventorySummary,
  InventoryUnit,
  InventoryUnitCreateBody,
  InventoryUnitUpdateBody,
  InventoryWarehouse,
  InventoryWarehouseBody,
  Invoice,
  InvoiceCreateBody,
  IssueDepartment,
  JobGrade,
  JobGradeCreateBody,
  JobGradeUpdateBody,
  JobPosting,
  JobPostingCreateBody,
  JobPostingUpdateBody,
  JournalEntry,
  JournalEntryCreateBody,
  LeaveBalance,
  LeaveRequest,
  LedgerEntry,
  LedgerReconciliationStatus,
  LedgerStatementLine,
  LedgerStatementLineImport,
  Loan,
  MembershipCreateBody,
  MembershipCreateOut,
  MembershipOut,
  MembershipRoleUpdateOut,
  MeResponse,
  MyFixedAsset,
  Notification,
  NotificationBroadcastBody,
  NotificationUnreadCount,
  Organisation,
  OrganisationSignupBody,
  OrganisationSignupOut,
  OrganisationUpdateBody,
  OrgSummary,
  Overtime,
  OvertimeCreateBody,
  PayeByStateLine,
  PayeEstimateOut,
  PayeEstimateRequestBody,
  PayrollRegisterLine,
  PayRun,
  PayRunCreateBody,
  PayRunSimulationOut,
  PayRunSimulationRequestBody,
  Payslip,
  PayslipDelivery,
  PerformanceReview,
  PerformanceReviewAcknowledgeBody,
  PerformanceReviewCreateBody,
  PerformanceReviewSubmitBody,
  PermissionOverrideBody,
  Policy,
  PolicyCreateBody,
  PolicyUpdateBody,
  ProbationDecisionBody,
  ProbationExtendBody,
  ProbationPeriod,
  ProbationPeriodCreateBody,
  PublicHoliday,
  PublicHolidayCreateBody,
  PurchaseOrder,
  PurchaseOrderBody,
  PurchaseOrderStatus,
  Quiz,
  QuizAttempt,
  QuizAttemptSubmitBody,
  QuizCreateBody,
  QuizQuestion,
  QuizQuestionCreateBody,
  QuizQuestionForAttempt,
  ReconciliationSummary,
  RecurringBill,
  RecurringBillCreateBody,
  RecurringInvoice,
  RecurringInvoiceCreateBody,
  RemindersSummary,
  Role,
  RuleVersion,
  Shift,
  ShiftCreateBody,
  ShiftRosterEntry,
  ShiftRosterEntryCreateBody,
  ShiftUpdateBody,
  SignDocumentBody,
  SimulationOut,
  SimulationRequestBody,
  StatutoryLiability,
  StockIssue,
  StockIssueBody,
  StockIssueStatus,
  StockTransfer,
  StockTransferBody,
  StockTransferStatus,
  Subscription,
  Task,
  TaskCreateBody,
  TaskStatus,
  TaskUpdateBody,
  TokenResponse,
  TrainingCourse,
  TrainingCourseAttachment,
  TrainingCourseAttachmentCreateBody,
  TrainingCourseCreateBody,
  TrainingCourseUpdateBody,
  TrainingEnrollment,
  TrainingEnrollmentCreateBody,
  TrainingEnrollmentUpdateBody,
  TransferReceiveBody,
  TrialBalanceLine,
  UnionMembership,
  UnionMembershipCreateBody,
  UnionMembershipTerminateBody,
  UnionMembershipUpdateBody,
  UsageSummary,
  Vendor,
  VendorCreateBody,
  VendorStatementLine,
  VendorUpdateBody,
  WhtPayment,
  WhtPaymentCreateBody,
  ExpiryReport,
  InventoryLotStock,
  InventoryReportFormat,
  MovementSummary,
  OutstandingOrders,
  ReorderSuggestion,
  Stocktake,
  StocktakeBody,
  StocktakeCountInput,
  StocktakeLineAddBody,
  StocktakeStatus,
  ValuationReport,
  VarianceReport,
} from "@/lib/types";

// --- auth ---

export const authApi = {
  login: (body: {
    identifier: string;
    password: string;
    org_id?: string;
    totp_code?: string;
  }) =>
    apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body,
      auth: false,
    }),
  me: () => apiFetch<MeResponse>("/auth/me"),
  totpSetup: () =>
    apiFetch<{ secret: string; provisioning_uri: string }>("/auth/totp/setup", {
      method: "POST",
    }),
  totpVerify: (code: string) =>
    apiFetch<void>("/auth/totp/verify", { method: "POST", body: { code } }),
};

// --- dashboard ---

// --- compliance ---

export const complianceApi = {
  currentRules: () => apiFetch<RuleVersion>("/compliance/current-rules"),
  payeEstimate: (body: PayeEstimateRequestBody) =>
    apiFetch<PayeEstimateOut>("/compliance/paye-estimate", { method: "POST", body }),
};

export const dashboardApi = {
  summary: () => apiFetch<OrgSummary>("/dashboard/summary"),
  deadlines: (withinDays = 30) =>
    apiFetch<StatutoryLiability[]>(
      `/dashboard/deadlines?within_days=${withinDays}`,
    ),
};

// --- employees ---

export const employeesApi = {
  list: () => apiFetch<Employee[]>("/employees"),
  me: () => apiFetch<Employee>("/employees/me"),
  get: (id: string) => apiFetch<Employee>(`/employees/${id}`),
  create: (body: EmployeeCreateBody) =>
    apiFetch<Employee>("/employees", { method: "POST", body }),
  getBankAccount: (id: string) =>
    apiFetch<BankAccount | null>(`/employees/${id}/bank-account`),
  upsertBankAccount: (id: string, body: BankAccountInput) =>
    apiFetch<BankAccount>(`/employees/${id}/bank-account`, {
      method: "PUT",
      body,
    }),
  setSalaryMasked: (id: string, salaryMasked: boolean) =>
    apiFetch<Employee>(`/employees/${id}`, {
      method: "PATCH",
      body: { salary_masked: salaryMasked },
    }),
  update: (id: string, body: EmployeeUpdateBody) =>
    apiFetch<Employee>(`/employees/${id}`, { method: "PATCH", body }),
  history: (id: string) =>
    apiFetch<EmployeeHistoryEvent[]>(`/employees/${id}/history`),
  bulkImport: (body: EmployeeBulkImportRequest) =>
    apiFetch<EmployeeBulkImportResult>("/employees/bulk-import", {
      method: "POST",
      body,
    }),
  uploadPhoto: (id: string, photo: Blob, consent: boolean) => {
    const formData = new FormData();
    formData.set("file", photo, "photo.webp");
    formData.set("consent", String(consent));
    return uploadFile<Employee>(`/employees/${id}/photo`, formData);
  },
  deletePhoto: (id: string) =>
    apiFetch<Employee>(`/employees/${id}/photo`, { method: "DELETE" }),
  uploadMyPhoto: (photo: Blob, consent: boolean) => {
    const formData = new FormData();
    formData.set("file", photo, "photo.webp");
    formData.set("consent", String(consent));
    return uploadFile<Employee>("/employees/me/photo", formData);
  },
  deleteMyPhoto: () => apiFetch<Employee>("/employees/me/photo", { method: "DELETE" }),
  createLogin: (id: string, body: CreateEmployeeLoginBody) =>
    apiFetch<CreateEmployeeLoginOut>(`/employees/${id}/create-login`, {
      method: "POST",
      body,
    }),
};

// --- tasks ---

export const tasksApi = {
  list: (scope: "mine" | "all" = "mine", status?: TaskStatus) =>
    apiFetch<Task[]>(
      `/tasks?scope=${scope}${status ? `&status=${status}` : ""}`,
    ),
  create: (body: TaskCreateBody) => apiFetch<Task>("/tasks", { method: "POST", body }),
  update: (id: string, body: TaskUpdateBody) =>
    apiFetch<Task>(`/tasks/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiFetch<void>(`/tasks/${id}`, { method: "DELETE" }),
};

// --- departments ---

export const departmentsApi = {
  list: () => apiFetch<Department[]>("/departments"),
  get: (id: string) => apiFetch<Department>(`/departments/${id}`),
  create: (body: DepartmentCreateBody) =>
    apiFetch<Department>("/departments", { method: "POST", body }),
  update: (id: string, body: DepartmentUpdateBody) =>
    apiFetch<Department>(`/departments/${id}`, { method: "PATCH", body }),
};

// --- branches ---

export const branchesApi = {
  list: () => apiFetch<Branch[]>("/branches"),
  get: (id: string) => apiFetch<Branch>(`/branches/${id}`),
  create: (body: BranchCreateBody) =>
    apiFetch<Branch>("/branches", { method: "POST", body }),
  update: (id: string, body: BranchUpdateBody) =>
    apiFetch<Branch>(`/branches/${id}`, { method: "PATCH", body }),
};

// --- public holidays ---

export const publicHolidaysApi = {
  list: () => apiFetch<PublicHoliday[]>("/public-holidays"),
  create: (body: PublicHolidayCreateBody) =>
    apiFetch<PublicHoliday>("/public-holidays", { method: "POST", body }),
  seedDefaults: (year: number) =>
    apiFetch<PublicHoliday[]>(`/public-holidays/seed-defaults?year=${year}`, {
      method: "POST",
      body: {},
    }),
  remove: (id: string) =>
    apiFetch<void>(`/public-holidays/${id}`, { method: "DELETE" }),
};

// --- job grades ---

export const jobGradesApi = {
  list: () => apiFetch<JobGrade[]>("/job-grades"),
  get: (id: string) => apiFetch<JobGrade>(`/job-grades/${id}`),
  create: (body: JobGradeCreateBody) =>
    apiFetch<JobGrade>("/job-grades", { method: "POST", body }),
  update: (id: string, body: JobGradeUpdateBody) =>
    apiFetch<JobGrade>(`/job-grades/${id}`, { method: "PATCH", body }),
};

// --- policies ---

export const policiesApi = {
  list: () => apiFetch<Policy[]>("/policies"),
  get: (id: string) => apiFetch<Policy>(`/policies/${id}`),
  create: (body: PolicyCreateBody) =>
    apiFetch<Policy>("/policies", { method: "POST", body }),
  update: (id: string, body: PolicyUpdateBody) =>
    apiFetch<Policy>(`/policies/${id}`, { method: "PATCH", body }),
};

// --- shifts ---

export const shiftsApi = {
  list: () => apiFetch<Shift[]>("/shifts"),
  get: (id: string) => apiFetch<Shift>(`/shifts/${id}`),
  create: (body: ShiftCreateBody) =>
    apiFetch<Shift>("/shifts", { method: "POST", body }),
  update: (id: string, body: ShiftUpdateBody) =>
    apiFetch<Shift>(`/shifts/${id}`, { method: "PATCH", body }),
};

// --- recruitment ---

export const jobPostingsApi = {
  list: () => apiFetch<JobPosting[]>("/job-postings"),
  get: (id: string) => apiFetch<JobPosting>(`/job-postings/${id}`),
  create: (body: JobPostingCreateBody) =>
    apiFetch<JobPosting>("/job-postings", { method: "POST", body }),
  update: (id: string, body: JobPostingUpdateBody) =>
    apiFetch<JobPosting>(`/job-postings/${id}`, { method: "PATCH", body }),
  candidates: (id: string) =>
    apiFetch<Candidate[]>(`/job-postings/${id}/candidates`),
  addCandidate: (id: string, body: CandidateCreateBody) =>
    apiFetch<Candidate>(`/job-postings/${id}/candidates`, {
      method: "POST",
      body,
    }),
};

export const candidatesApi = {
  get: (id: string) => apiFetch<Candidate>(`/candidates/${id}`),
  update: (id: string, body: CandidateUpdateBody) =>
    apiFetch<Candidate>(`/candidates/${id}`, { method: "PATCH", body }),
};

// --- performance reviews ---

export const performanceReviewsApi = {
  list: () => apiFetch<PerformanceReview[]>("/performance-reviews"),
  me: () => apiFetch<PerformanceReview[]>("/performance-reviews/me"),
  get: (id: string) =>
    apiFetch<PerformanceReview>(`/performance-reviews/${id}`),
  create: (body: PerformanceReviewCreateBody) =>
    apiFetch<PerformanceReview>("/performance-reviews", {
      method: "POST",
      body,
    }),
  submit: (id: string, body: PerformanceReviewSubmitBody) =>
    apiFetch<PerformanceReview>(`/performance-reviews/${id}/submit`, {
      method: "POST",
      body,
    }),
  acknowledge: (id: string, body: PerformanceReviewAcknowledgeBody) =>
    apiFetch<PerformanceReview>(`/performance-reviews/${id}/acknowledge`, {
      method: "POST",
      body,
    }),
};

// --- learning & development ---

export const trainingCoursesApi = {
  list: () => apiFetch<TrainingCourse[]>("/training-courses"),
  get: (id: string) => apiFetch<TrainingCourse>(`/training-courses/${id}`),
  create: (body: TrainingCourseCreateBody) =>
    apiFetch<TrainingCourse>("/training-courses", { method: "POST", body }),
  update: (id: string, body: TrainingCourseUpdateBody) =>
    apiFetch<TrainingCourse>(`/training-courses/${id}`, {
      method: "PATCH",
      body,
    }),
  enrollments: (id: string) =>
    apiFetch<TrainingEnrollment[]>(`/training-courses/${id}/enrollments`),
  enroll: (id: string, body: TrainingEnrollmentCreateBody) =>
    apiFetch<TrainingEnrollment>(`/training-courses/${id}/enrollments`, {
      method: "POST",
      body,
    }),
};

export const trainingEnrollmentsApi = {
  mine: () => apiFetch<TrainingEnrollment[]>("/training-enrollments/me"),
  update: (id: string, body: TrainingEnrollmentUpdateBody) =>
    apiFetch<TrainingEnrollment>(`/training-enrollments/${id}`, {
      method: "PATCH",
      body,
    }),
};

// --- employee relations ---

export const disciplinaryCasesApi = {
  list: () => apiFetch<DisciplinaryCase[]>("/disciplinary-cases"),
  get: (id: string) => apiFetch<DisciplinaryCase>(`/disciplinary-cases/${id}`),
  create: (body: DisciplinaryCaseCreateBody) =>
    apiFetch<DisciplinaryCase>("/disciplinary-cases", { method: "POST", body }),
  update: (id: string, body: DisciplinaryCaseUpdateBody) =>
    apiFetch<DisciplinaryCase>(`/disciplinary-cases/${id}`, {
      method: "PATCH",
      body,
    }),
  resolve: (id: string, body: DisciplinaryCaseResolveBody) =>
    apiFetch<DisciplinaryCase>(`/disciplinary-cases/${id}/resolve`, {
      method: "POST",
      body,
    }),
};

// --- notifications ---

export const notificationsApi = {
  mine: () => apiFetch<Notification[]>("/notifications/me"),
  unreadCount: () =>
    apiFetch<NotificationUnreadCount>("/notifications/me/unread-count"),
  markRead: (id: string) =>
    apiFetch<Notification>(`/notifications/me/${id}/read`, {
      method: "POST",
      body: {},
    }),
  markAllRead: () =>
    apiFetch<void>("/notifications/me/read-all", { method: "POST", body: {} }),
  broadcast: (body: NotificationBroadcastBody) =>
    apiFetch<Notification[]>("/notifications/broadcast", {
      method: "POST",
      body,
    }),
};

// --- union dues ---

export const unionMembershipsApi = {
  forEmployee: (employeeId: string) =>
    apiFetch<UnionMembership[]>(`/union-memberships/employees/${employeeId}`),
  mine: () => apiFetch<UnionMembership[]>("/union-memberships/me"),
  assign: (employeeId: string, body: UnionMembershipCreateBody) =>
    apiFetch<UnionMembership>(`/union-memberships/employees/${employeeId}`, {
      method: "POST",
      body,
    }),
  update: (id: string, body: UnionMembershipUpdateBody) =>
    apiFetch<UnionMembership>(`/union-memberships/${id}`, {
      method: "PATCH",
      body,
    }),
  terminate: (id: string, body: UnionMembershipTerminateBody) =>
    apiFetch<UnionMembership>(`/union-memberships/${id}/terminate`, {
      method: "POST",
      body,
    }),
};

// --- api keys ---

export const apiKeysApi = {
  list: () => apiFetch<ApiKey[]>("/api-keys"),
  create: (body: ApiKeyCreateBody) =>
    apiFetch<ApiKeyCreated>("/api-keys", { method: "POST", body }),
  revoke: (id: string) =>
    apiFetch<ApiKey>(`/api-keys/${id}/revoke`, { method: "POST", body: {} }),
};

// --- chart of accounts ---

export const chartAccountsApi = {
  list: () => apiFetch<ChartAccount[]>("/chart-of-accounts"),
  create: (body: ChartAccountCreateBody) =>
    apiFetch<ChartAccount>("/chart-of-accounts", { method: "POST", body }),
  update: (id: string, body: ChartAccountUpdateBody) =>
    apiFetch<ChartAccount>(`/chart-of-accounts/${id}`, {
      method: "PATCH",
      body,
    }),
  seedDefaults: () =>
    apiFetch<ChartAccount[]>("/chart-of-accounts/seed-defaults", {
      method: "POST",
      body: {},
    }),
};

// --- general ledger ---

export const generalLedgerApi = {
  entries: (params?: {
    account?: string;
    payRunId?: string;
    departmentId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.account) query.set("account", params.account);
    if (params?.payRunId) query.set("pay_run_id", params.payRunId);
    if (params?.departmentId) query.set("department_id", params.departmentId);
    const qs = query.toString();
    return apiFetch<LedgerEntry[]>(
      `/general-ledger/entries${qs ? `?${qs}` : ""}`,
    );
  },
  trialBalance: () =>
    apiFetch<TrialBalanceLine[]>("/general-ledger/trial-balance"),
  postJournalEntry: (body: JournalEntryCreateBody) =>
    apiFetch<LedgerEntry[]>("/general-ledger/journal-entries", {
      method: "POST",
      body,
    }),
};

// --- accounting settings ---

export const accountingSettingsApi = {
  get: () => apiFetch<AccountingSettings>("/accounting-settings"),
  update: (body: AccountingSettingsUpdateBody) =>
    apiFetch<AccountingSettings>("/accounting-settings", { method: "PATCH", body }),
};

// --- vendors ---

export const vendorsApi = {
  list: () => apiFetch<Vendor[]>("/vendors"),
  create: (body: VendorCreateBody) =>
    apiFetch<Vendor>("/vendors", { method: "POST", body }),
  update: (id: string, body: VendorUpdateBody) =>
    apiFetch<Vendor>(`/vendors/${id}`, { method: "PATCH", body }),
};

// --- bills ---

export const billsApi = {
  list: () => apiFetch<Bill[]>("/bills"),
  create: (body: BillCreateBody) =>
    apiFetch<Bill>("/bills", { method: "POST", body }),
  approve: (id: string) =>
    apiFetch<Bill>(`/bills/${id}/approve`, { method: "POST", body: {} }),
  pay: (id: string) =>
    apiFetch<Bill>(`/bills/${id}/pay`, { method: "POST", body: {} }),
  void: (id: string) =>
    apiFetch<Bill>(`/bills/${id}/void`, { method: "POST", body: {} }),
  downloadPdf: (id: string, filename: string) =>
    downloadAuthenticatedFile(`/bills/${id}/pdf`, filename),
  email: (id: string, to?: string) =>
    apiFetch<void>(`/bills/${id}/email`, {
      method: "POST",
      body: { to: to || null },
    }),
};

// --- customers ---

export const customersApi = {
  list: () => apiFetch<Customer[]>("/customers"),
  create: (body: CustomerCreateBody) =>
    apiFetch<Customer>("/customers", { method: "POST", body }),
  update: (id: string, body: CustomerUpdateBody) =>
    apiFetch<Customer>(`/customers/${id}`, { method: "PATCH", body }),
};

// --- invoices ---

export const invoicesApi = {
  list: () => apiFetch<Invoice[]>("/invoices"),
  create: (body: InvoiceCreateBody) =>
    apiFetch<Invoice>("/invoices", { method: "POST", body }),
  send: (id: string) =>
    apiFetch<Invoice>(`/invoices/${id}/send`, { method: "POST", body: {} }),
  pay: (id: string) =>
    apiFetch<Invoice>(`/invoices/${id}/pay`, { method: "POST", body: {} }),
  void: (id: string) =>
    apiFetch<Invoice>(`/invoices/${id}/void`, { method: "POST", body: {} }),
  downloadPdf: (id: string, filename: string) =>
    downloadAuthenticatedFile(`/invoices/${id}/pdf`, filename),
  email: (id: string, to?: string) =>
    apiFetch<void>(`/invoices/${id}/email`, {
      method: "POST",
      body: { to: to || null },
    }),
};

// --- financial statements ---

export const financialStatementsApi = {
  balanceSheet: (asOf?: string) => {
    const qs = asOf ? `?as_of=${asOf}` : "";
    return apiFetch<BalanceSheet>(`/financial-statements/balance-sheet${qs}`);
  },
  incomeStatement: (params?: { fromDate?: string; toDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set("from_date", params.fromDate);
    if (params?.toDate) query.set("to_date", params.toDate);
    const qs = query.toString();
    return apiFetch<IncomeStatement>(
      `/financial-statements/income-statement${qs ? `?${qs}` : ""}`,
    );
  },
  downloadBalanceSheetPdf: (asOf: string | undefined, filename: string) => {
    const qs = asOf ? `?as_of=${asOf}` : "";
    return downloadAuthenticatedFile(
      `/financial-statements/balance-sheet/pdf${qs}`,
      filename,
    );
  },
  emailBalanceSheet: (to: string, asOf?: string) => {
    const qs = asOf ? `?as_of=${asOf}` : "";
    return apiFetch<void>(`/financial-statements/balance-sheet/email${qs}`, {
      method: "POST",
      body: { to },
    });
  },
  downloadIncomeStatementPdf: (
    params: { fromDate?: string; toDate?: string } | undefined,
    filename: string,
  ) => {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set("from_date", params.fromDate);
    if (params?.toDate) query.set("to_date", params.toDate);
    const qs = query.toString();
    return downloadAuthenticatedFile(
      `/financial-statements/income-statement/pdf${qs ? `?${qs}` : ""}`,
      filename,
    );
  },
  emailIncomeStatement: (
    to: string,
    params?: { fromDate?: string; toDate?: string },
  ) => {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set("from_date", params.fromDate);
    if (params?.toDate) query.set("to_date", params.toDate);
    const qs = query.toString();
    return apiFetch<void>(
      `/financial-statements/income-statement/email${qs ? `?${qs}` : ""}`,
      {
        method: "POST",
        body: { to },
      },
    );
  },
};

// --- fixed assets ---

export const fixedAssetsApi = {
  list: () => apiFetch<FixedAsset[]>("/fixed-assets"),
  mine: () => apiFetch<MyFixedAsset[]>("/fixed-assets/me"),
  create: (body: FixedAssetCreateBody) =>
    apiFetch<FixedAsset>("/fixed-assets", { method: "POST", body }),
  depreciate: (id: string) =>
    apiFetch<FixedAsset>(`/fixed-assets/${id}/depreciate`, {
      method: "POST",
      body: {},
    }),
  dispose: (id: string, body: FixedAssetDisposeBody) =>
    apiFetch<FixedAsset>(`/fixed-assets/${id}/dispose`, {
      method: "POST",
      body,
    }),
  assignments: (id: string) =>
    apiFetch<FixedAssetAssignment[]>(`/fixed-assets/${id}/assignments`),
  assign: (id: string, body: FixedAssetAssignmentCreateBody) =>
    apiFetch<FixedAssetAssignment>(`/fixed-assets/${id}/assignments`, {
      method: "POST",
      body,
    }),
  returnAssignment: (assignmentId: string, body: FixedAssetAssignmentReturnBody) =>
    apiFetch<FixedAssetAssignment>(`/fixed-assets/assignments/${assignmentId}/return`, {
      method: "POST",
      body,
    }),
};

// --- budgets ---

export const budgetsApi = {
  list: () => apiFetch<Budget[]>("/budgets"),
  get: (id: string) => apiFetch<Budget>(`/budgets/${id}`),
  create: (body: BudgetCreateBody) =>
    apiFetch<Budget>("/budgets", { method: "POST", body }),
  update: (id: string, body: BudgetCreateBody) =>
    apiFetch<Budget>(`/budgets/${id}`, { method: "PUT", body }),
  remove: (id: string) =>
    apiFetch<void>(`/budgets/${id}`, { method: "DELETE" }),
  actuals: (id: string) => apiFetch<BudgetVsActual>(`/budgets/${id}/actuals`),
};

// --- bank reconciliation ---

export const companyBankAccountsApi = {
  list: () => apiFetch<CompanyBankAccount[]>("/company-bank-accounts"),
  get: (id: string) =>
    apiFetch<CompanyBankAccount>(`/company-bank-accounts/${id}`),
  create: (body: CompanyBankAccountCreateBody) =>
    apiFetch<CompanyBankAccount>("/company-bank-accounts", {
      method: "POST",
      body,
    }),
  statementLines: (id: string) =>
    apiFetch<BankStatementLine[]>(
      `/company-bank-accounts/${id}/statement-lines`,
    ),
  addStatementLine: (id: string, body: BankStatementLineCreateBody) =>
    apiFetch<BankStatementLine>(
      `/company-bank-accounts/${id}/statement-lines`,
      {
        method: "POST",
        body,
      },
    ),
  matchStatementLine: (
    id: string,
    lineId: string,
    body: BankStatementLineMatchBody,
  ) =>
    apiFetch<BankStatementLine>(
      `/company-bank-accounts/${id}/statement-lines/${lineId}/match`,
      { method: "POST", body },
    ),
  unmatchStatementLine: (id: string, lineId: string) =>
    apiFetch<BankStatementLine>(
      `/company-bank-accounts/${id}/statement-lines/${lineId}/unmatch`,
      { method: "POST", body: {} },
    ),
  reconciliation: (id: string) =>
    apiFetch<ReconciliationSummary>(
      `/company-bank-accounts/${id}/reconciliation`,
    ),
};

// --- pay runs ---

export const payRunsApi = {
  list: () => apiFetch<PayRun[]>("/pay-runs"),
  get: (id: string) => apiFetch<PayRun>(`/pay-runs/${id}`),
  create: (body: PayRunCreateBody) =>
    apiFetch<PayRun>("/pay-runs", { method: "POST", body }),
  payslips: (id: string) => apiFetch<Payslip[]>(`/pay-runs/${id}/payslips`),
  disbursement: (id: string) =>
    apiFetch<Disbursement>(`/pay-runs/${id}/disbursement`),
  myPayslips: () => apiFetch<Payslip[]>("/pay-runs/me/payslips"),
  deliveries: (payRunId: string, payslipId: string) =>
    apiFetch<PayslipDelivery[]>(
      `/pay-runs/${payRunId}/payslips/${payslipId}/deliveries`,
    ),
  resend: (payRunId: string, payslipId: string) =>
    apiFetch<void>(`/pay-runs/${payRunId}/payslips/${payslipId}/resend`, {
      method: "POST",
      body: {},
    }),
  downloadPayslipPdf: (payRunId: string, payslipId: string, filename: string) =>
    downloadAuthenticatedFile(
      `/pay-runs/${payRunId}/payslips/${payslipId}/pdf`,
      filename,
    ),
  reverse: (id: string, acknowledgeFiledOrRemitted = false) =>
    apiFetch<PayRun>(`/pay-runs/${id}/reverse`, {
      method: "POST",
      body: { acknowledge_filed_or_remitted: acknowledgeFiledOrRemitted },
    }),
};

// --- leave ---

export const leaveApi = {
  list: () => apiFetch<LeaveRequest[]>("/leave-requests"),
  mine: () => apiFetch<LeaveRequest[]>("/leave-requests/me"),
  myBalance: () => apiFetch<LeaveBalance>("/leave-requests/me/balance"),
  approve: (id: string) =>
    apiFetch<LeaveRequest>(`/leave-requests/${id}/approve`, { method: "POST" }),
  reject: (id: string) =>
    apiFetch<LeaveRequest>(`/leave-requests/${id}/reject`, { method: "POST" }),
};

// --- expenses ---

export const expensesApi = {
  list: () => apiFetch<Expense[]>("/expenses"),
  mine: () => apiFetch<Expense[]>("/expenses/me"),
  approve: (id: string) =>
    apiFetch<Expense>(`/expenses/${id}/approve`, { method: "POST" }),
  reject: (id: string) =>
    apiFetch<Expense>(`/expenses/${id}/reject`, { method: "POST" }),
  reimburse: (id: string) =>
    apiFetch<Expense>(`/expenses/${id}/reimburse`, { method: "POST" }),
};

// --- overtime ---

export const overtimeApi = {
  list: () => apiFetch<Overtime[]>("/overtime"),
  mine: () => apiFetch<Overtime[]>("/overtime/me"),
  submit: (body: OvertimeCreateBody) =>
    apiFetch<Overtime>("/overtime/me", { method: "POST", body }),
  approve: (id: string) =>
    apiFetch<Overtime>(`/overtime/${id}/approve`, { method: "POST" }),
  reject: (id: string) =>
    apiFetch<Overtime>(`/overtime/${id}/reject`, { method: "POST" }),
};

// --- loans ---

export const loansApi = {
  list: () => apiFetch<Loan[]>("/loans"),
  mine: () => apiFetch<Loan[]>("/loans/me"),
  get: (id: string) => apiFetch<Loan>(`/loans/${id}`),
  cancel: (id: string) =>
    apiFetch<Loan>(`/loans/${id}/cancel`, { method: "POST" }),
};

// --- benefits ---

export const benefitsApi = {
  forEmployee: (employeeId: string) =>
    apiFetch<Benefit[]>(`/benefits/employees/${employeeId}`),
  mine: () => apiFetch<Benefit[]>("/benefits/me"),
  assign: (employeeId: string, body: BenefitCreateBody) =>
    apiFetch<Benefit>(`/benefits/employees/${employeeId}`, {
      method: "POST",
      body,
    }),
  end: (id: string, endDate: string) =>
    apiFetch<Benefit>(`/benefits/${id}/end`, {
      method: "POST",
      body: { end_date: endDate },
    }),
};

// --- contractors ---

export const contractorsApi = {
  list: () => apiFetch<Contractor[]>("/contractors"),
  get: (id: string) => apiFetch<Contractor>(`/contractors/${id}`),
  create: (body: ContractorCreateBody) =>
    apiFetch<Contractor>("/contractors", { method: "POST", body }),
  payments: (id: string) =>
    apiFetch<WhtPayment[]>(`/contractors/${id}/payments`),
  recordPayment: (id: string, body: WhtPaymentCreateBody) =>
    apiFetch<WhtPayment>(`/contractors/${id}/payments`, {
      method: "POST",
      body,
    }),
};

export const contractorInvoicesApi = {
  list: (contractorId: string) =>
    apiFetch<ContractorInvoice[]>(`/contractors/${contractorId}/invoices`),
  create: (contractorId: string, body: ContractorInvoiceCreateBody) =>
    apiFetch<ContractorInvoice>(`/contractors/${contractorId}/invoices`, {
      method: "POST",
      body,
    }),
  submit: (contractorId: string, invoiceId: string) =>
    apiFetch<ContractorInvoice>(
      `/contractors/${contractorId}/invoices/${invoiceId}/submit`,
      {
        method: "POST",
        body: {},
      },
    ),
  pay: (
    contractorId: string,
    invoiceId: string,
    body: ContractorInvoicePayRequest,
  ) =>
    apiFetch<ContractorInvoice>(
      `/contractors/${contractorId}/invoices/${invoiceId}/pay`,
      {
        method: "POST",
        body,
      },
    ),
};

// --- statutory liabilities ---

export const statutoryLiabilitiesApi = {
  list: () => apiFetch<StatutoryLiability[]>("/statutory-liabilities"),
  file: (id: string) =>
    apiFetch<StatutoryLiability>(`/statutory-liabilities/${id}/file`, {
      method: "POST",
    }),
  remit: (id: string, reference?: string) =>
    apiFetch<StatutoryLiability>(`/statutory-liabilities/${id}/remit`, {
      method: "POST",
      body: { reference },
    }),
};

// --- final settlement ---

export const finalSettlementApi = {
  forEmployee: (employeeId: string) =>
    apiFetch<FinalSettlement[]>(`/final-settlements/${employeeId}`),
  process: (employeeId: string, body: FinalSettlementCreateBody) =>
    apiFetch<FinalSettlement>(`/final-settlements/${employeeId}`, {
      method: "POST",
      body,
    }),
};

// --- simulation ---

export const simulationApi = {
  payslip: (employeeId: string, body: SimulationRequestBody) =>
    apiFetch<SimulationOut>(`/simulation/payslip/${employeeId}`, {
      method: "POST",
      body,
    }),
  payRun: (body: PayRunSimulationRequestBody) =>
    apiFetch<PayRunSimulationOut>("/simulation/pay-run", {
      method: "POST",
      body,
    }),
};

// --- approval workflows ---

export const approvalWorkflowsApi = {
  list: (requestType: ApprovalRequestType) =>
    apiFetch<ApprovalWorkflowStep[]>(`/approval-workflow-steps/${requestType}`),
  replace: (
    requestType: ApprovalRequestType,
    steps: ApprovalWorkflowStepInput[],
  ) =>
    apiFetch<ApprovalWorkflowStep[]>(
      `/approval-workflow-steps/${requestType}`,
      {
        method: "PUT",
        body: steps,
      },
    ),
};

export const approvalInstancesApi = {
  forRequest: (requestType: ApprovalRequestType, requestId: string) =>
    apiFetch<ApprovalInstance | null>(
      `/approval-instances/${requestType}/${requestId}`,
    ),
};

// --- audit log ---

export const auditLogApi = {
  list: (params?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.entityType) query.set("entity_type", params.entityType);
    if (params?.entityId) query.set("entity_id", params.entityId);
    if (params?.action) query.set("action", params.action);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return apiFetch<AuditLogEntry[]>(`/audit-log${qs ? `?${qs}` : ""}`);
  },
};

// --- employee checklists (onboarding / offboarding) ---

export const employeeChecklistsApi = {
  forEmployee: (employeeId: string) =>
    apiFetch<ChecklistItem[]>(`/employees/${employeeId}/checklist-items`),
  create: (employeeId: string, body: ChecklistItemCreateBody) =>
    apiFetch<ChecklistItem>(`/employees/${employeeId}/checklist-items`, {
      method: "POST",
      body,
    }),
  complete: (itemId: string) =>
    apiFetch<ChecklistItem>(`/employees/checklist-items/${itemId}/complete`, {
      method: "POST",
      body: {},
    }),
};

// --- probation periods ---

export const probationApi = {
  forEmployee: (employeeId: string) =>
    apiFetch<ProbationPeriod[]>(`/employees/${employeeId}/probation-periods`),
  create: (employeeId: string, body: ProbationPeriodCreateBody) =>
    apiFetch<ProbationPeriod>(`/employees/${employeeId}/probation-periods`, {
      method: "POST",
      body,
    }),
  extend: (periodId: string, body: ProbationExtendBody) =>
    apiFetch<ProbationPeriod>(`/probation-periods/${periodId}/extend`, {
      method: "POST",
      body,
    }),
  decide: (periodId: string, body: ProbationDecisionBody) =>
    apiFetch<ProbationPeriod>(`/probation-periods/${periodId}/decide`, {
      method: "POST",
      body,
    }),
};

// --- employee documents ---

export const employeeDocumentsApi = {
  forEmployee: (employeeId: string) =>
    apiFetch<EmployeeDocument[]>(`/employees/${employeeId}/documents`),
  mine: () => apiFetch<EmployeeDocument[]>("/employees/documents/me"),
  create: (employeeId: string, body: EmployeeDocumentCreateBody) =>
    apiFetch<EmployeeDocument>(`/employees/${employeeId}/documents`, {
      method: "POST",
      body,
    }),
  update: (documentId: string, body: EmployeeDocumentUpdateBody) =>
    apiFetch<EmployeeDocument>(`/employees/documents/${documentId}`, {
      method: "PATCH",
      body,
    }),
};

// --- shift roster ---

export const shiftRosterApi = {
  forEmployee: (
    employeeId: string,
    params?: { startDate?: string; endDate?: string },
  ) => {
    const query = new URLSearchParams({ employee_id: employeeId });
    if (params?.startDate) query.set("start_date", params.startDate);
    if (params?.endDate) query.set("end_date", params.endDate);
    return apiFetch<ShiftRosterEntry[]>(`/shift-roster?${query.toString()}`);
  },
  mine: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("start_date", params.startDate);
    if (params?.endDate) query.set("end_date", params.endDate);
    const qs = query.toString();
    return apiFetch<ShiftRosterEntry[]>(
      `/shift-roster/me${qs ? `?${qs}` : ""}`,
    );
  },
  create: (body: ShiftRosterEntryCreateBody) =>
    apiFetch<ShiftRosterEntry[]>("/shift-roster", { method: "POST", body }),
};

// --- attendance ---

export const attendanceApi = {
  clockIn: () =>
    apiFetch<AttendanceRecord>("/attendance/clock-in", {
      method: "POST",
      body: {},
    }),
  clockOut: () =>
    apiFetch<AttendanceRecord>("/attendance/clock-out", {
      method: "POST",
      body: {},
    }),
  mine: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("start_date", params.startDate);
    if (params?.endDate) query.set("end_date", params.endDate);
    const qs = query.toString();
    return apiFetch<AttendanceRecord[]>(`/attendance/me${qs ? `?${qs}` : ""}`);
  },
  forEmployee: (
    employeeId: string,
    params?: { startDate?: string; endDate?: string },
  ) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("start_date", params.startDate);
    if (params?.endDate) query.set("end_date", params.endDate);
    const qs = query.toString();
    return apiFetch<AttendanceRecord[]>(
      `/attendance/employees/${employeeId}${qs ? `?${qs}` : ""}`,
    );
  },
};

// --- aging / vendor statement reports ---

function _statementQuery(params?: {
  fromDate?: string;
  toDate?: string;
}): string {
  const query = new URLSearchParams();
  if (params?.fromDate) query.set("from_date", params.fromDate);
  if (params?.toDate) query.set("to_date", params.toDate);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const agingReportsApi = {
  apAging: (asOf?: string) =>
    apiFetch<AgingLine[]>(`/reports/ap-aging${asOf ? `?as_of=${asOf}` : ""}`),
  arAging: (asOf?: string) =>
    apiFetch<AgingLine[]>(`/reports/ar-aging${asOf ? `?as_of=${asOf}` : ""}`),
  vendorStatement: (
    vendorId: string,
    params?: { fromDate?: string; toDate?: string },
  ) =>
    apiFetch<VendorStatementLine[]>(
      `/reports/vendors/${vendorId}/statement${_statementQuery(params)}`,
    ),
  downloadVendorStatementPdf: (
    vendorId: string,
    params: { fromDate?: string; toDate?: string } | undefined,
    filename: string,
  ) =>
    downloadAuthenticatedFile(
      `/reports/vendors/${vendorId}/statement/pdf${_statementQuery(params)}`,
      filename,
    ),
  emailVendorStatement: (
    vendorId: string,
    to: string | undefined,
    params?: { fromDate?: string; toDate?: string },
  ) =>
    apiFetch<void>(
      `/reports/vendors/${vendorId}/statement/email${_statementQuery(params)}`,
      {
        method: "POST",
        body: { to: to || null },
      },
    ),
  customerStatement: (
    customerId: string,
    params?: { fromDate?: string; toDate?: string },
  ) =>
    apiFetch<CustomerStatementLine[]>(
      `/reports/customers/${customerId}/statement${_statementQuery(params)}`,
    ),
  downloadCustomerStatementPdf: (
    customerId: string,
    params: { fromDate?: string; toDate?: string } | undefined,
    filename: string,
  ) =>
    downloadAuthenticatedFile(
      `/reports/customers/${customerId}/statement/pdf${_statementQuery(params)}`,
      filename,
    ),
  emailCustomerStatement: (
    customerId: string,
    to: string | undefined,
    params?: { fromDate?: string; toDate?: string },
  ) =>
    apiFetch<void>(
      `/reports/customers/${customerId}/statement/email${_statementQuery(params)}`,
      {
        method: "POST",
        body: { to: to || null },
      },
    ),
};

// --- credit notes ---

export const creditNotesApi = {
  forInvoice: (invoiceId: string) =>
    apiFetch<CreditNote[]>(`/invoices/${invoiceId}/credit-notes`),
  create: (invoiceId: string, body: CreditNoteCreateBody) =>
    apiFetch<CreditNote>(`/invoices/${invoiceId}/credit-notes`, {
      method: "POST",
      body,
    }),
};

// --- ledger bank reconciliation (org-wide, by chart-of-accounts code) ---

export const ledgerReconciliationApi = {
  importLines: (accountCode: string, lines: LedgerStatementLineImport[]) =>
    apiFetch<LedgerStatementLine[]>("/bank-reconciliation/statement-lines", {
      method: "POST",
      body: { account_code: accountCode, lines },
    }),
  match: (lineId: string, ledgerEntryId: string) =>
    apiFetch<LedgerStatementLine>(
      `/bank-reconciliation/statement-lines/${lineId}/match`,
      {
        method: "POST",
        body: { ledger_entry_id: ledgerEntryId },
      },
    ),
  unmatch: (lineId: string) =>
    apiFetch<LedgerStatementLine>(
      `/bank-reconciliation/statement-lines/${lineId}/unmatch`,
      {
        method: "POST",
        body: {},
      },
    ),
  status: (accountCode: string) =>
    apiFetch<LedgerReconciliationStatus>(
      `/bank-reconciliation/status?account_code=${encodeURIComponent(accountCode)}`,
    ),
};

// --- fixed asset transfers / revaluations / batch depreciation ---

export const fixedAssetOpsApi = {
  transfer: (id: string, body: FixedAssetTransferBody) =>
    apiFetch<FixedAsset>(`/fixed-assets/${id}/transfer`, {
      method: "POST",
      body,
    }),
  revalue: (id: string, body: FixedAssetRevalueBody) =>
    apiFetch<FixedAsset>(`/fixed-assets/${id}/revalue`, {
      method: "POST",
      body,
    }),
  batchDepreciate: () =>
    apiFetch<FixedAsset[]>("/fixed-assets/batch-depreciation", {
      method: "POST",
      body: {},
    }),
};

// --- recurring bills / invoices ---

export const recurringBillsApi = {
  list: () => apiFetch<RecurringBill[]>("/recurring-bills"),
  create: (body: RecurringBillCreateBody) =>
    apiFetch<RecurringBill>("/recurring-bills", { method: "POST", body }),
  setActive: (id: string, isActive: boolean) =>
    apiFetch<RecurringBill>(`/recurring-bills/${id}`, {
      method: "PATCH",
      body: { is_active: isActive },
    }),
  generateDue: (asOf?: string) =>
    apiFetch<Bill[]>(
      `/recurring-bills/generate-due${asOf ? `?as_of=${asOf}` : ""}`,
      {
        method: "POST",
        body: {},
      },
    ),
};

export const recurringInvoicesApi = {
  list: () => apiFetch<RecurringInvoice[]>("/recurring-invoices"),
  create: (body: RecurringInvoiceCreateBody) =>
    apiFetch<RecurringInvoice>("/recurring-invoices", { method: "POST", body }),
  setActive: (id: string, isActive: boolean) =>
    apiFetch<RecurringInvoice>(`/recurring-invoices/${id}`, {
      method: "PATCH",
      body: { is_active: isActive },
    }),
  generateDue: (asOf?: string) =>
    apiFetch<Invoice[]>(
      `/recurring-invoices/generate-due${asOf ? `?as_of=${asOf}` : ""}`,
      {
        method: "POST",
        body: {},
      },
    ),
};

// --- payroll reports ---

export const payrollReportsApi = {
  register: (payRunId: string) =>
    apiFetch<PayrollRegisterLine[]>(`/reports/payroll-register/${payRunId}`),
  payeByState: (params?: { fromDate?: string; toDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set("from_date", params.fromDate);
    if (params?.toDate) query.set("to_date", params.toDate);
    const qs = query.toString();
    return apiFetch<PayeByStateLine[]>(
      `/reports/paye-by-state${qs ? `?${qs}` : ""}`,
    );
  },
  annualTaxReconciliation: (taxYear: number) =>
    apiFetch<AnnualTaxReconciliationLine[]>(
      `/reports/annual-tax-reconciliation?tax_year=${taxYear}`,
    ),
  downloadTaxCertificate: (
    employeeId: string,
    taxYear: number,
    filename: string,
  ) =>
    downloadAuthenticatedFile(
      `/reports/annual-tax-reconciliation/${employeeId}/certificate?tax_year=${taxYear}`,
      filename,
    ),
};

// --- document generation ---

export const documentTemplatesApi = {
  list: () => apiFetch<DocumentTemplate[]>("/document-templates"),
  create: (body: DocumentTemplateCreateBody) =>
    apiFetch<DocumentTemplate>("/document-templates", { method: "POST", body }),
};

export const generatedDocumentsApi = {
  forEmployee: (employeeId: string) =>
    apiFetch<GeneratedDocument[]>(
      `/employees/${employeeId}/generated-documents`,
    ),
  mine: () => apiFetch<GeneratedDocument[]>("/generated-documents/me"),
  generate: (employeeId: string, body: GenerateDocumentRequestBody) =>
    apiFetch<GeneratedDocument>(
      `/employees/${employeeId}/generated-documents`,
      {
        method: "POST",
        body,
      },
    ),
  send: (documentId: string) =>
    apiFetch<GeneratedDocument>(`/generated-documents/${documentId}/send`, {
      method: "POST",
      body: {},
    }),
  sign: (documentId: string, body: SignDocumentBody) =>
    apiFetch<GeneratedDocument>(`/generated-documents/${documentId}/sign`, {
      method: "POST",
      body,
    }),
  downloadPdf: (documentId: string, filename: string) =>
    downloadAuthenticatedFile(
      `/generated-documents/${documentId}/pdf`,
      filename,
    ),
};

// --- reminders ---

export const remindersApi = {
  run: (params?: { asOf?: string; staleAfterDays?: number }) => {
    const query = new URLSearchParams();
    if (params?.asOf) query.set("as_of", params.asOf);
    if (params?.staleAfterDays !== undefined) {
      query.set("stale_after_days", String(params.staleAfterDays));
    }
    const qs = query.toString();
    return apiFetch<RemindersSummary>(`/reminders/run${qs ? `?${qs}` : ""}`, {
      method: "POST",
      body: {},
    });
  },
};

// --- fine-grained permissions ---

export const membershipsApi = {
  list: () => apiFetch<MembershipOut[]>("/memberships"),
  create: (body: MembershipCreateBody) =>
    apiFetch<MembershipCreateOut>("/memberships", { method: "POST", body }),
  updateRole: (membershipId: string, role: Role) =>
    apiFetch<MembershipRoleUpdateOut>(`/memberships/${membershipId}/role`, {
      method: "PUT",
      body: { role },
    }),
  effectivePermissions: (membershipId: string) =>
    apiFetch<EffectivePermissions>(`/memberships/${membershipId}/permissions`),
  setOverride: (membershipId: string, body: PermissionOverrideBody) =>
    apiFetch<EffectivePermissions>(
      `/memberships/${membershipId}/permissions/override`,
      {
        method: "PUT",
        body,
      },
    ),
  clearOverride: (membershipId: string, permission: string) =>
    apiFetch<EffectivePermissions>(
      `/memberships/${membershipId}/permissions/override/${permission}`,
      { method: "DELETE" },
    ),
};

// --- organisation ---

export const organisationApi = {
  get: () => apiFetch<Organisation>("/organisation"),
  update: (body: OrganisationUpdateBody) =>
    apiFetch<Organisation>("/organisation", { method: "PUT", body }),
  signup: (body: OrganisationSignupBody) =>
    apiFetch<OrganisationSignupOut>("/organisation/signup", {
      method: "POST",
      body,
      auth: false,
    }),
};

// --- subscription / usage ---

export const subscriptionApi = {
  get: () => apiFetch<Subscription>("/subscription"),
  usage: () => apiFetch<UsageSummary>("/subscription/usage"),
  changePlan: (body: ChangePlanBody) =>
    apiFetch<Subscription>("/subscription/change-plan", {
      method: "POST",
      body,
    }),
  cancel: () =>
    apiFetch<Subscription>("/subscription/cancel", {
      method: "POST",
      body: {},
    }),
};

// --- quizzes ---

export const quizzesApi = {
  forCourse: (courseId: string) =>
    apiFetch<Quiz[]>(`/training-courses/${courseId}/quizzes`),
  create: (courseId: string, body: QuizCreateBody) =>
    apiFetch<Quiz>(`/training-courses/${courseId}/quizzes`, {
      method: "POST",
      body,
    }),
  questions: (quizId: string) =>
    apiFetch<QuizQuestion[]>(`/quizzes/${quizId}/questions`),
  addQuestion: (quizId: string, body: QuizQuestionCreateBody) =>
    apiFetch<QuizQuestion>(`/quizzes/${quizId}/questions`, {
      method: "POST",
      body,
    }),
  questionsForAttempt: (quizId: string) =>
    apiFetch<QuizQuestionForAttempt[]>(
      `/quizzes/${quizId}/questions/for-attempt`,
    ),
  submitAttempt: (quizId: string, body: QuizAttemptSubmitBody) =>
    apiFetch<QuizAttempt>(`/quizzes/${quizId}/attempts`, {
      method: "POST",
      body,
    }),
  attempts: (quizId: string) =>
    apiFetch<QuizAttempt[]>(`/quizzes/${quizId}/attempts`),
};

// --- training course attachments ---

export const trainingCourseAttachmentsApi = {
  forCourse: (courseId: string) =>
    apiFetch<TrainingCourseAttachment[]>(
      `/training-courses/${courseId}/attachments`,
    ),
  create: (courseId: string, body: TrainingCourseAttachmentCreateBody) =>
    apiFetch<TrainingCourseAttachment>(
      `/training-courses/${courseId}/attachments`,
      {
        method: "POST",
        body,
      },
    ),
};

// --- inventory ---

function withQuery(path: string, params: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== false) {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export const inventoryApi = {
  settings: () => apiFetch<InventorySettings>("/inventory/settings"),
  updateSettings: (body: InventorySettingsUpdateBody) =>
    apiFetch<InventorySettings>("/inventory/settings", { method: "PUT", body }),
  summary: () => apiFetch<InventorySummary>("/inventory/summary"),
  // Phase 3: inventory accounting.
  startAccounting: () =>
    apiFetch<InventorySettings>("/inventory/accounting/start", { method: "POST" }),
  reconciliation: () => apiFetch<InventoryReconciliation>("/inventory/reconciliation"),
  journals: (documentType: InventoryDocumentType, documentId: string) =>
    apiFetch<JournalEntry[]>(
      withQuery("/inventory/journals", { document_type: documentType, document_id: documentId }),
    ),

  categories: (includeInactive = false) =>
    apiFetch<InventoryCategory[]>(
      withQuery("/inventory/categories", { include_inactive: includeInactive }),
    ),
  createCategory: (body: { name: string; parent_id?: string | null; expense_account_code?: string | null }) =>
    apiFetch<InventoryCategory>("/inventory/categories", { method: "POST", body }),
  updateCategory: (id: string, body: InventoryCategoryBody) =>
    apiFetch<InventoryCategory>(`/inventory/categories/${id}`, { method: "PATCH", body }),

  units: (includeInactive = false) =>
    apiFetch<InventoryUnit[]>(withQuery("/inventory/units", { include_inactive: includeInactive })),
  createUnit: (body: InventoryUnitCreateBody) =>
    apiFetch<InventoryUnit>("/inventory/units", { method: "POST", body }),
  updateUnit: (id: string, body: InventoryUnitUpdateBody) =>
    apiFetch<InventoryUnit>(`/inventory/units/${id}`, { method: "PATCH", body }),

  items: (params?: {
    q?: string;
    categoryId?: string;
    itemType?: InventoryItemType | "";
    includeInactive?: boolean;
  }) =>
    apiFetch<InventoryItem[]>(
      withQuery("/inventory/items", {
        q: params?.q,
        category_id: params?.categoryId,
        item_type: params?.itemType,
        include_inactive: params?.includeInactive,
      }),
    ),
  item: (id: string) => apiFetch<InventoryItem>(`/inventory/items/${id}`),
  createItem: (body: InventoryItemBody) =>
    apiFetch<InventoryItem>("/inventory/items", { method: "POST", body }),
  updateItem: (id: string, body: InventoryItemBody) =>
    apiFetch<InventoryItem>(`/inventory/items/${id}`, { method: "PATCH", body }),
  replaceItemUnits: (id: string, units: { unit_id: string; factor_to_base: string }[]) =>
    apiFetch<InventoryItem>(`/inventory/items/${id}/units`, { method: "PUT", body: { units } }),

  warehouses: (includeInactive = false) =>
    apiFetch<InventoryWarehouse[]>(
      withQuery("/inventory/warehouses", { include_inactive: includeInactive }),
    ),
  createWarehouse: (body: InventoryWarehouseBody) =>
    apiFetch<InventoryWarehouse>("/inventory/warehouses", { method: "POST", body }),
  updateWarehouse: (id: string, body: InventoryWarehouseBody) =>
    apiFetch<InventoryWarehouse>(`/inventory/warehouses/${id}`, { method: "PATCH", body }),

  adjustments: (params?: { status?: InventoryAdjustmentStatus | ""; warehouseId?: string }) =>
    apiFetch<InventoryAdjustment[]>(
      withQuery("/inventory/adjustments", {
        status: params?.status,
        warehouse_id: params?.warehouseId,
      }),
    ),
  adjustment: (id: string) => apiFetch<InventoryAdjustment>(`/inventory/adjustments/${id}`),
  createAdjustment: (body: InventoryAdjustmentBody) =>
    apiFetch<InventoryAdjustment>("/inventory/adjustments", { method: "POST", body }),
  updateAdjustment: (id: string, body: InventoryAdjustmentBody) =>
    apiFetch<InventoryAdjustment>(`/inventory/adjustments/${id}`, { method: "PUT", body }),
  deleteAdjustment: (id: string) =>
    apiFetch<void>(`/inventory/adjustments/${id}`, { method: "DELETE" }),
  postAdjustment: (id: string) =>
    apiFetch<InventoryAdjustment>(`/inventory/adjustments/${id}/post`, { method: "POST" }),
  submitAdjustment: (id: string) =>
    apiFetch<InventoryAdjustment>(`/inventory/adjustments/${id}/submit`, { method: "POST" }),
  approveAdjustment: (id: string, comment?: string) =>
    apiFetch<InventoryAdjustment>(`/inventory/adjustments/${id}/approve`, {
      method: "POST",
      body: { comment: comment || null },
    }),
  rejectAdjustment: (id: string, comment?: string) =>
    apiFetch<InventoryAdjustment>(`/inventory/adjustments/${id}/reject`, {
      method: "POST",
      body: { comment: comment || null },
    }),
  reverseAdjustment: (id: string, reason: string) =>
    apiFetch<InventoryAdjustment>(`/inventory/adjustments/${id}/reverse`, {
      method: "POST",
      body: { reason },
    }),

  stock: (params?: {
    warehouseId?: string;
    itemId?: string;
    q?: string;
    includeZero?: boolean;
  }) =>
    apiFetch<InventoryStockRow[]>(
      withQuery("/inventory/stock", {
        warehouse_id: params?.warehouseId,
        item_id: params?.itemId,
        q: params?.q,
        include_zero: params?.includeZero,
      }),
    ),
  movements: (params?: {
    itemId?: string;
    warehouseId?: string;
    movementType?: string;
    sourceId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) =>
    apiFetch<InventoryMovementPage>(
      withQuery("/inventory/movements", {
        item_id: params?.itemId,
        warehouse_id: params?.warehouseId,
        movement_type: params?.movementType,
        source_id: params?.sourceId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        limit: params?.limit,
        offset: params?.offset,
      }),
    ),
};

// --- inventory operations (Phase 2) ---

// The approve/reject/reason actions every inventory document shares.
function documentActions<T>(base: string) {
  return {
    submit: (id: string) => apiFetch<T>(`${base}/${id}/submit`, { method: "POST" }),
    approve: (id: string, comment?: string) =>
      apiFetch<T>(`${base}/${id}/approve`, { method: "POST", body: { comment: comment || null } }),
    reject: (id: string, comment?: string) =>
      apiFetch<T>(`${base}/${id}/reject`, { method: "POST", body: { comment: comment || null } }),
    remove: (id: string) => apiFetch<void>(`${base}/${id}`, { method: "DELETE" }),
  };
}

export const purchaseOrdersApi = {
  ...documentActions<PurchaseOrder>("/inventory/purchase-orders"),
  list: (params?: { status?: PurchaseOrderStatus | ""; vendorId?: string }) =>
    apiFetch<PurchaseOrder[]>(
      withQuery("/inventory/purchase-orders", { status: params?.status, vendor_id: params?.vendorId }),
    ),
  get: (id: string) => apiFetch<PurchaseOrder>(`/inventory/purchase-orders/${id}`),
  create: (body: PurchaseOrderBody) =>
    apiFetch<PurchaseOrder>("/inventory/purchase-orders", { method: "POST", body }),
  update: (id: string, body: PurchaseOrderBody) =>
    apiFetch<PurchaseOrder>(`/inventory/purchase-orders/${id}`, { method: "PUT", body }),
  issue: (id: string) =>
    apiFetch<PurchaseOrder>(`/inventory/purchase-orders/${id}/issue`, { method: "POST" }),
  cancel: (id: string, reason: string) =>
    apiFetch<PurchaseOrder>(`/inventory/purchase-orders/${id}/cancel`, {
      method: "POST",
      body: { reason },
    }),
  close: (id: string, reason: string) =>
    apiFetch<PurchaseOrder>(`/inventory/purchase-orders/${id}/close`, {
      method: "POST",
      body: { reason },
    }),
};

export const goodsReceiptsApi = {
  list: (params?: {
    status?: GoodsReceiptStatus | "";
    purchaseOrderId?: string;
    vendorId?: string;
    unbilled?: boolean;
  }) =>
    apiFetch<GoodsReceipt[]>(
      withQuery("/inventory/goods-receipts", {
        status: params?.status,
        purchase_order_id: params?.purchaseOrderId,
        vendor_id: params?.vendorId,
        unbilled: params?.unbilled,
      }),
    ),
  get: (id: string) => apiFetch<GoodsReceipt>(`/inventory/goods-receipts/${id}`),
  create: (body: GoodsReceiptBody) =>
    apiFetch<GoodsReceipt>("/inventory/goods-receipts", { method: "POST", body }),
  update: (id: string, body: Omit<GoodsReceiptBody, "purchase_order_id">) =>
    apiFetch<GoodsReceipt>(`/inventory/goods-receipts/${id}`, { method: "PUT", body }),
  remove: (id: string) => apiFetch<void>(`/inventory/goods-receipts/${id}`, { method: "DELETE" }),
  post: (id: string) =>
    apiFetch<GoodsReceipt>(`/inventory/goods-receipts/${id}/post`, { method: "POST" }),
  reverse: (id: string, reason: string) =>
    apiFetch<GoodsReceipt>(`/inventory/goods-receipts/${id}/reverse`, {
      method: "POST",
      body: { reason },
    }),
};

export const stockIssuesApi = {
  ...documentActions<StockIssue>("/inventory/issues"),
  departments: () => apiFetch<IssueDepartment[]>("/inventory/issues/departments"),
  list: (params?: { status?: StockIssueStatus | ""; warehouseId?: string }) =>
    apiFetch<StockIssue[]>(
      withQuery("/inventory/issues", { status: params?.status, warehouse_id: params?.warehouseId }),
    ),
  get: (id: string) => apiFetch<StockIssue>(`/inventory/issues/${id}`),
  create: (body: StockIssueBody) =>
    apiFetch<StockIssue>("/inventory/issues", { method: "POST", body }),
  update: (id: string, body: StockIssueBody) =>
    apiFetch<StockIssue>(`/inventory/issues/${id}`, { method: "PUT", body }),
  cancel: (id: string) => apiFetch<StockIssue>(`/inventory/issues/${id}/cancel`, { method: "POST" }),
  post: (id: string) => apiFetch<StockIssue>(`/inventory/issues/${id}/post`, { method: "POST" }),
  reverse: (id: string, reason: string) =>
    apiFetch<StockIssue>(`/inventory/issues/${id}/reverse`, { method: "POST", body: { reason } }),
};

export const stockTransfersApi = {
  ...documentActions<StockTransfer>("/inventory/transfers"),
  list: (params?: { status?: StockTransferStatus | ""; warehouseId?: string }) =>
    apiFetch<StockTransfer[]>(
      withQuery("/inventory/transfers", { status: params?.status, warehouse_id: params?.warehouseId }),
    ),
  get: (id: string) => apiFetch<StockTransfer>(`/inventory/transfers/${id}`),
  create: (body: StockTransferBody) =>
    apiFetch<StockTransfer>("/inventory/transfers", { method: "POST", body }),
  update: (id: string, body: StockTransferBody) =>
    apiFetch<StockTransfer>(`/inventory/transfers/${id}`, { method: "PUT", body }),
  cancel: (id: string) =>
    apiFetch<StockTransfer>(`/inventory/transfers/${id}/cancel`, { method: "POST" }),
  dispatch: (id: string, dispatchDate?: string) =>
    apiFetch<StockTransfer>(`/inventory/transfers/${id}/dispatch`, {
      method: "POST",
      body: { dispatch_date: dispatchDate || null },
    }),
  receive: (id: string, body: TransferReceiveBody) =>
    apiFetch<StockTransfer>(`/inventory/transfers/${id}/receive`, { method: "POST", body }),
};

// --- inventory stock control (Phase 4) ---

export const inventoryLotsApi = {
  list: (params?: { itemId?: string; warehouseId?: string }) =>
    apiFetch<InventoryLotStock[]>(
      withQuery("/inventory/lots", { item_id: params?.itemId, warehouse_id: params?.warehouseId }),
    ),
};

export const stocktakesApi = {
  ...documentActions<Stocktake>("/inventory/stocktakes"),
  list: (params?: { status?: StocktakeStatus | ""; warehouseId?: string }) =>
    apiFetch<Stocktake[]>(
      withQuery("/inventory/stocktakes", { status: params?.status, warehouse_id: params?.warehouseId }),
    ),
  get: (id: string) => apiFetch<Stocktake>(`/inventory/stocktakes/${id}`),
  create: (body: StocktakeBody) =>
    apiFetch<Stocktake>("/inventory/stocktakes", { method: "POST", body }),
  update: (id: string, body: StocktakeBody) =>
    apiFetch<Stocktake>(`/inventory/stocktakes/${id}`, { method: "PUT", body }),
  start: (id: string) => apiFetch<Stocktake>(`/inventory/stocktakes/${id}/start`, { method: "POST" }),
  recordCounts: (id: string, counts: StocktakeCountInput[]) =>
    apiFetch<Stocktake>(`/inventory/stocktakes/${id}/counts`, { method: "PUT", body: { counts } }),
  addLine: (id: string, body: StocktakeLineAddBody) =>
    apiFetch<Stocktake>(`/inventory/stocktakes/${id}/lines`, { method: "POST", body }),
  removeLine: (id: string, lineId: string) =>
    apiFetch<Stocktake>(`/inventory/stocktakes/${id}/lines/${lineId}`, { method: "DELETE" }),
  post: (id: string) => apiFetch<Stocktake>(`/inventory/stocktakes/${id}/post`, { method: "POST" }),
  cancel: (id: string) =>
    apiFetch<Stocktake>(`/inventory/stocktakes/${id}/cancel`, { method: "POST" }),
  download: (id: string, number: string, format: InventoryReportFormat) =>
    downloadAuthenticatedFile(
      withQuery(`/inventory/stocktakes/${id}/export`, { format }),
      `stocktake-${number}.${format}`,
    ),
};

type ReportQuery = Record<string, string | number | boolean | null | undefined>;

export const inventoryReportsApi = {
  reorder: () => apiFetch<ReorderSuggestion[]>("/inventory/reorder-suggestions"),
  valuation: (params: { asOf?: string; byWarehouse?: boolean }) =>
    apiFetch<ValuationReport>(
      withQuery("/inventory/reports/valuation", { as_of: params.asOf, by_warehouse: params.byWarehouse }),
    ),
  movements: (params: { dateFrom: string; dateTo: string; warehouseId?: string }) =>
    apiFetch<MovementSummary>(
      withQuery("/inventory/reports/movements", {
        date_from: params.dateFrom,
        date_to: params.dateTo,
        warehouse_id: params.warehouseId,
      }),
    ),
  variances: (params: { dateFrom: string; dateTo: string; warehouseId?: string }) =>
    apiFetch<VarianceReport>(
      withQuery("/inventory/reports/variances", {
        date_from: params.dateFrom,
        date_to: params.dateTo,
        warehouse_id: params.warehouseId,
      }),
    ),
  expiry: (withinDays: number) =>
    apiFetch<ExpiryReport>(withQuery("/inventory/reports/expiry", { within_days: withinDays })),
  outstandingOrders: () => apiFetch<OutstandingOrders>("/inventory/reports/outstanding-orders"),
  // `path` is the report's own path under /inventory, e.g. "reports/valuation".
  download: (path: string, query: ReportQuery, format: InventoryReportFormat, filename: string) =>
    downloadAuthenticatedFile(withQuery(`/inventory/${path}`, { ...query, format }), `${filename}.${format}`),
};
