"use client";

import { CountryStatusBadge } from "@/components/country-status";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { complianceApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";

const MODULE_LABELS: Record<string, string> = {
  vat: "VAT",
  withholding_tax: "Withholding tax",
  corporate_tax: "Corporate tax",
  employment_tax: "Employment tax",
};

// Read-only. An admin chooses the organisation's country in Setup &
// Onboarding; administering a country's rates belongs to the backend's
// review and approval workflow, not this screen.
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
                <Th>Can be chosen</Th>
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
                    <CountryStatusBadge status={country.status} />
                  </Td>
                  <Td>{country.selectable ? "Yes" : "Not yet"}</Td>
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

      <div className="space-y-2 text-[13px] text-ink-soft">
        <p>
          Only approved, effective-dated rules are used for live calculations or ledger postings.
          Nigeria runs on the rules shown in the Compliance Engine. Plutus will not calculate, post
          or file tax for any country that isn&apos;t active, and an organisation can&apos;t
          choose one.
        </p>
        <p>
          <strong className="text-ink">Draft:</strong> the rules are written up with their sources
          and wait for review by a tax adviser in that country.{" "}
          <strong className="text-ink">Awaiting review:</strong> the adviser is checking them.{" "}
          <strong className="text-ink">Setup required:</strong> nothing drafted yet.
        </p>
      </div>
    </div>
  );
}
