"use client";

import { Fragment, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { auditLogApi, employeesApi } from "@/lib/api/endpoints";
import { formatDateTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

// Not exhaustive — new entity types get added as new modules start logging.
// "All entity types" always stays a valid, working filter regardless.
const ENTITY_TYPES = [
  "employee",
  "leave_request",
  "expense",
  "loan",
  "benefit",
  "contractor",
  "pay_run",
  "payslip",
  "statutory_liability",
  "wht_payment",
  "final_settlement",
];

interface Filters {
  entityType: string;
  action: string;
  limit: number;
}

const DEFAULT_FILTERS: Filters = { entityType: "", action: "", limit: 100 };

export default function AuditLogPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const employees = useApiResource(() => employeesApi.list());
  const entries = useApiResource(
    () =>
      auditLogApi.list({
        entityType: filters.entityType || undefined,
        action: filters.action || undefined,
        limit: filters.limit,
      }),
    [filters],
  );

  const actorNameByAccountId = new Map(
    (employees.data ?? [])
      .filter((employee) => employee.account_id)
      .map((employee) => [employee.account_id as string, employee.full_name]),
  );

  function applyFilters() {
    setFilters(draft);
  }

  function clearFilters() {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        subtitle="Every recorded account action across the system, most recent first"
      />

      <Card className="mb-6">
        <CardHeader title="Filters" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="entityType">Entity Type</Label>
            <Select
              id="entityType"
              value={draft.entityType}
              onChange={(event) => setDraft((current) => ({ ...current, entityType: event.target.value }))}
            >
              <option value="">All entity types</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="action">Action</Label>
            <Input
              id="action"
              value={draft.action}
              onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))}
              placeholder="e.g. leave_request.approve"
            />
          </div>
          <div>
            <Label htmlFor="limit">Show</Label>
            <Select
              id="limit"
              value={String(draft.limit)}
              onChange={(event) =>
                setDraft((current) => ({ ...current, limit: Number(event.target.value) }))
              }
            >
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
              <option value="250">Last 250</option>
              <option value="500">Last 500</option>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={applyFilters}>Apply</Button>
            <Button variant="secondary" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {entries.loading ? <LoadingState /> : null}
        {entries.error ? <ErrorState message={entries.error} /> : null}
        {entries.data && entries.data.length === 0 ? (
          <EmptyState label="No audit events match these filters." />
        ) : null}
        {entries.data && entries.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th align="right">Details</Th>
              </tr>
            </Thead>
            <tbody>
              {entries.data.map((entry) => {
                const hasMetadata = Object.keys(entry.event_metadata).length > 0;
                const actorName = entry.account_id ? actorNameByAccountId.get(entry.account_id) : null;
                return (
                  <Fragment key={entry.id}>
                    <tr>
                      <Td>{formatDateTime(entry.created_at)}</Td>
                      <Td>
                        <div>{actorName ?? (entry.account_id ? "Unlinked account" : "System")}</div>
                        {entry.role ? (
                          <div className="text-[11px] text-ink-soft">{entry.role.replace(/_/g, " ")}</div>
                        ) : null}
                      </Td>
                      <Td className="font-mono text-[12px]">{entry.action}</Td>
                      <Td>
                        {entry.entity_type.replace(/_/g, " ")}
                        {entry.entity_id ? (
                          <div className="font-mono text-[11px] text-ink-soft">
                            {entry.entity_id.slice(0, 8)}…
                          </div>
                        ) : null}
                      </Td>
                      <Td align="right">
                        {hasMetadata ? (
                          <Button
                            size="md"
                            variant="secondary"
                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                          >
                            {expandedId === entry.id ? "Hide" : "Details"}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-ink-soft">—</span>
                        )}
                      </Td>
                    </tr>
                    {expandedId === entry.id ? (
                      <tr>
                        <td colSpan={5} className="border-b border-border bg-bg px-4 py-4">
                          <pre className="overflow-x-auto rounded-panel border border-border bg-surface px-3 py-2.5 font-mono text-[12px]">
                            {JSON.stringify(entry.event_metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
