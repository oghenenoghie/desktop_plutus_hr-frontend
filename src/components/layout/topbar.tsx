"use client";

import { LogOut, Menu } from "lucide-react";

import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS, type CountryAccess } from "@/lib/nav";

// `access` turns on the page and employee search (the main app); without it
// (employee self-service) the bar shows the company name instead.
export function TopBar({ access, onMenuClick }: { access?: CountryAccess; onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  // The name on the linked employee record, else the sign-in email, else the role.
  const roleLabel = user ? ROLE_LABELS[user.role] : "Account";
  const name = user?.display_name || user?.email || roleLabel;

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open main navigation"
            aria-controls="primary-navigation"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-panel border border-border text-ink-soft transition-colors hover:bg-bg hover:text-ink lg:hidden"
          >
            <Menu size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
        {user && access ? (
          <GlobalSearch role={user.role} access={access} />
        ) : (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Workspace</p>
            <p className="max-w-[280px] truncate text-sm font-semibold text-ink">{user?.org_name ?? "Plutus"}</p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2.5 border-l border-border pl-3 sm:pl-4">
          <Avatar name={user?.display_name || roleLabel} size="md" />
          <div className="hidden min-w-0 md:block">
            <p className="max-w-44 truncate text-[13px] font-bold leading-tight text-ink" title={name}>
              {name}
            </p>
            <p className="text-[11px] leading-tight text-ink-soft">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex size-9 items-center justify-center rounded-panel text-ink-soft transition-colors hover:bg-bad-tint hover:text-bad"
          >
            <LogOut size={17} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
