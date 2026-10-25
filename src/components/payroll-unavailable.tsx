import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";

// Shown in place of a payroll-only screen while the organisation's country
// has no approved statutory rules. The API refuses these calculations
// anyway; this says why, and what does work.
export function PayrollUnavailable({ countryName, currency }: { countryName: string; currency: string }) {
  return (
    <div>
      <PageHeader title="Payroll" subtitle={`Not available for ${countryName} yet`} />
      <Card>
        <CardHeader
          title={`Payroll isn't available for ${countryName} yet`}
          subtitle="Plutus only runs payroll on tax rules a local tax adviser has approved"
        />
        <div className="space-y-3 text-[13px] text-ink-soft">
          <p>
            {countryName}&apos;s income tax, social contributions and withholding rules are drafted
            and waiting for review. Until they&apos;re approved, Plutus won&apos;t calculate payslips,
            PAYE, statutory contributions or withholding tax for {countryName}, so it can&apos;t
            produce figures that might be wrong.
          </p>
          <p>
            Everything else works now, in {currency}: employees, leave, attendance, expenses,
            inventory, invoices, bills and the general ledger.
          </p>
          <p>
            <Link href="/compliance/countries" className="font-bold text-primary hover:underline">
              See each country&apos;s status
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
