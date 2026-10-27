"use client";

import { Fragment, use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useIsNigeria } from "@/components/region-field";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { employeesApi, payRunsApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { isEnginePayslip } from "@/lib/payslip-lines";
import type { Payslip, PayslipDelivery } from "@/lib/types";

interface PayslipDerivationOutputs {
  gross_minor: number;
  pensionable_pay_minor: number;
  pension_employee_minor: number;
  pension_employer_minor: number;
  nhf_minor: number;
  cumulative_rent_relief_minor: number;
  cumulative_chargeable_income_minor: number;
  paye_minor: number;
  loan_deduction_minor: number;
  benefit_deduction_minor: number;
  union_dues_deduction_minor: number;
  net_pay_minor: number;
}

export default function PayRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const isNigeria = useIsNigeria();
  const payRun = useApiResource(() => payRunsApi.get(id), [id]);
  const payslips = useApiResource(() => payRunsApi.payslips(id), [id]);
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, PayslipDelivery[]>>({});
  const [loadingDeliveriesId, setLoadingDeliveriesId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [needsAcknowledgment, setNeedsAcknowledgment] = useState(false);

  async function handleReverse(acknowledgeFiledOrRemitted: boolean) {
    try {
      await payRunsApi.reverse(id, acknowledgeFiledOrRemitted);
      showToast("Pay run reversed", "good");
      setNeedsAcknowledgment(false);
      payRun.reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const detail = String(err.detail ?? err.message);
        if (detail.includes("acknowledge_filed_or_remitted")) {
          setNeedsAcknowledgment(true);
          showToast(detail, "bad");
          return;
        }
      }
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Reversal failed.", "bad");
    }
  }

  async function loadDeliveries(slipId: string) {
    setLoadingDeliveriesId(slipId);
    try {
      const result = await payRunsApi.deliveries(id, slipId);
      setDeliveries((prev) => ({ ...prev, [slipId]: result }));
    } catch (err) {
      showToast(
        err instanceof ApiError ? String(err.detail ?? err.message) : "Failed to load delivery status.",
        "bad",
      );
    } finally {
      setLoadingDeliveriesId(null);
    }
  }

  function toggleExpand(slip: Payslip) {
    if (expandedId === slip.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(slip.id);
    if (!deliveries[slip.id]) {
      loadDeliveries(slip.id);
    }
  }

  async function handleDownload(slip: Payslip) {
    setDownloadingId(slip.id);
    try {
      const employee = employeesById.get(slip.employee_id);
      const filename = `payslip-${employee?.employee_number ?? slip.employee_id}-${slip.period_end}.pdf`;
      await payRunsApi.downloadPayslipPdf(id, slip.id, filename);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Download failed.", "bad");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleResend(slip: Payslip) {
    setResendingId(slip.id);
    try {
      await payRunsApi.resend(id, slip.id);
      showToast("Payslip resent", "good");
      await loadDeliveries(slip.id);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Resend failed.", "bad");
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div>
      {payRun.loading ? <LoadingState /> : null}
      {payRun.error ? <ErrorState message={payRun.error} /> : null}
      {payRun.data ? (
        <>
          <PageHeader
            title={`${formatDate(payRun.data.period_start)} – ${formatDate(payRun.data.period_end)}`}
            subtitle={`${titleCase(payRun.data.frequency)} pay run · ${payRun.data.employee_count} employees`}
            action={
              payRun.data.status === "completed" ? (
                <ConfirmActionButton
                  action={() => handleReverse(false)}
                  label="Reverse Pay Run"
                  tone="danger"
                  confirmTitle="Reverse this pay run?"
                  confirmMessage="This posts a correcting journal entry, restores any loan balances this run repaid, and removes any statutory liabilities it generated that haven't been filed yet. Payslips themselves are never edited or deleted. This can't be undone."
                  confirmLabel="Reverse"
                />
              ) : null
            }
          />

          <Card className="mb-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryStat label="Status" value={<StatusBadge status={payRun.data.status} />} />
              <SummaryStat label="Gross" value={formatMoney(payRun.data.gross_minor)} />
              <SummaryStat label="Net" value={formatMoney(payRun.data.net_minor)} />
              <SummaryStat
                label={payRun.data.status === "reversed" ? "Reversed" : "Completed"}
                value={formatDate(
                  payRun.data.status === "reversed" ? payRun.data.reversed_at : payRun.data.completed_at,
                )}
              />
            </div>
            {needsAcknowledgment ? (
              <div className="mt-4 rounded-panel border border-bad bg-bad-tint px-4 py-3">
                <p className="text-[13px] font-bold text-bad">
                  This run has statutory liabilities already filed or remitted with a government
                  authority — reversing it cannot undo that filing.
                </p>
                <div className="mt-3">
                  <ConfirmActionButton
                    action={() => handleReverse(true)}
                    label="Reverse Anyway"
                    tone="danger"
                    confirmTitle="Reverse despite the filed/remitted liability?"
                    confirmMessage="The filed or remitted liability itself will be left exactly as it is — this only reverses the payroll run's own postings and side effects."
                    confirmLabel="Reverse Anyway"
                  />
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              title="Payslips"
              subtitle="Every figure derived step by step, the way it was computed"
            />
            {payslips.loading ? <LoadingState /> : null}
            {payslips.error ? <ErrorState message={payslips.error} /> : null}
            {payslips.data && payslips.data.length === 0 ? (
              <EmptyState label="No payslips for this run." />
            ) : null}
            {payslips.data && payslips.data.length > 0 ? (
              <Table>
                <Thead>
                  <tr>
                    <Th>Employee</Th>
                    <Th align="right">Gross</Th>
                    <Th align="right">{isNigeria ? "PAYE" : "Income tax"}</Th>
                    <Th align="right">Net</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </Thead>
                <tbody>
                  {payslips.data.map((slip) => {
                    const outputs = slip.derivation?.outputs as PayslipDerivationOutputs | undefined;
                    return (
                      <Fragment key={slip.id}>
                        <tr>
                          <Td className="font-bold">
                            {employeesById.get(slip.employee_id)?.full_name ?? "—"}
                          </Td>
                          <Td align="right">{formatMoney(slip.gross_minor)}</Td>
                          <Td align="right">{formatMoney(slip.paye_minor)}</Td>
                          <Td align="right">{formatMoney(slip.net_minor)}</Td>
                          <Td align="right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="md" variant="secondary" onClick={() => toggleExpand(slip)}>
                                {expandedId === slip.id ? "Hide" : "· how?"}
                              </Button>
                              <Button
                                size="md"
                                variant="secondary"
                                onClick={() => handleDownload(slip)}
                                disabled={downloadingId === slip.id}
                              >
                                {downloadingId === slip.id ? "Downloading…" : "PDF"}
                              </Button>
                            </div>
                          </Td>
                        </tr>
                        {expandedId === slip.id ? (
                          <tr>
                            <td colSpan={5} className="border-b border-border bg-bg px-4 py-5">
                              {outputs ? (
                                <div className="grid gap-6 lg:grid-cols-2">
                                  <div className="space-y-3">
                                    <DerivationRow label="Gross Pay" value={outputs.gross_minor} />
                                    {isEnginePayslip(slip) ? (
                                      <StatutoryLineRows slip={slip} />
                                    ) : (
                                      <>
                                        <DerivationRow
                                          label="Pensionable Pay"
                                          value={outputs.pensionable_pay_minor}
                                        />
                                        <DerivationRow
                                          label="Pension (Employee, 8%)"
                                          value={outputs.pension_employee_minor}
                                          subtract
                                        />
                                        <DerivationRow
                                          label="Pension (Employer, 10%)"
                                          value={outputs.pension_employer_minor}
                                          muted
                                        />
                                        <DerivationRow label="NHF (2.5%)" value={outputs.nhf_minor} subtract />
                                        <DerivationRow
                                          label="Cumulative Rent Relief"
                                          value={outputs.cumulative_rent_relief_minor}
                                          muted
                                        />
                                        <DerivationRow
                                          label="Cumulative Chargeable Income"
                                          value={outputs.cumulative_chargeable_income_minor}
                                        />
                                        <DerivationRow label="PAYE" value={outputs.paye_minor} subtract />
                                      </>
                                    )}
                                    {outputs.loan_deduction_minor > 0 ? (
                                      <DerivationRow
                                        label="Loan Deduction"
                                        value={outputs.loan_deduction_minor}
                                        subtract
                                      />
                                    ) : null}
                                    {outputs.benefit_deduction_minor > 0 ? (
                                      <DerivationRow
                                        label="Benefit Deduction"
                                        value={outputs.benefit_deduction_minor}
                                        subtract
                                      />
                                    ) : null}
                                    {outputs.union_dues_deduction_minor > 0 ? (
                                      <DerivationRow
                                        label="Union Dues"
                                        value={outputs.union_dues_deduction_minor}
                                        subtract
                                      />
                                    ) : null}
                                    <div className="!mt-6 flex items-center justify-between border-t-2 border-primary pt-4">
                                      <span className="text-[13px] font-extrabold text-ink">Net Pay</span>
                                      <span className="text-[20px] font-extrabold text-primary">
                                        {formatMoney(outputs.net_pay_minor)}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                                      Delivery
                                    </h3>
                                    {loadingDeliveriesId === slip.id ? <LoadingState /> : null}
                                    {deliveries[slip.id] && deliveries[slip.id]!.length === 0 ? (
                                      <p className="text-[13px] text-ink-soft">Never delivered.</p>
                                    ) : null}
                                    {deliveries[slip.id]?.map((delivery) => (
                                      <div
                                        key={delivery.id}
                                        className="mb-3 flex items-center justify-between border-b border-border pb-3"
                                      >
                                        <div>
                                          <StatusBadge status={delivery.status} />
                                          <p className="mt-1 text-[12px] text-ink-soft">
                                            {delivery.recipient_email} · {formatDate(delivery.created_at)}
                                          </p>
                                          {delivery.error ? (
                                            <p className="mt-1 text-[12px] text-bad">{delivery.error}</p>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}
                                    <Button
                                      size="md"
                                      variant="secondary"
                                      onClick={() => handleResend(slip)}
                                      disabled={resendingId === slip.id}
                                    >
                                      {resendingId === slip.id ? "Resending…" : "Resend Payslip"}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[13px] text-ink-soft">
                                  No derivation recorded for this payslip.
                                </p>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </Table>
            ) : null}
          </Card>
        </>
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">{label}</p>
      <div className="mt-1 text-[15px] font-extrabold text-ink">{value}</div>
    </div>
  );
}

// A payslip from the country rule engine: its statutory lines in the order
// they were calculated. What the employer pays on top is shown, not
// subtracted.
function StatutoryLineRows({ slip }: { slip: Payslip }) {
  return (
    <>
      {(slip.statutory_lines ?? []).map((line) => (
        <DerivationRow
          key={line.code}
          label={line.kind === "employer_contribution" ? `${line.name} (employer)` : line.name}
          value={line.amount_minor}
          subtract={line.kind !== "employer_contribution"}
          muted={line.kind === "employer_contribution"}
        />
      ))}
      <p className="text-[11px] text-ink-soft">Rule set {slip.rule_version_id}</p>
    </>
  );
}

function DerivationRow({
  label,
  value,
  subtract,
  muted,
}: {
  label: string;
  value: number;
  subtract?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <span className={`text-[13px] ${muted ? "text-ink-soft" : "font-bold text-ink"}`}>{label}</span>
      <span className={`text-[13px] font-bold ${subtract ? "text-bad" : "text-ink"}`}>
        {subtract ? "− " : ""}
        {formatMoney(value)}
      </span>
    </div>
  );
}
