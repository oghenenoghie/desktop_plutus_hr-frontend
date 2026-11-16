---
name: dashboard-data-table-engineer
description: 'Design and implement advanced data tables for dashboards and admin screens with TanStack Table (v9 or v8, detected from the project) or the project table and shadcn-style table markup: sorting, column and global filtering, search, pagination, column visibility, column resizing, row selection, bulk actions, CSV export, status badges, inline editing, server-side loading, virtualization for large datasets, and mobile-responsive layouts. Use when building or fixing any list of records (employees, pay runs, invoices, ledger lines, stock items, customers, users), when a table is slow, inaccessible or unusable on small screens, or when moving filtering, sorting and paging to the server. Detects the installed TanStack major before writing code and uses only APIs verified for that version.'
---

# Dashboard Data Table Engineer

Tables are where dashboard users do their work. A good table is fast, honest about
what it shows (which rows, which filters, which totals), and operable by
keyboard. Page layout belongs to `dashboard-design-engineer`; status colours and
density tokens to `dashboard-design-system`; installing packages to
`dashboard-component-library`.

---

## 1. Do you need a table library?

| Situation | Build with |
|---|---|
| Up to about 50 rows, no sorting or filtering (a statement, a payslip breakdown) | The project's table component or semantic `<table>` markup |
| Interactive table (sort, filter, paginate, select) on data already in the browser | TanStack Table, client-side row models |
| Large or growing data, or data the user may not see in full | TanStack Table in manual mode with server-side sort, filter and paging (§6) |
| Thousands of rows that must scroll in one view | TanStack Table plus TanStack Virtual (§7) |

If the project already has a table component or a table wrapper, render through
it. TanStack Table is headless: it computes rows and state; your markup and the
project's styles draw them.

---

## 2. Detect the TanStack version first

```bash
npm ls @tanstack/react-table --depth=0
grep '"@tanstack/react-table"' package.json
```

- **v9 (`9.x`)**: `useTable` with an explicit `features` object (§3).
- **v8 (`8.x`)**: `useReactTable` with `getCoreRowModel()` and `get*RowModel()`
  options (§4).
- **Not installed**: the current release is v9 (9.3.1 when this skill was
  written; peer `react >= 18`; depends on `@tanstack/react-store`). Install it
  with the project's package manager after the checks in
  `dashboard-component-library` §4.

Do not upgrade a v8 project to v9 as part of a feature task. If asked to migrate,
read the official v9 migration guide; `useLegacyTable` from
`@tanstack/react-table/legacy` is a deprecated stepping stone, not a target.

Never mix the two APIs in one file. Before using any API not shown here, confirm
it in the installed type definitions (`node_modules/@tanstack/table-core/dist`)
or the docs for that major.

---

## 3. TanStack Table v9

### The model

- **Features are opt-in.** Declare them once, outside the component, with
  `tableFeatures({...})`. A feature you did not register has no APIs on the table.
- **Row models live in the same object**: `sortedRowModel: createSortedRowModel()`,
  `filteredRowModel: createFilteredRowModel()`,
  `paginatedRowModel: createPaginatedRowModel()`. There is no
  `getCoreRowModel` to pass.
- **Sort and filter functions are registered** in `sortFns` and `filterFns`;
  columns refer to them by key (`sortFn: 'text'`, `filterFn: 'includesString'`)
  or by passing the function. In v9 the column option is `sortFn`; v8 called it
  `sortingFn`.
- **`stockFeatures`** registers every feature. Fine for a prototype; explicit
  features keep the bundle smaller.
- **State** is owned by the table unless you pass it: `initialState` for
  defaults, `state` with `on*Change` for controlled state, or `atoms` for
  external stores. The second argument to `useTable` is a selector for the state
  your component re-renders on; `<table.Subscribe selector={...}>` limits
  re-renders to one island. Reading `table.atoms.<slice>.get()` during render
  does not subscribe.

### Feature map (v9)

| Capability | Register | Key APIs |
|---|---|---|
| Sorting | `rowSortingFeature`, `sortedRowModel: createSortedRowModel()`, `sortFns` | `header.column.getCanSort()`, `getToggleSortingHandler()`, `getIsSorted()`, `getNextSortingOrder()` |
| Column filters | `columnFilteringFeature`, `filteredRowModel: createFilteredRowModel()`, `filterFns` | `column.getFilterValue()`, `column.setFilterValue()` |
| Global search | `globalFilteringFeature` (with the filtered row model and `filterFns`) | `table.setGlobalFilter()`, `table.state.globalFilter`, option `globalFilterFn` |
| Pagination | `rowPaginationFeature`, `paginatedRowModel: createPaginatedRowModel()` | `firstPage()`, `previousPage()`, `nextPage()`, `lastPage()`, `getCanPreviousPage()`, `getCanNextPage()`, `getPageCount()`, `setPageSize()`, `getPrePaginatedRowModel()` |
| Column visibility | `columnVisibilityFeature` | `table.getAllLeafColumns()`, `column.getIsVisible()`, `column.getToggleVisibilityHandler()`, `row.getVisibleCells()` |
| Column sizing and resizing | `columnSizingFeature` then `columnResizingFeature` (order matters) | `header.getSize()`, `header.getResizeHandler()`, `column.getIsResizing()`, option `columnResizeMode` (`'onEnd'` default, or `'onChange'`) |
| Row selection | `rowSelectionFeature` | `row.getIsSelected()`, `row.getCanSelect()`, `row.getToggleSelectedHandler()`, `table.getIsAllRowsSelected()`, `getIsSomeRowsSelected()`, `getToggleAllRowsSelectedHandler()`, `getIsAllPageRowsSelected()`, `getToggleAllPageRowsSelectedHandler()`, `getSelectedRowModel()`, options `enableRowSelection`, `getRowId` |
| Others | `rowExpandingFeature`, `columnGroupingFeature`, `columnPinningFeature`, `rowPinningFeature`, `columnFacetingFeature`, `columnOrderingFeature` with their row models (`createExpandedRowModel`, `createGroupedRowModel`, `createFacetedRowModel`, `createFacetedUniqueValues`, `createFacetedMinMaxValues`) | Check that feature's guide before use |

Rendering: `<table.FlexRender header={header} />` and
`<table.FlexRender cell={cell} />` (the standalone `flexRender` export also
exists). With `columnVisibilityFeature` registered, iterate
`row.getVisibleCells()`; without it, `row.getAllCells()`.

### Example: employees table (v9)

Sorting, global search, pagination and selection, with accessible markup.

```tsx
'use client'

import { useMemo, useState } from 'react'
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'

type Employee = {
  id: string
  name: string
  department: string
  status: 'active' | 'on_leave' | 'exited'
  grossMinor: number // money in minor units from the API
  currency: string
}

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  filterFns: { includesString: filterFn_includesString },
})

const columnHelper = createColumnHelper<typeof features, Employee>()

const statusLabel: Record<Employee['status'], string> = {
  active: 'Active',
  on_leave: 'On leave',
  exited: 'Exited',
}

const ariaSort = { asc: 'ascending', desc: 'descending' } as const

export function EmployeesTable({ data }: { data: Employee[] }) {
  const [search, setSearch] = useState('')

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: 'select',
          header: ({ table }) => (
            <input
              type="checkbox"
              aria-label="Select all employees on every page"
              checked={table.getIsAllRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomeRowsSelected()
              }}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              aria-label={`Select ${row.original.name}`}
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
            />
          ),
        }),
        columnHelper.accessor('name', { header: 'Name', sortFn: 'text' }),
        columnHelper.accessor('department', { header: 'Department', sortFn: 'text' }),
        columnHelper.accessor('status', {
          header: 'Status',
          cell: (info) => <span className="badge">{statusLabel[info.getValue()]}</span>,
        }),
        columnHelper.accessor('grossMinor', {
          header: 'Gross pay',
          cell: (info) =>
            new Intl.NumberFormat(undefined, { style: 'currency', currency: info.row.original.currency }).format(
              info.getValue() / 100, // assumes a 2-decimal currency; use the currency's exponent
            ),
        }),
      ]),
    [],
  )

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    enableRowSelection: (row) => row.original.status !== 'exited',
    globalFilterFn: 'includesString',
    state: { globalFilter: search },
    onGlobalFilterChange: (updater) =>
      setSearch((old) => (typeof updater === 'function' ? updater(old) : updater) ?? ''),
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
  })

  const total = table.getPrePaginatedRowModel().rows.length
  const selected = table.getSelectedRowModel().rows.length
  const { pageIndex } = table.state.pagination

  return (
    <section aria-labelledby="employees-heading">
      <h2 id="employees-heading">Employees</h2>

      <label>
        <span className="sr-only">Search employees</span>
        <input
          type="search"
          placeholder="Search name or department"
          value={search}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
        />
      </label>
      <p aria-live="polite" className="text-sm text-fg-muted">
        {total.toLocaleString()} employees{selected > 0 ? `, ${selected} selected` : ''}
      </p>

      <div className="overflow-x-auto">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      scope="col"
                      aria-sort={sorted ? ariaSort[sorted] : undefined}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()}>
                          <table.FlexRender header={header} />
                          <span aria-hidden> {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : ''}</span>
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {search ? 'No employees match this search.' : 'No employees yet.'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} data-selected={row.getIsSelected() || undefined}>
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav aria-label="Pagination" className="flex items-center gap-2">
        <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </button>
        <span className="tabular-nums">
          Page {pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
        </span>
        <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </button>
      </nav>
    </section>
  )
}
```

Replace the raw elements with the project's table, input, button and badge
components, and the badge with the status mapping in §9.

---

## 4. TanStack Table v8

Keep v8 code in v8 idioms when the project is on v8:

```tsx
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'

const [sorting, setSorting] = useState<SortingState>([])
const table = useReactTable({
  data,
  columns, // ColumnDef<Employee>[]
  state: { sorting },
  onSortingChange: setSorting,
  getRowId: (row) => row.id,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
})
// Render: flexRender(header.column.columnDef.header, header.getContext())
//         flexRender(cell.column.columnDef.cell, cell.getContext())
// State:  table.getState().pagination
// Column sort function option: sortingFn
// Rows before paging: table.getPrePaginationRowModel()
```

The UX, accessibility, server-side and performance rules below apply to both
versions; only the API names differ.

---

## 5. State and URLs

- Keep sorting, filters, search, page and page size in the URL query when the
  table is the page's main content, so views can be shared and restored.
- Reset to the first page when filters or search change. Client-side TanStack
  does this by default (`autoResetPageIndex`); in manual mode do it yourself.
- Persist per-user preferences (visible columns, density, page size) in user
  settings or storage, not in the URL.
- Give rows a stable id with `getRowId` (the record id, never the array index),
  so selection survives sorting, filtering and refetching.

---

## 6. Server-side tables

Use server-side processing when the full dataset is large, grows without bound,
or must not be sent to the browser in full (permissions, privacy).

Table options (both versions): `manualPagination`, `manualSorting`,
`manualFiltering`, plus `rowCount` (or `pageCount`, `-1` when unknown) so the
table knows the number of pages, and `on*Change` handlers to receive state
changes.

```tsx
// v9: the server does the work; the table renders the current page.
const table = useTable({
  features, // still register sorting, filtering and pagination features for their state and APIs
  columns,
  data: page.rows,
  rowCount: page.total,
  manualPagination: true,
  manualSorting: true,
  manualFiltering: true,
  state: { pagination, sorting, globalFilter: search },
  onPaginationChange: setPagination,
  onSortingChange: setSorting,
  onGlobalFilterChange: setSearch,
  getRowId: (row) => row.id,
})
```

Fetching rules:

- Key requests by the full query (page, size, sort, filters, search). Use the data
  layer the project already has (server components, a query library, or its API
  client); do not add one for a single table.
- Debounce search and text filters (about 300ms). Cancel stale requests
  (`AbortController`) so a slow early response cannot overwrite a later one.
- Keep showing the previous page with a subtle busy state while the next one
  loads; do not flash an empty table.
- The server returns the total count for the query, and validates and
  allow-lists sort and filter fields.
- Totals and "select all" refer to the whole result set, which only the server
  knows. Label them accordingly (§8, §9).

---

## 7. Large datasets and performance

- **Thresholds of thumb:** client-side row models handle thousands of rows
  comfortably; rendering is the bottleneck, not sorting. Virtualise when more
  than a few hundred rows render at once. Go server-side when the data does not
  belong in the browser.
- **Stable inputs.** Memoise `columns` and `data` (`useMemo`, or define columns
  outside the component). New arrays every render recompute everything.
- **Cheap cells.** Format in the cell function; do not create components inside
  render; avoid per-cell effects.
- **Narrow re-renders.** In v9, pass a selector to `useTable` and use
  `table.Subscribe` for parts that depend on fast-changing state (resizing,
  selection counts).
- **Resizing.** During a drag, write column widths as CSS variables instead of
  re-rendering every cell; cells read `width: calc(var(--col-<id>-size) * 1px)`.

### Row virtualisation with TanStack Virtual

Virtualisation is a rendering strategy, not a table feature: the table still
builds the rows; the virtualiser picks which indexes to render.

```tsx
import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

// inside the component, after creating `table`
const scrollRef = useRef<HTMLDivElement>(null)
const rows = table.getRowModel().rows
const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 40, // fixed row height in px
  overscan: 8,
})

return (
  <div ref={scrollRef} style={{ height: 600, overflow: 'auto' }}>
    <table style={{ display: 'grid' }}>
      {/* thead with display: grid, position: sticky, top: 0 */}
      <tbody style={{ display: 'grid', height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index]
          return (
            <tr
              key={row.id}
              style={{ display: 'flex', position: 'absolute', width: '100%', transform: `translateY(${item.start}px)` }}
            >
              {row.getAllCells().map((cell) => (
                <td key={cell.id} style={{ width: cell.column.getSize() }}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)
```

Notes: give the scroll container a fixed height; map virtual indexes against the
current `table.getRowModel().rows` (a stale list after sorting breaks); use
`measureElement` with `data-index` only for variable-height rows;
`cell.column.getSize()` needs the column sizing feature in v9. Virtual rows
leave the DOM, so set `aria-rowcount` on the table and `aria-rowindex` on rows
if screen-reader users need positions.

---

## 8. Bulk actions and selection

- A bulk bar appears when one or more rows are selected: the count ("12
  selected"), the actions, and "Clear selection". It does not cover the table
  header or pagination.
- Decide and state whether selection spans pages. With server-side data, offer
  "Select all 1,204 matching" explicitly after the page is selected, and send
  the filter to the server rather than 1,204 ids.
- Rows that cannot take an action are not selectable, or the action states how
  many will be skipped and why.
- Destructive bulk actions confirm with the count and the consequence. Report
  partial failure per row ("38 approved, 2 failed: missing tax ID"), and keep
  the failed rows selected.

---

## 9. Display conventions

- **Status badges:** one mapping per status vocabulary (status → label → tone),
  shared by every table and filter that shows it. Text label always; tone from
  the design system's status tokens; never colour alone.
- **Numbers:** right-aligned, `tabular-nums`, formatted with `Intl` in the
  record's currency. Negative amounts with a sign or accounting brackets,
  consistently across the product.
- **Dates:** one format per product; relative time ("2 hours ago") only for
  activity, with the absolute date in a tooltip or `title`.
- **Text:** truncate long text with an ellipsis and the full value in `title` or a
  tooltip; never truncate ids or amounts.
- **Headers:** sticky inside the scroll container; sort indicators visible on the
  sorted column only.
- **Totals rows** (finance, payroll) are computed from the whole filtered set,
  not only the visible page, and say so ("Total for 1,204 filtered rows"). If
  only the server can compute it, ask the server.
- **Row actions:** one primary action visible, the rest in an overflow menu. A row
  click may open a detail drawer, but a row that contains other controls is not
  itself a link.
- **Density:** comfortable by default; compact as a user option where people scan
  long lists.
- **Empty and error:** "No records yet" with the creating action; "No results"
  with "Clear filters"; errors inside the table frame with a retry. Skeleton
  rows while loading.

---

## 10. Inline editing

- Only for low-risk, single-field edits (a label, a category, a quantity before
  posting). For payroll, accounting and anything audited, use a drawer or form
  with an explicit save, validation and an audit entry.
- Make edit mode explicit: an edit button or double-click opens an input in the
  cell; `Enter` saves, `Esc` cancels, focus stays on the cell afterwards.
- Validate inline with the message next to the field. Save optimistically only if
  you can roll back and tell the user when the save fails.
- Pass the save handler to cells through the column definition's closure or the
  table `meta` option, typed for your version.

---

## 11. Export

- Say what is exported: "Export 1,204 filtered rows" or "Export this page". For
  large or server-side sets, generate the file on the server.
- Export the formatted meaning, not internal codes: labels for statuses, amounts
  as numbers with a currency column, ISO dates.
- Guard against spreadsheet formula injection: prefix cells starting with `=`,
  `+`, `-`, `@`, tab or carriage return with a single quote, and quote every field.

```ts
// Client-side CSV of rows before pagination (v9: getPrePaginatedRowModel; v8: getPrePaginationRowModel).
function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return `"${s.replace(/"/g, '""')}"`
  }
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
```

The byte-order mark helps spreadsheet apps read UTF-8 (names with accents, the
naira sign).

---

## 12. Mobile and narrow screens

Choose per table; never squeeze ten columns into 360px.

| Pattern | Use when |
|---|---|
| Horizontal scroll with a sticky first column and a visible edge shadow or hint | People compare across columns (ledgers, statements) |
| Card list: each row becomes a card with 3 or 4 priority fields and a "Details" action | People act on one record at a time (approvals, employees) |
| Priority columns: hide low-priority columns below a breakpoint, offer the column picker | Mixed use |

Filters move into a sheet behind a "Filters" button with the active count;
bulk actions move into a bottom bar.

---

## 13. Accessibility

- Semantic `<table>`, `<thead>`, `<tbody>`, `<th scope="col">` (and
  `scope="row"` for row headers). Name the table with a `<caption>`,
  `aria-labelledby` or `aria-label`.
- Sort controls are `<button>`s inside the header; the header carries
  `aria-sort` on the sorted column only.
- Selection checkboxes have labels naming the row; the header checkbox shows the
  indeterminate state.
- Pagination is a `<nav>` with a label; buttons say what they do; the current
  page is announced.
- A polite live region announces result counts after filtering or searching.
- Use `role="grid"` only if you implement the full grid keyboard model (arrow-key
  cell navigation); a table with buttons in it is a table.
- Resizing handles are reachable by keyboard or the table offers a column-width
  setting instead.

---

## 14. Done when

- [ ] TanStack major detected; only that version's APIs used; any API not listed
      here was checked in the installed types.
- [ ] Row ids stable; columns and data memoised.
- [ ] Sorting, filtering, search and paging state is in the URL where it matters.
- [ ] Server-side mode used where the data should not be in the browser; stale
      requests cancelled; previous page kept while loading.
- [ ] Counts, totals and "select all" state which rows they cover.
- [ ] Empty (both kinds), loading and error states built.
- [ ] Phone-width layout chosen and checked; keyboard-only pass done.
- [ ] Export escapes formula injection and states its scope.
- [ ] Lint, typecheck, build and the table's tests pass.
