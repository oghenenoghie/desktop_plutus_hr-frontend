"use client";

import Link from "next/link";

import { EmployeePicker } from "@/components/employee-picker";
import { RegionField, useIsNigeria, useRegionLabel } from "@/components/region-field";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { branchesApi, complianceApi } from "@/lib/api/endpoints";
import { currencyLabel, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Employee, EmployeeCreateBody, EmployeeUpdateBody, EmploymentType, PayFrequency } from "@/lib/types";

// The employee form, shared by New Employee and Edit Employee, so a record
// started with the minimum can be completed later with the same fields.

export const EMPLOYMENT_TYPES: EmploymentType[] = ["permanent", "fixed_term", "part_time", "intern", "consultant"];
export const PAY_FREQUENCIES: PayFrequency[] = ["monthly", "biweekly", "weekly"];
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Separated"];

// Pay is entered per pay period: what the employee earns each month (or
// fortnight, or week), the same figures each payslip is worked out from.
const PERIOD_WORD: Record<PayFrequency, string> = {
  monthly: "Monthly",
  biweekly: "Fortnightly",
  weekly: "Weekly",
};

export interface EmployeeFormState {
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

export const EMPTY_EMPLOYEE_FORM: EmployeeFormState = {
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

function majorUnits(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  return String(minor / 100);
}

function percentFromPpm(ppm: number | null | undefined): string {
  return ppm ? String(ppm / 10_000) : "";
}

function percentToPpm(value: string): number | null {
  if (value.trim() === "") return null;
  return Math.round(Number(value) * 10_000);
}

// The form as the employee is now, for editing.
export function formFromEmployee(employee: Employee): EmployeeFormState {
  return {
    employee_number: employee.employee_number,
    full_name: employee.full_name,
    state_of_residence: employee.state_of_residence,
    state_of_origin: employee.state_of_origin ?? "",
    employment_type: employee.employment_type,
    date_of_joining: employee.date_of_joining,
    contract_end_date: employee.contract_end_date ?? "",
    job_title: employee.job_title ?? "",
    manager_id: employee.manager_id ?? "",
    branch_id: employee.branch_id ?? "",
    basic: majorUnits(employee.basic_minor),
    housing: majorUnits(employee.housing_minor),
    transport: majorUnits(employee.transport_minor),
    other_earnings: majorUnits(employee.other_earnings_minor),
    annual_rent_paid: majorUnits(employee.annual_rent_paid_minor),
    pension_employee_rate: percentFromPpm(employee.pension_employee_rate_ppm),
    pension_employer_rate: percentFromPpm(employee.pension_employer_rate_ppm),
    tax_half_shares: employee.tax_half_shares?.toString() ?? "",
    is_expatriate: employee.is_expatriate == null ? "" : employee.is_expatriate ? "yes" : "no",
    pay_frequency: employee.pay_frequency,
    annual_leave_entitlement_days: String(employee.annual_leave_entitlement_days),
    tin: employee.tin ?? "",
    pfa_name: employee.pfa_name ?? "",
    rsa_pin: employee.rsa_pin ?? "",
    nhf_number: employee.nhf_number ?? "",
    date_of_birth: employee.date_of_birth ?? "",
    gender: employee.gender ?? "",
    nationality: employee.nationality ?? "",
    marital_status: employee.marital_status ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    residential_address: employee.residential_address ?? "",
    next_of_kin_name: employee.next_of_kin_name ?? "",
    next_of_kin_phone: employee.next_of_kin_phone ?? "",
  };
}

const optional = (value: string) => value.trim() || undefined;

// POST /employees from the form.
export function createBodyFromForm(form: EmployeeFormState, isNigeria: boolean): EmployeeCreateBody {
  return {
    employee_number: form.employee_number,
    full_name: form.full_name,
    state_of_residence: form.state_of_residence,
    state_of_origin: optional(form.state_of_origin),
    employment_type: form.employment_type,
    date_of_joining: form.date_of_joining,
    contract_end_date: optional(form.contract_end_date),
    basic_minor: toMinorUnits(form.basic),
    housing_minor: toMinorUnits(form.housing),
    transport_minor: toMinorUnits(form.transport),
    other_earnings_minor: form.other_earnings ? toMinorUnits(form.other_earnings) : undefined,
    annual_rent_paid_minor: form.annual_rent_paid ? toMinorUnits(form.annual_rent_paid) : undefined,
    pension_employee_rate_ppm: isNigeria ? (percentToPpm(form.pension_employee_rate) ?? undefined) : undefined,
    pension_employer_rate_ppm: isNigeria ? (percentToPpm(form.pension_employer_rate) ?? undefined) : undefined,
    // Only some countries' rules need these, never Nigeria's; left unset
    // they stay unrecorded, and a rule that needs one refuses the run.
    tax_half_shares: !isNigeria && form.tax_half_shares !== "" ? Number(form.tax_half_shares) : undefined,
    is_expatriate: !isNigeria && form.is_expatriate ? form.is_expatriate === "yes" : undefined,
    pay_frequency: form.pay_frequency,
    annual_leave_entitlement_days: form.annual_leave_entitlement_days
      ? Number(form.annual_leave_entitlement_days)
      : undefined,
    job_title: optional(form.job_title),
    manager_id: optional(form.manager_id),
    branch_id: optional(form.branch_id),
    tin: optional(form.tin),
    pfa_name: optional(form.pfa_name),
    rsa_pin: optional(form.rsa_pin),
    nhf_number: optional(form.nhf_number),
    date_of_birth: optional(form.date_of_birth),
    gender: optional(form.gender),
    nationality: optional(form.nationality),
    marital_status: optional(form.marital_status),
    email: optional(form.email),
    phone: optional(form.phone),
    residential_address: optional(form.residential_address),
    next_of_kin_name: optional(form.next_of_kin_name),
    next_of_kin_phone: optional(form.next_of_kin_phone),
  };
}

// PATCH /employees/{id}: only what changed. A cleared optional field is sent
// as null; pay is left out when the viewer can't see it (masked).
export function updateBodyFromForm(
  initial: EmployeeFormState,
  form: EmployeeFormState,
  { isNigeria, payVisible }: { isNigeria: boolean; payVisible: boolean },
): EmployeeUpdateBody {
  const body: EmployeeUpdateBody = {};
  const changed = (key: keyof EmployeeFormState) => initial[key] !== form[key];
  const text = (value: string) => value.trim() || null;

  if (changed("employee_number")) body.employee_number = form.employee_number.trim();
  if (changed("full_name")) body.full_name = form.full_name.trim();
  if (changed("employment_type")) body.employment_type = form.employment_type;
  if (changed("date_of_joining")) body.date_of_joining = form.date_of_joining;
  if (changed("state_of_residence")) body.state_of_residence = form.state_of_residence;
  if (changed("state_of_origin")) body.state_of_origin = text(form.state_of_origin);
  if (changed("contract_end_date")) body.contract_end_date = text(form.contract_end_date);
  if (changed("job_title")) body.job_title = text(form.job_title);
  if (changed("manager_id")) body.manager_id = text(form.manager_id);
  if (changed("branch_id")) body.branch_id = text(form.branch_id);
  if (changed("tin")) body.tin = text(form.tin);
  if (changed("date_of_birth")) body.date_of_birth = text(form.date_of_birth);
  if (changed("gender")) body.gender = text(form.gender);
  if (changed("nationality")) body.nationality = text(form.nationality);
  if (changed("marital_status")) body.marital_status = text(form.marital_status);
  if (changed("email")) body.email = text(form.email);
  if (changed("phone")) body.phone = text(form.phone);
  if (changed("residential_address")) body.residential_address = text(form.residential_address);
  if (changed("next_of_kin_name")) body.next_of_kin_name = text(form.next_of_kin_name);
  if (changed("next_of_kin_phone")) body.next_of_kin_phone = text(form.next_of_kin_phone);
  if (changed("annual_leave_entitlement_days") && form.annual_leave_entitlement_days.trim()) {
    body.annual_leave_entitlement_days = Number(form.annual_leave_entitlement_days);
  }
  if (changed("pay_frequency")) body.pay_frequency = form.pay_frequency;
  if (payVisible) {
    if (changed("basic")) body.basic_minor = toMinorUnits(form.basic);
    if (changed("housing")) body.housing_minor = toMinorUnits(form.housing);
    if (changed("transport")) body.transport_minor = toMinorUnits(form.transport);
    if (changed("other_earnings")) body.other_earnings_minor = toMinorUnits(form.other_earnings || "0");
    if (changed("annual_rent_paid")) body.annual_rent_paid_minor = toMinorUnits(form.annual_rent_paid || "0");
    if (isNigeria) {
      if (changed("pension_employee_rate")) body.pension_employee_rate_ppm = percentToPpm(form.pension_employee_rate);
      if (changed("pension_employer_rate")) body.pension_employer_rate_ppm = percentToPpm(form.pension_employer_rate);
    } else {
      if (changed("tax_half_shares")) {
        body.tax_half_shares = form.tax_half_shares === "" ? null : Number(form.tax_half_shares);
      }
      if (changed("is_expatriate")) body.is_expatriate = form.is_expatriate === "" ? null : form.is_expatriate === "yes";
    }
  }
  if (isNigeria) {
    if (changed("pfa_name")) body.pfa_name = text(form.pfa_name);
    if (changed("rsa_pin")) body.rsa_pin = text(form.rsa_pin);
    if (changed("nhf_number")) body.nhf_number = text(form.nhf_number);
  }
  return body;
}

// A label wrapping its control, so the two are tied together for screen
// readers (and for "find the field labelled ...").
// group: a heading over a composite control (a photo picker with its own
// buttons) that mustn't sit inside a <label>.
export function Field({
  label,
  required,
  full,
  hint,
  group,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  hint?: React.ReactNode;
  group?: boolean;
  children: React.ReactNode;
}) {
  const heading = (
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
      {label}
      {required ? " *" : ""}
    </span>
  );
  return (
    <div className={full ? "col-span-2" : undefined}>
      {group ? (
        <div role="group" aria-label={label}>
          {heading}
          {children}
        </div>
      ) : (
        <label className="block">
          {heading}
          {children}
        </label>
      )}
      {hint ? <div className="mt-1 text-[11px] text-ink-soft">{hint}</div> : null}
    </div>
  );
}

// Every field of the employee record, in four sections. payVisible false
// (pay masked from this viewer) shows the pay section without its figures.
export function EmployeeFormFields({
  form,
  set,
  payVisible = true,
  photo,
}: {
  form: EmployeeFormState;
  set: <K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) => void;
  payVisible?: boolean;
  photo?: React.ReactNode;
}) {
  const isNigeria = useIsNigeria();
  const regionLabel = useRegionLabel();
  const branches = useApiResource(() => branchesApi.list());
  // The statutory pension minimums, from the rule set in force, to show
  // against the optional richer-scheme rates.
  const rules = useApiResource(() => (isNigeria ? complianceApi.currentRules() : Promise.resolve(null)), [isNigeria]);
  const minEmployeePension = rules.data ? rules.data.pension.employee_rate_ppm / 10_000 : null;
  const minEmployerPension = rules.data ? rules.data.pension.employer_rate_ppm / 10_000 : null;
  const periodWord = PERIOD_WORD[form.pay_frequency];

  return (
    <>
      <Card>
        <CardHeader title="Identity & Employment" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee Number" required>
            <Input required value={form.employee_number} onChange={(e) => set("employee_number", e.target.value)} placeholder="EMP-005" />
          </Field>
          <Field label="Full Name" required>
            <Input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
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
          <Field
            label="Branch (Work Location)"
            hint={
              branches.data && branches.data.length === 0 ? (
                <>
                  Work locations are your branches, and none have been added yet.{" "}
                  <Link href="/branches" className="font-bold text-primary hover:underline">
                    Add a branch
                  </Link>
                </>
              ) : null
            }
          >
            <Select value={form.branch_id} onChange={(e) => set("branch_id", e.target.value)}>
              <option value="">No branch</option>
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Pay Components"
          subtitle={
            payVisible
              ? `What the employee is paid each pay period, in ${currencyLabel()}. Each payslip is worked out from these. Pension is on basic + housing + transport.`
              : "This employee's pay is hidden from you, so it can't be changed here."
          }
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
          <Field label="Annual Leave Entitlement (days)">
            <Input
              inputMode="numeric"
              value={form.annual_leave_entitlement_days}
              onChange={(e) => set("annual_leave_entitlement_days", e.target.value)}
            />
          </Field>
          {payVisible ? (
            <>
              <Field label={`${periodWord} Basic (${currencyLabel()})`} required>
                <Input required inputMode="decimal" value={form.basic} onChange={(e) => set("basic", e.target.value)} placeholder="300000" />
              </Field>
              <Field label={`${periodWord} Housing Allowance (${currencyLabel()})`} required>
                <Input required inputMode="decimal" value={form.housing} onChange={(e) => set("housing", e.target.value)} placeholder="150000" />
              </Field>
              <Field label={`${periodWord} Transport Allowance (${currencyLabel()})`} required>
                <Input
                  required
                  inputMode="decimal"
                  value={form.transport}
                  onChange={(e) => set("transport", e.target.value)}
                  placeholder="50000"
                />
              </Field>
              <Field label={`Other ${periodWord} Earnings (${currencyLabel()})`}>
                <Input
                  inputMode="decimal"
                  value={form.other_earnings}
                  onChange={(e) => set("other_earnings", e.target.value)}
                  placeholder="0"
                />
              </Field>
            </>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Statutory & Compliance"
          subtitle={
            isNigeria
              ? "TIN is a hard gate for payroll: a pay run can't be validated or posted for an employee without one"
              : "The employee's tax identification number"
          }
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={isNigeria ? "TIN" : "Tax ID number"}
            hint={isNigeria ? "Needed before this employee can be paid." : undefined}
          >
            <Input value={form.tin} onChange={(e) => set("tin", e.target.value)} placeholder={isNigeria ? "12345678-0001" : undefined} />
          </Field>
          {payVisible ? (
            <Field
              label={`Annual Rent the Employee Pays (${currencyLabel()})`}
              hint="Their own rent, for the rent relief on income tax. Not an allowance, and never paid to them."
            >
              <Input
                inputMode="decimal"
                value={form.annual_rent_paid}
                onChange={(e) => set("annual_rent_paid", e.target.value)}
                placeholder="0"
              />
            </Field>
          ) : (
            <div />
          )}
          {isNigeria ? (
            <>
              {payVisible ? (
                <>
                  <Field
                    label="Employee Pension Rate (%)"
                    hint={`${minEmployeePension !== null ? `${minEmployeePension}% is the statutory minimum. ` : ""}Leave blank to use it.`}
                  >
                    <Input
                      inputMode="decimal"
                      value={form.pension_employee_rate}
                      onChange={(e) => set("pension_employee_rate", e.target.value)}
                      placeholder={minEmployeePension !== null ? String(minEmployeePension) : ""}
                    />
                  </Field>
                  <Field
                    label="Employer Pension Rate (%)"
                    hint={`${minEmployerPension !== null ? `${minEmployerPension}% is the statutory minimum. ` : ""}Leave blank to use it.`}
                  >
                    <Input
                      inputMode="decimal"
                      value={form.pension_employer_rate}
                      onChange={(e) => set("pension_employer_rate", e.target.value)}
                      placeholder={minEmployerPension !== null ? String(minEmployerPension) : ""}
                    />
                  </Field>
                </>
              ) : null}
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
          ) : payVisible ? (
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
                  onChange={(e) => set("is_expatriate", e.target.value as EmployeeFormState["is_expatriate"])}
                >
                  <option value="">Not recorded</option>
                  <option value="no">Local staff</option>
                  <option value="yes">Expatriate</option>
                </Select>
              </Field>
            </>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Personal & Contact Details" subtitle="Optional, and can be completed later" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" hint="Payslips are emailed here.">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Residential Address" full>
            <Input value={form.residential_address} onChange={(e) => set("residential_address", e.target.value)} />
          </Field>
          <Field label="Date of Birth">
            <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
          </Field>
          <Field label="Gender">
            <Input value={form.gender} onChange={(e) => set("gender", e.target.value)} />
          </Field>
          <Field label="Nationality">
            <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
          </Field>
          <Field label="Marital Status">
            <Select value={form.marital_status} onChange={(e) => set("marital_status", e.target.value)}>
              <option value="">Not recorded</option>
              {MARITAL_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
              {form.marital_status && !MARITAL_STATUSES.includes(form.marital_status) ? (
                <option value={form.marital_status}>{form.marital_status}</option>
              ) : null}
            </Select>
          </Field>
          <Field label="Next of Kin Name">
            <Input value={form.next_of_kin_name} onChange={(e) => set("next_of_kin_name", e.target.value)} />
          </Field>
          <Field label="Next of Kin Phone">
            <Input value={form.next_of_kin_phone} onChange={(e) => set("next_of_kin_phone", e.target.value)} />
          </Field>
          {photo ? <div className="col-span-2">{photo}</div> : null}
        </div>
      </Card>
    </>
  );
}
