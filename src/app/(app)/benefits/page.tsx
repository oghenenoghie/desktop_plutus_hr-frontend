"use client";

import { useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { benefitsApi } from "@/lib/api/endpoints";
import { currencyLabel, formatDate, formatMoney, titleCase, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { BenefitFrequency } from "@/lib/types";

export default function BenefitsPage() {
  const { showToast } = useToast();
  const [employeeId, setEmployeeId] = useState("");
  const [adding, setAdding] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ending, setEnding] = useState(false);
  const benefits = useApiResource(
    () => (employeeId ? benefitsApi.forEmployee(employeeId) : Promise.resolve([])),
    [employeeId],
  );

  async function submitEnd(benefitId: string) {
    setEnding(true);
    try {
      await benefitsApi.end(benefitId, endDate);
      showToast("Benefit ended", "good");
      setEndingId(null);
      benefits.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setEnding(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Benefits Administration"
        subtitle="Plan enrollment and employer cost per employee"
        action={employeeId ? <Button onClick={() => setAdding(true)}>Add Benefit</Button> : undefined}
      />

      <Card className="mb-6">
        <Label htmlFor="employee">Employee</Label>
        <div className="max-w-sm">
          <EmployeePicker value={employeeId} onChange={setEmployeeId} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Enrolled Benefits" />
        {!employeeId ? <EmptyState label="Select an employee to view their benefits." /> : null}
        {employeeId && benefits.loading ? <LoadingState /> : null}
        {benefits.error ? <ErrorState message={benefits.error} /> : null}
        {employeeId && benefits.data && benefits.data.length === 0 ? (
          <EmptyState label="No benefits enrolled for this employee." />
        ) : null}
        {benefits.data && benefits.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Plan</Th>
                <Th>Frequency</Th>
                <Th align="right">Value</Th>
                <Th>Effective</Th>
                <Th>Ends</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {benefits.data.map((benefit) => (
                <tr key={benefit.id}>
                  <Td>
                    <div className="font-bold">{benefit.name}</div>
                    {benefit.description ? (
                      <div className="text-[11px] text-ink-soft">{benefit.description}</div>
                    ) : null}
                  </Td>
                  <Td>{titleCase(benefit.frequency)}</Td>
                  <Td align="right">{benefit.value_minor != null ? formatMoney(benefit.value_minor) : "—"}</Td>
                  <Td>{formatDate(benefit.effective_date)}</Td>
                  <Td>{formatDate(benefit.end_date)}</Td>
                  <Td align="right">
                    {!benefit.end_date ? (
                      endingId === benefit.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(event) => setEndDate(event.target.value)}
                            className="w-40"
                          />
                          <Button size="md" onClick={() => submitEnd(benefit.id)} disabled={ending}>
                            {ending ? "Saving…" : "Confirm"}
                          </Button>
                          <Button size="md" variant="secondary" onClick={() => setEndingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="md" variant="secondary" onClick={() => setEndingId(benefit.id)}>
                          End Benefit
                        </Button>
                      )
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {adding ? (
        <AddBenefitDrawer
          employeeId={employeeId}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            benefits.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function AddBenefitDrawer({
  employeeId,
  onClose,
  onAdded,
}: {
  employeeId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<BenefitFrequency>("monthly");
  const [value, setValue] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await benefitsApi.assign(employeeId, {
        name,
        frequency,
        effective_date: effectiveDate,
        description: description || null,
        value_minor: value ? toMinorUnits(value) : null,
      });
      showToast("Benefit added", "good");
      onAdded();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Add Benefit" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Plan Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Health Insurance"
            required
          />
        </div>
        <div>
          <Label htmlFor="frequency">Frequency</Label>
          <Select
            id="frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as BenefitFrequency)}
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
            <option value="one_time">One-Time</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="value">Value ({currencyLabel()}, optional)</Label>
          <Input
            id="value"
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g. 25000"
          />
        </div>
        <div>
          <Label htmlFor="effective-date">Effective Date</Label>
          <Input
            id="effective-date"
            type="date"
            value={effectiveDate}
            onChange={(event) => setEffectiveDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !name}>
            {submitting ? "Adding…" : "Add Benefit"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
