"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { accountingSettingsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatDateTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { todayInLagos } from "@/lib/inventory";
import type { AccountingSettings, AccountingSettingsUpdateBody } from "@/lib/types";

function errorText(err: unknown): string {
  return err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.";
}

// Changing what the ledger accepts is a financial-control decision: the API
// lets admin and accountant change these, and the other accounting roles
// read them.
const CHANGERS = ["admin", "accountant"];

export default function AccountingSettingsPage() {
  const { user } = useAuth();
  const canChange = user?.role !== undefined && CHANGERS.includes(user.role);
  const settings = useApiResource(() => accountingSettingsApi.get());

  return (
    <div>
      <PageHeader
        title="Accounting Settings"
        subtitle="The accounting lock date and what the ledger posts automatically"
      />
      {settings.loading && !settings.data ? <LoadingState /> : null}
      {settings.error ? <ErrorState message={settings.error} /> : null}
      {settings.data ? (
        <div className="flex flex-col gap-6">
          <LockDateCard settings={settings.data} canChange={canChange} onSaved={settings.reload} />
          <RemittanceCard settings={settings.data} canChange={canChange} onSaved={settings.reload} />
          {settings.data.updated_at ? (
            <p className="text-[12px] text-ink-soft">Last changed {formatDateTime(settings.data.updated_at)}.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function useSave(onSaved: () => void) {
  const { showToast } = useToast();
  return async (body: AccountingSettingsUpdateBody, message: string) => {
    try {
      await accountingSettingsApi.update(body);
      showToast(message, "good");
      onSaved();
    } catch (err) {
      showToast(errorText(err), "bad");
    }
  };
}

// D13: an interim period control. Nothing can be posted on or before the
// lock date: journals of every kind, and inventory documents.
function LockDateCard({
  settings,
  canChange,
  onSaved,
}: {
  settings: AccountingSettings;
  canChange: boolean;
  onSaved: () => void;
}) {
  const save = useSave(onSaved);
  const [lockDate, setLockDate] = useState(settings.lock_date ?? "");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!lockDate) return;
    setSaving(true);
    await save({ lock_date: lockDate }, `Books locked up to ${formatDate(lockDate)}`);
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader
        title="Lock date"
        subtitle="Close a period once it has been reported: nothing can then be posted on or before this date — no journals, bills, invoices, payroll or inventory documents."
        action={
          <Badge tone={settings.lock_date ? "good" : "neutral"}>
            {settings.lock_date ? `Locked to ${formatDate(settings.lock_date)}` : "Nothing locked"}
          </Badge>
        }
      />
      {canChange ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-64">
            <Label htmlFor="lock-date">Lock the books up to</Label>
            <Input
              id="lock-date"
              type="date"
              value={lockDate}
              max={todayInLagos()}
              onChange={(event) => setLockDate(event.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving || !lockDate || lockDate === settings.lock_date}>
              {saving ? "Saving…" : "Save lock date"}
            </Button>
            {settings.lock_date ? (
              <ConfirmActionButton
                label="Remove lock"
                confirmTitle="Remove the lock date?"
                confirmMessage="Every period becomes open to postings again, including periods already reported."
                confirmLabel="Remove lock"
                action={async () => {
                  await save({ lock_date: null }, "Lock date removed");
                  setLockDate("");
                }}
              />
            ) : null}
          </div>
        </form>
      ) : (
        <p className="text-[13px] text-ink-soft">Only an admin or an accountant can change the lock date.</p>
      )}
    </Card>
  );
}

function RemittanceCard({
  settings,
  canChange,
  onSaved,
}: {
  settings: AccountingSettings;
  canChange: boolean;
  onSaved: () => void;
}) {
  const save = useSave(onSaved);
  return (
    <Card>
      <CardHeader
        title="Statutory remittances"
        subtitle="When on, marking a statutory liability as remitted also posts it: Dr the scheme's payable, Cr cash. Remittances recorded before it was switched on are never back-posted."
        action={
          <Badge tone={settings.post_statutory_remittances ? "good" : "neutral"}>
            {settings.post_statutory_remittances ? "Posting" : "Not posting"}
          </Badge>
        }
      />
      {canChange ? (
        settings.post_statutory_remittances ? (
          <ConfirmActionButton
            label="Stop posting remittances"
            confirmTitle="Stop posting remittances?"
            confirmMessage="Remittances recorded from now on won't reach the ledger; record their journals by hand."
            confirmLabel="Stop"
            action={() => save({ post_statutory_remittances: false }, "Remittances no longer post")}
          />
        ) : (
          <ConfirmActionButton
            label="Post remittances"
            tone="primary"
            confirmTitle="Post statutory remittances?"
            confirmMessage="The default chart of accounts is added if it's missing, and each remittance recorded from now on posts its journal."
            confirmLabel="Start posting"
            action={() => save({ post_statutory_remittances: true }, "Remittances now post to the ledger")}
          />
        )
      ) : null}
    </Card>
  );
}
