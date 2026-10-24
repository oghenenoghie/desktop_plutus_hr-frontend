"use client";

import { useEffect, useState } from "react";

import { analyticsApi } from "@/lib/analytics/api";
import type { AnalyticsAccess, Section } from "@/lib/analytics/types";
import { getAccessToken } from "@/lib/auth/token-store";

// What the signed-in member may see in Analytics, fetched once per sign-in
// and shared by every component that asks (the section tabs, the page
// guard, the export buttons). The API enforces the same rules on every
// request; this only decides what to offer.
let cached: { token: string | null; promise: Promise<AnalyticsAccess> } | null = null;

function loadAccess(): Promise<AnalyticsAccess> {
  const token = getAccessToken();
  if (!cached || cached.token !== token) {
    const promise = analyticsApi.access();
    cached = { token, promise };
    promise.catch(() => {
      if (cached?.promise === promise) cached = null;
    });
  }
  return cached.promise;
}

export function useAnalyticsAccess(): {
  access: AnalyticsAccess | null;
  error: boolean;
  can: (section: Section) => boolean;
} {
  const [access, setAccess] = useState<AnalyticsAccess | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadAccess()
      .then((value) => {
        if (!cancelled) setAccess(value);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return {
    access,
    error,
    can: (section) => Boolean(access?.can_view && access.sections.find((s) => s.section === section)?.allowed),
  };
}
