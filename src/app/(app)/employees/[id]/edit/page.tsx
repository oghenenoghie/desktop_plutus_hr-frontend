"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

import {
  EmployeeFormFields,
  type EmployeeFormState,
  Field,
  formFromEmployee,
  updateBodyFromForm,
} from "@/components/employees/employee-form";
import { EmployeePhotoField } from "@/components/employee-photo-field";
import { PageHeader } from "@/components/layout/page-header";
import { useIsNigeria } from "@/components/region-field";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { employeesApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type { Employee } from "@/lib/types";

// Every field recorded when the employee was created, editable afterwards,
// so a record started with the minimum (no TIN, no email) can be completed.
export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const employee = useApiResource(() => employeesApi.get(id), [id]);

  return (
    <div>
      {employee.loading && !employee.data ? <LoadingState /> : null}
      {employee.error ? <ErrorState message={employee.error} /> : null}
      {employee.data ? (
        <EditEmployeeForm employee={employee.data} onPhotoChanged={employee.reload} />
      ) : null}
    </div>
  );
}

function EditEmployeeForm({ employee, onPhotoChanged }: { employee: Employee; onPhotoChanged: () => void }) {
  const isNigeria = useIsNigeria();
  const router = useRouter();
  const { showToast } = useToast();
  const [initial] = useState<EmployeeFormState>(() => formFromEmployee(employee));
  const [form, setForm] = useState<EmployeeFormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  // Pay is null when it's masked from this viewer: it isn't shown, and
  // isn't sent.
  const payVisible = employee.basic_minor !== null;

  function set<K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const body = updateBodyFromForm(initial, form, { isNigeria, payVisible });
    if (Object.keys(body).length === 0) {
      router.push(`/employees/${employee.id}`);
      return;
    }
    setSubmitting(true);
    try {
      await employeesApi.update(employee.id, body);
      showToast("Employee details saved", "good");
      router.push(`/employees/${employee.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not save the changes.");
      setSubmitting(false);
    }
  }

  async function onPhotoSelected(blob: Blob, consent: boolean) {
    setPhotoBusy(true);
    try {
      await employeesApi.uploadPhoto(employee.id, blob, consent);
      showToast("Photo updated", "good");
      onPhotoChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Photo upload failed.", "bad");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onPhotoRemoved() {
    setPhotoBusy(true);
    try {
      await employeesApi.deletePhoto(employee.id);
      showToast("Photo removed", "good");
      onPhotoChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not remove photo.", "bad");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={`Edit ${employee.full_name}`}
        subtitle="Complete or correct any detail. A change to pay is kept in the employee's history."
      />
      <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
        <EmployeeFormFields
          form={form}
          set={set}
          payVisible={payVisible}
          photo={
            <Field label="Photo" full group>
              <EmployeePhotoField
                name={employee.full_name}
                previewUrl={employee.photo_url}
                busy={photoBusy}
                onSelect={onPhotoSelected}
                onRemove={onPhotoRemoved}
              />
            </Field>
          }
        />

        {error ? <ErrorState message={error} /> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push(`/employees/${employee.id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </>
  );
}
