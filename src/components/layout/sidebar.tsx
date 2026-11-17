"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  ArrowUpDown,
  BadgePercent,
  Banknote,
  BookLock,
  BarChart3,
  Bell,
  BookOpenCheck,
  BookText,
  Boxes,
  Building2,
  ExternalLink,
  Headset,
  Calculator,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  ChevronDown,
  Clock,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  CreditCard,
  Earth,
  FileDown,
  Gauge,
  UserSearch,
  UsersRound,
  Wallet,
  Award,
  CalendarRange,
  ChartColumn,
  ChartLine,
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
  LayoutDashboard,
  Link2,
  ListChecks,
  Lock,
  Map,
  MapPin,
  Network,
  Package,
  PackageCheck,
  PackageMinus,
  PackageSearch,
  Percent,
  PiggyBank,
  Repeat,
  Receipt,
  ReceiptText,
  ReceiptCent,
  Scale,
  Settings2,
  SlidersHorizontal,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Timer,
  Truck,
  UserCog,
  UserPlus,
  UserSquare2,
  Users,
  Users2,
  Warehouse,
  Workflow,
} from "lucide-react";

import {
  navGroupsForRole,
  ROLE_LABELS,
  type CountryAccess,
  type NavGroup,
  type NavItem,
  type NavSubgroup,
} from "@/lib/nav";
import type { Role } from "@/lib/types";

export const NAV_ICONS: Record<NavItem["icon"], typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  notifications: Bell,
  myTeam: UserCog,
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
  countryCompliance: Earth,
  taxSettings: BadgePercent,
  payeCalculator: Percent,
  setup: Settings2,
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
  featureMap: Map,
  tasks: ListChecks,
  calendar: CalendarDays,
  publicHolidays: CalendarOff,
  balanceSheet: BookOpenCheck,
  vatReport: ReceiptCent,
  security: Lock,
  inventory: Package,
  inventoryItems: PackageSearch,
  warehouses: Warehouse,
  stockOnHand: Boxes,
  stockMovements: ArrowUpDown,
  stockAdjustments: ClipboardPen,
  purchaseOrders: ShoppingCart,
  goodsReceipts: PackageCheck,
  stockIssues: PackageMinus,
  stockTransfers: Truck,
  inventorySettings: SlidersHorizontal,
  stocktakes: ClipboardCheck,
  reorder: Repeat,
  inventoryReports: FileBarChart,
  accountingSettings: BookLock,
  analyticsOverview: Gauge,
  analyticsWorkforce: UsersRound,
  analyticsPayroll: Wallet,
  analyticsAttendance: Timer,
  analyticsLeave: CalendarRange,
  analyticsRecruitment: UserSearch,
  analyticsPerformance: Award,
  analyticsCompliance: ChartColumn,
  analyticsFinancial: ChartLine,
  analyticsReports: FileDown,
};

function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The most specific nav href the path falls under, so /inventory/items
// highlights "Items" and not also the /inventory overview above it.
function activeHrefFor(groups: NavGroup[], pathname: string): string | null {
  let best: string | null = null;
  for (const group of groups) {
    const items = group.subgroups
      ? group.subgroups.flatMap((subgroup) => subgroup.items)
      : (group.items ?? []);
    for (const item of items) {
      if (isActiveHref(pathname, item.href) && (best === null || item.href.length > best.length)) {
        best = item.href;
      }
    }
  }
  return best;
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
  const Icon = NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-10 items-center gap-2.5 rounded-panel px-3 py-2.5 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-primary text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
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
      aria-expanded={!collapsed}
      className={`flex min-h-9 w-full items-center justify-between rounded-panel px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 transition-colors hover:bg-white/5 hover:text-white/90 ${
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
  access,
  orgName,
  open,
  onClose,
}: {
  role: Role;
  access: CountryAccess;
  orgName: string;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const groups = navGroupsForRole(role, access);
  const activeHref = activeHrefFor(groups, pathname);
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
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-flex size-9 items-center justify-center rounded-btn bg-white text-[18px] font-extrabold text-primary-dark"
            >
              P
            </span>
            <div>
              <div className="text-[17px] font-extrabold leading-tight tracking-tight">Plutus</div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-white/50">
                Technologies
              </div>
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

        <div className="mx-4 mb-4 flex items-center gap-3 rounded-panel border border-white/10 bg-white/[0.06] px-3 py-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-btn bg-white/10 text-white/85">
            <Building2 size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold" title={orgName}>
              {orgName}
            </div>
            <div className="text-[11px] font-semibold text-white/60">Viewing as {ROLE_LABELS[role]}</div>
          </div>
        </div>

        <nav id="primary-navigation" aria-label="Primary navigation" className="sidebar-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
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
                                      active={item.href === activeHref}
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
                            active={item.href === activeHref}
                            onClick={onClose}
                          />
                        ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <a
          href="https://www.plutusng.com/docs"
          target="_blank"
          rel="noreferrer"
          className="mx-4 mb-4 flex items-center gap-3 rounded-panel border border-white/10 bg-white/[0.06] px-3 py-3 text-white transition-colors hover:bg-white/10"
        >
          <Headset size={20} strokeWidth={2} aria-hidden="true" className="shrink-0 text-white/85" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold">Need help?</span>
            <span className="block text-[11px] text-white/60">Guides and support</span>
          </span>
          <ExternalLink size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-white/60" />
          <span className="sr-only">(opens the Plutus help site in a new window)</span>
        </a>
      </aside>
    </>
  );
}
