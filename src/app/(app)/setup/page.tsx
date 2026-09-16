"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { organisationApi } from "@/lib/api/endpoints";
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
  const { showToast } = useToast();

  const [rcNumber, setRcNumber] = useState("");
  const [companyTin, setCompanyTin] = useState("");
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("monthly");
  const [pfa, setPfa] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Seeds local editable state from the server once per load — not a
    // derived-state loop, since the user then owns edits until Save reloads it.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (organisation.data) {
      setRcNumber(organisation.data.rc_number ?? "");
      setCompanyTin(organisation.data.company_tin ?? "");
      setPayFrequency(organisation.data.default_pay_frequency);
      setPfa(organisation.data.default_pfa ?? "");
      setStates(organisation.data.states_of_operation);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [organisation.data]);

  function toggleState(state: string) {
    setStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state],
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await organisationApi.update({
        rc_number: rcNumber,
        company_tin: companyTin,
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
              title="Statutory registration"
              subtitle="Used across payslips, statutory filings, and generated documents"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rc-number">RC number</Label>
                <Input
                  id="rc-number"
                  value={rcNumber}
                  onChange={(event) => setRcNumber(event.target.value)}
                  placeholder="RC1234567"
                />
              </div>
              <div>
                <Label htmlFor="company-tin">Company TIN</Label>
                <Input
                  id="company-tin"
                  value={companyTin}
                  onChange={(event) => setCompanyTin(event.target.value)}
                  placeholder="12345678-0001"
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
              <div>
                <Label htmlFor="default-pfa">Default PFA</Label>
                <Input
                  id="default-pfa"
                  value={pfa}
                  onChange={(event) => setPfa(event.target.value)}
                  placeholder="ARM Pension Managers"
                />
              </div>
            </div>
          </Card>

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
