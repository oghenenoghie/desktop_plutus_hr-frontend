"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { subscriptionApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { PlanCode } from "@/lib/types";

const PLANS: PlanCode[] = ["free", "starter", "professional", "enterprise"];

export default function SubscriptionPage() {
  const subscription = useApiResource(() => subscriptionApi.get());
  const usage = useApiResource(() => subscriptionApi.usage());
  const { showToast } = useToast();
  const [changingTo, setChangingTo] = useState<PlanCode | "">("");
  const [changing, setChanging] = useState(false);

  async function changePlan() {
    if (!changingTo) return;
    setChanging(true);
    try {
      await subscriptionApi.changePlan({ plan_code: changingTo });
      showToast("Plan changed", "good");
      setChangingTo("");
      subscription.reload();
      usage.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setChanging(false);
    }
  }

  async function cancel() {
    try {
      await subscriptionApi.cancel();
      showToast("Subscription canceled", "good");
      subscription.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader title="Subscription" subtitle="Plan, pricing, and employee-count usage for this organisation" />

      {subscription.loading || usage.loading ? <LoadingState /> : null}
      {subscription.error ? <ErrorState message={subscription.error} /> : null}
      {usage.error ? <ErrorState message={usage.error} /> : null}

      {subscription.data && usage.data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Current Plan" />
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-extrabold text-ink">{usage.data.plan_name}</span>
              <StatusBadge status={subscription.data.status} />
              {usage.data.over_limit ? <Badge tone="bad">Over Employee Limit</Badge> : null}
            </div>
            <dl className="mt-4 grid grid-cols-[160px_1fr] gap-y-2.5 text-[13px]">
              <dt className="text-ink-soft">Monthly Price</dt>
              <dd className="font-bold">{formatMoney(usage.data.monthly_price_minor)}</dd>
              <dt className="text-ink-soft">Employees</dt>
              <dd className="font-bold">
                {usage.data.employee_count}
                {usage.data.employee_limit !== null ? ` / ${usage.data.employee_limit}` : " (unlimited)"}
              </dd>
              <dt className="text-ink-soft">Renews</dt>
              <dd className="font-bold">{formatDate(subscription.data.current_period_end)}</dd>
            </dl>
            {subscription.data.status !== "canceled" ? (
              <div className="mt-4">
                <ConfirmActionButton
                  action={cancel}
                  label="Cancel Subscription"
                  tone="danger"
                  confirmTitle="Cancel this subscription?"
                  confirmMessage="The organisation's plan will be marked canceled."
                  confirmLabel="Cancel Subscription"
                />
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Change Plan" subtitle="Placeholder pricing/limits — configure for real billing separately" />
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select value={changingTo} onChange={(event) => setChangingTo(event.target.value as PlanCode)}>
                  <option value="">Select a plan</option>
                  {PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {titleCase(plan)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={changePlan} disabled={!changingTo || changing}>
                {changing ? "Changing…" : "Change Plan"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
