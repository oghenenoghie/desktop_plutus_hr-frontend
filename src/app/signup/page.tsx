"use client";

import Link from "next/link";
import { useState } from "react";

import { countryOptionLabel } from "@/components/country-status";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { organisationApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { OrganisationSignupOut, SignupCountry } from "@/lib/types";

// The server sets up an organisation in Nigeria when no country is sent.
// Any listed country can be chosen; payroll waits for approved rules.
const DEFAULT_COUNTRY = "NG";

function countryHelp(country: SignupCountry | undefined): string {
  if (!country || country.payroll_available) {
    return "Sets the currency and the tax rules Plutus uses, from the moment your workspace is created.";
  }
  return `Your workspace will run in ${country.currency}. Payroll for ${country.name} switches on once a local tax adviser approves its tax rules; everything else works straight away.`;
}

export default function SignupPage() {
  const countries = useApiResource(() => organisationApi.countries());
  const [orgName, setOrgName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);
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
        org_address: orgAddress.trim() || undefined,
        admin_email: email,
        admin_password: password,
        // Sent only when the list loaded, so it came from the server's own
        // catalogue; otherwise the server's default applies.
        country_code: countries.data ? countryCode : undefined,
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
          <div className="mb-1 text-[15px] font-extrabold tracking-tight text-ink">Plutus Technologies</div>
          <h1 className="mt-3 text-[17px] font-extrabold text-ink">Your workspace is ready</h1>
          <p className="mt-2 text-[12.5px] text-ink-soft">
            You can sign in right away with your email and password. Multi-factor authentication is optional —
            turn it on anytime from Security &amp; Access once you&apos;re in.
          </p>

          <dl className="mt-5 grid grid-cols-[110px_1fr] gap-y-2.5 text-[13px]">
            <dt className="text-ink-soft">Email</dt>
            <dd className="font-mono font-bold">{created.email}</dd>
          </dl>

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
        <div className="mb-1 text-[15px] font-extrabold tracking-tight text-ink">Plutus Technologies</div>
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
            <Label htmlFor="org-address">Company Address</Label>
            <Input
              id="org-address"
              type="text"
              autoComplete="street-address"
              maxLength={500}
              value={orgAddress}
              onChange={(e) => setOrgAddress(e.target.value)}
              placeholder="12 Adeola Odeku Street, Victoria Island, Lagos"
            />
          </div>

          <div>
            <Label htmlFor="org-country">Country</Label>
            {countries.data ? (
              <Select
                id="org-country"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-describedby="org-country-help"
              >
                {countries.data.map((country) => (
                  <option key={country.code} value={country.code}>
                    {countryOptionLabel(country)}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="rounded-panel border border-border bg-bg px-[13px] py-[11px] text-[13px] text-ink-soft">
                {countries.loading ? "Loading countries…" : "Nigeria (NGN)"}
              </div>
            )}
            <p id="org-country-help" className="mt-1.5 text-[11.5px] text-ink-soft">
              {countries.error
                ? "We couldn't load the country list, so your workspace will be set up for Nigeria. You can change it in Setup before your first pay run."
                : countryHelp(countries.data?.find((country) => country.code === countryCode))}
            </p>
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
            <div className="rounded-panel bg-bad-tint px-3 py-2.5 text-[12.5px] font-bold text-bad-ink">
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
