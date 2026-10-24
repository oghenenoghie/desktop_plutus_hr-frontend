"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { analyticsApi } from "@/lib/analytics/api";
import { formatIsoDate, formatMoney } from "@/lib/analytics/format";
import type { ExportFormat, RecordColumn } from "@/lib/analytics/types";
import { ApiError } from "@/lib/api/client";
import { useApiResource } from "@/lib/hooks";

// Drill-down: the source records behind a figure, fetched a page at a time
// from the API with the page's own filters. The API decides which fields
// each dataset returns and refuses one the member may not see.

const PAGE_SIZE = 25;

interface DrillContextValue {
  openRecords: (dataset: string, title: string) => void;
  canExport: boolean;
}

const DrillContext = createContext<DrillContextValue>({ openRecords: () => {}, canExport: false });

export function useDrill(): DrillContextValue {
  return useContext(DrillContext);
}

export function DrillProvider({
  query,
  canExport,
  children,
}: {
  query: string;
  canExport: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<{ dataset: string; title: string } | null>(null);
  const openRecords = useCallback((dataset: string, title: string) => setOpen({ dataset, title }), []);
  return (
    <DrillContext.Provider value={{ openRecords, canExport }}>
      {children}
      {open ? (
        <RecordsDrawer
          dataset={open.dataset}
          title={open.title}
          query={query}
          canExport={canExport}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </DrillContext.Provider>
  );
}

function cell(column: RecordColumn, value: string | number | null, currency: string): string {
  if (value === null || value === "") return "—";
  if (column.kind === "money" && typeof value === "number") return formatMoney(value, currency);
  if (column.kind === "date" && typeof value === "string") return formatIsoDate(value);
  if (typeof value === "string") return value.replace(/_/g, " ");
  return value.toLocaleString("en-NG");
}

export function ExportButtons({
  onExport,
  label = "Export",
}: {
  onExport: (format: ExportFormat) => Promise<void>;
  label?: string;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  async function run(format: ExportFormat) {
    setBusy(format);
    try {
      await onExport(format);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Download failed.", "bad");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      {(["csv", "xlsx", "pdf"] as const).map((format) => (
        <Button
          key={format}
          variant="secondary"
          disabled={busy !== null}
          onClick={() => void run(format)}
          className="!px-3 !py-2"
        >
          {busy === format ? "Preparing…" : format.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}

function RecordsDrawer({
  dataset,
  title,
  query,
  canExport,
  onClose,
}: {
  dataset: string;
  title: string;
  query: string;
  canExport: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const records = useApiResource(() => analyticsApi.records(dataset, query, page, PAGE_SIZE), [dataset, query, page]);
  const data = records.data;
  const pages = data ? Math.max(Math.ceil(data.total / data.page_size), 1) : 1;

  return (
    <Drawer title={data?.title ?? title} onClose={onClose} size="lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-soft">
          {data ? `${data.total.toLocaleString("en-NG")} record${data.total === 1 ? "" : "s"} for the filters on this page` : " "}
        </p>
        {canExport ? (
          <ExportButtons label="Export these records" onExport={(format) => analyticsApi.exportRecords(dataset, query, format)} />
        ) : null}
      </div>
      {records.loading && !data ? <LoadingState /> : null}
      {records.error ? <ErrorState message={records.error} /> : null}
      {data && data.rows.length === 0 ? <EmptyState label="No records match these filters." /> : null}
      {data && data.rows.length > 0 ? (
        <div className={records.loading ? "opacity-60 transition-opacity" : ""}>
          <Table>
            <Thead>
              <tr>
                {data.columns.map((column) => (
                  <Th
                    key={column.key}
                    align={["money", "count", "days", "hours", "percent"].includes(column.kind) ? "right" : "left"}
                  >
                    {column.label}
                  </Th>
                ))}
              </tr>
            </Thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i}>
                  {data.columns.map((column) => (
                    <Td
                      key={column.key}
                      align={["money", "count", "days", "hours", "percent"].includes(column.kind) ? "right" : "left"}
                      className="whitespace-nowrap tabular-nums"
                    >
                      {cell(column, row[column.key] ?? null, data.currency)}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4 flex items-center justify-between gap-3 text-[12.5px] text-ink-soft">
            <span>
              Page {data.page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="!px-3 !py-2">
                Previous
              </Button>
              <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="!px-3 !py-2">
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
