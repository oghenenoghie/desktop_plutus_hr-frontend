"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { loansApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function LoansPage() {
  const { showToast } = useToast();
  const loans = useApiResource(() => loansApi.list());

  async function cancel(loanId: string) {
    try {
      await loansApi.cancel(loanId);
      loans.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader title="Loans & Advances" subtitle="Requests, repayment schedules and payroll deductions" />

      <Card>
        {loans.loading ? <LoadingState /> : null}
        {loans.error ? <ErrorState message={loans.error} /> : null}
        {loans.data && loans.data.length === 0 ? <EmptyState label="No loans on record." /> : null}
        {loans.data && loans.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Start</Th>
                <Th align="right">Principal</Th>
                <Th align="right">Installment</Th>
                <Th align="right">Installments</Th>
                <Th align="right">Outstanding</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {loans.data.map((loan) => (
                <tr key={loan.id}>
                  <Td>{formatDate(loan.start_date)}</Td>
                  <Td align="right">{formatMoney(loan.principal_minor)}</Td>
                  <Td align="right">{formatMoney(loan.installment_minor)}</Td>
                  <Td align="right">{loan.num_installments}</Td>
                  <Td align="right">{formatMoney(loan.outstanding_minor)}</Td>
                  <Td>
                    <StatusBadge status={loan.status} />
                  </Td>
                  <Td align="right">
                    {loan.status === "active" ? (
                      <ConfirmActionButton
                        action={() => cancel(loan.id)}
                        label="Cancel"
                        tone="danger"
                        confirmTitle="Cancel this loan?"
                        confirmMessage="This stops all future installment deductions for this loan. This can't be undone."
                        confirmLabel="Cancel Loan"
                      />
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
