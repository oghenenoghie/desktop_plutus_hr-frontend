import Link from "next/link";
import { ArrowRight, Banknote, CalendarDays, Landmark, LayoutGrid, Megaphone, Receipt, UserPlus, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";

interface QuickLink {
  href: string;
  // The page in the role's menu this action belongs to: shown only when
  // the role can open that page (the page and API decide the rest).
  page: string;
  label: string;
  icon: LucideIcon;
}

const LINKS: QuickLink[] = [
  { href: "/employees/new", page: "/employees", label: "Add Employee", icon: UserPlus },
  { href: "/payroll/new", page: "/payroll", label: "Run Payroll", icon: Banknote },
  { href: "/invoices", page: "/invoices", label: "New Invoice", icon: Receipt },
  { href: "/general-ledger", page: "/general-ledger", label: "Journal Entry", icon: Landmark },
  { href: "/leave", page: "/leave", label: "Manage Leave", icon: CalendarDays },
  { href: "/feature-map", page: "/feature-map", label: "All Modules", icon: LayoutGrid },
];

export function QuickActions({
  pages,
  onAnnounce,
  onRunReminders,
}: {
  pages: Set<string>;
  onAnnounce: () => void;
  onRunReminders: () => Promise<void>;
}) {
  const links = LINKS.filter((link) => pages.has(link.page));
  return (
    <section aria-labelledby="quick-actions" className="rounded-card border border-border bg-surface p-5">
      <h2 id="quick-actions" className="mb-4 text-sm font-extrabold text-ink">
        Quick actions
      </h2>
      <div className="flex flex-wrap gap-2.5">
        {links.map((link, index) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex min-h-10 items-center gap-2 rounded-btn border px-4 text-[13px] font-bold ${
                index === 0
                  ? "border-primary bg-primary text-white hover:bg-primary-dark"
                  : "border-border bg-surface text-ink hover:border-primary/40 hover:bg-primary-tint/40"
              }`}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              {link.label}
              {index === 0 ? <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
            </Link>
          );
        })}
        <Button variant="secondary" onClick={onAnnounce}>
          <Megaphone size={16} strokeWidth={2} aria-hidden="true" />
          Send Announcement
        </Button>
        <ConfirmActionButton
          action={onRunReminders}
          label="Run Reminders"
          tone="primary"
          confirmTitle="Run the reminder job now?"
          confirmMessage="Notifies admins/payroll managers of upcoming statutory deadlines and stale approval requests. Intended to run on a schedule externally, but safe to trigger on demand."
          confirmLabel="Run"
        />
      </div>
    </section>
  );
}
