"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { complianceApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { CountryTaxStatus } from "@/lib/types";

const MODULE_LABELS: Record<string, string> = {
  vat: "VAT",
  withholding_tax: "Withholding tax",
  corporate_tax: "Corporate tax",
  employment_tax: "Employment tax",
};

function ReadinessBadge({ status }: { status: CountryTaxStatus }) {
  return status === "active" ? (
    <Badge tone="good">Active</Badge>
  ) : (
    <Badge tone="warn">Setup required</Badge>
  );
}

// Read-only. Choosing a country for an organisation, and administering its
// rates, belongs in an authorised settings workflow on the backend, not here.
export default function CountryCompliancePage() {
  const countries = useApiResource(() => complianceApi.countries());

  return (
    <div>
      <PageHeader
        title="Country Compliance"
        subtitle="Jurisdiction catalogue and tax readiness by country"
      />

      <Card className="mb-6">
        <CardHeader
          title="Supported jurisdictions"
          subtitle="A listed country is not necessarily enabled for live tax calculations"
        />
        {countries.loading ? <LoadingState /> : null}
        {countries.error ? <ErrorState message={countries.error} /> : null}
        {countries.data && countries.data.length === 0 ? (
          <EmptyState label="No jurisdictions are configured." />
        ) : null}
        {countries.data && countries.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Country</Th>
                <Th>Status</Th>
                <Th>Currency</Th>
                <Th>Tax authority</Th>
                <Th>Modules</Th>
              </tr>
            </Thead>
            <tbody>
              {countries.data.map((country) => (
                <tr key={country.code}>
                  <Td>
                    <span className="font-bold">{country.name}</span>
                    <span className="ml-2 text-ink-soft">{country.code}</span>
                  </Td>
                  <Td>
                    <ReadinessBadge status={country.status} />
                  </Td>
                  <Td>{country.currency}</Td>
                  <Td className="max-w-xs">{country.tax_authority}</Td>
                  <Td className="max-w-xs">
                    {country.enabled_modules.map((m) => MODULE_LABELS[m] ?? m).join(", ")}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      <p className="text-[13px] text-ink-soft">
        Only approved, effective-dated rules are used for live calculations or ledger postings.
        Nigeria runs on the rules shown in the Compliance Engine. A country marked &ldquo;Setup
        required&rdquo; has no approved rules yet, so Plutus will not calculate or post tax for it.
      </p>
    </div>
  );
}
