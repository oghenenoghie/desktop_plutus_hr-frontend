"use client";

import { LogOut, Menu } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useAuth } from "@/lib/auth/auth-context";

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open main navigation"
            aria-controls="primary-navigation"
            className="inline-flex size-9 items-center justify-center rounded-panel border border-border text-ink-soft transition-colors hover:bg-bg hover:text-ink lg:hidden"
          >
            <Menu size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
        <div className="hidden min-w-0 sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
            Workspace
          </p>
          <p className="max-w-[280px] truncate text-sm font-semibold text-ink">
            {user?.org_name ?? "Plutus"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2 border-l border-border pl-3 sm:pl-4">
          <Avatar name={user?.role ?? "?"} size="md" />
          <span className="hidden max-w-32 truncate text-xs font-medium text-ink-soft xl:block">
            {user?.role?.replace(/_/g, " ") ?? "Account"}
          </span>
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
