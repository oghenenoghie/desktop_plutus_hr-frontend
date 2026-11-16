"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { EngineOnly, NigeriaOnly, PayrollUnavailable } from "@/components/payroll-unavailable";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthGate } from "@/lib/auth/auth-gate";
import { lockedReason, type CountryAccess } from "@/lib/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate
      allow={[
        "admin",
        "payroll_manager",
        "accountant",
        "hr_manager",
        "manager",
        "department_manager",
        "auditor",
      ]}
    >
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!user) return null;
  // Only an explicit false locks payroll: an API from before /auth/me
  // reported it only ever served Nigeria, where payroll runs.
  const access: CountryAccess = {
    payrollAvailable: user.payroll_available !== false,
    isNigeria: (user.country_code ?? "NG") === "NG",
  };
  const locked = lockedReason(pathname, access);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-panel focus:bg-surface focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Skip to main content
      </a>
      <Sidebar
        role={user.role}
        access={access}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7 lg:px-8"
        >
          <div className="mx-auto w-full max-w-[1600px]">
            {locked === "payroll" ? (
              <PayrollUnavailable countryName={user.country_name} currency={user.currency} />
            ) : locked === "nigeria" ? (
              <NigeriaOnly countryName={user.country_name} />
            ) : locked === "engine" ? (
              <EngineOnly />
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
