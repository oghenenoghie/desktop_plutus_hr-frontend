"use client";

import { useState } from "react";

import {
  AssetCategoriesDrawer,
  AssetCategoryModal,
  LeasePaymentDrawer,
  METHOD_LABELS,
  YearEndDepreciationDrawer,
  methodSummary,
  percentToPpm,
  ratePercent,
} from "@/components/fixed-assets/fixed-asset-tools";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { departmentsApi, employeesApi, fixedAssetOpsApi, fixedAssetsApi } from "@/lib/api/endpoints";
import { currencyLabel, formatDate, formatMoney, titleCase, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { withCreated } from "@/lib/records";
import type {
  AssetCategory,
  DepreciationMethod,
  FixedAsset,
  FixedAssetCategory,
  FixedAssetDepreciationEvent,
} from "@/lib/types";

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
  const [viewingHistory, setViewingHistory] = useState<FixedAsset | null>(null);
  const [payingLease, setPayingLease] = useState<FixedAsset | null>(null);
  const [runningYearEnd, setRunningYearEnd] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  // Owned assets and leased (right-of-use) assets are two registers.
  const [register, setRegister] = useState<"acquired" | "leased">("acquired");
  const categories = useApiResource(() => fixedAssetsApi.categories());
  const categoriesById = new Map((categories.data ?? []).map((category) => [category.id, category]));
  const leasedCount = (assets.data ?? []).filter((asset) => asset.acquisition_type === "leased").length;
  const shown = (assets.data ?? []).filter((asset) => (asset.acquisition_type ?? "acquired") === register);
  const leased = register === "leased";

  // Active assets only: a disposed asset is off the books (disposal cleared
  // its cost and accumulated depreciation from the ledger), though the
  // register keeps the figures it had.
  const active = shown.filter((asset) => asset.status === "active");
  const totals = active.reduce(
    (sum, asset) => ({
      cost: sum.cost + asset.cost_minor,
      depreciation: sum.depreciation + asset.accumulated_depreciation_minor,
      bookValue: sum.bookValue + asset.book_value_minor,
    }),
    { cost: 0, depreciation: 0, bookValue: 0 },
  );
  const disposedCount = shown.length - active.length;
  const countedCaption =
    `${active.length} active asset${active.length === 1 ? "" : "s"}` +
    (disposedCount > 0 ? ` · ${disposedCount} disposed not counted` : "");

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
      showToast(`Depreciated ${updated.length} asset(s) for the month`, "good");
      assets.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Fixed Assets"
        subtitle="Owned and leased assets — cost, accumulated depreciation or amortisation, and net book value"
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setManagingCategories(true)}>
              Asset Categories
            </Button>
            <ConfirmActionButton
              action={batchDepreciate}
              label="Run Monthly Depreciation"
              tone="primary"
              confirmTitle="Run one month's depreciation for all active assets?"
              confirmMessage="Posts one month of depreciation (amortisation for leased assets) for every active asset, by each asset's own method and rate."
              confirmLabel="Run"
            />
            <Button variant="secondary" onClick={() => setRunningYearEnd(true)}>
              Year-End Depreciation
            </Button>
            <Button onClick={() => setCreating(true)}>New Fixed Asset</Button>
          </div>
        }
      />

      <div role="tablist" aria-label="Asset register" className="mb-4 flex gap-2">
        {(
          [
            ["acquired", "Owned assets"],
            ["leased", `Leased assets${leasedCount ? ` (${leasedCount})` : ""}`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={register === value}
            onClick={() => setRegister(value)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-bold ${register === value ? "bg-ink text-white" : "bg-surface text-ink-soft hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {assets.data && assets.data.length > 0 ? (
        <section aria-label="Fixed asset totals" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiTile label="Total cost" value={formatMoney(totals.cost)} caption={countedCaption} />
          <KpiTile
            label={leased ? "Amortised" : "Accumulated depreciation"}
            value={formatMoney(totals.depreciation)}
            caption={leased ? "Amortised over the lease terms so far" : "Built up before Plutus and posted since"}
          />
          <KpiTile
            label="Net book value"
            value={formatMoney(totals.bookValue)}
            caption={leased ? "Cost less amortisation" : "Cost less accumulated depreciation"}
          />
        </section>
      ) : null}

      <Card>
        {assets.loading ? <LoadingState /> : null}
        {assets.error ? <ErrorState message={assets.error} /> : null}
        {assets.data && shown.length === 0 ? (
          <EmptyState label={leased ? "No leased assets yet." : "No fixed assets yet."} />
        ) : null}
        {assets.data && shown.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Tag</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>{leased ? "Amortisation" : "Depreciation"}</Th>
                <Th>Department</Th>
                <Th>Assigned To</Th>
                <Th>{leased ? "Lease Start" : "Acquired"}</Th>
                <Th align="right">Cost</Th>
                <Th align="right">{leased ? "Amortised" : "Accum. Depreciation"}</Th>
                <Th align="right">Book Value</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {shown.map((asset) => (
                <tr key={asset.id}>
                  <Td className="font-mono text-[12px]">{asset.asset_tag}</Td>
                  <Td className="font-bold">{asset.name}</Td>
                  <Td>
                    {asset.asset_category_id ? (categoriesById.get(asset.asset_category_id)?.name ?? "—") : asset.category ? titleCase(asset.category) : "—"}
                  </Td>
                  <Td className="text-[12px]">
                    {asset.depreciation_method ? methodSummary(asset) : "—"}
                    {asset.lease_term_months ? <div className="text-ink-soft">Lease term {asset.lease_term_months} months</div> : null}
                  </Td>
                  <Td>
                    {asset.department_id ? (departmentsById.get(asset.department_id)?.name ?? "—") : "—"}
                  </Td>
                  <Td>
                    {asset.assigned_employee_id
                      ? (employeesById.get(asset.assigned_employee_id)?.full_name ?? "—")
                      : "—"}
                  </Td>
                  <Td>{formatDate(asset.acquisition_date)}</Td>
                  <Td align="right">{formatMoney(asset.cost_minor)}</Td>
                  <Td align="right">
                    <div>{formatMoney(asset.accumulated_depreciation_minor)}</div>
                    {/* The history of this figure, for every asset — disposed ones included. */}
                    <button
                      type="button"
                      onClick={() => setViewingHistory(asset)}
                      aria-label={`History of ${asset.asset_tag}`}
                      className="mt-1 cursor-pointer text-[11px] font-bold text-primary underline-offset-2 hover:underline"
                    >
                      History
                    </button>
                  </Td>
                  <Td align="right" className="font-bold">
                    {formatMoney(asset.book_value_minor)}
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
                        {asset.acquisition_type === "leased" ? (
                          <Button size="md" variant="secondary" onClick={() => setPayingLease(asset)}>
                            Lease Payment
                          </Button>
                        ) : (
                          <Button size="md" variant="secondary" onClick={() => setRevaluing(asset)}>
                            Revalue
                          </Button>
                        )}
                        <ConfirmActionButton
                          action={() => depreciate(asset)}
                          label={asset.acquisition_type === "leased" ? "Amortise" : "Depreciate"}
                          tone="primary"
                          confirmTitle={asset.acquisition_type === "leased" ? "Record a month's amortisation?" : "Record a month's depreciation?"}
                          confirmMessage={`Posts one month of ${asset.depreciation_method ? METHOD_LABELS[asset.depreciation_method].toLowerCase() : "straight line"} ${asset.acquisition_type === "leased" ? "amortisation" : "depreciation"} for "${asset.name}".`}
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
            // A category may have been added from the form.
            categories.reload();
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

      {viewingHistory ? (
        <DepreciationHistoryDrawer asset={viewingHistory} onClose={() => setViewingHistory(null)} />
      ) : null}

      {payingLease ? (
        <LeasePaymentDrawer
          asset={payingLease}
          onClose={() => setPayingLease(null)}
          onPaid={() => setPayingLease(null)}
        />
      ) : null}

      {runningYearEnd ? (
        <YearEndDepreciationDrawer onClose={() => setRunningYearEnd(false)} onRun={() => assets.reload()} />
      ) : null}

      {managingCategories ? (
        <AssetCategoriesDrawer
          onClose={() => {
            setManagingCategories(false);
            categories.reload();
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

const EVENT_LABELS: Record<FixedAssetDepreciationEvent["kind"], string> = {
  opening: "Opening balance",
  depreciation: "Depreciation",
  revaluation: "Revaluation",
};

function signedMoney(minor: number): string {
  return minor < 0 ? `−${formatMoney(-minor)}` : `+${formatMoney(minor)}`;
}

// Every change to one asset's accumulated depreciation, oldest first, with
// the running total after each: what it had built up before Plutus, each
// period posted since, and revaluations, which reset it to zero.
function DepreciationHistoryDrawer({ asset, onClose }: { asset: FixedAsset; onClose: () => void }) {
  const history = useApiResource(() => fixedAssetsApi.depreciationHistory(asset.id));
  const unexplained = history.data?.unexplained_minor ?? 0;

  return (
    <Drawer title={`Depreciation History — ${asset.asset_tag}`} onClose={onClose}>
      <p className="mb-3 text-[13px] font-bold text-ink">{asset.name}</p>
      <dl className="mb-5 grid grid-cols-3 gap-3">
        {[
          ["Cost", asset.cost_minor],
          ["Accumulated", asset.accumulated_depreciation_minor],
          ["Book value", asset.book_value_minor],
        ].map(([label, minor]) => (
          <div key={label}>
            <dt className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">{label}</dt>
            <dd className="mt-1 text-[14px] font-extrabold text-ink">{formatMoney(Number(minor))}</dd>
          </div>
        ))}
      </dl>
      {asset.status === "disposed" ? (
        <p className="mb-4 text-[12px] text-ink-soft">
          Disposed {formatDate(asset.disposed_at)}: its cost and accumulated depreciation were taken off the books
          then.
        </p>
      ) : null}
      {history.loading ? <LoadingState /> : null}
      {history.error ? <ErrorState message={history.error} /> : null}
      {history.data && history.data.events.length === 0 ? (
        <EmptyState label="No depreciation recorded for this asset yet." />
      ) : null}
      {history.data && history.data.events.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Date</Th>
              <Th>Event</Th>
              <Th align="right">Change</Th>
              <Th align="right">Accumulated</Th>
            </tr>
          </Thead>
          <tbody>
            {history.data.events.map((event, index) => (
              <tr key={`${event.kind}-${event.date}-${index}`}>
                <Td className="whitespace-nowrap">{formatDate(event.date)}</Td>
                <Td>
                  <div className="font-bold">{EVENT_LABELS[event.kind]}</div>
                  {event.kind !== "depreciation" ? (
                    <div className="text-[11px] text-ink-soft">{event.description}</div>
                  ) : null}
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  {signedMoney(event.amount_minor)}
                </Td>
                <Td align="right" className="whitespace-nowrap font-bold">
                  {formatMoney(event.accumulated_minor)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
      {history.data && unexplained !== 0 ? (
        <p role="note" className="mt-4 rounded-panel bg-warn-tint px-3 py-2.5 text-[12px] text-warn-ink">
          {unexplained > 0
            ? `${formatMoney(unexplained)} of this asset's accumulated depreciation was recorded without a posting this history can trace, for example when the asset was brought in from another system.`
            : `The postings above come to ${formatMoney(-unexplained)} more than this asset's accumulated depreciation.`}
        </p>
      ) : null}
    </Drawer>
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
        new_value_minor: toMinorUnits(newValue),
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
          Current book value: <span className="font-bold text-ink">{formatMoney(asset.book_value_minor)}</span>.
          Resets accumulated depreciation and posts the difference to a revaluation surplus/loss account.
        </p>
        <div>
          <Label htmlFor="newValue">New Book Value ({currencyLabel()})</Label>
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
  // Bought now (paid from cash), already owned before Plutus (brought on
  // as an opening balance with the depreciation it had built up), or
  // leased (a right-of-use asset against a lease liability).
  const [source, setSource] = useState<"purchase" | "opening" | "leased">("purchase");
  const alreadyOwned = source === "opening";
  const isLeased = source === "leased";
  const [openingDepreciation, setOpeningDepreciation] = useState("");
  const assetCategories = useApiResource(() => fixedAssetsApi.categories());
  const [createdCategories, setCreatedCategories] = useState<AssetCategory[]>([]);
  const categoryOptions = withCreated(assetCategories.data, createdCategories);
  const [assetCategoryId, setAssetCategoryId] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [method, setMethod] = useState<DepreciationMethod>("straight_line");
  const [rate, setRate] = useState("");
  const [leaseTerm, setLeaseTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // A category's usual depreciation fills the form; any of it can change.
  function applyCategory(category: AssetCategory | undefined) {
    setAssetCategoryId(category?.id ?? "");
    if (!category) return;
    setMethod(category.depreciation_method);
    setRate(category.depreciation_rate_ppm === null ? "" : ratePercent(category.depreciation_rate_ppm).replace("%", ""));
    if (category.useful_life_months) setUsefulLifeMonths(String(category.useful_life_months));
  }

  const assigneeRequired = category !== "" && REQUIRES_ASSIGNEE.has(category);
  const costMinor = toMinorUnits(cost);
  const depreciableMinor = Math.max(costMinor - (salvageValue ? toMinorUnits(salvageValue) : 0), 0);
  const openingDepreciationMinor = alreadyOwned && openingDepreciation ? toMinorUnits(openingDepreciation) : 0;
  // The same limits register_fixed_asset enforces.
  const openingDepreciationError = !alreadyOwned
    ? null
    : openingDepreciationMinor < 0
      ? "Can't be negative."
      : cost !== "" && openingDepreciationMinor > depreciableMinor
        ? `Can't be more than cost less salvage value (${formatMoney(depreciableMinor)}).`
        : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fixedAssetsApi.create({
        name,
        asset_tag: assetTag,
        acquisition_date: acquisitionDate,
        cost_minor: toMinorUnits(cost),
        salvage_value_minor: salvageValue ? toMinorUnits(salvageValue) : 0,
        // A lease is amortised over its term unless a useful life is given.
        useful_life_months: Number(usefulLifeMonths || (isLeased ? leaseTerm : "")),
        category: category || null,
        assigned_employee_id: assignedEmployeeId || null,
        opening_balance: alreadyOwned,
        opening_accumulated_depreciation_minor: openingDepreciationMinor,
        acquisition_type: isLeased ? "leased" : "acquired",
        depreciation_method: method,
        depreciation_rate_ppm: method === "write_off" ? null : percentToPpm(rate),
        lease_term_months: isLeased ? Number(leaseTerm) : null,
        asset_category_id: assetCategoryId || null,
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
        <div>
          <Label htmlFor="acquisitionSource">How It Comes onto the Books</Label>
          <Select
            id="acquisitionSource"
            value={source}
            onChange={(event) => {
              const next = event.target.value as "purchase" | "opening" | "leased";
              setSource(next);
              if (next !== "opening") setOpeningDepreciation("");
              if (next !== "leased") setLeaseTerm("");
            }}
            aria-describedby="acquisitionSourceHint"
          >
            <option value="purchase">Bought now — paid from cash</option>
            <option value="opening">Already owned before Plutus — opening balance</option>
            <option value="leased">Leased — right of use, against a lease liability</option>
          </Select>
          <p id="acquisitionSourceHint" className="mt-1 text-[11px] text-ink-soft">
            {alreadyOwned
              ? "No cash is posted: the asset comes on at cost, less the depreciation it has already built up, against Opening Balance Equity."
              : isLeased
                ? "Posts the cost as a right-of-use asset against Lease Liability. It's amortised over the lease, and lease payments reduce the liability."
                : "Posts the cost against Cash and Bank."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cost">Cost ({currencyLabel()})</Label>
            <Input id="cost" value={cost} onChange={(event) => setCost(event.target.value)} inputMode="decimal" required />
          </div>
          <div>
            <Label htmlFor="salvageValue">Salvage Value ({currencyLabel()})</Label>
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
          <div className="mb-1 flex items-center justify-between gap-3">
            <Label htmlFor="assetCategory">Asset Category</Label>
            <Button type="button" size="md" variant="secondary" onClick={() => setCreatingCategory(true)}>
              + New Category
            </Button>
          </div>
          <Select
            id="assetCategory"
            value={assetCategoryId}
            onChange={(event) => applyCategory(categoryOptions.find((entry) => entry.id === event.target.value))}
          >
            <option value="">No category</option>
            {categoryOptions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </Select>
        </div>
        {isLeased ? (
          <div>
            <Label htmlFor="leaseTerm">Lease Term — Payment Period (months)</Label>
            <Input
              id="leaseTerm"
              value={leaseTerm}
              onChange={(event) => setLeaseTerm(event.target.value)}
              inputMode="numeric"
              required
            />
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="depreciationMethod">{isLeased ? "Amortisation Method" : "Depreciation Method"}</Label>
            <Select
              id="depreciationMethod"
              value={method}
              onChange={(event) => setMethod(event.target.value as DepreciationMethod)}
            >
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          {method !== "write_off" ? (
            <div>
              <Label htmlFor="depreciationRate">{isLeased ? "Amortisation Rate (% a year)" : "Rate (% a year)"}</Label>
              <Input
                id="depreciationRate"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                inputMode="decimal"
                placeholder={method === "reducing_balance" ? "e.g. 25" : "optional"}
                required={method === "reducing_balance"}
                aria-describedby="depreciationRateHint"
              />
            </div>
          ) : null}
        </div>
        <p id="depreciationRateHint" className="-mt-2 text-[11px] text-ink-soft">
          {method === "reducing_balance"
            ? "The rate is applied each year to the net book value at the start of the year."
            : method === "write_off"
              ? "The whole cost, less salvage value, is charged at the next depreciation run."
              : "A rate charges that share of cost each year; leave it blank to spread the cost evenly over the useful life."}
        </p>
        <div>
          <Label htmlFor="usefulLifeMonths">Useful Life (months)</Label>
          <Input
            id="usefulLifeMonths"
            value={usefulLifeMonths}
            onChange={(event) => setUsefulLifeMonths(event.target.value)}
            inputMode="numeric"
            placeholder={isLeased ? "the lease term" : undefined}
            required={!isLeased}
          />
        </div>
        {alreadyOwned ? (
          <div>
            <Label htmlFor="openingDepreciation">Accumulated Depreciation to Date ({currencyLabel()})</Label>
            <Input
              id="openingDepreciation"
              value={openingDepreciation}
              onChange={(event) => setOpeningDepreciation(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              aria-invalid={openingDepreciationError ? true : undefined}
              aria-describedby="openingDepreciationHint"
            />
            <p
              id="openingDepreciationHint"
              className={`mt-1 text-[11px] ${openingDepreciationError ? "font-bold text-bad" : "text-ink-soft"}`}
            >
              {openingDepreciationError ??
                (cost !== ""
                  ? `Book value brought on: ${formatMoney(costMinor - openingDepreciationMinor)}. Depreciation continues from here.`
                  : "What it had built up before Plutus.")}
            </p>
          </div>
        ) : null}
        <div>
          <Label htmlFor="category">Device Type</Label>
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
          <Button
            type="submit"
            disabled={submitting || (assigneeRequired && !assignedEmployeeId) || openingDepreciationError !== null}
          >
            {submitting ? "Creating…" : "Create Asset"}
          </Button>
        </div>
      </form>
      {creatingCategory ? (
        <AssetCategoryModal
          onClose={() => setCreatingCategory(false)}
          onCreated={(created) => {
            setCreatedCategories((current) => [...current, created]);
            applyCategory(created);
            setCreatingCategory(false);
          }}
        />
      ) : null}
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
        proceeds_minor: proceeds ? toMinorUnits(proceeds) : 0,
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
          Current book value: <span className="font-bold text-ink">{formatMoney(asset.book_value_minor)}</span>.
          Any difference between proceeds and book value posts as a gain or loss.
        </p>
        <div>
          <Label htmlFor="proceeds">Disposal Proceeds ({currencyLabel()})</Label>
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
