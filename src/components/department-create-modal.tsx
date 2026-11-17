"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { departmentsApi } from "@/lib/api/endpoints";
import type { Department, Role } from "@/lib/types";

// The roles the API lets create a department (POST /departments).
export function canCreateDepartments(role: Role | undefined): boolean {
  return role === "admin" || role === "payroll_manager" || role === "accountant";
}

// Adds a department without leaving the form that needs it (a stock issue,
// for example). The manager can be assigned later on the Departments page.
export function DepartmentCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (department: Department) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const department = await departmentsApi.create({ name: name.trim(), manager_id: null });
      showToast(`${department.name} department created`, "good");
      onCreated(department);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not create the department.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Department" onClose={onClose} size="sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="new-department-name">Name</Label>
          <Input
            id="new-department-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            required
            placeholder="e.g. Finance"
          />
          <p className="mt-1 text-[11px] text-ink-soft">Assign its manager later on the Departments page.</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Creating…" : "Create Department"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
