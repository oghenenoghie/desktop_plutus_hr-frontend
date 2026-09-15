"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  BookText,
  Boxes,
  Building2,
  Calculator,
  CalendarCheck,
  ChevronDown,
  Clock,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileSignature,
  FileSpreadsheet,
  FileWarning,
  Fingerprint,
  Gavel,
  GraduationCap,
  HandCoins,
  History,
  KeyRound,
  Landmark,
  Laptop,
  LayoutDashboard,
  Link2,
  MapPin,
  Network,
  Percent,
  PiggyBank,
  Receipt,
  ReceiptText,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  UserPlus,
  UserSquare2,
  Users,
  Users2,
  Workflow,
} from "lucide-react";

import {
  navGroupsForRole,
  ROLE_LABELS,
  type NavGroup,
  type NavItem,
  type NavSubgroup,
} from "@/lib/nav";
import type { Role } from "@/lib/types";

const ICONS: Record<NavItem["icon"], typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  employees: Users,
  orgChart: Network,
  departments: Building2,
  branches: MapPin,
  jobGrades: BarChart3,
  policies: BookText,
  shifts: Clock,
  shiftRoster: CalendarCheck,
  attendance: Fingerprint,
  overtime: Timer,
  recruitment: UserPlus,
  performance: Star,
  learning: GraduationCap,
  employeeRelations: Gavel,
  unionDues: Users2,
  assets: Laptop,
  integrations: Link2,
  approvalWorkflows: Workflow,
  auditLog: History,
  generalLedger: Landmark,
  bills: CreditCard,
  invoices: Receipt,
  financialStatements: FileBarChart,
  fixedAssets: Boxes,
  budgets: PiggyBank,
  bankReconciliation: ArrowLeftRight,
  payroll: Banknote,
  compliance: Scale,
  payeCalculator: Percent,
  leave: ClipboardList,
  expenses: ReceiptText,
  loans: HandCoins,
  benefits: ShieldCheck,
  contractors: UserSquare2,
  reports: FileWarning,
  settlement: FileWarning,
  simulation: Calculator,
  payrollReports: FileSpreadsheet,
  documentGeneration: FileSignature,
  permissions: KeyRound,
  subscription: Sparkles,
};

function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupHasActive(group: NavGroup, pathname: string): boolean {
  if (group.subgroups) {
    return group.subgroups.some((subgroup) =>
      subgroup.items.some((item) => isActiveHref(pathname, item.href)),
    );
  }
  return (group.items ?? []).some((item) => isActiveHref(pathname, item.href));
}

function subgroupHasActive(subgroup: NavSubgroup, pathname: string): boolean {
  return subgroup.items.some((item) => isActiveHref(pathname, item.href));
}

// Every heading collapsed except whichever one contains the current page —
// a role with several sections (admin, payroll_manager) would otherwise see
// every item in every section expanded on first load.
function initialCollapsed(groups: NavGroup[], pathname: string): Set<string> {
  const collapsed = new Set<string>();
  for (const group of groups) {
    if (!groupHasActive(group, pathname)) collapsed.add(group.heading);
    if (group.subgroups) {
      for (const subgroup of group.subgroups) {
        if (!subgroupHasActive(subgroup, pathname))
          collapsed.add(`${group.heading}/${subgroup.heading}`);
      }
    }
  }
  return collapsed;
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-panel px-3 py-2.5 text-[13px] font-bold transition-colors ${
        active
          ? "bg-primary text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon size={16} strokeWidth={2.25} />
      {item.label}
    </Link>
  );
}

function GroupHeading({
  label,
  collapsed,
  onToggle,
  indent,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-panel px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-white/50 hover:text-white/80 ${
        indent ? "pl-3" : ""
      }`}
    >
      {label}
      <ChevronDown
        size={14}
        strokeWidth={2.5}
        className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
      />
    </button>
  );
}

export function Sidebar({
  role,
  open,
  onClose,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const groups = navGroupsForRole(role);
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    initialCollapsed(groups, pathname),
  );

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col bg-primary-dark text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div>
            <div className="text-[15px] font-extrabold tracking-tight">
              Plutus
            </div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.03em] text-white/50">
              Ledger
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-panel border border-white/10 px-2.5 py-1 text-[13px] font-bold text-white/70 lg:hidden"
          >
            ✕
          </button>
        </div>

        <div className="mx-6 mb-4 rounded-panel border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-white/50">
            Viewing as
          </div>
          <div className="mt-0.5 text-[13px] font-bold">
            {ROLE_LABELS[role]}
          </div>
        </div>

        <nav className="sidebar-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-4 pb-6">
          {groups.map((group) => {
            const groupCollapsed = collapsed.has(group.heading);
            return (
              <div key={group.heading} className="mb-1">
                <GroupHeading
                  label={group.heading}
                  collapsed={groupCollapsed}
                  onToggle={() => toggle(group.heading)}
                />
                {!groupCollapsed ? (
                  <div className="space-y-0.5">
                    {group.subgroups
                      ? group.subgroups.map((subgroup) => {
                          const subKey = `${group.heading}/${subgroup.heading}`;
                          const subCollapsed = collapsed.has(subKey);
                          return (
                            <div key={subKey}>
                              <GroupHeading
                                label={subgroup.heading}
                                collapsed={subCollapsed}
                                onToggle={() => toggle(subKey)}
                                indent
                              />
                              {!subCollapsed ? (
                                <div className="space-y-0.5 pl-2">
                                  {subgroup.items.map((item) => (
                                    <NavLink
                                      key={item.href}
                                      item={item}
                                      active={isActiveHref(pathname, item.href)}
                                      onClick={onClose}
                                    />
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      : (group.items ?? []).map((item) => (
                          <NavLink
                            key={item.href}
                            item={item}
                            active={isActiveHref(pathname, item.href)}
                            onClick={onClose}
                          />
                        ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
