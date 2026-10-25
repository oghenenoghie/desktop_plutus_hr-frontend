"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { PayrollUnavailable } from "@/components/payroll-unavailable";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthGate } from "@/lib/auth/auth-gate";
import { isPayrollOnlyPath } from "@/lib/nav";

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
  const payrollLocked = !user.payroll_available && isPayrollOnlyPath(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar
        role={user.role}
        payrollAvailable={user.payroll_available}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-8">
          {payrollLocked ? (
            <PayrollUnavailable countryName={user.country_name} currency={user.currency} />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
