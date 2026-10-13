"use client";

import { useState } from "react";

import {
  StockLinesEditor,
  errorText,
  stockLinesBody,
  stockLinesFrom,
  type StockLineDraft,
} from "@/components/inventory/document-ui";
import { EmployeePicker } from "@/components/employee-picker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { inventoryApi, stockIssuesApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { useApiResource } from "@/lib/hooks";
import { isRequesterOnly, todayInLagos } from "@/lib/inventory";
import type { StockIssue, StockIssueBody } from "@/lib/types";

// Create or edit a draft stock issue. A department manager raises issues
// only for the departments they head (the API lists just those); an
// inventory operator can raise one for anyone, or for no department.
export function StockIssueForm({
  issue,
  onSaved,
  onCancel,
}: {
  issue?: StockIssue;
  onSaved: (saved: StockIssue) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const requesterOnly = isRequesterOnly(user?.role);
  const warehouses = useApiResource(() => inventoryApi.warehouses());
  const items = useApiResource(() => inventoryApi.items());
  const departments = useApiResource(() => stockIssuesApi.departments());
  const [warehouseId, setWarehouseId] = useState(issue?.warehouse_id ?? "");
  const [departmentId, setDepartmentId] = useState(issue?.department_id ?? "");
  const [requestedBy, setRequestedBy] = useState(issue?.requested_by_employee_id ?? "");
  const [issueDate, setIssueDate] = useState(issue?.issue_date ?? todayInLagos());
  const [purpose, setPurpose] = useState(issue?.purpose ?? "");
  const [notes, setNotes] = useState(issue?.notes ?? "");
  const [lines, setLines] = useState<StockLineDraft[]>(() => stockLinesFrom(issue?.lines));
  const [submitting, setSubmitting] = useState(false);

  const effectiveWarehouse = warehouseId || warehouses.data?.[0]?.id || "";
  const effectiveDepartment = departmentId || (requesterOnly ? departments.data?.[0]?.id ?? "" : "");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const body = stockLinesBody(lines);
    if (typeof body === "string") return showToast(body, "bad");
    if (!effectiveWarehouse) return showToast("Choose the warehouse to issue from.", "bad");
    if (requesterOnly && !effectiveDepartment) return showToast("Choose your department.", "bad");
    const payload: StockIssueBody = {
      warehouse_id: effectiveWarehouse,
      department_id: effectiveDepartment || null,
      requested_by_employee_id: requesterOnly ? null : requestedBy || null,
      issue_date: issueDate,
      purpose: purpose.trim(),
      notes: notes || null,
      lines: body,
    };
    setSubmitting(true);
    try {
      const saved = issue
        ? await stockIssuesApi.update(issue.id, payload)
        : await stockIssuesApi.create(payload);
      onSaved(saved);
    } catch (err) {
      showToast(errorText(err, "Could not save."), "bad");
      setSubmitting(false);
    }
  }

  if (warehouses.loading || items.loading || departments.loading) return <LoadingState />;
  const error = items.error ?? warehouses.error ?? departments.error;
  if (error) return <ErrorState message={error} />;
  if (requesterOnly && (departments.data ?? []).length === 0) {
    return <EmptyState label="You don't head a department, so there is nothing to request stock for." />;
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader title="Issue" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="issue-warehouse">Issue from</Label>
            <Select id="issue-warehouse" value={effectiveWarehouse} onChange={(e) => setWarehouseId(e.target.value)} required>
              {(warehouses.data ?? []).map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="issue-department">Department</Label>
            <Select id="issue-department" value={effectiveDepartment} onChange={(e) => setDepartmentId(e.target.value)} required={requesterOnly}>
              {requesterOnly ? null : <option value="">No department</option>}
              {(departments.data ?? []).map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="issue-date">Issue date</Label>
            <Input id="issue-date" type="date" value={issueDate} max={todayInLagos()} onChange={(e) => setIssueDate(e.target.value)} required />
          </div>
          {requesterOnly ? null : (
            <div>
              <Label htmlFor="issue-requested-by">Requested by</Label>
              <EmployeePicker id="issue-requested-by" value={requestedBy} onChange={setRequestedBy} />
              <p className="mt-1 text-[11px] text-ink-soft">Leave blank to record yourself. Their manager can be an approver.</p>
            </div>
          )}
          <div className={requesterOnly ? "sm:col-span-3" : "sm:col-span-2"}>
            <Label htmlFor="issue-purpose">Purpose</Label>
            <Input id="issue-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={500} required placeholder="e.g. Office supplies for Q4" />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="issue-notes">Notes</Label>
            <Textarea id="issue-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Items" subtitle="Stock and consumable items only; stock leaves at the item's average cost when the issue is posted." />
        <StockLinesEditor items={items.data ?? []} lines={lines} onChange={setLines} idPrefix="issue" />
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : issue ? "Save changes" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
