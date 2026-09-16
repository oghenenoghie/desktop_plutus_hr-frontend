"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { publicHolidaysApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

const CURRENT_YEAR = new Date().getFullYear();

export default function PublicHolidaysPage() {
  const holidays = useApiResource(() => publicHolidaysApi.list());
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seedYear, setSeedYear] = useState(String(CURRENT_YEAR));
  const [seeding, setSeeding] = useState(false);

  const sorted = [...(holidays.data ?? [])].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await publicHolidaysApi.create({ holiday_date: date, name });
      showToast("Public holiday added", "good");
      setName("");
      setDate("");
      holidays.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSeed() {
    setSeeding(true);
    try {
      await publicHolidaysApi.seedDefaults(Number(seedYear));
      showToast(`Federal holidays seeded for ${seedYear}`, "good");
      holidays.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSeeding(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await publicHolidaysApi.remove(id);
      showToast("Public holiday removed", "good");
      holidays.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Public Holidays"
        subtitle="Federal and state holidays observed by this organisation — leave duration is counted in working days against this calendar"
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Label htmlFor="seed-year">Seed federal holidays for a year</Label>
            <Input
              id="seed-year"
              type="number"
              value={seedYear}
              onChange={(event) => setSeedYear(event.target.value)}
            />
          </div>
          <Button variant="secondary" disabled={seeding} onClick={onSeed}>
            {seeding ? "Seeding…" : "Seed Defaults"}
          </Button>
        </div>
      </Card>

      <Card className="mb-6">
        <form onSubmit={onAdd} className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="holiday-date">Date</Label>
            <Input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="holiday-name">Name</Label>
            <Input
              id="holiday-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Democracy Day"
              required
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add Holiday"}
          </Button>
        </form>
      </Card>

      <Card>
        {holidays.loading ? <LoadingState /> : null}
        {holidays.error ? <ErrorState message={holidays.error} /> : null}
        {sorted.length === 0 && !holidays.loading ? (
          <EmptyState label="No public holidays recorded yet." />
        ) : null}
        {sorted.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Date</Th>
                <Th>Name</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {sorted.map((holiday) => (
                <tr key={holiday.id}>
                  <Td>{formatDate(holiday.holiday_date)}</Td>
                  <Td className="font-bold">{holiday.name}</Td>
                  <Td align="right">
                    <ConfirmActionButton
                      action={() => onDelete(holiday.id)}
                      label="Delete"
                      confirmTitle="Remove this public holiday?"
                      confirmMessage={`${holiday.name} on ${formatDate(holiday.holiday_date)} will no longer count as a non-working day.`}
                      confirmLabel="Remove"
                    />
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
