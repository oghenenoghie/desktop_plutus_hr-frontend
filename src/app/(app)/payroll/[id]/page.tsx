"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import type { PayRunVarianceFlag, Payslip, PayslipDelivery } from "@/lib/types";

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

const STEPS: { key: string; label: string; hint: string }[] = [
  { key: "draft", label: "Draft", hint: "Check each payslip below" },
  { key: "validated", label: "Validated", hint: "TINs and pay changes checked" },
  { key: "locked", label: "Posted", hint: "In the books, payslips emailed" },
  { key: "paid", label: "Paid", hint: "Net pay disbursed" },
];

function percent(part: number, whole: number): string {
  if (!whole) return "";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

export default function PayRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const isNigeria = useIsNigeria();
  const router = useRouter();
  const payRun = useApiResource(() => payRunsApi.get(id), [id]);
  const status = payRun.data?.status;
  const posted = status === "locked" || status === "reversed";
  const payslips = useApiResource(() => payRunsApi.payslips(id), [id, status]);
  // Before a run is posted there are no payslips yet: what each one will be
  // is worked out on the server without writing anything.
  const preview = useApiResource(
    () => (status === "draft" || status === "validated" ? payRunsApi.preview(id) : Promise.resolve([])),
    [id, status],
  );
  const slips = posted ? payslips : preview;
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, PayslipDelivery[]>>({});
  const [loadingDeliveriesId, setLoadingDeliveriesId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [needsAcknowledgment, setNeedsAcknowledgment] = useState(false);
  const [varianceFlags, setVarianceFlags] = useState<PayRunVarianceFlag[] | null>(null);

  function errorText(err: unknown, fallback: string): string {
    return err instanceof ApiError ? String(err.detail ?? err.message) : fallback;
  }

  async function handleValidate(overrideVariance: boolean) {
    try {
      await payRunsApi.validate(id, overrideVariance);
      setVarianceFlags(null);
      showToast("Pay run validated. Post it to the records when the figures are right.", "good");
      payRun.reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && errorText(err, "").includes("variance flag")) {
        setVarianceFlags(await payRunsApi.varianceFlags(id));
        return;
      }
      showToast(errorText(err, "Validation failed."), "bad");
    }
  }

  async function handlePost() {
    try {
      await payRunsApi.lock(id);
      showToast("Pay run posted: payroll is in the books and payslips are being emailed.", "good");
      payRun.reload();
    } catch (err) {
      showToast(errorText(err, "Posting failed."), "bad");
    }
  }

  async function handleMarkPaid() {
    try {
      await payRunsApi.markPaid(id);
      showToast("Pay run marked as paid", "good");
      payRun.reload();
    } catch (err) {
      showToast(errorText(err, "Couldn't mark the run paid."), "bad");
    }
  }

  async function handleDiscard() {
    try {
      await payRunsApi.discard(id);
      showToast("Pay run discarded", "good");
      router.push("/payroll");
    } catch (err) {
      showToast(errorText(err, "Couldn't discard the run."), "bad");
    }
  }

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
      showToast(errorText(err, "Reversal failed."), "bad");
    }
  }

  async function loadDeliveries(slipId: string) {
    setLoadingDeliveriesId(slipId);
    try {
      const result = await payRunsApi.deliveries(id, slipId);
      setDeliveries((prev) => ({ ...prev, [slipId]: result }));
    } catch (err) {
      showToast(errorText(err, "Failed to load delivery status."), "bad");
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
    if (posted && !deliveries[slip.id]) {
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
      showToast(errorText(err, "Download failed."), "bad");
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
      showToast(errorText(err, "Resend failed."), "bad");
    } finally {
      setResendingId(null);
    }
  }

  const run = payRun.data;
  const totals = (slips.data ?? []).reduce(
    (sum, slip) => ({ gross: sum.gross + slip.gross_minor, net: sum.net + slip.net_minor }),
    { gross: 0, net: 0 },
  );
  const currentStep = !run
    ? -1
    : run.status === "reversed"
      ? -1
      : run.disbursed_at
        ? 3
        : STEPS.findIndex((step) => step.key === run.status);

  return (
    <div>
      {payRun.loading ? <LoadingState /> : null}
      {payRun.error ? <ErrorState message={payRun.error} /> : null}
      {run ? (
        <>
          <PageHeader
            title={`${formatDate(run.period_start)} – ${formatDate(run.period_end)}`}
            subtitle={`${titleCase(run.frequency)} pay run · ${run.employee_ids.length} employees`}
            action={
              <div className="flex flex-wrap gap-2">
                {run.status === "draft" || run.status === "validated" ? (
                  <ConfirmActionButton
                    action={handleDiscard}
                    label="Discard"
                    tone="danger"
                    confirmTitle="Discard this pay run?"
                    confirmMessage="Nothing has been posted yet, so nothing else changes."
                    confirmLabel="Discard"
                  />
                ) : null}
                {run.status === "draft" ? (
                  <Button onClick={() => handleValidate(false)}>Validate</Button>
                ) : null}
                {run.status === "validated" ? (
                  <ConfirmActionButton
                    action={handlePost}
                    label="Post to Records"
                    tone="primary"
                    confirmTitle="Post this pay run to the records?"
                    confirmMessage={`Writes ${run.employee_ids.length} payslip(s), posts ${formatMoney(totals.gross)} gross pay and the employer's costs to the general ledger (profit and loss and balance sheet), and emails each employee their payslip. A posted run can only be reversed, not edited.`}
                    confirmLabel="Post"
                  />
                ) : null}
                {posted ? (
                  <Link href={`/print/pay-runs/${id}`}>
                    <Button variant="secondary">Print</Button>
                  </Link>
                ) : null}
                {run.status === "locked" && !run.disbursed_at ? (
                  <ConfirmActionButton
                    action={handleMarkPaid}
                    label="Mark as Paid"
                    tone="primary"
                    confirmTitle="Mark this pay run as paid?"
                    confirmMessage={`Records that ${formatMoney(run.net_minor)} net pay has been paid to the employees.`}
                    confirmLabel="Mark Paid"
                  />
                ) : null}
                {run.status === "locked" ? (
                  <ConfirmActionButton
                    action={() => handleReverse(false)}
                    label="Reverse Pay Run"
                    tone="danger"
                    confirmTitle="Reverse this pay run?"
                    confirmMessage="This posts a correcting journal entry, restores any loan balances this run repaid, and removes any statutory liabilities it generated that haven't been filed yet. Payslips themselves are never edited or deleted. This can't be undone."
                    confirmLabel="Reverse"
                  />
                ) : null}
              </div>
            }
          />

          {currentStep >= 0 ? (
            <ol aria-label="Pay run steps" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STEPS.map((step, index) => (
                <li
                  key={step.key}
                  aria-current={index === currentStep ? "step" : undefined}
                  className={`rounded-panel border px-4 py-3 ${index <= currentStep ? "border-primary bg-surface" : "border-border bg-bg"}`}
                >
                  <p className={`text-[12px] font-extrabold ${index <= currentStep ? "text-primary" : "text-ink-soft"}`}>
                    {index + 1}. {step.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">{step.hint}</p>
                </li>
              ))}
            </ol>
          ) : null}

          {varianceFlags ? (
            <div role="alert" className="mb-6 rounded-panel border border-warn bg-warn-tint px-4 py-3">
              <p className="text-[13px] font-bold text-warn-ink">
                Check these before validating: pay that changed a lot since the last posted run, or employees left out of
                it.
              </p>
              <ul className="mt-2 list-disc pl-5 text-[13px] text-warn-ink">
                {varianceFlags.map((flag) => (
                  <li key={flag.id}>
                    {employeesById.get(flag.employee_id)?.full_name ?? "An employee"}:{" "}
                    {flag.flag_type === "gross_swing" ? "gross pay changed by 30% or more" : "not in this run"}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Button onClick={() => handleValidate(true)}>Validate Anyway</Button>
              </div>
            </div>
          ) : null}

          <Card className="mb-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryStat label="Status" value={<StatusBadge status={run.status} />} />
              <SummaryStat label={posted ? "Gross" : "Gross (preview)"} value={formatMoney(posted ? run.gross_minor : totals.gross)} />
              <SummaryStat label={posted ? "Net" : "Net (preview)"} value={formatMoney(posted ? run.net_minor : totals.net)} />
              <SummaryStat
                label={run.status === "reversed" ? "Reversed" : run.disbursed_at ? "Paid" : "Posted"}
                value={formatDate(
                  run.status === "reversed" ? run.reversed_at : (run.disbursed_at ?? run.locked_at),
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
              title={posted ? "Payslips" : "Payslips (preview)"}
              subtitle={
                posted
                  ? "Every figure derived step by step, the way it was computed"
                  : "What each payslip will be when the run is posted. Nothing is in the books yet."
              }
            />
            {slips.loading ? <LoadingState /> : null}
            {slips.error ? <ErrorState message={slips.error} /> : null}
            {slips.data && slips.data.length === 0 && !slips.loading ? (
              <EmptyState label="No payslips for this run." />
            ) : null}
            {slips.data && slips.data.length > 0 ? (
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
                  {slips.data.map((slip) => {
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
                              {posted ? (
                                <Button
                                  size="md"
                                  variant="secondary"
                                  onClick={() => handleDownload(slip)}
                                  disabled={downloadingId === slip.id}
                                >
                                  {downloadingId === slip.id ? "Downloading…" : "PDF"}
                                </Button>
                              ) : null}
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
                                          label={`Pension (Employee, ${percent(outputs.pension_employee_minor, outputs.pensionable_pay_minor)})`}
                                          value={outputs.pension_employee_minor}
                                          subtract
                                        />
                                        <DerivationRow
                                          label={`Pension (Employer, ${percent(outputs.pension_employer_minor, outputs.pensionable_pay_minor)})`}
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
                                  {posted ? (
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
                                  ) : null}
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
