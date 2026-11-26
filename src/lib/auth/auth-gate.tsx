"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";
import type { Role } from "@/lib/types";

// Redirects unauthenticated visitors to /login, and — when `allow` is given —
// bumps a signed-in user with the wrong role to their home surface instead of
// rendering a shell they have no nav access to. Employees have explicit access
// to their workspace and personal expense claims only.
export function AuthGate({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: Role[];
}) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const employeeRouteAllowed =
    user?.role === "employee" && (pathname === "/me" || pathname === "/expenses");
  const allowed = !allow || (!!user && (allow.includes(user.role) || employeeRouteAllowed));

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && user && !allowed) {
      router.replace(homeForRole(user.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user, pathname, allowed]);

  if (status !== "authenticated" || !allowed) {
    return <div className="flex h-screen items-center justify-center bg-bg text-[13px] text-ink-soft">Loading…</div>;
  }

  return <>{children}</>;
}

export function homeForRole(role: Role): string {
  return role === "employee" ? "/me" : "/dashboard";
}
