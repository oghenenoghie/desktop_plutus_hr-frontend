"use client";

import { useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { employeesApi, shiftRosterApi, shiftsApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

const TODAY = new Date().toISOString().slice(0, 10);

export default function ShiftRosterPage() {
  const employees = useApiResource(() => employeesApi.list());
  const [employeeId, setEmployeeId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const entries = useApiResource(
    () => (employeeId ? shiftRosterApi.forEmployee(employeeId) : Promise.resolve([])),
    [employeeId],
  );
  const shifts = useApiResource(() => shiftsApi.list());
  const shiftsById = new Map((shifts.data ?? []).map((shift) => [shift.id, shift]));

  return (
    <div>
      <PageHeader
        title="Shift Roster"
        subtitle="Assign employees onto shifts for a date range"
        action={
          <Button onClick={() => setAssigning(true)} disabled={!employeeId}>
            Assign Shift
          </Button>
        }
      />

      <Card className="mb-6">
        <Label htmlFor="employee">Employee</Label>
        <EmployeePicker value={employeeId} onChange={setEmployeeId} />
      </Card>

      {employeeId ? (
        <Card>
          <CardHeader
            title={`Roster — ${employees.data?.find((e) => e.id === employeeId)?.full_name ?? ""}`}
          />
          {entries.loading ? <LoadingState /> : null}
          {entries.error ? <ErrorState message={entries.error} /> : null}
          {entries.data && entries.data.length === 0 ? (
            <EmptyState label="No roster entries for this employee yet." />
          ) : null}
          {entries.data && entries.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Shift</Th>
                </tr>
              </Thead>
              <tbody>
                {entries.data.map((entry) => (
                  <tr key={entry.id}>
                    <Td>{formatDate(entry.work_date)}</Td>
                    <Td className="font-bold">{shiftsById.get(entry.shift_id)?.name ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>
      ) : null}

      {assigning ? (
        <AssignRosterModal
          employeeId={employeeId}
          onClose={() => setAssigning(false)}
          onAssigned={() => {
            setAssigning(false);
            entries.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function AssignRosterModal({
  employeeId,
  onClose,
  onAssigned,
}: {
  employeeId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { showToast } = useToast();
  const shifts = useApiResource(() => shiftsApi.list());
  const [shiftId, setShiftId] = useState("");
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await shiftRosterApi.create({
        employee_id: employeeId,
        shift_id: shiftId,
        start_date: startDate,
        end_date: endDate,
      });
      showToast("Roster entries created", "good");
      onAssigned();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Assign Shift" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="shift">Shift</Label>
          <Select id="shift" value={shiftId} onChange={(event) => setShiftId(event.target.value)} required>
            <option value="">Select a shift</option>
            {(shifts.data ?? []).map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
          </div>
        </div>
        <p className="text-[12px] text-ink-soft">
          Creates one roster entry per day in the range, rejecting the whole range if any day is
          already booked.
        </p>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
