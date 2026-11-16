"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  EMPTY_EMPLOYEE_FORM,
  EmployeeFormFields,
  type EmployeeFormState,
  Field,
  createBodyFromForm,
} from "@/components/employees/employee-form";
import { EmployeePhotoField } from "@/components/employee-photo-field";
import { PageHeader } from "@/components/layout/page-header";
import { useIsNigeria } from "@/components/region-field";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/data-state";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { employeesApi } from "@/lib/api/endpoints";

export default function NewEmployeePage() {
  const isNigeria = useIsNigeria();
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<EmployeeFormState>(EMPTY_EMPLOYEE_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<{
    blob: Blob;
    consent: boolean;
    previewUrl: string;
  } | null>(null);

  function set<K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const employee = await employeesApi.create(createBodyFromForm(form, isNigeria));
      if (pendingPhoto) {
        try {
          await employeesApi.uploadPhoto(employee.id, pendingPhoto.blob, pendingPhoto.consent);
        } catch (photoErr) {
          showToast(
            photoErr instanceof ApiError
              ? String(photoErr.detail ?? photoErr.message)
              : "Employee created, but the photo upload failed — add it from the employee's page.",
            "bad",
          );
        }
      }
      if (isNigeria && !form.tin.trim()) {
        showToast("Employee created. Add their TIN before running payroll for them.", "good");
      }
      router.push(`/employees?created=${employee.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not create employee.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Employee"
        subtitle={
          isNigeria
            ? "Every field here feeds TIN gating, PAYE, pension and NHF for this employee. Anything left out can be added later."
            : "The employee's record, ready for payroll once it's available in your country. Anything left out can be added later."
        }
      />

      <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
        <EmployeeFormFields
          form={form}
          set={set}
          photo={
            <Field label="Photo" full group>
              <EmployeePhotoField
                name={form.full_name}
                previewUrl={pendingPhoto?.previewUrl ?? null}
                onSelect={(blob, consent) =>
                  setPendingPhoto((prev) => {
                    if (prev) URL.revokeObjectURL(prev.previewUrl);
                    return { blob, consent, previewUrl: URL.createObjectURL(blob) };
                  })
                }
              />
            </Field>
          }
        />

        {error ? <ErrorState message={error} /> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/employees")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}
