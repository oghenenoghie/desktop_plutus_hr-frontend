"use client";

import { useState } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS } from "@/lib/nav";
import type { Role } from "@/lib/types";

const MFA_REQUIRED_ROLES: Role[] = ["admin", "payroll_manager", "accountant"];

export default function SecurityPage() {
  const { user } = useAuth();
  const mfaRequired = user ? MFA_REQUIRED_ROLES.includes(user.role) : false;

  return (
    <div>
      <PageHeader
        title="Security & Access"
        subtitle="Multi-factor authentication, roles, and the audit trail — in one place"
      />

      <div className="flex flex-col gap-6">
        {mfaRequired ? <MfaCard /> : null}

        <Card>
          <CardHeader
            title="Roles & Access"
            subtitle="Fine-grained permission overrides and who can log in"
          />
          <div className="flex flex-wrap gap-3">
            {user?.role === "admin" ? (
              <Link href="/permissions">
                <Button variant="secondary">Manage Permissions</Button>
              </Link>
            ) : null}
            <Link href="/audit-log">
              <Button variant="secondary">View Audit Log</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MfaCard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [enrollment, setEnrollment] = useState<{ secret: string; provisioning_uri: string } | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function startReset() {
    setRequesting(true);
    try {
      const result = await authApi.totpSetup();
      setEnrollment(result);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Could not start MFA reset.", "bad");
    } finally {
      setRequesting(false);
    }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setVerifying(true);
    try {
      await authApi.totpVerify(code);
      showToast("Authenticator confirmed — MFA is active again.", "good");
      setEnrollment(null);
      setCode("");
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Invalid code.", "bad");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Multi-Factor Authentication"
        subtitle={`Required for ${ROLE_LABELS.admin}, ${ROLE_LABELS.payroll_manager}, and ${ROLE_LABELS.accountant} logins`}
      />
      <div className="flex items-center gap-3">
        <Badge tone="good">Enabled for {user ? ROLE_LABELS[user.role] : "this role"}</Badge>
      </div>

      {enrollment ? (
        <div className="mt-4 rounded-panel border border-border p-4">
          <p className="text-[12.5px] text-ink-soft">
            Add this secret to an authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter
            the 6-digit code it generates to confirm. Your current authenticator stops working the moment you
            requested this reset — finish this step now, or you won&apos;t be able to sign back in.
          </p>
          <p className="mt-3 break-all rounded-panel bg-bg p-2.5 font-mono text-[12px] font-bold text-ink">
            {enrollment.secret}
          </p>
          <p className="mt-2 break-all text-[11px] text-ink-soft">{enrollment.provisioning_uri}</p>
          <form onSubmit={confirm} className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="mfa-code">6-digit code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                required
              />
            </div>
            <Button type="submit" disabled={verifying}>
              {verifying ? "Confirming…" : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEnrollment(null);
                setCode("");
              }}
            >
              Cancel
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-4">
          <Button variant="secondary" disabled={requesting} onClick={startReset}>
            {requesting ? "Starting…" : "Reset MFA Device"}
          </Button>
          <p className="mt-2 text-[11.5px] text-ink-soft">
            Use this if you lost your authenticator device or are switching to a new one.
          </p>
        </div>
      )}
    </Card>
  );
}
