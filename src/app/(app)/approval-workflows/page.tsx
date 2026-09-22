"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { approvalWorkflowsApi, employeesApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import type {
  ApprovalRequestType,
  ApprovalStepEligibilityType,
  ApprovalWorkflowStepInput,
  Role,
} from "@/lib/types";

const REQUEST_TYPES: { value: ApprovalRequestType; label: string }[] = [
  { value: "leave_request", label: "Leave Requests" },
  { value: "expense", label: "Expenses" },
  { value: "bill", label: "Vendor Bills" },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "payroll_manager", label: "Payroll Manager" },
  { value: "manager", label: "Manager" },
];

function emptyStep(): ApprovalWorkflowStepInput {
  return { eligibility_type: "role", eligible_role: "payroll_manager", eligible_account_id: null };
}

export default function ApprovalWorkflowsPage() {
  const { showToast } = useToast();
  const [requestType, setRequestType] = useState<ApprovalRequestType>("leave_request");
  const configured = useApiResource(() => approvalWorkflowsApi.list(requestType), [requestType]);
  const employees = useApiResource(() => employeesApi.list());
  const [steps, setSteps] = useState<ApprovalWorkflowStepInput[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Seeds local editable state from the server once per request-type
    // switch — not a derived-state loop, since the user then owns edits
    // until Save reloads it.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (configured.data) {
      setSteps(
        configured.data.map((step) => ({
          eligibility_type: step.eligibility_type,
          eligible_role: step.eligible_role,
          eligible_account_id: step.eligible_account_id,
        })),
      );
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [configured.data]);

  const namedApprovers = (employees.data ?? []).filter((employee) => employee.account_id);

  function updateStep(index: number, patch: Partial<ApprovalWorkflowStepInput>) {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function onEligibilityTypeChange(index: number, type: ApprovalStepEligibilityType) {
    if (type === "role") {
      updateStep(index, {
        eligibility_type: type,
        eligible_role: "payroll_manager",
        eligible_account_id: null,
      });
    } else if (type === "specific_person") {
      updateStep(index, {
        eligibility_type: type,
        eligible_role: null,
        eligible_account_id: namedApprovers[0]?.account_id ?? null,
      });
    } else {
      updateStep(index, { eligibility_type: type, eligible_role: null, eligible_account_id: null });
    }
  }

  function addStep() {
    setSteps((current) => [...current, emptyStep()]);
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    try {
      await approvalWorkflowsApi.replace(requestType, steps);
      showToast("Workflow saved", "good");
      configured.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Approval Workflows"
        subtitle="Configure who approves what, and in what order"
      />

      <Card className="mb-6">
        <Label htmlFor="request-type">Request Type</Label>
        <div className="max-w-sm">
          <Select
            id="request-type"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value as ApprovalRequestType)}
          >
            {REQUEST_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Steps"
          subtitle="Each step must approve, in order, before the request is finalized"
          action={<Button onClick={addStep}>Add Step</Button>}
        />
        {configured.loading ? <LoadingState /> : null}
        {configured.error ? <ErrorState message={configured.error} /> : null}
        {!configured.loading && steps.length === 0 ? (
          <p className="py-6 text-[13px] text-ink-soft">
            No steps configured — Admin or Payroll Manager can decide any request
            {requestType !== "bill" ? ", and a Manager can decide their own team's requests" : ""}.
            Add a step below to require a specific approval chain instead.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-3 rounded-panel border border-border p-3"
              >
                <span className="w-14 shrink-0 text-[12px] font-bold text-ink-soft">
                  Step {index + 1}
                </span>
                <div className="w-56">
                  <Select
                    value={step.eligibility_type}
                    onChange={(event) =>
                      onEligibilityTypeChange(index, event.target.value as ApprovalStepEligibilityType)
                    }
                  >
                    <option value="role">A specific role</option>
                    {requestType !== "bill" ? (
                      <>
                        <option value="direct_manager">Requester&apos;s direct manager</option>
                        <option value="department_head">Requester&apos;s department head</option>
                      </>
                    ) : null}
                    <option value="specific_person">One named person</option>
                  </Select>
                </div>
                {step.eligibility_type === "role" ? (
                  <div className="w-56">
                    <Select
                      value={step.eligible_role ?? "payroll_manager"}
                      onChange={(event) =>
                        updateStep(index, { eligible_role: event.target.value as Role })
                      }
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
                {step.eligibility_type === "specific_person" ? (
                  <div className="w-64">
                    <Select
                      value={step.eligible_account_id ?? ""}
                      onChange={(event) => updateStep(index, { eligible_account_id: event.target.value })}
                    >
                      <option value="">Select a person</option>
                      {namedApprovers.map((employee) => (
                        <option key={employee.id} value={employee.account_id!}>
                          {employee.full_name} · {employee.employee_number}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="md"
                    variant="secondary"
                    onClick={() => moveStep(index, -1)}
                    disabled={index === 0}
                  >
                    Move Up
                  </Button>
                  <Button
                    size="md"
                    variant="secondary"
                    onClick={() => moveStep(index, 1)}
                    disabled={index === steps.length - 1}
                  >
                    Move Down
                  </Button>
                  <Button size="md" variant="secondary" onClick={() => removeStep(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
