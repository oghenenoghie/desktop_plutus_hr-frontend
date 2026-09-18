"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";
import { homeForRole } from "@/lib/auth/auth-gate";

export default function RootPage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && user) {
      router.replace(homeForRole(user.role));
    }
  }, [status, user, router]);

  return <div className="flex h-screen items-center justify-center bg-bg text-[13px] text-ink-soft">Loading…</div>;
}
