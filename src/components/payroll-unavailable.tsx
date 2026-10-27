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
          subtitle="Plutus only runs payroll on approved tax rules"
        />
        <div className="space-y-3 text-[13px] text-ink-soft">
          <p>
            {countryName}&apos;s income tax, social contributions and withholding rules aren&apos;t
            approved yet. Until they are, Plutus won&apos;t calculate payslips, income tax,
            statutory contributions or withholding tax for {countryName}, so it can&apos;t produce
            figures that might be wrong.
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

// Shown in place of a screen built on Nigeria's own rules (its PAYE,
// pension, NHF and withholding tables) in any other country. The API
// refuses them there.
export function NigeriaOnly({ countryName }: { countryName: string }) {
  return (
    <div>
      <PageHeader title="Nigeria only" subtitle={`Not used in ${countryName}`} />
      <Card>
        <CardHeader
          title="This screen is for Nigeria's tax rules"
          subtitle={`${countryName}'s payroll runs on its own rules`}
        />
        <div className="space-y-3 text-[13px] text-ink-soft">
          <p>
            It works from Nigeria&apos;s PAYE, pension, NHF and withholding tables, which don&apos;t
            apply in {countryName}. {countryName}&apos;s rules, and the figures your organisation
            enters for them, are under Tax Settings; pay runs, payslips and payroll reports use
            them.
          </p>
          <p>
            <Link href="/tax-settings" className="font-bold text-primary hover:underline">
              Open Tax Settings
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

// Shown in place of Tax Settings in Nigeria, whose rules take none.
export function EngineOnly() {
  return (
    <div>
      <PageHeader title="Tax Settings" subtitle="Not used in Nigeria" />
      <Card>
        <CardHeader
          title="Nigeria's rules take no Tax Settings"
          subtitle="Every figure is built into Nigeria's approved rule versions"
        />
        <div className="space-y-3 text-[13px] text-ink-soft">
          <p>
            <Link href="/compliance" className="font-bold text-primary hover:underline">
              See Nigeria&apos;s rules in the Compliance Engine
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
