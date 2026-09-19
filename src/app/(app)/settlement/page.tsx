"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { finalSettlementApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, nairaToMinor } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function SettlementPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SettlementPageInner />
    </Suspense>
  );
}

function SettlementPageInner() {
  const searchParams = useSearchParams();
  const [employeeId, setEmployeeId] = useState(() => searchParams.get("employeeId") ?? "");
  const [processing, setProcessing] = useState(false);
  const settlements = useApiResource(
    () => (employeeId ? finalSettlementApi.forEmployee(employeeId) : Promise.resolve([])),
    [employeeId],
  );

  return (
    <div>
      <PageHeader
        title="Final Settlement"
        subtitle="Exit payroll — gratuity, leave payout and loan clearance"
        action={
          employeeId ? <Button onClick={() => setProcessing(true)}>Process Settlement</Button> : undefined
        }
      />

      <Card className="mb-6">
        <Label htmlFor="employee">Employee</Label>
        <div className="max-w-sm">
          <EmployeePicker value={employeeId} onChange={setEmployeeId} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Settlement Records" />
        {!employeeId ? <EmptyState label="Select an employee to view their settlement history." /> : null}
        {employeeId && settlements.loading ? <LoadingState /> : null}
        {settlements.error ? <ErrorState message={settlements.error} /> : null}
        {employeeId && settlements.data && settlements.data.length === 0 ? (
          <EmptyState label="No final settlement on record for this employee." />
        ) : null}
        {settlements.data && settlements.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Termination Date</Th>
                <Th align="right">Leave Days Paid</Th>
                <Th align="right">Leave Payout</Th>
                <Th align="right">Gratuity</Th>
                <Th align="right">Loan Recovered</Th>
                <Th align="right">Net Settlement</Th>
              </tr>
            </Thead>
            <tbody>
              {settlements.data.map((settlement) => (
                <tr key={settlement.id}>
                  <Td>{formatDate(settlement.termination_date)}</Td>
                  <Td align="right">{settlement.leave_days_paid_out}</Td>
                  <Td align="right">{formatNaira(settlement.leave_payout_minor)}</Td>
                  <Td align="right">{formatNaira(settlement.gratuity_minor)}</Td>
                  <Td align="right">{formatNaira(settlement.outstanding_loan_recovered_minor)}</Td>
                  <Td align="right" className="font-extrabold">
                    {formatNaira(settlement.net_settlement_minor)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {processing ? (
        <ProcessSettlementDrawer
          employeeId={employeeId}
          onClose={() => setProcessing(false)}
          onProcessed={() => {
            setProcessing(false);
            settlements.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function ProcessSettlementDrawer({
  employeeId,
  onClose,
  onProcessed,
}: {
  employeeId: string;
  onClose: () => void;
  onProcessed: () => void;
}) {
  const { showToast } = useToast();
  const [terminationDate, setTerminationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [gratuity, setGratuity] = useState("");
  const [leaveDaysPaidOut, setLeaveDaysPaidOut] = useState("");
  const [leavePayout, setLeavePayout] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await finalSettlementApi.process(employeeId, {
        termination_date: terminationDate,
        gratuity_minor: nairaToMinor(gratuity),
        leave_days_paid_out: Number(leaveDaysPaidOut) || 0,
        leave_payout_minor: nairaToMinor(leavePayout),
      });
      showToast("Settlement processed", "good");
      onProcessed();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Process Settlement" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="termination-date">Termination Date</Label>
          <Input
            id="termination-date"
            type="date"
            value={terminationDate}
            onChange={(event) => setTerminationDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="gratuity">Gratuity (₦)</Label>
          <Input
            id="gratuity"
            inputMode="decimal"
            value={gratuity}
            onChange={(event) => setGratuity(event.target.value)}
            placeholder="e.g. 500000"
          />
        </div>
        <div>
          <Label htmlFor="leave-days">Leave Days Paid Out</Label>
          <Input
            id="leave-days"
            inputMode="numeric"
            value={leaveDaysPaidOut}
            onChange={(event) => setLeaveDaysPaidOut(event.target.value)}
            placeholder="e.g. 12"
          />
        </div>
        <div>
          <Label htmlFor="leave-payout">Leave Payout (₦)</Label>
          <Input
            id="leave-payout"
            inputMode="decimal"
            value={leavePayout}
            onChange={(event) => setLeavePayout(event.target.value)}
            placeholder="e.g. 120000"
          />
        </div>
        <p className="text-[12px] text-ink-soft">
          Any outstanding loan balance is recovered automatically and netted against the settlement.
        </p>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Processing…" : "Process Settlement"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
