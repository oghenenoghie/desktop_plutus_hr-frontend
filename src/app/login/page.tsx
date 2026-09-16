"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { homeForRole } from "@/lib/auth/auth-gate";
import { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const { login, status, user } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [orgId, setOrgId] = useState("");
  const [showOrgField, setShowOrgField] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(homeForRole(user.role));
    }
  }, [status, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login({ identifier, password, totpCode, orgId });
      router.replace(homeForRole(me.role));
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[380px] rounded-lg border border-border bg-surface p-8">
        <div className="mb-1 text-[15px] font-extrabold tracking-tight text-ink">Plutus</div>
        <h1 className="mt-3 text-[17px] font-extrabold text-ink">Sign in to your workspace</h1>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          The compliance-native payroll platform for Nigeria and Africa.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="identifier">Email or Employee ID</Label>
            <Input
              id="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@company.com or ABCD2345"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <Label htmlFor="totp">MFA code (Super Admin / Payroll Manager / Accountant)</Label>
            <Input
              id="totp"
              inputMode="numeric"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="6-digit code"
            />
          </div>

          {showOrgField ? (
            <div>
              <Label htmlFor="org">Organisation ID</Label>
              <Input
                id="org"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="org-uuid"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowOrgField(true)}
              className="text-[11.5px] font-bold text-primary hover:underline"
            >
              Belong to multiple organisations?
            </button>
          )}

          {error ? (
            <div className="rounded-panel bg-bad-tint px-3 py-2.5 text-[12.5px] font-bold text-bad">
              {error}
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12px] text-ink-soft">
          New company?{" "}
          <Link href="/signup" className="font-bold text-primary hover:underline">
            Set up your workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
