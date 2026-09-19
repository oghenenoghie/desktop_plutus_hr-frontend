"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { departmentsApi, employeesApi, fixedAssetOpsApi, fixedAssetsApi } from "@/lib/api/endpoints";
import { formatDate, formatNaira, nairaToMinor, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { FixedAsset, FixedAssetCategory } from "@/lib/types";

const CATEGORIES: FixedAssetCategory[] = ["laptop", "phone", "vehicle", "furniture", "other"];
// A laptop/phone/vehicle doesn't just exist — it's issued to someone from
// day one, the same rule the backend's register_fixed_asset enforces.
const REQUIRES_ASSIGNEE = new Set<FixedAssetCategory>(["laptop", "phone", "vehicle"]);

export default function FixedAssetsPage() {
  const assets = useApiResource(() => fixedAssetsApi.list());
  const departments = useApiResource(() => departmentsApi.list());
  const departmentsById = new Map((departments.data ?? []).map((department) => [department.id, department]));
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [disposing, setDisposing] = useState<FixedAsset | null>(null);
  const [transferring, setTransferring] = useState<FixedAsset | null>(null);
  const [revaluing, setRevaluing] = useState<FixedAsset | null>(null);
  const [assigning, setAssigning] = useState<FixedAsset | null>(null);
  const [returning, setReturning] = useState<FixedAsset | null>(null);

  async function depreciate(asset: FixedAsset) {
    try {
      await fixedAssetsApi.depreciate(asset.id);
      assets.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function batchDepreciate() {
    try {
      const updated = await fixedAssetOpsApi.batchDepreciate();
      showToast(`Depreciated ${updated.length} asset(s)`, "good");
      assets.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Fixed Assets"
        subtitle="Depreciable company property — cost, accumulated depreciation, and book value"
        action={
          <div className="flex gap-3">
            <ConfirmActionButton
              action={batchDepreciate}
              label="Run Batch Depreciation"
              tone="primary"
              confirmTitle="Run batch depreciation for all active assets?"
              confirmMessage="Posts one period of straight-line depreciation for every active fixed asset in this org."
              confirmLabel="Run"
            />
            <Button onClick={() => setCreating(true)}>New Fixed Asset</Button>
          </div>
        }
      />

      <Card>
        {assets.loading ? <LoadingState /> : null}
        {assets.error ? <ErrorState message={assets.error} /> : null}
        {assets.data && assets.data.length === 0 ? (
          <EmptyState label="No fixed assets yet." />
        ) : null}
        {assets.data && assets.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Tag</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Department</Th>
                <Th>Assigned To</Th>
                <Th>Acquired</Th>
                <Th align="right">Cost</Th>
                <Th align="right">Accum. Depreciation</Th>
                <Th align="right">Book Value</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {assets.data.map((asset) => (
                <tr key={asset.id}>
                  <Td className="font-mono text-[12px]">{asset.asset_tag}</Td>
                  <Td className="font-bold">{asset.name}</Td>
                  <Td>{asset.category ? titleCase(asset.category) : "—"}</Td>
                  <Td>
                    {asset.department_id ? (departmentsById.get(asset.department_id)?.name ?? "—") : "—"}
                  </Td>
                  <Td>
                    {asset.assigned_employee_id
                      ? (employeesById.get(asset.assigned_employee_id)?.full_name ?? "—")
                      : "—"}
                  </Td>
                  <Td>{formatDate(asset.acquisition_date)}</Td>
                  <Td align="right">{formatNaira(asset.cost_minor)}</Td>
                  <Td align="right">{formatNaira(asset.accumulated_depreciation_minor)}</Td>
                  <Td align="right" className="font-bold">
                    {formatNaira(asset.book_value_minor)}
                  </Td>
                  <Td>
                    <StatusBadge status={asset.status} />
                  </Td>
                  <Td align="right">
                    {asset.status === "active" ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {asset.assignment_status === "available" ? (
                          <Button size="md" variant="secondary" onClick={() => setAssigning(asset)}>
                            Assign
                          </Button>
                        ) : null}
                        {asset.assignment_status === "assigned" ? (
                          <Button size="md" variant="secondary" onClick={() => setReturning(asset)}>
                            Return
                          </Button>
                        ) : null}
                        <Button size="md" variant="secondary" onClick={() => setTransferring(asset)}>
                          Transfer
                        </Button>
                        <Button size="md" variant="secondary" onClick={() => setRevaluing(asset)}>
                          Revalue
                        </Button>
                        <ConfirmActionButton
                          action={() => depreciate(asset)}
                          label="Depreciate"
                          tone="primary"
                          confirmTitle="Record depreciation for this period?"
                          confirmMessage={`Posts one period of straight-line depreciation for "${asset.name}" against accumulated depreciation.`}
                          confirmLabel="Record"
                        />
                        <Button variant="secondary" onClick={() => setDisposing(asset)}>
                          Dispose
                        </Button>
                      </div>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewFixedAssetDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            assets.reload();
          }}
        />
      ) : null}

      {disposing ? (
        <DisposeFixedAssetDrawer
          asset={disposing}
          onClose={() => setDisposing(null)}
          onDisposed={() => {
            setDisposing(null);
            assets.reload();
          }}
        />
      ) : null}

      {transferring ? (
        <TransferFixedAssetDrawer
          asset={transferring}
          onClose={() => setTransferring(null)}
          onTransferred={() => {
            setTransferring(null);
            assets.reload();
          }}
        />
      ) : null}

      {revaluing ? (
        <RevalueFixedAssetDrawer
          asset={revaluing}
          onClose={() => setRevaluing(null)}
          onRevalued={() => {
            setRevaluing(null);
            assets.reload();
          }}
        />
      ) : null}

      {assigning ? (
        <AssignFixedAssetDrawer
          asset={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={() => {
            setAssigning(null);
            assets.reload();
          }}
        />
      ) : null}

      {returning ? (
        <ReturnFixedAssetDrawer
          asset={returning}
          onClose={() => setReturning(null)}
          onReturned={() => {
            setReturning(null);
            assets.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function TransferFixedAssetDrawer({
  asset,
  onClose,
  onTransferred,
}: {
  asset: FixedAsset;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const { showToast } = useToast();
  const departments = useApiResource(() => departmentsApi.list());
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fixedAssetOpsApi.transfer(asset.id, {
        to_department_id: toDepartmentId || null,
        transfer_date: transferDate,
        note: note || null,
      });
      showToast("Asset transferred", "good");
      onTransferred();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Transfer ${asset.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="toDepartment">To Department</Label>
          <Select id="toDepartment" value={toDepartmentId} onChange={(event) => setToDepartmentId(event.target.value)}>
            <option value="">No department</option>
            {(departments.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="transferDate">Transfer Date</Label>
          <Input
            id="transferDate"
            type="date"
            value={transferDate}
            onChange={(event) => setTransferDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="note">Note</Label>
          <Input id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Transferring…" : "Transfer"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function RevalueFixedAssetDrawer({
  asset,
  onClose,
  onRevalued,
}: {
  asset: FixedAsset;
  onClose: () => void;
  onRevalued: () => void;
}) {
  const { showToast } = useToast();
  const [newValue, setNewValue] = useState("");
  const [revaluationDate, setRevaluationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fixedAssetOpsApi.revalue(asset.id, {
        new_value_minor: nairaToMinor(newValue),
        revaluation_date: revaluationDate,
        reason,
      });
      showToast("Asset revalued", "good");
      onRevalued();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Revalue ${asset.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Current book value: <span className="font-bold text-ink">{formatNaira(asset.book_value_minor)}</span>.
          Resets accumulated depreciation and posts the difference to a revaluation surplus/loss account.
        </p>
        <div>
          <Label htmlFor="newValue">New Book Value (₦)</Label>
          <Input
            id="newValue"
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            inputMode="decimal"
            required
          />
        </div>
        <div>
          <Label htmlFor="revaluationDate">Revaluation Date</Label>
          <Input
            id="revaluationDate"
            type="date"
            value={revaluationDate}
            onChange={(event) => setRevaluationDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="reason">Reason</Label>
          <Input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} required />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Revaluing…" : "Revalue"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function AssignFixedAssetDrawer({
  asset,
  onClose,
  onAssigned,
}: {
  asset: FixedAsset;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { showToast } = useToast();
  const employees = useApiResource(() => employeesApi.list());
  const [employeeId, setEmployeeId] = useState("");
  const [assignedDate, setAssignedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fixedAssetsApi.assign(asset.id, { employee_id: employeeId, assigned_date: assignedDate });
      showToast("Asset assigned", "good");
      onAssigned();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Assign ${asset.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="assignEmployee">Employee</Label>
          <Select
            id="assignEmployee"
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
          <Label htmlFor="assignDate">Assigned Date</Label>
          <Input
            id="assignDate"
            type="date"
            value={assignedDate}
            onChange={(event) => setAssignedDate(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !employeeId}>
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function ReturnFixedAssetDrawer({
  asset,
  onClose,
  onReturned,
}: {
  asset: FixedAsset;
  onClose: () => void;
  onReturned: () => void;
}) {
  const { showToast } = useToast();
  const openAssignment = useApiResource(async () => {
    const rows = await fixedAssetsApi.assignments(asset.id);
    return rows.find((row) => row.returned_date === null) ?? null;
  });
  const [returnedDate, setReturnedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [conditionNotes, setConditionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!openAssignment.data) return;
    setSubmitting(true);
    try {
      await fixedAssetsApi.returnAssignment(openAssignment.data.id, {
        returned_date: returnedDate,
        condition_notes: conditionNotes || null,
      });
      showToast("Asset returned", "good");
      onReturned();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Return ${asset.name}`} onClose={onClose}>
      {openAssignment.loading ? <LoadingState /> : null}
      {openAssignment.error ? <ErrorState message={openAssignment.error} /> : null}
      {!openAssignment.loading && !openAssignment.data ? (
        <EmptyState label="No open assignment found for this asset." />
      ) : null}
      {openAssignment.data ? (
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
          <div>
            <Label htmlFor="returnDate">Returned Date</Label>
            <Input
              id="returnDate"
              type="date"
              value={returnedDate}
              onChange={(event) => setReturnedDate(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="conditionNotes">Condition Notes</Label>
            <Input
              id="conditionNotes"
              value={conditionNotes}
              onChange={(event) => setConditionNotes(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="mt-auto flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Returning…" : "Return"}
            </Button>
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}

function NewFixedAssetDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const employees = useApiResource(() => employeesApi.list());
  const [name, setName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [cost, setCost] = useState("");
  const [salvageValue, setSalvageValue] = useState("");
  const [usefulLifeMonths, setUsefulLifeMonths] = useState("");
  const [category, setCategory] = useState<FixedAssetCategory | "">("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const assigneeRequired = category !== "" && REQUIRES_ASSIGNEE.has(category);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fixedAssetsApi.create({
        name,
        asset_tag: assetTag,
        acquisition_date: acquisitionDate,
        cost_minor: nairaToMinor(cost),
        salvage_value_minor: salvageValue ? nairaToMinor(salvageValue) : 0,
        useful_life_months: Number(usefulLifeMonths),
        category: category || null,
        assigned_employee_id: assignedEmployeeId || null,
      });
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Fixed Asset" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="assetTag">Asset Tag</Label>
          <Input
            id="assetTag"
            value={assetTag}
            onChange={(event) => setAssetTag(event.target.value)}
            placeholder="e.g. FA-1003"
            required
          />
        </div>
        <div>
          <Label htmlFor="acquisitionDate">Acquisition Date</Label>
          <Input
            id="acquisitionDate"
            type="date"
            value={acquisitionDate}
            onChange={(event) => setAcquisitionDate(event.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cost">Cost (₦)</Label>
            <Input id="cost" value={cost} onChange={(event) => setCost(event.target.value)} inputMode="decimal" required />
          </div>
          <div>
            <Label htmlFor="salvageValue">Salvage Value (₦)</Label>
            <Input
              id="salvageValue"
              value={salvageValue}
              onChange={(event) => setSalvageValue(event.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="usefulLifeMonths">Useful Life (months)</Label>
          <Input
            id="usefulLifeMonths"
            value={usefulLifeMonths}
            onChange={(event) => setUsefulLifeMonths(event.target.value)}
            inputMode="numeric"
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={category}
            onChange={(event) => {
              const value = event.target.value as FixedAssetCategory | "";
              setCategory(value);
              if (!value || !REQUIRES_ASSIGNEE.has(value)) setAssignedEmployeeId("");
            }}
          >
            <option value="">None — not a tracked device</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
        </div>
        {assigneeRequired ? (
          <div>
            <Label htmlFor="assignedEmployee">Assigned To</Label>
            <Select
              id="assignedEmployee"
              value={assignedEmployeeId}
              onChange={(event) => setAssignedEmployeeId(event.target.value)}
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
        ) : null}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || (assigneeRequired && !assignedEmployeeId)}>
            {submitting ? "Creating…" : "Create Asset"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function DisposeFixedAssetDrawer({
  asset,
  onClose,
  onDisposed,
}: {
  asset: FixedAsset;
  onClose: () => void;
  onDisposed: () => void;
}) {
  const { showToast } = useToast();
  const [proceeds, setProceeds] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fixedAssetsApi.dispose(asset.id, {
        proceeds_minor: proceeds ? nairaToMinor(proceeds) : 0,
      });
      onDisposed();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Dispose ${asset.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Current book value: <span className="font-bold text-ink">{formatNaira(asset.book_value_minor)}</span>.
          Any difference between proceeds and book value posts as a gain or loss.
        </p>
        <div>
          <Label htmlFor="proceeds">Disposal Proceeds (₦)</Label>
          <Input
            id="proceeds"
            value={proceeds}
            onChange={(event) => setProceeds(event.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Disposing…" : "Dispose Asset"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
