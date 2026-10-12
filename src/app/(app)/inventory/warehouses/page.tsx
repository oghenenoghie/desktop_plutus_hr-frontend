"use client";

import { useState } from "react";

import { InventoryError } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { branchesApi, inventoryApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory } from "@/lib/inventory";
import type { Branch, InventoryWarehouse } from "@/lib/types";

export default function InventoryWarehousesPage() {
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);
  const warehouses = useApiResource(() => inventoryApi.warehouses(true));
  const branches = useApiResource(() => branchesApi.list());
  const [editing, setEditing] = useState<InventoryWarehouse | "new" | null>(null);
  const branchesById = new Map((branches.data ?? []).map((branch) => [branch.id, branch]));

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle="Stores and stock locations; each can belong to a branch"
        action={
          canManage && !warehouses.error ? (
            <Button onClick={() => setEditing("new")}>New Warehouse</Button>
          ) : undefined
        }
      />

      {warehouses.error ? (
        <InventoryError message={warehouses.error} canManage={canManage} />
      ) : (
        <Card>
          {warehouses.loading ? <LoadingState /> : null}
          {warehouses.data && warehouses.data.length === 0 ? (
            <EmptyState label="No warehouses yet. Add one before recording stock." />
          ) : null}
          {warehouses.data && warehouses.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>Branch</Th>
                  <Th>Address</Th>
                  <Th>Status</Th>
                  {canManage ? <Th align="right">Actions</Th> : null}
                </tr>
              </Thead>
              <tbody>
                {warehouses.data.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <Td className="font-bold">{warehouse.code}</Td>
                    <Td>{warehouse.name}</Td>
                    <Td>{warehouse.branch_id ? (branchesById.get(warehouse.branch_id)?.name ?? "—") : "—"}</Td>
                    <Td>{warehouse.address ?? "—"}</Td>
                    <Td>
                      <Badge tone={warehouse.is_active ? "good" : "neutral"}>
                        {warehouse.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </Td>
                    {canManage ? (
                      <Td align="right">
                        <Button variant="secondary" onClick={() => setEditing(warehouse)}>
                          Edit
                        </Button>
                      </Td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>
      )}

      {editing ? (
        <WarehouseDrawer
          warehouse={editing === "new" ? undefined : editing}
          branches={branches.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            warehouses.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function WarehouseDrawer({
  warehouse,
  branches,
  onClose,
  onSaved,
}: {
  warehouse?: InventoryWarehouse;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [code, setCode] = useState(warehouse?.code ?? "");
  const [name, setName] = useState(warehouse?.name ?? "");
  const [branchId, setBranchId] = useState(warehouse?.branch_id ?? "");
  const [address, setAddress] = useState(warehouse?.address ?? "");
  const [isActive, setIsActive] = useState(warehouse?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (warehouse) {
        await inventoryApi.updateWarehouse(warehouse.id, {
          name,
          branch_id: branchId || null,
          address: address || null,
          is_active: isActive,
        });
        showToast("Warehouse updated", "good");
      } else {
        await inventoryApi.createWarehouse({
          code,
          name,
          branch_id: branchId || null,
          address: address || null,
        });
        showToast("Warehouse created", "good");
      }
      onSaved();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={warehouse ? `Edit ${warehouse.code}` : "New Warehouse"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        {!warehouse ? (
          <div>
            <Label htmlFor="warehouse-code">Code</Label>
            <Input
              id="warehouse-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. LAG-01"
              maxLength={16}
              required
            />
          </div>
        ) : null}
        <div>
          <Label htmlFor="warehouse-name">Name</Label>
          <Input
            id="warehouse-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Ikeja main store"
            maxLength={120}
            required
          />
        </div>
        <div>
          <Label htmlFor="warehouse-branch">Branch</Label>
          <Select id="warehouse-branch" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="">No branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="warehouse-address">Address</Label>
          <Input
            id="warehouse-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            maxLength={500}
            placeholder="Optional"
          />
        </div>
        {warehouse ? (
          <div>
            <Label htmlFor="warehouse-active">Status</Label>
            <Select
              id="warehouse-active"
              value={isActive ? "active" : "inactive"}
              onChange={(event) => setIsActive(event.target.value === "active")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive (only once it holds no stock)</option>
            </Select>
          </div>
        ) : null}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : warehouse ? "Save Changes" : "Create Warehouse"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
