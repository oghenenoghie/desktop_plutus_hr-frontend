"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { complianceApi } from "@/lib/api/endpoints";
import { formatNaira, nairaToMinor } from "@/lib/format";
import type { PayeEstimateOut } from "@/lib/types";

export default function PayeCalculatorPage() {
  const [annualGross, setAnnualGross] = useState("6,000,000");
  const [annualRent, setAnnualRent] = useState("1,200,000");
  const [result, setResult] = useState<PayeEstimateOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const out = await complianceApi.payeEstimate({
        annual_gross_minor: nairaToMinor(annualGross),
        annual_rent_minor: nairaToMinor(annualRent),
      });
      setResult(out);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Calculation failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="PAYE Calculator"
        subtitle="Every figure shown step by step, the way the engine derives it"
      />

      <Card className="mb-6">
        <form onSubmit={calculate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="annual-gross">Annual gross pay</Label>
            <Input
              id="annual-gross"
              value={annualGross}
              onChange={(event) => setAnnualGross(event.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="annual-rent">Annual rent paid</Label>
            <Input
              id="annual-rent"
              value={annualRent}
              onChange={(event) => setAnnualRent(event.target.value)}
              inputMode="decimal"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Calculating…" : "Calculate"}
          </Button>
        </form>
        <p className="mt-4 text-[11px] text-ink-soft">
          Illustrative only — this assumes a 50 / 30 / 20 basic / housing / transport split of
          the annual gross entered above. A real payslip never assumes this: it reads each
          employee&apos;s actual stored pay components. Every rate below is read live from the
          same versioned rules engine every real payslip uses.
        </p>
      </Card>

      {error ? <ErrorState message={error} /> : null}

      {result ? (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title="1 · Assumed component split"
              subtitle={`Rule version ${result.rule_version_id}`}
            />
            <DerivationRow label="Basic (50%)" value={formatNaira(result.basic_minor)} />
            <DerivationRow label="Housing (30%)" value={formatNaira(result.housing_minor)} />
            <DerivationRow label="Transport (20%)" value={formatNaira(result.transport_minor)} />
            <DerivationRow label="Annual gross" value={formatNaira(result.gross_annual_minor)} bold />
          </Card>

          <Card>
            <CardHeader title="2 · Statutory deductions" />
            <DerivationRow
              label="Pension (employee share)"
              value={`− ${formatNaira(result.pension_employee_annual_minor)}`}
            />
            <DerivationRow
              label="NHF"
              value={`− ${formatNaira(result.nhf_annual_minor)}`}
            />
            <DerivationRow
              label="Rent relief"
              value={`− ${formatNaira(result.rent_relief_annual_minor)}`}
            />
          </Card>

          <Card>
            <CardHeader title="3 · Chargeable income" />
            <DerivationRow
              label="Annual chargeable income"
              value={formatNaira(result.chargeable_income_annual_minor)}
              bold
            />
          </Card>

          <Card>
            <CardHeader title="4 · PAYE" />
            <DerivationRow label="Annual PAYE" value={formatNaira(result.paye_annual_minor)} bold />
            <DerivationRow label="Monthly PAYE" value={formatNaira(result.paye_monthly_minor)} />
            <div className="my-3 border-t border-border" />
            <DerivationRow label="Annual net pay" value={formatNaira(result.net_annual_minor)} bold />
            <DerivationRow label="Monthly net pay" value={formatNaira(result.net_monthly_minor)} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function DerivationRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-b-0">
      <span className={`text-[13px] ${bold ? "font-bold text-ink" : "text-ink-soft"}`}>{label}</span>
      <span className={`text-[13px] ${bold ? "font-extrabold text-ink" : "font-bold text-ink"}`}>
        {value}
      </span>
    </div>
  );
}
