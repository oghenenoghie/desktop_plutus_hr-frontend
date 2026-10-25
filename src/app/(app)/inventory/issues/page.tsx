"use client";

import Link from "next/link";
import { useState } from "react";

import { InventoryError } from "@/components/inventory/inventory-ui";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { stockIssuesApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { canManageInventory, canRequestStock, isRequesterOnly, statusLabel } from "@/lib/inventory";
import type { StockIssueStatus } from "@/lib/types";

const STATUSES: StockIssueStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "posted",
  "reversed",
  "rejected",
  "cancelled",
];

export default function StockIssuesPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StockIssueStatus | "">("");
  const issues = useApiResource(() => stockIssuesApi.list({ status }), [status]);
  const requesterOnly = isRequesterOnly(user?.role);

  return (
    <div>
      <PageHeader
        title="Stock Issues"
        subtitle={
          requesterOnly
            ? "Request stock for the departments you head; the store issues it once approved"
            : "Stock handed out for use — requested, approved, then posted out of the warehouse"
        }
        action={
          canRequestStock(user?.role) && !issues.error ? (
            <Link
              href="/inventory/issues/new"
              className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
            >
              {requesterOnly ? "Request Stock" : "New Stock Issue"}
            </Link>
          ) : undefined
        }
      />
      {issues.error ? (
        <InventoryError message={issues.error} canManage={canManageInventory(user?.role)} />
      ) : (
        <Card>
          <div className="mb-4 max-w-xs">
            <Label htmlFor="issue-status">Status</Label>
            <Select id="issue-status" value={status} onChange={(e) => setStatus(e.target.value as StockIssueStatus | "")}>
              <option value="">All</option>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {statusLabel(option)}
                </option>
              ))}
            </Select>
          </div>
          {issues.loading ? <LoadingState /> : null}
          {issues.data && issues.data.length === 0 ? <EmptyState label="No stock issues yet." /> : null}
          {issues.data && issues.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Date</Th>
                  <Th>Department</Th>
                  <Th>Requested by</Th>
                  <Th>Purpose</Th>
                  <Th>Warehouse</Th>
                  {requesterOnly ? null : <Th align="right">Value</Th>}
                  <Th>Status</Th>
                </tr>
              </Thead>
              <tbody>
                {issues.data.map((issue) => (
                  <tr key={issue.id}>
                    <Td>
                      <Link href={`/inventory/issues/${issue.id}`} className="font-bold text-primary hover:underline">
                        {issue.issue_number}
                      </Link>
                    </Td>
                    <Td>{formatDate(issue.issue_date)}</Td>
                    <Td>{issue.department_name ?? "—"}</Td>
                    <Td>{issue.requested_by_name ?? "—"}</Td>
                    <Td>{issue.purpose}</Td>
                    <Td>{issue.warehouse_code}</Td>
                    {requesterOnly ? null : (
                      <Td align="right">{issue.value_minor === null ? "—" : formatMoney(issue.value_minor)}</Td>
                    )}
                    <Td>
                      <StatusBadge status={issue.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>
      )}
    </div>
  );
}
