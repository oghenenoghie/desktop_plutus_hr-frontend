import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "employees"
    | "orgChart"
    | "departments"
    | "branches"
    | "jobGrades"
    | "policies"
    | "shifts"
    | "shiftRoster"
    | "attendance"
    | "overtime"
    | "compliance"
    | "payeCalculator"
    | "setup"
    | "notifications"
    | "myTeam"
    | "recruitment"
    | "performance"
    | "learning"
    | "employeeRelations"
    | "unionDues"
    | "assets"
    | "integrations"
    | "generalLedger"
    | "bills"
    | "invoices"
    | "financialStatements"
    | "fixedAssets"
    | "budgets"
    | "bankReconciliation"
    | "payroll"
    | "leave"
    | "expenses"
    | "loans"
    | "benefits"
    | "contractors"
    | "reports"
    | "settlement"
    | "simulation"
    | "approvalWorkflows"
    | "auditLog"
    | "payrollReports"
    | "documentGeneration"
    | "permissions"
    | "subscription";
  roles: Role[];
}

// A group is either a flat list of items, or split into subgroups when it's
// big enough that a flat list would be a wall of items (e.g. everything
// under Accounts). Never both on the same group.
export interface NavSubgroup {
  heading: string;
  items: NavItem[];
}

export interface NavGroup {
  heading: string;
  items?: NavItem[];
  subgroups?: NavSubgroup[];
}

// Roles allowed to view each item — mirrors the backend's require_roles()
// gates where they exist (dashboard is admin/payroll_manager only server-side),
// otherwise a sensible admin/payroll_manager/manager split for HR-facing screens.
//
// Grouped by domain rather than one flat list: everything accounting- and
// finance-related lives under "Accounts" (split into its own subgroups,
// since that's the biggest section), separate from HR/workforce and the
// admin-only "Company Info" items.
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        icon: "dashboard",
        roles: ["admin", "payroll_manager", "accountant", "hr_manager", "manager", "department_manager", "auditor"],
      },
      {
        href: "/notifications",
        label: "Notifications",
        icon: "notifications",
        roles: ["admin", "payroll_manager", "accountant", "hr_manager", "manager", "department_manager", "auditor"],
      },
      {
        href: "/my-team",
        label: "My Team",
        icon: "myTeam",
        roles: ["manager", "department_manager"],
      },
    ],
  },
  {
    heading: "HR",
    subgroups: [
      {
        heading: "Workforce",
        items: [
          {
            href: "/employees",
            label: "Employees",
            icon: "employees",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "department_manager", "auditor"],
          },
          {
            href: "/org-chart",
            label: "Org Chart",
            icon: "orgChart",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "department_manager", "auditor"],
          },
          {
            href: "/departments",
            label: "Departments",
            icon: "departments",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "auditor"],
          },
          {
            href: "/branches",
            label: "Branches",
            icon: "branches",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "auditor"],
          },
          {
            href: "/job-grades",
            label: "Job Grades",
            icon: "jobGrades",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "auditor"],
          },
          {
            href: "/recruitment",
            label: "Recruitment",
            icon: "recruitment",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "auditor"],
          },
          {
            href: "/employee-relations",
            label: "Employee Relations",
            icon: "employeeRelations",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "auditor"],
          },
        ],
      },
      {
        heading: "Requests & Time",
        items: [
          {
            href: "/leave",
            label: "Leave",
            icon: "leave",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "department_manager", "auditor"],
          },
          {
            href: "/expenses",
            label: "Expenses",
            icon: "expenses",
            roles: ["admin", "payroll_manager", "manager", "accountant", "auditor"],
          },
          {
            href: "/loans",
            label: "Loans & Advances",
            icon: "loans",
            roles: ["admin", "payroll_manager", "manager", "accountant", "auditor"],
          },
          {
            href: "/benefits",
            label: "Benefits",
            icon: "benefits",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "auditor"],
          },
          {
            href: "/attendance",
            label: "Attendance",
            icon: "attendance",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "department_manager", "auditor"],
          },
          {
            href: "/overtime",
            label: "Overtime",
            icon: "overtime",
            roles: ["admin", "payroll_manager", "manager", "accountant", "auditor"],
          },
          {
            href: "/shift-roster",
            label: "Shift Roster",
            icon: "shiftRoster",
            roles: ["admin", "payroll_manager", "manager", "accountant", "auditor"],
          },
          {
            href: "/shifts",
            label: "Shifts",
            icon: "shifts",
            roles: ["admin", "payroll_manager", "manager", "accountant", "auditor"],
          },
          {
            href: "/union-dues",
            label: "Union Dues",
            icon: "unionDues",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
        ],
      },
      {
        heading: "Company",
        items: [
          {
            href: "/policies",
            label: "Policies",
            icon: "policies",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "auditor"],
          },
          {
            href: "/assets",
            label: "Company Assets",
            icon: "assets",
            roles: ["admin", "payroll_manager", "manager", "accountant", "auditor"],
          },
          {
            href: "/learning",
            label: "Learning",
            icon: "learning",
            roles: ["admin", "payroll_manager", "manager", "accountant", "hr_manager", "auditor"],
          },
          {
            href: "/performance",
            label: "Performance",
            icon: "performance",
            roles: ["admin", "payroll_manager", "manager", "accountant", "auditor"],
          },
        ],
      },
    ],
  },
  {
    heading: "Accounts",
    subgroups: [
      {
        heading: "Payroll",
        items: [
          {
            href: "/payroll",
            label: "Payroll Runs",
            icon: "payroll",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/compliance",
            label: "Compliance Engine",
            icon: "compliance",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/calculator",
            label: "PAYE Calculator",
            icon: "payeCalculator",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/payroll-reports",
            label: "Payroll Reports",
            icon: "payrollReports",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/settlement",
            label: "Final Settlement",
            icon: "settlement",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/simulation",
            label: "Simulation",
            icon: "simulation",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/contractors",
            label: "Contractors",
            icon: "contractors",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
        ],
      },
      {
        heading: "Payables & Receivables",
        items: [
          {
            href: "/bills",
            label: "Bills",
            icon: "bills",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/invoices",
            label: "Invoices",
            icon: "invoices",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/reports",
            label: "Financial Reports",
            icon: "reports",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
        ],
      },
      {
        heading: "Accounting",
        items: [
          {
            href: "/general-ledger",
            label: "General Ledger",
            icon: "generalLedger",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/financial-statements",
            label: "Financial Statements",
            icon: "financialStatements",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/bank-reconciliation",
            label: "Bank Reconciliation",
            icon: "bankReconciliation",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
        ],
      },
      {
        heading: "Assets & Budgets",
        items: [
          {
            href: "/fixed-assets",
            label: "Fixed Assets",
            icon: "fixedAssets",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
          {
            href: "/budgets",
            label: "Budgets",
            icon: "budgets",
            roles: ["admin", "payroll_manager", "accountant", "auditor"],
          },
        ],
      },
    ],
  },
  {
    heading: "Company Info",
    items: [
      {
        href: "/setup",
        label: "Setup & Onboarding",
        icon: "setup",
        roles: ["admin"],
      },
      {
        href: "/integrations",
        label: "Integrations",
        icon: "integrations",
        roles: ["admin"],
      },
      {
        href: "/approval-workflows",
        label: "Approval Workflows",
        icon: "approvalWorkflows",
        roles: ["admin"],
      },
      {
        href: "/audit-log",
        label: "Audit Log",
        icon: "auditLog",
        roles: ["admin", "payroll_manager", "accountant", "auditor"],
      },
      {
        href: "/document-generation",
        label: "Documents",
        icon: "documentGeneration",
        roles: ["admin", "payroll_manager", "accountant", "hr_manager"],
      },
      {
        href: "/permissions",
        label: "Permissions",
        icon: "permissions",
        roles: ["admin"],
      },
      {
        href: "/subscription",
        label: "Subscription",
        icon: "subscription",
        roles: ["admin"],
      },
    ],
  },
];

function filterItems(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => item.roles.includes(role));
}

// Filters every group/subgroup down to what this role can see, dropping
// anything left empty rather than rendering a heading with nothing under it.
export function navGroupsForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => {
    if (group.subgroups) {
      const subgroups = group.subgroups
        .map((subgroup) => ({
          ...subgroup,
          items: filterItems(subgroup.items, role),
        }))
        .filter((subgroup) => subgroup.items.length > 0);
      return { heading: group.heading, subgroups };
    }
    return {
      heading: group.heading,
      items: filterItems(group.items ?? [], role),
    };
  }).filter((group) =>
    group.subgroups
      ? group.subgroups.length > 0
      : (group.items?.length ?? 0) > 0,
  );
}

// Flat list of every item a role can see, in the same order they appear in
// NAV_GROUPS — used wherever the grouping itself doesn't matter (e.g. route
// guards, "what can this role reach" checks).
export function navForRole(role: Role): NavItem[] {
  return navGroupsForRole(role).flatMap((group) =>
    group.subgroups
      ? group.subgroups.flatMap((subgroup) => subgroup.items)
      : (group.items ?? []),
  );
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Super Admin",
  payroll_manager: "Payroll Manager",
  accountant: "Accountant",
  hr_manager: "HR Manager",
  manager: "Manager",
  department_manager: "Department Manager",
  auditor: "Auditor",
  employee: "Employee",
};
