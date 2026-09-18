"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { membershipsApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";
import { ROLE_LABELS } from "@/lib/nav";
import type { MembershipCreateOut, Permission, Role } from "@/lib/types";

const ALL_PERMISSIONS: Permission[] = [
  "employees.view",
  "employees.manage",
  "payroll.run",
  "payroll.approve",
  "accounting.manage",
  "recruitment.manage",
  "performance.manage",
  "reports.view",
  "settings.manage",
];

// The team-invite flow grants Super Admin/Payroll Manager/HR Manager/
// Accountant/Auditor/Manager to a new login. Employee is deliberately
// excluded — that invite stays tied to a specific employee record via
// employees/[id]/edit — and so is Department Manager, which is granted
// from the department it heads (alongside its manager_id assignment)
// since it only makes sense attached to an existing employee record.
const ROLES: Role[] = ["admin", "payroll_manager", "accountant", "hr_manager", "manager", "auditor"];

export default function PermissionsPage() {
  const memberships = useApiResource(() => membershipsApi.list());
  const [membershipId, setMembershipId] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<MembershipCreateOut | null>(null);
  const selected = (memberships.data ?? []).find((m) => m.id === membershipId) ?? null;

  return (
    <div>
      <PageHeader
        title="Permissions"
        subtitle="Fine-grained permission overrides layered on top of each membership's role"
        action={<Button onClick={() => setCreating(true)}>New User</Button>}
      />

      <Card className="mb-6">
        {memberships.loading ? <LoadingState /> : null}
        {memberships.error ? <ErrorState message={memberships.error} /> : null}
        {memberships.data && memberships.data.length > 0 ? (
          <div>
            <Select id="membership" value={membershipId} onChange={(event) => setMembershipId(event.target.value)}>
              <option value="">Select a member</option>
              {memberships.data.map((membership) => (
                <option key={membership.id} value={membership.id}>
                  {membership.email} · {ROLE_LABELS[membership.role]}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </Card>

      {selected ? <MembershipPermissions membershipId={selected.id} role={selected.role} /> : null}

      {creating ? (
        <NewUserDrawer
          onClose={() => setCreating(false)}
          onCreated={(membership) => {
            setCreating(false);
            setCreated(membership);
            memberships.reload();
          }}
        />
      ) : null}

      {created ? <NewUserCredentialsDialog membership={created} onClose={() => setCreated(null)} /> : null}
    </div>
  );
}

function NewUserDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (membership: MembershipCreateOut) => void;
}) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const membership = await membershipsApi.create({ email, password, role });
      showToast("User created", "good");
      onCreated(membership);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New User" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="new-user-email">Email</Label>
          <Input
            id="new-user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="new-user-password">Initial Password</Label>
          <Input
            id="new-user-password"
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>
        <div>
          <Label htmlFor="new-user-role">Role</Label>
          <Select id="new-user-role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create User"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function NewUserCredentialsDialog({
  membership,
  onClose,
}: {
  membership: MembershipCreateOut;
  onClose: () => void;
}) {
  return (
    <Drawer title="User Created" onClose={onClose}>
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Share these sign-in details with <span className="font-bold text-ink">{membership.email}</span> now —
          they won&apos;t be shown again.
        </p>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2.5 text-[13px]">
          <dt className="text-ink-soft">Email</dt>
          <dd className="font-mono font-bold">{membership.email}</dd>
          <dt className="text-ink-soft">Role</dt>
          <dd className="font-bold">{ROLE_LABELS[membership.role]}</dd>
        </dl>
        <p className="text-[12.5px] text-ink-soft">
          They can turn on multi-factor authentication anytime from Security &amp; Access.
        </p>
        <div className="mt-auto flex justify-end pt-4">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Drawer>
  );
}

function MembershipPermissions({ membershipId, role }: { membershipId: string; role: Role }) {
  const { showToast } = useToast();
  const effective = useApiResource(() => membershipsApi.effectivePermissions(membershipId), [membershipId]);
  const [pendingPermission, setPendingPermission] = useState<Permission | null>(null);

  const granted = new Set(effective.data?.permissions ?? []);

  async function toggle(permission: Permission, isGranted: boolean) {
    setPendingPermission(permission);
    try {
      await membershipsApi.setOverride(membershipId, { permission, granted: !isGranted });
      effective.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setPendingPermission(null);
    }
  }

  async function resetToDefault(permission: Permission) {
    setPendingPermission(permission);
    try {
      await membershipsApi.clearOverride(membershipId, permission);
      effective.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setPendingPermission(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Effective Permissions"
        subtitle={`Base role: ${ROLE_LABELS[role]} — toggling here adds a per-membership override, it doesn't change the role`}
      />
      {effective.loading ? <LoadingState /> : null}
      {effective.error ? <ErrorState message={effective.error} /> : null}
      {effective.data ? (
        <div className="flex flex-col gap-2">
          {ALL_PERMISSIONS.map((permission) => {
            const isGranted = granted.has(permission);
            return (
              <div
                key={permission}
                className="flex items-center justify-between rounded-panel border border-border px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-ink">{permission}</span>
                  <Badge tone={isGranted ? "good" : "neutral"}>{isGranted ? "Granted" : "Not granted"}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="md"
                    variant="secondary"
                    disabled={pendingPermission === permission}
                    onClick={() => resetToDefault(permission)}
                  >
                    Reset to Default
                  </Button>
                  <Button
                    size="md"
                    variant="secondary"
                    disabled={pendingPermission === permission}
                    onClick={() => toggle(permission, isGranted)}
                  >
                    {isGranted ? "Revoke" : "Grant"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {effective.data && effective.data.permissions.length === 0 ? (
        <EmptyState label="No permissions granted to this membership." />
      ) : null}
    </Card>
  );
}
