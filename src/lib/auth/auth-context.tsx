"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { clearTokens, getAccessToken, setTokens } from "@/lib/auth/token-store";
import { setDisplayCurrency } from "@/lib/format";
import type { MeResponse } from "@/lib/types";

interface LoginParams {
  identifier: string;
  password: string;
  orgId?: string;
  totpCode?: string;
}

interface AuthContextValue {
  user: MeResponse | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (params: LoginParams) => Promise<MeResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const router = useRouter();

  const loadUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const me = await authApi.me();
      // Before the screens render, so every amount is in the
      // organisation's currency.
      setDisplayCurrency(me.currency);
      setUser(me);
      setStatus("authenticated");
    } catch {
      clearTokens();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    // Hydrating the session on mount can resolve synchronously (no stored
    // token) as well as asynchronously (verifying an existing one) — both
    // paths are intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async ({ identifier, password, orgId, totpCode }: LoginParams) => {
      const tokens = await authApi.login({
        identifier,
        password,
        org_id: orgId || undefined,
        totp_code: totpCode || undefined,
      });
      setTokens(tokens.access_token, tokens.refresh_token);
      const me = await authApi.me();
      setDisplayCurrency(me.currency);
      setUser(me);
      setStatus("authenticated");
      return me;
    },
    [],
  );

  const logout = useCallback(() => {
    clearTokens();
    setDisplayCurrency("NGN");
    setUser(null);
    setStatus("unauthenticated");
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, status, login, logout, refreshUser: loadUser }),
    [user, status, login, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function isAuthError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
