"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { shiftsApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { Shift } from "@/lib/types";

// Backend times are "HH:MM:SS"; the <input type="time"> control speaks "HH:MM".
function toInputTime(value: string): string {
  return value.slice(0, 5);
}

function toApiTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function formatTime(value: string): string {
  const [hours, minutes] = value.split(":");
  const h = Number(hours);
  const period = h >= 12 ? "PM" : "AM";
  const twelveHour = h % 12 === 0 ? 12 : h % 12;
  return `${twelveHour}:${minutes} ${period}`;
}

export default function ShiftsPage() {
  const shifts = useApiResource(() => shiftsApi.list());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);

  return (
    <div>
      <PageHeader
        title="Shifts"
        subtitle="Work-shift definitions employees can be rostered onto"
        action={<Button onClick={() => setCreating(true)}>New Shift</Button>}
      />

      <Card>
        {shifts.loading ? <LoadingState /> : null}
        {shifts.error ? <ErrorState message={shifts.error} /> : null}
        {shifts.data && shifts.data.length === 0 ? (
          <EmptyState label="No shifts on record yet." />
        ) : null}
        {shifts.data && shifts.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Starts</Th>
                <Th>Ends</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {shifts.data.map((shift) => (
                <tr key={shift.id}>
                  <Td className="font-bold">{shift.name}</Td>
                  <Td>{formatTime(shift.start_time)}</Td>
                  <Td>{formatTime(shift.end_time)}</Td>
                  <Td align="right">
                    <Button size="md" variant="secondary" onClick={() => setEditing(shift)}>
                      Edit
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <ShiftModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            shifts.reload();
          }}
        />
      ) : null}

      {editing ? (
        <ShiftModal
          shift={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            shifts.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function ShiftModal({
  shift,
  onClose,
  onSaved,
}: {
  shift?: Shift;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(shift?.name ?? "");
  const [startTime, setStartTime] = useState(shift ? toInputTime(shift.start_time) : "");
  const [endTime, setEndTime] = useState(shift ? toInputTime(shift.end_time) : "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = { name, start_time: toApiTime(startTime), end_time: toApiTime(endTime) };
      if (shift) {
        await shiftsApi.update(shift.id, body);
        showToast("Shift updated", "good");
      } else {
        await shiftsApi.create(body);
        showToast("Shift created", "good");
      }
      onSaved();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={shift ? "Edit Shift" : "New Shift"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Morning, Night"
            required
          />
        </div>
        <div>
          <Label htmlFor="start-time">Start Time</Label>
          <Input
            id="start-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="end-time">End Time</Label>
          <Input
            id="end-time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
          />
          <p className="mt-1.5 text-[11px] text-ink-soft">
            An end time earlier than the start time means an overnight shift.
          </p>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : shift ? "Save Changes" : "Create Shift"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
