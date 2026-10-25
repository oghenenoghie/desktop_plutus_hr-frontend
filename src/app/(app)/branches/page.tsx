"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { branchesApi, employeesApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import { RegionField, useRegionLabel } from "@/components/region-field";
import type { Branch, Employee } from "@/lib/types";

export default function BranchesPage() {
  const branches = useApiResource(() => branchesApi.list());
  const employees = useApiResource(() => employeesApi.list());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));

  return (
    <div>
      <PageHeader
        title="Branches"
        subtitle="Physical office locations and their managers"
        action={<Button onClick={() => setCreating(true)}>New Branch</Button>}
      />

      <Card>
        {branches.loading ? <LoadingState /> : null}
        {branches.error ? <ErrorState message={branches.error} /> : null}
        {branches.data && branches.data.length === 0 ? (
          <EmptyState label="No branches on record yet." />
        ) : null}
        {branches.data && branches.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>State</Th>
                <Th>Address</Th>
                <Th>Manager</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {branches.data.map((branch) => {
                const manager = branch.manager_id ? employeesById.get(branch.manager_id) : null;
                return (
                  <tr key={branch.id}>
                    <Td className="font-bold">{branch.name}</Td>
                    <Td>{branch.state ?? "—"}</Td>
                    <Td>{branch.address ?? "—"}</Td>
                    <Td>{manager ? manager.full_name : "—"}</Td>
                    <Td align="right">
                      <Button size="md" variant="secondary" onClick={() => setEditing(branch)}>
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
        <BranchDrawer
          employees={employees.data ?? []}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            branches.reload();
          }}
        />
      ) : null}

      {editing ? (
        <BranchDrawer
          branch={editing}
          employees={employees.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            branches.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function BranchDrawer({
  branch,
  employees,
  onClose,
  onSaved,
}: {
  branch?: Branch;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const regionLabel = useRegionLabel();
  const { showToast } = useToast();
  const [name, setName] = useState(branch?.name ?? "");
  const [state, setState] = useState(branch?.state ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [managerId, setManagerId] = useState(branch?.manager_id ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        name,
        state: state || null,
        address: address || null,
        manager_id: managerId || null,
      };
      if (branch) {
        await branchesApi.update(branch.id, body);
        showToast("Branch updated", "good");
      } else {
        await branchesApi.create(body);
        showToast("Branch created", "good");
      }
      onSaved();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={branch ? "Edit Branch" : "New Branch"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Lagos HQ"
            required
          />
        </div>
        <div>
          <Label htmlFor="state">{regionLabel}</Label>
          <RegionField id="state" value={state ?? ""} onChange={setState} emptyLabel="Not specified" />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={address ?? ""}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Optional"
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
            {submitting ? "Saving…" : branch ? "Save Changes" : "Create Branch"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
