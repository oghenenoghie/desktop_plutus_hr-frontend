"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { organisationApi } from "@/lib/api/endpoints";
import type { OrganisationSignupOut } from "@/lib/types";

export default function SignupPage() {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<OrganisationSignupOut | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await organisationApi.signup({
        org_name: orgName,
        admin_email: email,
        admin_password: password,
      });
      setCreated(result);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Unable to create your workspace.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-[420px] rounded-lg border border-border bg-surface p-8">
          <div className="mb-1 text-[15px] font-extrabold tracking-tight text-ink">Plutus</div>
          <h1 className="mt-3 text-[17px] font-extrabold text-ink">Your workspace is ready</h1>
          <p className="mt-2 text-[12.5px] text-ink-soft">
            Save these details now — the authenticator secret won&apos;t be shown again. Super Admin logins
            require an authenticator app on every sign-in.
          </p>

          <dl className="mt-5 grid grid-cols-[110px_1fr] gap-y-2.5 text-[13px]">
            <dt className="text-ink-soft">Email</dt>
            <dd className="font-mono font-bold">{created.email}</dd>
          </dl>

          <div className="mt-4 rounded-panel border border-border p-3">
            <p className="text-[12.5px] text-ink-soft">
              Add this secret to an authenticator app (Google Authenticator, Authy, 1Password, etc.) before you
              sign in:
            </p>
            <p className="mt-2 break-all rounded-panel bg-bg p-2.5 font-mono text-[12px] font-bold text-ink">
              {created.totp_secret}
            </p>
          </div>

          <Link href="/login">
            <Button size="lg" className="mt-6 w-full">
              Go to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[380px] rounded-lg border border-border bg-surface p-8">
        <div className="mb-1 text-[15px] font-extrabold tracking-tight text-ink">Plutus</div>
        <h1 className="mt-3 text-[17px] font-extrabold text-ink">Set up your workspace</h1>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          The compliance-native payroll platform for Nigeria and Africa.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="org-name">Company Name</Label>
            <Input
              id="org-name"
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Nigeria Ltd"
            />
          </div>

          <div>
            <Label htmlFor="email">Your Work Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          {error ? (
            <div className="rounded-panel bg-bad-tint px-3 py-2.5 text-[12.5px] font-bold text-bad">
              {error}
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Creating your workspace…" : "Create workspace"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12px] text-ink-soft">
          Already have a workspace?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
