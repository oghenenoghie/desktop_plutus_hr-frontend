"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { departmentsApi, employeesApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { Department, Employee } from "@/lib/types";

export default function DepartmentsPage() {
  const departments = useApiResource(() => departmentsApi.list());
  const employees = useApiResource(() => employeesApi.list());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Organisational structure and department managers"
        action={<Button onClick={() => setCreating(true)}>New Department</Button>}
      />

      <Card>
        {departments.loading ? <LoadingState /> : null}
        {departments.error ? <ErrorState message={departments.error} /> : null}
        {departments.data && departments.data.length === 0 ? (
          <EmptyState label="No departments on record yet." />
        ) : null}
        {departments.data && departments.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Manager</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {departments.data.map((department) => {
                const manager = department.manager_id ? employeesById.get(department.manager_id) : null;
                return (
                  <tr key={department.id}>
                    <Td className="font-bold">{department.name}</Td>
                    <Td>{manager ? manager.full_name : "—"}</Td>
                    <Td align="right">
                      <Button size="md" variant="secondary" onClick={() => setEditing(department)}>
                        Edit
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <DepartmentModal
          employees={employees.data ?? []}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            departments.reload();
          }}
        />
      ) : null}

      {editing ? (
        <DepartmentModal
          department={editing}
          employees={employees.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            departments.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function DepartmentModal({
  department,
  employees,
  onClose,
  onSaved,
}: {
  department?: Department;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(department?.name ?? "");
  const [managerId, setManagerId] = useState(department?.manager_id ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = { name, manager_id: managerId || null };
      if (department) {
        await departmentsApi.update(department.id, body);
        showToast("Department updated", "good");
      } else {
        await departmentsApi.create(body);
        showToast("Department created", "good");
      }
      onSaved();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={department ? "Edit Department" : "New Department"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Finance"
            required
          />
        </div>
        <div>
          <Label htmlFor="manager">Manager</Label>
          <Select id="manager" value={managerId ?? ""} onChange={(event) => setManagerId(event.target.value)}>
            <option value="">No manager assigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : department ? "Save Changes" : "Create Department"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
