"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { inventoryApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory } from "@/lib/inventory";
import { formatNaira, nairaToMinor } from "@/lib/format";
import type { InventoryCategory, InventorySettings, InventoryUnit } from "@/lib/types";

function errorText(err: unknown): string {
  return err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.";
}

export default function InventorySettingsPage() {
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);
  const { showToast } = useToast();
  const settings = useApiResource(() => inventoryApi.settings());

  async function setEnabled(enabled: boolean) {
    try {
      await inventoryApi.updateSettings({ enabled });
      showToast(enabled ? "Inventory switched on" : "Inventory switched off", "good");
      settings.reload();
    } catch (err) {
      showToast(errorText(err), "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory Settings"
        subtitle="Switch the module on, set the approval and receiving rules, and manage item categories and units of measure"
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader
            title="Inventory module"
            subtitle="Switching it off hides inventory but keeps every record; switching it back on restores them."
          />
          {settings.loading ? <LoadingState /> : null}
          {settings.error ? <ErrorState message={settings.error} /> : null}
          {settings.data ? (
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1 text-[13px]">
                <div>
                  Status:{" "}
                  <Badge tone={settings.data.enabled ? "good" : "neutral"}>
                    {settings.data.enabled ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="text-ink-soft">
                  Costing method: weighted average (one average cost per item across all warehouses)
                </div>
              </div>
              {canManage ? (
                settings.data.enabled ? (
                  <ConfirmActionButton
                    label="Switch off"
                    confirmTitle="Switch inventory off?"
                    confirmMessage="Inventory pages will stop working for everyone in the organisation. No records are deleted."
                    confirmLabel="Switch off"
                    action={() => setEnabled(false)}
                  />
                ) : (
                  <Button onClick={() => setEnabled(true)}>Switch on</Button>
                )
              ) : null}
            </div>
          ) : null}
        </Card>

        {settings.data?.enabled ? (
          <>
            <OperationsCard settings={settings.data} canManage={canManage} onSaved={settings.reload} />
            <UnitsCard canManage={canManage} />
            <CategoriesCard canManage={canManage} />
          </>
        ) : null}
      </div>
    </div>
  );
}

// The Phase 2 rules: over-receipt tolerance (D4), the adjustment gain
// approval limit (D8) and whether issues and transfers need approval.
function OperationsCard({
  settings,
  canManage,
  onSaved,
}: {
  settings: InventorySettings;
  canManage: boolean;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [tolerance, setTolerance] = useState(String(settings.over_receipt_tolerance_bp / 100));
  const [limit, setLimit] = useState(
    settings.adjustment_gain_approval_limit_minor === null
      ? ""
      : String(settings.adjustment_gain_approval_limit_minor / 100),
  );
  const [issueApproval, setIssueApproval] = useState(settings.require_issue_approval);
  const [transferApproval, setTransferApproval] = useState(settings.require_transfer_approval);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const percent = Number(tolerance || "0");
    if (!/^\d+(\.\d{1,2})?$/.test(tolerance || "0") || percent > 100) {
      return showToast("Tolerance must be a percentage from 0 to 100, with at most 2 decimals.", "bad");
    }
    if (limit.trim() && !/^\d+(\.\d{1,2})?$/.test(limit.trim())) {
      return showToast("The approval limit must be an amount in naira.", "bad");
    }
    setSaving(true);
    try {
      await inventoryApi.updateSettings({
        over_receipt_tolerance_bp: Math.round(percent * 100),
        adjustment_gain_approval_limit_minor: limit.trim() ? nairaToMinor(limit.trim()) : null,
        require_issue_approval: issueApproval,
        require_transfer_approval: transferApproval,
      });
      showToast("Operations settings saved", "good");
      onSaved();
    } catch (err) {
      showToast(errorText(err), "bad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Operations"
        subtitle="Receiving tolerance and which stock documents need approval. Purchase orders always do; approvers come from Approval Workflows."
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ops-tolerance">Over-receipt tolerance (%)</Label>
            <Input
              id="ops-tolerance"
              inputMode="decimal"
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
              disabled={!canManage}
            />
            <p className="mt-1 text-[11px] text-ink-soft">
              How far above the ordered quantity a receipt may go. 0 means never more than ordered.
            </p>
          </div>
          <div>
            <Label htmlFor="ops-limit">Adjustment gain approval limit (₦)</Label>
            <Input
              id="ops-limit"
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="No limit"
              disabled={!canManage}
            />
            <p className="mt-1 text-[11px] text-ink-soft">
              Write-offs always need approval. Gains need it when worth this much or more
              {settings.adjustment_gain_approval_limit_minor === null
                ? "; blank means gains never do."
                : ` (now ${formatNaira(settings.adjustment_gain_approval_limit_minor)}).`}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={issueApproval}
            onChange={(e) => setIssueApproval(e.target.checked)}
            disabled={!canManage}
          />
          Stock issues need approval before they are posted
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={transferApproval}
            onChange={(e) => setTransferApproval(e.target.checked)}
            disabled={!canManage}
          />
          Transfers need approval before they are dispatched
        </label>
        {canManage ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : null}
      </form>
    </Card>
  );
}

function UnitsCard({ canManage }: { canManage: boolean }) {
  const units = useApiResource(() => inventoryApi.units(true));
  const [editing, setEditing] = useState<InventoryUnit | "new" | null>(null);

  return (
    <Card>
      <CardHeader
        title="Units of measure"
        subtitle="Each item is counted in one base unit; alternative units (e.g. a carton of 24) are set per item."
        action={canManage ? <Button onClick={() => setEditing("new")}>New Unit</Button> : undefined}
      />
      {units.loading ? <LoadingState /> : null}
      {units.error ? <ErrorState message={units.error} /> : null}
      {units.data && units.data.length === 0 ? <EmptyState label="No units yet." /> : null}
      {units.data && units.data.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Fractions</Th>
              <Th>Status</Th>
              {canManage ? <Th align="right">Actions</Th> : null}
            </tr>
          </Thead>
          <tbody>
            {units.data.map((unit) => (
              <tr key={unit.id}>
                <Td className="font-bold">{unit.code}</Td>
                <Td>{unit.name}</Td>
                <Td>{unit.allows_fraction ? "Allowed (e.g. 2.5)" : "Whole numbers only"}</Td>
                <Td>
                  <Badge tone={unit.is_active ? "good" : "neutral"}>
                    {unit.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                {canManage ? (
                  <Td align="right">
                    <Button variant="secondary" onClick={() => setEditing(unit)}>
                      Edit
                    </Button>
                  </Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
      {editing ? (
        <UnitDrawer
          unit={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            units.reload();
          }}
        />
      ) : null}
    </Card>
  );
}

function UnitDrawer({
  unit,
  onClose,
  onSaved,
}: {
  unit?: InventoryUnit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [code, setCode] = useState(unit?.code ?? "");
  const [name, setName] = useState(unit?.name ?? "");
  const [allowsFraction, setAllowsFraction] = useState(unit?.allows_fraction ?? false);
  const [isActive, setIsActive] = useState(unit?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (unit) {
        await inventoryApi.updateUnit(unit.id, {
          name,
          allows_fraction: allowsFraction,
          is_active: isActive,
        });
        showToast("Unit updated", "good");
      } else {
        await inventoryApi.createUnit({ code, name, allows_fraction: allowsFraction });
        showToast("Unit created", "good");
      }
      onSaved();
    } catch (err) {
      showToast(errorText(err), "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={unit ? `Edit ${unit.code}` : "New Unit"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        {!unit ? (
          <div>
            <Label htmlFor="unit-code">Code</Label>
            <Input
              id="unit-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. CTN"
              maxLength={16}
              required
            />
          </div>
        ) : null}
        <div>
          <Label htmlFor="unit-name">Name</Label>
          <Input
            id="unit-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Carton"
            maxLength={64}
            required
          />
        </div>
        <div>
          <Label htmlFor="unit-fraction">Quantities</Label>
          <Select
            id="unit-fraction"
            value={allowsFraction ? "yes" : "no"}
            onChange={(event) => setAllowsFraction(event.target.value === "yes")}
          >
            <option value="no">Whole numbers only (pieces, boxes)</option>
            <option value="yes">Fractions allowed (kilograms, litres)</option>
          </Select>
          {unit ? (
            <p className="mt-1 text-[11px] text-ink-soft">
              Can&apos;t change once the unit is used by an item or an adjustment.
            </p>
          ) : null}
        </div>
        {unit ? (
          <div>
            <Label htmlFor="unit-active">Status</Label>
            <Select
              id="unit-active"
              value={isActive ? "active" : "inactive"}
              onChange={(event) => setIsActive(event.target.value === "active")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        ) : null}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : unit ? "Save Changes" : "Create Unit"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function CategoriesCard({ canManage }: { canManage: boolean }) {
  const categories = useApiResource(() => inventoryApi.categories(true));
  const [editing, setEditing] = useState<InventoryCategory | "new" | null>(null);
  const byId = new Map((categories.data ?? []).map((category) => [category.id, category]));

  return (
    <Card>
      <CardHeader
        title="Item categories"
        subtitle="Group items for filtering and reporting. Categories can be nested."
        action={canManage ? <Button onClick={() => setEditing("new")}>New Category</Button> : undefined}
      />
      {categories.loading ? <LoadingState /> : null}
      {categories.error ? <ErrorState message={categories.error} /> : null}
      {categories.data && categories.data.length === 0 ? (
        <EmptyState label="No categories yet." />
      ) : null}
      {categories.data && categories.data.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Parent</Th>
              <Th>Status</Th>
              {canManage ? <Th align="right">Actions</Th> : null}
            </tr>
          </Thead>
          <tbody>
            {categories.data.map((category) => (
              <tr key={category.id}>
                <Td className="font-bold">{category.name}</Td>
                <Td>{category.parent_id ? (byId.get(category.parent_id)?.name ?? "—") : "—"}</Td>
                <Td>
                  <Badge tone={category.is_active ? "good" : "neutral"}>
                    {category.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                {canManage ? (
                  <Td align="right">
                    <Button variant="secondary" onClick={() => setEditing(category)}>
                      Edit
                    </Button>
                  </Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
      {editing ? (
        <CategoryDrawer
          category={editing === "new" ? undefined : editing}
          categories={categories.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            categories.reload();
          }}
        />
      ) : null}
    </Card>
  );
}

function CategoryDrawer({
  category,
  categories,
  onClose,
  onSaved,
}: {
  category?: InventoryCategory;
  categories: InventoryCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState(category?.parent_id ?? "");
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (category) {
        await inventoryApi.updateCategory(category.id, {
          name,
          parent_id: parentId || null,
          is_active: isActive,
        });
        showToast("Category updated", "good");
      } else {
        await inventoryApi.createCategory({ name, parent_id: parentId || null });
        showToast("Category created", "good");
      }
      onSaved();
    } catch (err) {
      showToast(errorText(err), "bad");
      setSubmitting(false);
    }
  }

  const parents = categories.filter((option) => option.is_active && option.id !== category?.id);

  return (
    <Drawer title={category ? "Edit Category" : "New Category"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="category-name">Name</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Office supplies"
            maxLength={120}
            required
          />
        </div>
        <div>
          <Label htmlFor="category-parent">Parent category</Label>
          <Select
            id="category-parent"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">None (top level)</option>
            {parents.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>
        {category ? (
          <div>
            <Label htmlFor="category-active">Status</Label>
            <Select
              id="category-active"
              value={isActive ? "active" : "inactive"}
              onChange={(event) => setIsActive(event.target.value === "active")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        ) : null}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : category ? "Save Changes" : "Create Category"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
