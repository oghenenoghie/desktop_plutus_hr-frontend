"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { overtimeApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Overtime } from "@/lib/types";

export default function OvertimePage() {
  const overtime = useApiResource(() => overtimeApi.list());
  const { showToast } = useToast();

  async function act(run: (id: string) => Promise<unknown>, id: string, successMessage: string) {
    try {
      await run(id);
      showToast(successMessage, "good");
      overtime.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Overtime"
        subtitle="Extra hours worked, taxable and excluded from the NSITF base, fed into the next pay run once approved"
      />

      <Card>
        {overtime.loading ? <LoadingState /> : null}
        {overtime.error ? <ErrorState message={overtime.error} /> : null}
        {overtime.data && overtime.data.length === 0 ? (
          <EmptyState label="No overtime entries yet." />
        ) : null}
        {overtime.data && overtime.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Date</Th>
                <Th align="right">Hours</Th>
                <Th align="right">Rate</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {overtime.data.map((entry: Overtime) => (
                <tr key={entry.id}>
                  <Td>{formatDate(entry.work_date)}</Td>
                  <Td align="right">{entry.hours}</Td>
                  <Td align="right">{entry.rate_multiplier}×</Td>
                  <Td align="right">{formatNaira(entry.amount_minor)}</Td>
                  <Td>
                    <StatusBadge status={entry.status} />
                  </Td>
                  <Td align="right">
                    {entry.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <ConfirmActionButton
                          action={() => act(overtimeApi.reject, entry.id, "Overtime entry rejected")}
                          label="Reject"
                          confirmTitle="Reject this overtime entry?"
                          confirmMessage={`${entry.hours}h at ${entry.rate_multiplier}× (${formatNaira(entry.amount_minor)}) will be rejected.`}
                          confirmLabel="Reject"
                        />
                        <ConfirmActionButton
                          action={() => act(overtimeApi.approve, entry.id, "Overtime entry approved")}
                          label="Approve"
                          tone="primary"
                          confirmTitle="Approve this overtime entry?"
                          confirmMessage={`${entry.hours}h at ${entry.rate_multiplier}× (${formatNaira(entry.amount_minor)}) will be approved and picked up by the next pay run.`}
                          confirmLabel="Approve"
                        />
                      </div>
                    ) : null}
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
