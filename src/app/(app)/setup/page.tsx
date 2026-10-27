"use client";

import { useEffect, useState } from "react";

import { CountryStatusBadge, countryOptionLabel } from "@/components/country-status";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { complianceApi, organisationApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { useApiResource } from "@/lib/hooks";
import { NIGERIA_STATES } from "@/lib/nigeria-states";
import type { PayFrequency } from "@/lib/types";

const PAY_FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
];

export default function SetupPage() {
  const organisation = useApiResource(() => organisationApi.get());
  const countries = useApiResource(() => complianceApi.countries());
  const { showToast } = useToast();
  const { refreshUser } = useAuth();

  const [rcNumber, setRcNumber] = useState("");
  const [companyTin, setCompanyTin] = useState("");
  const [address, setAddress] = useState("");
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("monthly");
  const [pfa, setPfa] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [countryCode, setCountryCode] = useState("");

  useEffect(() => {
    // Seeds local editable state from the server once per load — not a
    // derived-state loop, since the user then owns edits until Save reloads it.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (organisation.data) {
      setRcNumber(organisation.data.rc_number ?? "");
      setCompanyTin(organisation.data.company_tin ?? "");
      setAddress(organisation.data.address ?? "");
      setPayFrequency(organisation.data.default_pay_frequency);
      setPfa(organisation.data.default_pfa ?? "");
      setStates(organisation.data.states_of_operation);
      setCountryCode(organisation.data.country_code);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [organisation.data]);

  function toggleState(state: string) {
    setStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state],
    );
  }

  const isNigeria = organisation.data?.country_code === "NG";
  const chosenCountry = countries.data?.find((country) => country.code === countryCode);
  const currentCountry = countries.data?.find(
    (country) => country.code === organisation.data?.country_code,
  );

  // Separate from Save setup: the server refuses any change once a pay run
  // or posted journal exists (409) and says so. The session is reloaded, so
  // every screen switches to the new currency and payroll availability.
  async function changeCountry() {
    try {
      await organisationApi.update({ country_code: countryCode });
      showToast(
        `The organisation now runs in ${chosenCountry?.name ?? countryCode} (${chosenCountry?.currency ?? ""}).`,
        "good",
      );
      organisation.reload();
      await refreshUser();
    } catch (err) {
      showToast(
        err instanceof ApiError ? String(err.detail ?? err.message) : "The country couldn't be changed.",
        "bad",
      );
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await organisationApi.update({
        rc_number: rcNumber,
        company_tin: companyTin,
        address,
        default_pay_frequency: payFrequency,
        default_pfa: pfa,
        states_of_operation: states,
      });
      showToast("Company setup saved.", "good");
      organisation.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Save failed.", "bad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Setup & Onboarding"
        subtitle="Company and statutory registration, and the defaults new-hire forms start from"
      />

      {organisation.loading ? <LoadingState /> : null}
      {organisation.error ? <ErrorState message={organisation.error} /> : null}

      {organisation.data ? (
        <form onSubmit={save} className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title="Country"
              subtitle="Decides which statutory rules and currency Plutus uses for this organisation"
            />
            <dl className="mb-4 grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
              <dt className="text-ink-soft">Country</dt>
              <dd className="flex flex-wrap items-center gap-2 font-bold">
                {organisation.data.country_name} ({organisation.data.country_code})
                {currentCountry ? <CountryStatusBadge status={currentCountry.status} /> : null}
              </dd>
              <dt className="text-ink-soft">Currency</dt>
              <dd className="font-bold">{organisation.data.currency}</dd>
              <dt className="text-ink-soft">Payroll</dt>
              <dd className="font-bold">
                {currentCountry
                  ? currentCountry.payroll_available
                    ? "Available"
                    : "Not available yet: the tax rules aren't approved"
                  : "—"}
              </dd>
            </dl>
            {countries.error ? <ErrorState message={countries.error} /> : null}
            {countries.data ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="org-country">Change to</Label>
                  <Select
                    id="org-country"
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value)}
                    aria-describedby="org-country-help"
                  >
                    {countries.data.map((country) => (
                      <option key={country.code} value={country.code}>
                        {countryOptionLabel(country)}
                      </option>
                    ))}
                  </Select>
                </div>
                <ConfirmActionButton
                  action={changeCountry}
                  label="Change country"
                  pendingLabel="Changing…"
                  tone="primary"
                  confirmTitle="Change the organisation's country?"
                  confirmMessage={
                    chosenCountry?.payroll_available === false
                      ? `This organisation will run in ${chosenCountry.name}, in ${chosenCountry.currency}. Payroll won't be available until ${chosenCountry.name}'s tax rules are approved.`
                      : `Plutus will use ${chosenCountry?.name ?? countryCode}'s tax rules and ${chosenCountry?.currency ?? ""} for this organisation.`
                  }
                  confirmLabel="Change country"
                  disabled={!chosenCountry || countryCode === organisation.data.country_code}
                />
              </div>
            ) : null}
            <p id="org-country-help" className="mt-3 text-[12px] text-ink-soft">
              The country can change only before the first pay run or posted journal. Payroll runs
              only on approved tax rules; outside Nigeria, an admin also enters the figures the
              rules leave to each organisation under Tax Settings.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="Statutory registration"
              subtitle="Used across payslips, statutory filings, and generated documents"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rc-number">{isNigeria ? "RC number" : "Company registration number"}</Label>
                <Input
                  id="rc-number"
                  value={rcNumber}
                  onChange={(event) => setRcNumber(event.target.value)}
                  placeholder={isNigeria ? "RC1234567" : undefined}
                />
              </div>
              <div>
                <Label htmlFor="company-tin">{isNigeria ? "Company TIN" : "Company tax ID number"}</Label>
                <Input
                  id="company-tin"
                  value={companyTin}
                  onChange={(event) => setCompanyTin(event.target.value)}
                  placeholder={isNigeria ? "12345678-0001" : undefined}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="company-address">Company address</Label>
                <Input
                  id="company-address"
                  maxLength={500}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder={isNigeria ? "12 Adeola Odeku Street, Victoria Island, Lagos" : undefined}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Onboarding defaults"
              subtitle="A starting point new-hire forms are pre-filled with — never applied retroactively to existing employees"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="default-pay-frequency">Default pay frequency</Label>
                <Select
                  id="default-pay-frequency"
                  value={payFrequency}
                  onChange={(event) => setPayFrequency(event.target.value as PayFrequency)}
                >
                  {PAY_FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </Select>
              </div>
              {isNigeria ? (
                <div>
                  <Label htmlFor="default-pfa">Default PFA</Label>
                  <Input
                    id="default-pfa"
                    value={pfa}
                    onChange={(event) => setPfa(event.target.value)}
                    placeholder="ARM Pension Managers"
                  />
                </div>
              ) : null}
            </div>
          </Card>

          {isNigeria ? (
            <Card>
              <CardHeader
                title="States of operation"
                subtitle="Nigerian states this organisation employs staff in"
              />
              <div className="flex flex-wrap gap-2">
                {NIGERIA_STATES.map((state) => {
                  const selected = states.includes(state);
                  return (
                    <button
                      key={state}
                      type="button"
                      onClick={() => toggleState(state)}
                      className={`rounded-badge border px-3 py-[5px] text-[11px] font-bold uppercase tracking-[0.03em] transition-colors ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-bg text-ink-soft hover:text-ink"
                      }`}
                    >
                      {state}
                    </button>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save setup"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
