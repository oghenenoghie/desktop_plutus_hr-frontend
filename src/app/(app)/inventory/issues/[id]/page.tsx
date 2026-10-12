"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { ApprovalCard, DocumentMovements, Field, ReasonDrawer, errorText } from "@/components/inventory/document-ui";
import { InventoryError } from "@/components/inventory/inventory-ui";
import { StockIssueForm } from "@/components/inventory/stock-issue-form";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { inventoryApi, stockIssuesApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import {
  canManageInventory,
  canOperateInventory,
  canRequestStock,
  formatQuantity,
  isRequesterOnly,
} from "@/lib/inventory";

export default function StockIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canOperate = canOperateInventory(user?.role);
  const canRequest = canRequestStock(user?.role);
  // Department managers can't read the stock ledger.
  const requesterOnly = isRequesterOnly(user?.role);
  const issue = useApiResource(() => stockIssuesApi.get(id), [id]);
  // Only operators can post, and only they need to know whether a draft
  // may skip approval.
  const settings = useApiResource(
    () => (canOperate ? inventoryApi.settings() : Promise.resolve(null)),
    [canOperate],
  );
  const [editing, setEditing] = useState(false);
  const [reversing, setReversing] = useState(false);

  async function act(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      showToast(label, "good");
      issue.reload();
    } catch (err) {
      showToast(errorText(err), "bad");
    }
  }

  // With issue approval switched off, submitting approves at once; say so.
  async function submit() {
    try {
      const saved = await stockIssuesApi.submit(id);
      showToast(
        saved.status === "approved"
          ? `${saved.issue_number} approved — ready to be issued`
          : `${saved.issue_number} submitted for approval`,
        "good",
      );
      issue.reload();
    } catch (err) {
      showToast(errorText(err), "bad");
    }
  }

  if (issue.loading && !issue.data) return <LoadingState />;
  if (issue.error) return <InventoryError message={issue.error} canManage={canManageInventory(user?.role)} />;
  const doc = issue.data;
  if (!doc) return null;

  if (editing) {
    return (
      <div>
        <PageHeader title={`Edit ${doc.issue_number}`} subtitle="Only a draft can be edited" />
        <StockIssueForm
          issue={doc}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            showToast(`${doc.issue_number} saved`, "good");
            issue.reload();
          }}
        />
      </div>
    );
  }

  const approvalOff = settings.data ? !settings.data.require_issue_approval : false;
  const canPost = canOperate && (doc.status === "approved" || (doc.status === "draft" && approvalOff));

  return (
    <div>
      <PageHeader
        title={doc.issue_number}
        subtitle={doc.purpose}
        action={
          canRequest ? (
            <div className="flex flex-wrap gap-2">
              {doc.status === "draft" ? (
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  {canPost ? null : (
                    <Button onClick={submit}>Submit for approval</Button>
                  )}
                </>
              ) : null}
              {doc.status === "draft" || doc.status === "rejected" ? (
                <ConfirmActionButton
                  label="Delete"
                  confirmTitle={`Delete ${doc.issue_number}?`}
                  confirmMessage="The issue is removed; no stock has moved."
                  confirmLabel="Delete"
                  action={async () => {
                    try {
                      await stockIssuesApi.remove(doc.id);
                      showToast(`${doc.issue_number} deleted`, "good");
                      router.push("/inventory/issues");
                    } catch (err) {
                      showToast(errorText(err), "bad");
                    }
                  }}
                />
              ) : null}
              {["draft", "pending_approval", "approved"].includes(doc.status) ? (
                <ConfirmActionButton
                  label="Cancel issue"
                  confirmTitle={`Cancel ${doc.issue_number}?`}
                  confirmMessage="The issue is closed without any stock leaving the warehouse."
                  confirmLabel="Cancel issue"
                  action={() => act(`${doc.issue_number} cancelled`, () => stockIssuesApi.cancel(doc.id))}
                />
              ) : null}
              {canPost ? (
                <Button onClick={() => act(`${doc.issue_number} posted — stock issued`, () => stockIssuesApi.post(doc.id))}>
                  Post issue
                </Button>
              ) : null}
              {canOperate && doc.status === "posted" ? (
                <Button variant="secondary" onClick={() => setReversing(true)}>
                  Reverse
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-6">
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Status">
              <StatusBadge status={doc.status} />
            </Field>
            <Field label="Issue date">{formatDate(doc.issue_date)}</Field>
            <Field label="Warehouse">
              {doc.warehouse_code} — {doc.warehouse_name}
            </Field>
            <Field label="Department">{doc.department_name ?? "—"}</Field>
            <Field label="Requested by">{doc.requested_by_name ?? "—"}</Field>
            {doc.value_minor !== null ? <Field label="Value issued">{formatNaira(doc.value_minor)}</Field> : null}
            <Field label="Posted">{formatDateTime(doc.posted_at)}</Field>
            {doc.reversed_at ? <Field label="Reversed">{formatDateTime(doc.reversed_at)}</Field> : null}
            {doc.cancelled_at ? <Field label="Cancelled">{formatDateTime(doc.cancelled_at)}</Field> : null}
            {doc.reversal_reason ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label="Reversed because">{doc.reversal_reason}</Field>
              </div>
            ) : null}
            {doc.notes ? (
              <div className="col-span-2 sm:col-span-4">
                <Field label="Notes">{doc.notes}</Field>
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Items" />
          <Table>
            <Thead>
              <tr>
                <Th>Item</Th>
                <Th align="right">Quantity</Th>
                <Th align="right">In base unit</Th>
              </tr>
            </Thead>
            <tbody>
              {(doc.lines ?? []).map((line) => (
                <tr key={line.id}>
                  <Td>
                    <div className="font-bold">{line.item_sku}</div>
                    <div className="text-[11px] text-ink-soft">{line.item_name}</div>
                  </Td>
                  <Td align="right">
                    {formatQuantity(line.quantity)} {line.unit_code}
                  </Td>
                  <Td align="right">
                    {line.quantity_base === null ? "—" : `${formatQuantity(line.quantity_base)} ${line.base_unit_code}`}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {!requesterOnly && (doc.status === "posted" || doc.status === "reversed") ? <DocumentMovements sourceId={doc.id} version={doc.status} /> : null}

        {doc.submitted_at ? (
          <ApprovalCard
            requestType="stock_issue"
            requestId={doc.id}
            pending={doc.status === "pending_approval"}
            canDecide={canRequest}
            onDecide={async (approve, comment) => {
              try {
                await (approve ? stockIssuesApi.approve(doc.id, comment) : stockIssuesApi.reject(doc.id, comment));
                showToast(approve ? "Approval recorded" : `${doc.issue_number} rejected`, "good");
                issue.reload();
              } catch (err) {
                showToast(errorText(err), "bad");
              }
            }}
          />
        ) : null}
      </div>

      {reversing ? (
        <ReasonDrawer
          title={`Reverse ${doc.issue_number}`}
          explanation="Reversing puts the issued stock back into the warehouse at the value it left at — use it for an issue posted in error or stock returned unused."
          actionLabel="Reverse issue"
          onClose={() => setReversing(false)}
          onConfirm={async (reason) => {
            try {
              await stockIssuesApi.reverse(doc.id, reason);
              showToast(`${doc.issue_number} reversed`, "good");
              setReversing(false);
              issue.reload();
            } catch (err) {
              showToast(errorText(err), "bad");
            }
          }}
        />
      ) : null}
    </div>
  );
}
