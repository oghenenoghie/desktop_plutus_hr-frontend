"use client";

import { useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { unionMembershipsApi } from "@/lib/api/endpoints";
import { currencyLabel, formatDate, formatMoney, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { UnionMembershipStatus } from "@/lib/types";

const STATUS_TONE: Record<UnionMembershipStatus, "good" | "warn" | "neutral"> = {
  active: "good",
  suspended: "warn",
  terminated: "neutral",
};

export default function UnionDuesPage() {
  const [employeeId, setEmployeeId] = useState("");
  const memberships = useApiResource(
    () => (employeeId ? unionMembershipsApi.forEmployee(employeeId) : Promise.resolve([])),
    [employeeId],
  );
  const [assigning, setAssigning] = useState(false);

  return (
    <div>
      <PageHeader title="Union Dues" subtitle="Trade union memberships and monthly dues per employee" />

      <Card className="mb-6">
        <Label htmlFor="employee">Employee</Label>
        <div className="max-w-sm">
          <EmployeePicker value={employeeId} onChange={setEmployeeId} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Union Memberships"
          action={
            employeeId ? (
              <Button onClick={() => setAssigning(true)}>Assign Membership</Button>
            ) : undefined
          }
        />
        {!employeeId ? (
          <EmptyState label="Select an employee to view their union memberships." />
        ) : null}
        {employeeId && memberships.loading ? <LoadingState /> : null}
        {memberships.error ? <ErrorState message={memberships.error} /> : null}
        {employeeId && memberships.data && memberships.data.length === 0 ? (
          <EmptyState label="No union memberships on record for this employee." />
        ) : null}
        {memberships.data && memberships.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Union</Th>
                <Th>Membership No.</Th>
                <Th align="right">Monthly Dues</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {memberships.data.map((membership) => (
                <tr key={membership.id}>
                  <Td className="font-bold">{membership.union_name}</Td>
                  <Td>{membership.membership_number ?? "—"}</Td>
                  <Td align="right">{formatMoney(membership.monthly_dues_minor)}</Td>
                  <Td>{formatDate(membership.joined_date)}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[membership.status]}>{membership.status}</Badge>
                  </Td>
                  <Td align="right">
                    {membership.status !== "terminated" ? (
                      <TerminateButton
                        membershipId={membership.id}
                        unionName={membership.union_name}
                        onDone={() => memberships.reload()}
                      />
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {assigning && employeeId ? (
        <AssignMembershipDrawer
          employeeId={employeeId}
          onClose={() => setAssigning(false)}
          onAssigned={() => {
            setAssigning(false);
            memberships.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function TerminateButton({
  membershipId,
  unionName,
  onDone,
}: {
  membershipId: string;
  unionName: string;
  onDone: () => void;
}) {
  async function terminate() {
    await unionMembershipsApi.terminate(membershipId, {
      terminated_date: new Date().toISOString().slice(0, 10),
    });
    onDone();
  }

  return (
    <ConfirmActionButton
      action={terminate}
      label="Terminate"
      tone="danger"
      confirmTitle="Terminate this membership?"
      confirmMessage={`This ends the employee's membership in ${unionName} as of today.`}
      confirmLabel="Terminate"
    />
  );
}

function AssignMembershipDrawer({
  employeeId,
  onClose,
  onAssigned,
}: {
  employeeId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { showToast } = useToast();
  const [unionName, setUnionName] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [monthlyDues, setMonthlyDues] = useState("");
  const [joinedDate, setJoinedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await unionMembershipsApi.assign(employeeId, {
        union_name: unionName,
        membership_number: membershipNumber || null,
        monthly_dues_minor: toMinorUnits(monthlyDues),
        joined_date: joinedDate,
      });
      showToast("Union membership assigned", "good");
      onAssigned();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Assign Union Membership" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="union-name">Union Name</Label>
          <Input
            id="union-name"
            value={unionName}
            onChange={(event) => setUnionName(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="membership-number">Membership Number</Label>
          <Input
            id="membership-number"
            value={membershipNumber}
            onChange={(event) => setMembershipNumber(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="monthly-dues">Monthly Dues ({currencyLabel()})</Label>
          <Input
            id="monthly-dues"
            type="number"
            min={0}
            step="0.01"
            value={monthlyDues}
            onChange={(event) => setMonthlyDues(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="joined-date">Joined Date</Label>
          <Input
            id="joined-date"
            type="date"
            value={joinedDate}
            onChange={(event) => setJoinedDate(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
