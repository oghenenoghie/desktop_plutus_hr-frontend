"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EmployeePicker } from "@/components/employee-picker";
import { EmployeePhotoField } from "@/components/employee-photo-field";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { branchesApi, complianceApi, employeesApi } from "@/lib/api/endpoints";
import { currencyLabel, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { RegionField, useIsNigeria, useRegionLabel } from "@/components/region-field";
import type { EmploymentType, PayFrequency } from "@/lib/types";

const EMPLOYMENT_TYPES: EmploymentType[] = ["permanent", "fixed_term", "part_time", "intern", "consultant"];
const PAY_FREQUENCIES: PayFrequency[] = ["monthly", "biweekly", "weekly"];
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Separated"];

// Pay is entered per pay period: what the employee earns each month (or
// fortnight, or week), the same figures each payslip is worked out from.
const PERIOD_WORD: Record<PayFrequency, string> = {
  monthly: "Monthly",
  biweekly: "Fortnightly",
  weekly: "Weekly",
};

function percentToPpm(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  return Math.round(Number(value) * 10_000);
}

interface FormState {
  employee_number: string;
  full_name: string;
  state_of_residence: string;
  state_of_origin: string;
  employment_type: EmploymentType;
  date_of_joining: string;
  contract_end_date: string;
  job_title: string;
  manager_id: string;
  branch_id: string;
  basic: string;
  housing: string;
  transport: string;
  other_earnings: string;
  annual_rent_paid: string;
  pension_employee_rate: string;
  pension_employer_rate: string;
  tax_half_shares: string;
  is_expatriate: "" | "yes" | "no";
  pay_frequency: PayFrequency;
  annual_leave_entitlement_days: string;
  tin: string;
  pfa_name: string;
  rsa_pin: string;
  nhf_number: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  marital_status: string;
  email: string;
  phone: string;
  residential_address: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
}

const INITIAL_STATE: FormState = {
  employee_number: "",
  full_name: "",
  state_of_residence: "",
  state_of_origin: "",
  employment_type: "permanent",
  date_of_joining: "",
  contract_end_date: "",
  job_title: "",
  manager_id: "",
  branch_id: "",
  basic: "",
  housing: "",
  transport: "",
  other_earnings: "",
  annual_rent_paid: "",
  pension_employee_rate: "",
  pension_employer_rate: "",
  tax_half_shares: "",
  is_expatriate: "",
  pay_frequency: "monthly",
  annual_leave_entitlement_days: "20",
  tin: "",
  pfa_name: "",
  rsa_pin: "",
  nhf_number: "",
  date_of_birth: "",
  gender: "",
  nationality: "",
  marital_status: "",
  email: "",
  phone: "",
  residential_address: "",
  next_of_kin_name: "",
  next_of_kin_phone: "",
};

export default function NewEmployeePage() {
  const isNigeria = useIsNigeria();
  const regionLabel = useRegionLabel();
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<{
    blob: Blob;
    consent: boolean;
    previewUrl: string;
  } | null>(null);
  const branches = useApiResource(() => branchesApi.list());
  // The statutory pension minimums, from the rule set in force, to show
  // against the optional richer-scheme rates.
  const rules = useApiResource(() => (isNigeria ? complianceApi.currentRules() : Promise.resolve(null)), [isNigeria]);
  const minEmployeePension = rules.data ? rules.data.pension.employee_rate_ppm / 10_000 : null;
  const minEmployerPension = rules.data ? rules.data.pension.employer_rate_ppm / 10_000 : null;
  const periodWord = PERIOD_WORD[form.pay_frequency];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const employee = await employeesApi.create({
        employee_number: form.employee_number,
        full_name: form.full_name,
        state_of_residence: form.state_of_residence,
        state_of_origin: form.state_of_origin || undefined,
        employment_type: form.employment_type,
        date_of_joining: form.date_of_joining,
        contract_end_date: form.contract_end_date || undefined,
        basic_minor: toMinorUnits(form.basic),
        housing_minor: toMinorUnits(form.housing),
        transport_minor: toMinorUnits(form.transport),
        other_earnings_minor: form.other_earnings ? toMinorUnits(form.other_earnings) : undefined,
        annual_rent_paid_minor: form.annual_rent_paid ? toMinorUnits(form.annual_rent_paid) : undefined,
        pension_employee_rate_ppm: isNigeria ? percentToPpm(form.pension_employee_rate) : undefined,
        pension_employer_rate_ppm: isNigeria ? percentToPpm(form.pension_employer_rate) : undefined,
        // Only some countries' rules need these, never Nigeria's; left unset
        // they stay unrecorded, and a rule that needs one refuses the run.
        tax_half_shares: !isNigeria && form.tax_half_shares !== "" ? Number(form.tax_half_shares) : undefined,
        is_expatriate: !isNigeria && form.is_expatriate ? form.is_expatriate === "yes" : undefined,
        pay_frequency: form.pay_frequency,
        annual_leave_entitlement_days: form.annual_leave_entitlement_days
          ? Number(form.annual_leave_entitlement_days)
          : undefined,
        job_title: form.job_title || undefined,
        manager_id: form.manager_id || undefined,
        branch_id: form.branch_id || undefined,
        tin: form.tin || undefined,
        pfa_name: form.pfa_name || undefined,
        rsa_pin: form.rsa_pin || undefined,
        nhf_number: form.nhf_number || undefined,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        nationality: form.nationality || undefined,
        marital_status: form.marital_status || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        residential_address: form.residential_address || undefined,
        next_of_kin_name: form.next_of_kin_name || undefined,
        next_of_kin_phone: form.next_of_kin_phone || undefined,
      });
      if (pendingPhoto) {
        try {
          await employeesApi.uploadPhoto(employee.id, pendingPhoto.blob, pendingPhoto.consent);
        } catch (photoErr) {
          showToast(
            photoErr instanceof ApiError
              ? String(photoErr.detail ?? photoErr.message)
              : "Employee created, but the photo upload failed — add it from the employee's page.",
            "bad",
          );
        }
      }
      router.push(`/employees?created=${employee.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not create employee.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Employee"
        subtitle={
          isNigeria
            ? "Every field here feeds TIN gating, PAYE, pension and NHF for this employee"
            : "The employee's record, ready for payroll once it's available in your country"
        }
      />

      <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader title="Identity & Employment" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Employee Number" required>
              <Input required value={form.employee_number} onChange={(e) => set("employee_number", e.target.value)} placeholder="EMP-005" />
            </Field>
            <Field label="Full Name" required>
              <Input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </Field>
            <Field label="Marital Status">
              <Select value={form.marital_status} onChange={(e) => set("marital_status", e.target.value)}>
                <option value="">Not recorded</option>
                {MARITAL_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Residential Address" full>
              <Input value={form.residential_address} onChange={(e) => set("residential_address", e.target.value)} />
            </Field>
            <Field label={`${regionLabel} of Residence`} required>
              <RegionField
                required
                value={form.state_of_residence}
                onChange={(value) => set("state_of_residence", value)}
                emptyLabel="Select a state"
              />
            </Field>
            <Field label={`${regionLabel} of Origin`}>
              <RegionField
                value={form.state_of_origin}
                onChange={(value) => set("state_of_origin", value)}
                emptyLabel="Select a state"
              />
            </Field>
            <Field label="Employment Type" required>
              <Select required value={form.employment_type} onChange={(e) => set("employment_type", e.target.value as EmploymentType)}>
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date of Joining" required>
              <Input required type="date" value={form.date_of_joining} onChange={(e) => set("date_of_joining", e.target.value)} />
            </Field>
            <Field label="Contract End Date">
              <Input type="date" value={form.contract_end_date} onChange={(e) => set("contract_end_date", e.target.value)} />
            </Field>
            <Field label="Job Title">
              <Input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
            </Field>
            <Field label="Manager">
              <EmployeePicker value={form.manager_id} onChange={(value) => set("manager_id", value)} />
            </Field>
            <Field label="Branch (Work Location)">
              <Select value={form.branch_id} onChange={(e) => set("branch_id", e.target.value)}>
                <option value="">No branch</option>
                {(branches.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
              {branches.data && branches.data.length === 0 ? (
                <p className="mt-1 text-[11px] text-ink-soft">
                  Work locations are your branches, and none have been added yet.{" "}
                  <Link href="/branches" className="font-bold text-primary hover:underline">
                    Add a branch
                  </Link>
                </p>
              ) : null}
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Pay Components"
            subtitle={`What the employee is paid each pay period, in ${currencyLabel()}. Each payslip is worked out from these. Pension is on basic + housing + transport.`}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pay Frequency">
              <Select value={form.pay_frequency} onChange={(e) => set("pay_frequency", e.target.value as PayFrequency)}>
                {PAY_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {PERIOD_WORD[freq]}
                  </option>
                ))}
              </Select>
            </Field>
            <div />
            <Field label={`${periodWord} Basic (${currencyLabel()})`} required>
              <Input required inputMode="decimal" value={form.basic} onChange={(e) => set("basic", e.target.value)} placeholder="300000" />
            </Field>
            <Field label={`${periodWord} Housing Allowance (${currencyLabel()})`} required>
              <Input required inputMode="decimal" value={form.housing} onChange={(e) => set("housing", e.target.value)} placeholder="150000" />
            </Field>
            <Field label={`${periodWord} Transport Allowance (${currencyLabel()})`} required>
              <Input required inputMode="decimal" value={form.transport} onChange={(e) => set("transport", e.target.value)} placeholder="50000" />
            </Field>
            <Field label={`Other ${periodWord} Earnings (${currencyLabel()})`}>
              <Input inputMode="decimal" value={form.other_earnings} onChange={(e) => set("other_earnings", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Annual Leave Entitlement (days)">
              <Input inputMode="numeric" value={form.annual_leave_entitlement_days} onChange={(e) => set("annual_leave_entitlement_days", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Statutory & Compliance"
            subtitle={
              isNigeria
                ? "TIN is a hard gate for payroll — a missing TIN will flag before any run"
                : "The employee's tax identification number"
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Annual Rent the Employee Pays (${currencyLabel()})`}>
              <Input
                inputMode="decimal"
                value={form.annual_rent_paid}
                onChange={(e) => set("annual_rent_paid", e.target.value)}
                placeholder="0"
              />
              <p className="mt-1 text-[11px] text-ink-soft">
                Their own rent, for the rent relief on income tax. Not an allowance, and never paid to them.
              </p>
            </Field>
            <Field label={isNigeria ? "TIN" : "Tax ID number"}>
              <Input
                value={form.tin}
                onChange={(e) => set("tin", e.target.value)}
                placeholder={isNigeria ? "12345678-0001" : undefined}
              />
            </Field>
            {isNigeria ? (
              <>
                <Field label="Employee Pension Rate (%)">
                  <Input
                    inputMode="decimal"
                    value={form.pension_employee_rate}
                    onChange={(e) => set("pension_employee_rate", e.target.value)}
                    placeholder={minEmployeePension !== null ? String(minEmployeePension) : ""}
                  />
                  <p className="mt-1 text-[11px] text-ink-soft">
                    {minEmployeePension !== null ? `${minEmployeePension}% is the statutory minimum. ` : ""}Leave blank to
                    use it.
                  </p>
                </Field>
                <Field label="Employer Pension Rate (%)">
                  <Input
                    inputMode="decimal"
                    value={form.pension_employer_rate}
                    onChange={(e) => set("pension_employer_rate", e.target.value)}
                    placeholder={minEmployerPension !== null ? String(minEmployerPension) : ""}
                  />
                  <p className="mt-1 text-[11px] text-ink-soft">
                    {minEmployerPension !== null ? `${minEmployerPension}% is the statutory minimum. ` : ""}Leave blank to
                    use it.
                  </p>
                </Field>
                <Field label="Pension PFA">
                  <Input value={form.pfa_name} onChange={(e) => set("pfa_name", e.target.value)} />
                </Field>
                <Field label="RSA PIN">
                  <Input value={form.rsa_pin} onChange={(e) => set("rsa_pin", e.target.value)} />
                </Field>
                <Field label="NHF Number">
                  <Input value={form.nhf_number} onChange={(e) => set("nhf_number", e.target.value)} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Family shares (in halves)">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={form.tax_half_shares}
                    onChange={(e) => set("tax_half_shares", e.target.value)}
                    placeholder="Where income tax depends on family; 1 share = 2"
                  />
                </Field>
                <Field label="Expatriate status">
                  <Select
                    value={form.is_expatriate}
                    onChange={(e) => set("is_expatriate", e.target.value as FormState["is_expatriate"])}
                  >
                    <option value="">Not recorded</option>
                    <option value="no">Local staff</option>
                    <option value="yes">Expatriate</option>
                  </Select>
                </Field>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Personal Details" subtitle="Optional" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Birth">
              <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            </Field>
            <Field label="Gender">
              <Input value={form.gender} onChange={(e) => set("gender", e.target.value)} />
            </Field>
            <Field label="Nationality">
              <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Photo" full>
              <EmployeePhotoField
                name={form.full_name}
                previewUrl={pendingPhoto?.previewUrl ?? null}
                onSelect={(blob, consent) =>
                  setPendingPhoto((prev) => {
                    if (prev) URL.revokeObjectURL(prev.previewUrl);
                    return { blob, consent, previewUrl: URL.createObjectURL(blob) };
                  })
                }
              />
            </Field>
            <Field label="Next of Kin Name">
              <Input value={form.next_of_kin_name} onChange={(e) => set("next_of_kin_name", e.target.value)} />
            </Field>
            <Field label="Next of Kin Phone">
              <Input value={form.next_of_kin_phone} onChange={(e) => set("next_of_kin_phone", e.target.value)} />
            </Field>
          </div>
        </Card>

        {error ? <ErrorState message={error} /> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/employees")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}
