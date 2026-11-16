"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { TaxSettingsNotice } from "@/components/tax-settings-notice";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { payRunsApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { payRunStatusLabel } from "@/lib/pay-runs";

export default function PayrollPage() {
  const router = useRouter();
  const payRuns = useApiResource(() => payRunsApi.list());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const runs = payRuns.data ?? [];
  const filteredRuns = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return runs.filter((run) => {
      const matchesSearch = !query ||
        [run.frequency, run.period_start, run.period_end, payRunStatusLabel(run)]
          .some((value) => String(value).toLocaleLowerCase().includes(query));
      return matchesSearch && (statusFilter === "all" || run.status === statusFilter);
    });
  }, [runs, search, statusFilter]);
  const draftCount = runs.filter((run) => run.status === "draft").length;
  const reviewCount = runs.filter((run) => run.status === "validated").length;
  const unpaidCount = runs.filter((run) => run.status === "locked" && !run.disbursed_at).length;

  return (
    <div>
      <PageHeader
        title="Payroll Runs"
        subtitle="Multi-frequency runs with full audit trail"
        action={<Button onClick={() => router.push("/payroll/new")}>New Pay Run</Button>}
      />

      <TaxSettingsNotice />

      <section aria-label="Payroll workflow overview" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Draft runs", value: draftCount, note: "Awaiting validation" },
          { label: "Ready to post", value: reviewCount, note: "Validated runs" },
          { label: "Awaiting payment", value: unpaidCount, note: "Posted, not marked paid" },
        ].map((item) => (
          <div key={item.label} className="rounded-panel border border-border bg-surface px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">{item.label}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums">{payRuns.loading ? "—" : item.value.toLocaleString("en-NG")}</div>
            <div className="mt-1 text-xs text-ink-soft">{item.note}</div>
          </div>
        ))}
      </section>

      <Card>
        <div className="mb-4 grid grid-cols-1 gap-3 border-b border-border pb-4 sm:grid-cols-[minmax(220px,1fr)_190px]">
          <div>
            <label htmlFor="payroll-search" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Find a pay run</label>
            <input id="payroll-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search frequency, period or status" className="w-full rounded-panel border border-border bg-surface px-[13px] py-[11px] text-[13px] text-ink outline-none placeholder:text-ink-soft focus:border-primary" />
          </div>
          <div>
            <label htmlFor="payroll-status" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Run status</label>
            <select id="payroll-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-panel border border-border bg-surface px-[13px] py-[11px] text-[13px] text-ink outline-none focus:border-primary">
              <option value="all">All statuses</option>
              {[...new Set(runs.map((run) => run.status))].sort().map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
            </select>
          </div>
          <p className="text-xs text-ink-soft sm:col-span-2" aria-live="polite">{filteredRuns.length.toLocaleString("en-NG")} of {runs.length.toLocaleString("en-NG")} pay runs</p>
        </div>
        {payRuns.loading ? <LoadingState /> : null}
        {payRuns.error ? <ErrorState message={payRuns.error} /> : null}
        {payRuns.data && runs.length === 0 ? (
          <EmptyState label="No pay runs have been created yet. Create a run to begin the payroll workflow." />
        ) : null}
        {payRuns.data && runs.length > 0 && filteredRuns.length === 0 ? (
          <EmptyState label="No pay runs match these filters. Try another search or select all statuses." />
        ) : null}
        {payRuns.data && filteredRuns.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Period</Th>
                <Th>Frequency</Th>
                <Th align="right">Employees</Th>
                <Th align="right">Gross</Th>
                <Th align="right">Net</Th>
                <Th>Status</Th>
                <Th>Posted</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr key={run.id}>
                  <Td>
                    {formatDate(run.period_start)} – {formatDate(run.period_end)}
                  </Td>
                  <Td>{titleCase(run.frequency)}</Td>
                  <Td align="right">{run.employee_count}</Td>
                  {/* Payslips are only written when a run is posted. */}
                  <Td align="right">{run.locked_at ? formatMoney(run.gross_minor) : <span className="text-ink-soft">Not posted</span>}</Td>
                  <Td align="right">{run.locked_at ? formatMoney(run.net_minor) : <span className="text-ink-soft">—</span>}</Td>
                  <Td>
                    <StatusBadge status={run.status} label={payRunStatusLabel(run)} />
                  </Td>
                  <Td>{formatDate(run.locked_at)}</Td>
                  <Td align="right">
                    <Button size="md" variant="secondary" onClick={() => router.push(`/payroll/${run.id}`)}>
                      {run.status === "draft" || run.status === "validated" ? "Review & Post" : "View"}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
