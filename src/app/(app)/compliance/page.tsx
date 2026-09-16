"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { complianceApi, employeesApi } from "@/lib/api/endpoints";
import { formatNaira, formatPpmAsPercent } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { RuleVersion } from "@/lib/types";

function ordinal(day: number): string {
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${suffix}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function schemeRows(rules: RuleVersion) {
  return [
    {
      scheme: "PAYE",
      base: "Cumulative annual chargeable income",
      rate: "Progressive — see band table",
      authority: rules.paye.authority,
      deadline: `${ordinal(rules.paye.due_day_of_following_month)} of the following month`,
    },
    {
      scheme: "Pension",
      base: "Pensionable pay (basic + housing + transport)",
      rate: `${formatPpmAsPercent(rules.pension.employee_rate_ppm)} employee + ${formatPpmAsPercent(rules.pension.employer_rate_ppm)} employer`,
      authority: rules.pension.authority,
      deadline: `${rules.pension.due_working_days_after_payment} working days after payment`,
    },
    {
      scheme: "NHF",
      base: "Basic salary",
      rate: formatPpmAsPercent(rules.nhf.rate_ppm),
      authority: rules.nhf.authority,
      deadline: `${rules.nhf.due_days_after_payment} days after payment`,
    },
    {
      scheme: "NSITF",
      base: "Pensionable pay (employer cost)",
      rate: formatPpmAsPercent(rules.nsitf.rate_ppm),
      authority: rules.nsitf.authority,
      deadline: `${ordinal(rules.nsitf.due_day_of_following_month)} of the following month`,
    },
    {
      scheme: "ITF",
      base: "Annual payroll (employer cost, qualifying employers)",
      rate: formatPpmAsPercent(rules.itf.rate_ppm),
      authority: rules.itf.authority,
      deadline: `${ordinal(rules.itf.due_day)} ${MONTHS[rules.itf.due_month - 1]}`,
    },
    {
      scheme: "WHT",
      base: "Contractor/vendor payments, by category",
      rate: rules.wht.categories.map((c) => `${c.category}: ${formatPpmAsPercent(c.rate_ppm)}`).join(", "),
      authority: rules.wht.authority,
      deadline: `${ordinal(rules.wht.due_day_of_following_month)} of the following month`,
    },
  ];
}

function payeBandLabel(rules: RuleVersion, index: number): string {
  const band = rules.paye.bands[index]!;
  const lowerExclusive = index === 0 ? 0 : rules.paye.bands[index - 1]!.up_to_minor!;
  const lower = formatNaira(lowerExclusive);
  return band.up_to_minor === null
    ? `Above ${lower}`
    : `${lower} – ${formatNaira(band.up_to_minor)}`;
}

export default function CompliancePage() {
  const rules = useApiResource(() => complianceApi.currentRules());
  const employees = useApiResource(() => employeesApi.list());

  const unregistered = (employees.data ?? []).filter((e) => !e.tin || !e.tin.trim());

  return (
    <div>
      <PageHeader
        title="Compliance Engine"
        subtitle="PAYE, pension, NHF, NSITF, ITF & WHT — versioned and current"
      />

      <Card className="mb-6">
        <CardHeader title="Statutory schemes" subtitle={rules.data ? `Rule version ${rules.data.id}` : undefined} />
        {rules.loading ? <LoadingState /> : null}
        {rules.error ? <ErrorState message={rules.error} /> : null}
        {rules.data ? (
          <Table>
            <Thead>
              <tr>
                <Th>Scheme</Th>
                <Th>Base</Th>
                <Th>Rate</Th>
                <Th>Authority</Th>
                <Th>Deadline</Th>
              </tr>
            </Thead>
            <tbody>
              {schemeRows(rules.data).map((row) => (
                <tr key={row.scheme}>
                  <Td className="font-bold">{row.scheme}</Td>
                  <Td className="max-w-xs">{row.base}</Td>
                  <Td>{row.rate}</Td>
                  <Td>{row.authority}</Td>
                  <Td>{row.deadline}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="PAYE bands"
          subtitle={
            rules.data
              ? `Tax-free threshold ${formatNaira(rules.data.paye.tax_free_threshold_minor)} — rent relief ${formatPpmAsPercent(rules.data.paye.rent_relief_rate_ppm)} of rent paid, capped at ${formatNaira(rules.data.paye.rent_relief_cap_minor)}`
              : undefined
          }
        />
        {rules.data ? (
          <Table>
            <Thead>
              <tr>
                <Th>Cumulative chargeable income</Th>
                <Th align="right">Rate</Th>
              </tr>
            </Thead>
            <tbody>
              {rules.data.paye.bands.map((band, index) => (
                <tr key={index}>
                  <Td>{payeBandLabel(rules.data as RuleVersion, index)}</Td>
                  <Td align="right">{formatPpmAsPercent(band.rate_ppm)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="TIN registration gate"
          subtitle="A payroll run is blocked for any employee without a valid Tax Identification Number"
        />
        {employees.loading ? <LoadingState /> : null}
        {employees.error ? <ErrorState message={employees.error} /> : null}
        {employees.data && unregistered.length === 0 ? (
          <EmptyState label="Every employee has a registered TIN." />
        ) : null}
        {unregistered.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Employee</Th>
                <Th>State of residence</Th>
                <Th>Status</Th>
              </tr>
            </Thead>
            <tbody>
              {unregistered.map((employee) => (
                <tr key={employee.id}>
                  <Td>{employee.full_name}</Td>
                  <Td>{employee.state_of_residence}</Td>
                  <Td>
                    <Badge tone="bad">No TIN</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
