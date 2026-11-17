"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { employeesApi, performanceReviewsApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function PerformancePage() {
  const router = useRouter();
  const reviews = useApiResource(() => performanceReviewsApi.list());
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Performance"
        subtitle="Review cycles, ratings and acknowledgements"
        action={<Button onClick={() => setCreating(true)}>New Review</Button>}
      />

      <Card>
        {reviews.loading ? <LoadingState /> : null}
        {reviews.error ? <ErrorState message={reviews.error} /> : null}
        {reviews.data && reviews.data.length === 0 ? (
          <EmptyState label="No performance reviews on record yet." />
        ) : null}
        {reviews.data && reviews.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Employee</Th>
                <Th>Period</Th>
                <Th>Status</Th>
                <Th>Rating</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {reviews.data.map((review) => (
                <tr key={review.id}>
                  <Td className="font-bold">
                    {employeesById.get(review.employee_id)?.full_name ?? "—"}
                  </Td>
                  <Td>
                    {formatDate(review.period_start)} – {formatDate(review.period_end)}
                  </Td>
                  <Td>
                    <StatusBadge status={review.status} />
                  </Td>
                  <Td>{review.rating != null ? `${review.rating}/5` : "—"}</Td>
                  <Td align="right">
                    <Button
                      size="md"
                      variant="secondary"
                      onClick={() => router.push(`/performance/${review.id}`)}
                    >
                      View
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewReviewModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/performance/${id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function NewReviewModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { showToast } = useToast();
  const employees = useApiResource(() => employeesApi.list());
  const [employeeId, setEmployeeId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [goals, setGoals] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const review = await performanceReviewsApi.create({
        employee_id: employeeId,
        period_start: periodStart,
        period_end: periodEnd,
        goals: goals || null,
      });
      showToast("Performance review created", "good");
      onCreated(review.id);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Performance Review" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="employee">Employee</Label>
          <Select
            id="employee"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            required
          >
            <option value="">Select an employee</option>
            {(employees.data ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="period-start">Period Start</Label>
          <Input
            id="period-start"
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="period-end">Period End</Label>
          <Input
            id="period-end"
            type="date"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="goals">Goals</Label>
          <Textarea
            id="goals"
            value={goals}
            onChange={(event) => setGoals(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Review"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
