"use client";

import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { payRunsApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function PayrollPage() {
  const router = useRouter();
  const payRuns = useApiResource(() => payRunsApi.list());

  return (
    <div>
      <PageHeader
        title="Payroll Runs"
        subtitle="Multi-frequency runs with full audit trail"
        action={<Button onClick={() => router.push("/payroll/new")}>New Pay Run</Button>}
      />

      <Card>
        {payRuns.loading ? <LoadingState /> : null}
        {payRuns.error ? <ErrorState message={payRuns.error} /> : null}
        {payRuns.data && payRuns.data.length === 0 ? (
          <EmptyState label="No pay runs have been created yet." />
        ) : null}
        {payRuns.data && payRuns.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Period</Th>
                <Th>Frequency</Th>
                <Th align="right">Employees</Th>
                <Th align="right">Gross</Th>
                <Th align="right">Net</Th>
                <Th>Status</Th>
                <Th>Completed</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {payRuns.data.map((run) => (
                <tr key={run.id}>
                  <Td>
                    {formatDate(run.period_start)} – {formatDate(run.period_end)}
                  </Td>
                  <Td>{titleCase(run.frequency)}</Td>
                  <Td align="right">{run.employee_count}</Td>
                  <Td align="right">{formatMoney(run.gross_minor)}</Td>
                  <Td align="right">{formatMoney(run.net_minor)}</Td>
                  <Td>
                    <StatusBadge status={run.status} />
                  </Td>
                  <Td>{formatDate(run.completed_at)}</Td>
                  <Td align="right">
                    <Button size="md" variant="secondary" onClick={() => router.push(`/payroll/${run.id}`)}>
                      View
                    </Button>
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
