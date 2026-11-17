"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { disciplinaryCasesApi, employeesApi } from "@/lib/api/endpoints";
import { caseStatusTone } from "@/lib/case-status";
import { formatDate, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { DisciplinaryCaseCategory } from "@/lib/types";

const CATEGORIES: DisciplinaryCaseCategory[] = [
  "misconduct",
  "attendance",
  "policy_violation",
  "harassment",
  "other",
];

export default function EmployeeRelationsPage() {
  const router = useRouter();
  const cases = useApiResource(() => disciplinaryCasesApi.list());
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Employee Relations"
        subtitle="Disciplinary cases and their resolutions"
        action={<Button onClick={() => setCreating(true)}>New Case</Button>}
      />

      <Card>
        {cases.loading ? <LoadingState /> : null}
        {cases.error ? <ErrorState message={cases.error} /> : null}
        {cases.data && cases.data.length === 0 ? (
          <EmptyState label="No disciplinary cases on record." />
        ) : null}
        {cases.data && cases.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Employee</Th>
                <Th>Category</Th>
                <Th>Incident Date</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {cases.data.map((disciplinaryCase) => (
                <tr key={disciplinaryCase.id}>
                  <Td className="font-bold">
                    {employeesById.get(disciplinaryCase.employee_id)?.full_name ?? "—"}
                  </Td>
                  <Td>{titleCase(disciplinaryCase.category)}</Td>
                  <Td>{formatDate(disciplinaryCase.incident_date)}</Td>
                  <Td>
                    <Badge tone={caseStatusTone(disciplinaryCase.status)}>
                      {disciplinaryCase.status.replace(/_/g, " ")}
                    </Badge>
                  </Td>
                  <Td align="right">
                    <Button
                      size="md"
                      variant="secondary"
                      onClick={() => router.push(`/employee-relations/${disciplinaryCase.id}`)}
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
        <NewCaseModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/employee-relations/${id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function NewCaseModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { showToast } = useToast();
  const employees = useApiResource(() => employeesApi.list());
  const [employeeId, setEmployeeId] = useState("");
  const [category, setCategory] = useState<DisciplinaryCaseCategory>("misconduct");
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await disciplinaryCasesApi.create({
        employee_id: employeeId,
        category,
        description,
        incident_date: incidentDate,
      });
      showToast("Case opened", "good");
      onCreated(created.id);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Disciplinary Case" onClose={onClose}>
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
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as DisciplinaryCaseCategory)}
          >
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="incident-date">Incident Date</Label>
          <Input
            id="incident-date"
            type="date"
            value={incidentDate}
            onChange={(event) => setIncidentDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Opening…" : "Open Case"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
