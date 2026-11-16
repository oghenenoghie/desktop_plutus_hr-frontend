---
name: dashboard-design-engineer
description: 'Plan, build and review premium enterprise dashboards and data-heavy admin screens: SaaS, HR and payroll, accounting and finance, CRM and ERP, inventory, admin consoles, executive overviews and analytics. Use when creating, redesigning or critiquing a dashboard page or app shell: information hierarchy, collapsible sidebar, top bar, contextual page header, KPI cards, filter and search bars, tabs, drawers, modals, dropdown menus, keyboard access, responsive behaviour, light and dark presentation, and empty, loading, error and success states. Owns page structure, interaction and the end-to-end implementation workflow. Hands off component sourcing to dashboard-component-library, charts to dashboard-data-visualization, tables to dashboard-data-table-engineer, tokens and theming to dashboard-design-system, and MCP servers to dashboard-mcp-tooling. Defers to any product-specific UX or domain skill already in .claude/skills.'
---

# Dashboard Design Engineer

You design and build dashboards that people use every day to make decisions and
do work: payroll officers closing a run, accountants reconciling a period,
operations leads clearing a queue, executives checking whether the business is on
track. A premium dashboard is not the one with the most effects. It answers its
question fast, shows the numbers accurately, and stays calm under real data.

This skill owns **what goes on the page, where, and how it behaves**. It does not
repeat the rules owned by the sibling skills:

| Need | Skill |
|---|---|
| Find, choose or install a component | `dashboard-component-library` |
| Choose and build a chart, date range or trend indicator | `dashboard-data-visualization` |
| Build a data table (sorting, filters, selection, export, server data) | `dashboard-data-table-engineer` |
| Colour, type, spacing, radius, shadow and icon tokens; light and dark themes | `dashboard-design-system` |
| Figma, 21st.dev, shadcn registry, Iconify, Context7 or browser MCP servers | `dashboard-mcp-tooling` |

**Precedence.** Product or domain skills in this repository (for example a UX
audit skill or a product reference skill) win on what exists, what it is called,
and the product's information architecture. Read them first. This skill is the
method for building the screens well, not a licence to redesign the product.

---

## 1. The implementation workflow

Follow these steps in order for any dashboard task. Skipping steps 1 to 4 is the
usual cause of duplicated components, invented data and off-brand screens.

1. **Inspect the existing project.** Read the route or page you are changing, its
   layout, and the components it already uses. Check `.claude/skills/` for
   product skills and `AGENTS.md` / `CLAUDE.md` for repo rules.
2. **Identify the framework, versions and dependencies.** Read `package.json` and
   the lockfile. Note the framework version (Next.js majors change APIs; read the
   framework docs shipped in `node_modules` when a repo says to), React version,
   Tailwind version, and any UI, chart, table, icon or motion libraries.
3. **Inventory components and tokens.** List the UI kit
   (`src/components/ui` or similar), feature components, and where tokens live
   (`globals.css`, `tailwind.config.*`, a theme provider). Reuse beats new.
4. **State the purpose and the users.** Write one sentence: "This page helps
   <role> to <decide or do X>." If you cannot, ask or read the product skill.
5. **Plan the information architecture.** Decide the page archetype (§2), the
   primary question, the sections in priority order, and what is a drill-down
   rather than on-page content. Sketch it as a short outline before coding.
6. **Plan reusable components.** Decide which pieces already exist, which need a
   new variant, and which are genuinely new. Build new ones in the kit's style
   and location, with props named like their siblings.
7. **Check docs and MCP availability.** Before using any library API you have not
   seen in this repo, verify it (installed types, official docs, or Context7 if
   connected). See `dashboard-mcp-tooling`; never assume a server is connected.
8. **Implement.** Server data loading where the framework supports it; client
   components only where interaction needs them.
9. **Wire real data.** Use the project's API client and types. Never invent
   metrics, fields, endpoints or sample numbers in production code. If data does
   not exist yet, build the empty state and say what is missing.
10. **Build every state.** Loading, empty (each kind), error, partial or stale,
    success, and no-permission (§9).
11. **Check accessibility and performance.** Keyboard path through the page,
    focus visibility, labels, contrast in both themes, reduced motion, no layout
    shift on load, no unnecessary client JavaScript.
12. **Run the project's checks.** Lint, typecheck and build with the project's
    own scripts (for example `npm run lint`, `npx tsc --noEmit`,
    `npm run build`), plus its unit or end-to-end tests for the area you touched.
13. **Verify visually.** Run the app and look at the page at desktop, tablet and
    phone widths, in light and dark themes if both exist, with real or seeded
    data, with empty data, and with an error. Use a browser MCP server or a
    Playwright script (`dashboard-mcp-tooling` §4.6). Fix what you see before
    reporting done.

---

## 2. Choose the archetype before the layout

Every dashboard answers one primary question. Pick the archetype that matches it,
then lead with the element that answers it.

| Archetype | Primary question | Lead with | Then |
|---|---|---|---|
| Executive overview | Are we on track? | 3 to 5 KPIs against target or prior period | One trend, a short exceptions list, links to detail |
| Operational (HR, payroll, inventory, support, admin) | What needs my action now? | Task queue, alerts, blockers with counts | Status breakdown, the working table |
| Analytical | Why did it change? | Filter bar and one primary chart | Linked breakdowns, drill-down table |
| Accounting and finance | Do the numbers reconcile? | Period and entity scope, statement-style totals | Variance columns, drill to ledger lines, export |
| CRM and sales | Where is the pipeline and who owns it? | Stage totals and conversion | Records by owner and next action |
| ERP and inventory | Do we have what we need, where? | Stock against reorder points, shortfalls | Movements, valuation, locations |
| SaaS product admin | Is the account healthy? | Usage against plan, billing state | Members, settings, audit log |

Domain notes that change layout decisions:

- **HR and payroll.** The run status (draft, validated, locked, paid) is the
  spine of the page; show it in the page header, not in a card. Statutory
  deadlines and blockers (missing tax IDs, unapproved changes) outrank charts.
- **Accounting.** Totals must tie out on screen: a subtotal shown in a card must
  match the table total for the same scope. Show the period and the basis
  (accrual or cash, currency) next to every figure that depends on them.
- **Inventory.** Quantities need units; values need the valuation method. A
  shortfall list sorted by urgency beats a stock-level chart.
- **Executive.** Fewer, larger, comparative numbers. Every number needs its
  comparison (target, prior period) or it means nothing.

---

## 3. Information hierarchy

- **One primary question per page.** If a page answers three questions, it is
  three tabs or three pages.
- **Hierarchy through size, position and weight, not decoration.** The most
  important block is the widest and highest. Secondary blocks are narrower. Do not
  give every block the same card at the same size.
- **Group by task, not by data source.** "Needs approval" beats "Leave API data".
- **Progressive disclosure.** Summary on the page, detail in a drawer, raw records
  on a detail page. Do not put a 40-column table on an overview.
- **Three to six KPIs.** More than six is a report, not a dashboard. Choose the
  ones tied to a decision.
- **Scope is always visible.** Period, entity or branch, currency and filters in
  effect appear in the page header or filter bar, never only inside a menu.
- **Numbers align.** Right-align numeric columns, use tabular figures
  (`font-variant-numeric: tabular-nums`, Tailwind `tabular-nums`), and format
  with `Intl.NumberFormat` for the user's locale and the record's currency.

### Avoid the generic AI dashboard

This layout is the default output of many generators and reads as low-effort:
a "Welcome back, Name 👋" hero, four identical stat cards with random deltas, a
gradient area chart of nothing in particular, a "Recent activity" list, and a
donut. Replace it with the archetype in §2: lead with the decision, vary block
sizes by importance, and use only the metrics the product actually has.

---

## 4. The app shell

```
┌──────────────────────────────────────────────────────────────────┐
│ Top bar: org/entity switcher · global search · help · alerts · me │
├───────────┬──────────────────────────────────────────────────────┤
│ Sidebar   │ Page header: breadcrumb · title · scope · actions    │
│ (nav)     ├──────────────────────────────────────────────────────┤
│           │ Filter bar (when the page filters)                    │
│           ├──────────────────────────────────────────────────────┤
│           │ Content grid                                         │
└───────────┴──────────────────────────────────────────────────────┘
```

### Collapsible sidebar

- Two widths: expanded (roughly 240 to 280px) and rail (roughly 56 to 72px).
  Take the exact values from the design system's layout tokens.
- Group items by job ("Payroll", "People", "Accounting"), not alphabetically.
  Keep it to two levels; a third level belongs in the page (tabs).
- The active item is marked with `aria-current="page"` and a visible state that
  does not rely on colour alone (weight, indicator bar, or background).
- The collapse toggle is a `<button>` with `aria-expanded` and
  `aria-controls`, a visible label or `aria-label`, and its state persisted
  per user (cookie or storage read before paint, so the layout does not jump).
- In rail mode, every icon has a tooltip and an accessible name. Icons alone are
  not navigation for new users; expanded is the default.
- Below the large breakpoint the sidebar becomes an off-canvas drawer opened from
  the top bar, with focus moved into it and returned to the trigger on close.

### Top bar

Global, not page-specific: organisation or entity switcher, global search or
command palette, notifications, help, and the user menu. Page actions do not go
here.

### Contextual page header

- Breadcrumb when the page is below the top level.
- Title in sentence case, sized as a heading, not a hero (see the design system's
  type scale; a dashboard title is typically 20 to 24px, not 40px or more).
- Scope controls: period, entity, currency, the run or record being viewed, and
  its status badge.
- One primary action. Secondary actions sit beside it; rare or destructive ones go
  in an overflow menu.

### Landmarks and skip link

```tsx
// Shape only: use the project's own layout, nav and header components.
export function AppShell({ nav, topBar, children }: {
  nav: React.ReactNode
  topBar: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header>{topBar}</header>
      <div className="flex">
        <nav aria-label="Main">{nav}</nav>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
```

Token class names in examples (`bg-bg`, `bg-surface`, `text-fg`, `text-fg-muted`,
`border-border`) are placeholders. Use the project's own utilities; see
`dashboard-design-system`.

`min-w-0` on the main column matters: without it, wide tables push the whole page
sideways instead of scrolling inside their own container.

---

## 5. Responsive behaviour

Use the project's breakpoints. Decide behaviour per block, not per page:

| Block | Desktop | Tablet | Phone |
|---|---|---|---|
| Sidebar | Expanded or rail | Rail | Off-canvas drawer |
| KPI row | 4 to 5 across | 2 across | 1 or 2 across; keep the comparison visible |
| Primary chart | Full width of its column | Full width | Full width, fewer ticks, legend below |
| Secondary charts | 2 or 3 across | 2 across | Stacked, or behind tabs |
| Tables | Full | Horizontal scroll with sticky first column | Card list or priority columns (see the table skill) |
| Filter bar | Inline | Inline, wraps | Collapsed into a "Filters" button opening a sheet |
| Page actions | Inline | Inline | Primary visible, others in a menu |

Rules:

- Test at 320px width; nothing should scroll horizontally except a table's own
  scroll container.
- Touch targets at least 24 by 24 CSS px (WCAG 2.2 AA, 2.5.8); aim for 44px on
  primary touch controls.
- Do not hide information on small screens that people need to act. Move it
  behind a disclosure instead.

---

## 6. KPI cards

Anatomy, in reading order:

1. **Label**: what it is, in plain words ("Net pay this run").
2. **Value**: formatted with unit or currency; abbreviate only above the point
   where precision stops mattering (`₦12.4m`), and give the exact value in a
   tooltip or `title`.
3. **Comparison**: the delta, its direction, and what it is compared with
   ("+4.2% vs last month"). Without the comparison period the delta is noise.
4. **Context** (optional): target, sparkline, or as-of time.
5. **Action** (optional): the card links to the detail it summarises.

Rules:

- **Colour the delta by meaning, not by sign.** Costs or overdue counts going up
  are bad. Configure "good direction" per metric.
- **Never colour alone.** Pair colour with an arrow icon and the signed text.
- **Divide carefully.** When the prior value is zero, show "New" or "n/a", not
  "∞%" or "+100%".
- **No count-up animations on financial or statutory figures.** They show wrong
  numbers for a moment and slow reading.
- **Skeleton matches the final card** so the row does not shift when data arrives.

```tsx
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

type Direction = 'up-is-good' | 'down-is-good' | 'neutral'

// Full class names in a map (not built from strings) so Tailwind can see them.
const toneClass = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-fg-muted',
} as const

export function KpiCard({
  label,
  value,
  previous,
  format,
  comparisonLabel,
  direction = 'up-is-good',
  href,
}: {
  label: string
  value: number
  previous?: number | null
  format: (n: number) => string
  comparisonLabel: string // e.g. "vs last month"
  direction?: Direction
  href?: string
}) {
  const change =
    previous == null || previous === 0 ? null : (value - previous) / Math.abs(previous)
  const tone =
    change == null || change === 0 || direction === 'neutral'
      ? 'neutral'
      : (change > 0) === (direction === 'up-is-good')
        ? 'positive'
        : 'negative'
  const Icon = change == null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight
  const pct =
    change != null
      ? new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(change)
      : previous == null
        ? 'No comparison'
        : value === 0
          ? 'No change'
          : 'New' // previous was zero: a percentage would be meaningless

  const body = (
    <>
      <p className="text-sm text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums" title={format(value)}>
        {format(value)}
      </p>
      <p className={`mt-1 flex items-center gap-1 text-sm ${toneClass[tone]}`}>
        <Icon aria-hidden className="size-4" />
        <span>{pct}</span>
        <span className="text-fg-muted">{comparisonLabel}</span>
      </p>
    </>
  )

  return href ? (
    <a href={href} className="block rounded-card border border-border bg-surface p-4 focus-visible:outline-2">
      {body}
    </a>
  ) : (
    <div className="rounded-card border border-border bg-surface p-4">{body}</div>
  )
}
```

Map the `toneClass` values to the project's status text tokens, and swap `<a>`
for the framework's link component.

---

## 7. Filters, search and scope

- **Placement.** Page-wide filters go in one bar under the page header. Filters
  that apply to one block live in that block's header.
- **URL state.** Put filter, search, sort and page state in the URL query so views
  can be shared, bookmarked and restored with the back button. In Next.js, check
  how the installed version passes `searchParams` to pages before you write the
  code (the shape changed across majors).
- **Applied filters are visible** as removable chips, with "Clear all" and the
  result count ("128 employees").
- **Search** is debounced (around 250 to 300ms), states what it searches in its
  placeholder ("Search name, staff ID or email"), and supports `/` or
  `Ctrl/Cmd+K` to focus only if the product already uses that convention.
- **Dates.** Date-range controls follow `dashboard-data-visualization` §5.
- **Defaults** are the most common useful view (current period, my team), and the
  page says what the default is.

---

## 8. Interaction patterns

Prefer the project's existing primitives. If it has none, use a headless library
that implements the WAI-ARIA Authoring Practices (see
`dashboard-component-library`). Do not hand-roll focus traps when a tested
primitive exists.

| Pattern | Use when | Do not use when | Keyboard and ARIA essentials |
|---|---|---|---|
| Tabs | Sibling views of the same object or scope | Steps in a process (use a stepper) or unrelated pages | `role="tablist"`/`tab`/`tabpanel`, arrow keys move between tabs, `aria-selected`; reflect the active tab in the URL |
| Drawer (side sheet) | Viewing or editing one record while keeping the list in view | Long multi-step forms, or anything that must block the page | Focus moves in on open, is trapped while modal, `Esc` closes, focus returns to the trigger; labelled by its title |
| Modal dialog | Short, blocking decisions or forms (confirm, rename, approve) | Browsing or reading content | `role="dialog"` with `aria-modal`, labelled title, initial focus on the first field or the least destructive button, `Esc` closes |
| Confirm dialog | Destructive or irreversible actions | Routine reversible actions (use undo) | States the consequence ("Lock the May run for 42 employees?"); the destructive button names the action |
| Dropdown menu | A list of actions | Choosing a value (use a select or combobox) | Menu button pattern: `Enter`/`Space`/`↓` open, arrows move, typeahead, `Esc` closes and returns focus |
| Combobox / select | Choosing one or more values, especially long lists | Fewer than about 5 options (use a segmented control or radios) | Labelled, announces results, supports typing |
| Popover | Small contextual detail or a short form | Critical content | Opened by a button, `Esc` closes, not hover-only |
| Tooltip | Supplementary labels (icon buttons, truncated text) | Essential information or interactive content | Appears on focus as well as hover; never the only label of a control |
| Toast | Non-blocking confirmation of something that happened | Errors that need action (show inline) | `aria-live="polite"` region; long enough to read; undo for reversible actions |

Keyboard rules for the whole page:

- Every action reachable and operable by keyboard, in a logical order.
- Focus is always visible (`:focus-visible` with a ring that passes 3:1 contrast).
- Opening an overlay moves focus in; closing returns it. Stacked overlays close
  one at a time with `Esc`, topmost first.
- No keyboard traps outside modal overlays.

---

## 9. States

Build all of these for each data block, not just for the page:

| State | What to show | Notes |
|---|---|---|
| Loading | A skeleton shaped like the final content | Reserve the final height; no full-page spinner; stream or suspend per section where the framework supports it |
| Empty: first use | What the block will show, and the action that fills it ("Add your first employee") | Link to the setup step |
| Empty: no results | "No results for these filters" and a "Clear filters" action | Keep the filters visible |
| Empty: real zero | The zero, shown as data ("0 overdue remittances") with a positive tone | Zero is information, not emptiness |
| Error | What failed, in plain words, and a retry | Contain it to the block so the rest of the page works; log details, do not show stack traces |
| Partial or stale | The data, plus an "As of 10:42" or "2 sources unavailable" note | Never hide that numbers are incomplete |
| Success | Inline confirmation or a toast; update the data in place | Do not navigate away unexpectedly |
| No permission | That the user cannot see this, and who can grant access | Do not render an empty block that looks like "no data" |

If the project already has a shared state component (for example a
`DataState` or `EmptyState`), use it so every block behaves the same way.

```tsx
// Shape of a per-section state switch. Replace the placeholders with the
// project's skeleton, empty-state and error components.
type Section<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; data: T }

export function SectionBody<T>({
  state,
  isEmpty,
  empty,
  skeleton,
  children,
}: {
  state: Section<T>
  isEmpty: (data: T) => boolean
  empty: React.ReactNode
  skeleton: React.ReactNode
  children: (data: T) => React.ReactNode
}) {
  if (state.status === 'loading') return <div aria-busy="true">{skeleton}</div>
  if (state.status === 'error')
    return (
      <div role="alert" className="text-sm">
        <p>{state.message}</p>
        <button type="button" onClick={state.retry} className="mt-2 underline">
          Try again
        </button>
      </div>
    )
  return isEmpty(state.data) ? <>{empty}</> : <>{children(state.data)}</>
}
```

---

## 10. Light and dark

- Both themes are part of "done" when the product has both. Build with semantic
  tokens only, so a component never needs a `dark:` override for colour.
- After building, check in dark: status colours, chart series, borders on
  surfaces, focus rings, disabled states, and images or logos.
- If the product has no dark theme, do not add one as a side effect of a
  dashboard task. Note it, and follow `dashboard-design-system` §5 when asked.

---

## 11. Motion

- Motion explains a change: an overlay entering, a row being added, a panel
  expanding. Keep it short (around 150 to 250ms) and consistent.
- Respect `prefers-reduced-motion`; with it set, remove movement and keep instant
  or opacity-only changes.
- Use the motion library the project already has (for example Motion for React,
  imported from `motion/react`). If none is installed, CSS transitions are
  enough for dashboards; do not add a library for one fade.
- No entrance animation on every card, no parallax, no animated backgrounds on
  data screens.

---

## 12. Quality bar

**Avoid**, and what to do instead:

| Avoid | Instead |
|---|---|
| Gradients on surfaces, text or charts | Flat surfaces; colour carries meaning only |
| Floating cards with heavy drop shadows | Hairline borders and surface contrast; shadow only for overlays |
| Glassmorphism, blur and translucency on data | Opaque surfaces with readable contrast |
| Random or decorative animation | Motion that explains a state change (§11) |
| Oversized headings and hero sections | The type scale's page-title size; content starts near the top |
| Decorative charts that answer nothing | A number, a table, or no block at all |
| Inconsistent corner radii | The radius scale, one radius per component type |
| Repetitive equal-size card grids | Sizes by importance; mix KPIs, a table and one chart |
| Clutter: every metric on one screen | One question per page; drill-down for the rest |
| Icons on every label | Icons where they speed recognition (nav, status, actions) |
| Placeholder or invented data | Real data, or an honest empty state |

**Before you hand off, check:**

- [ ] The page's purpose sentence is true of what you built.
- [ ] Every figure has its unit, period and scope visible or one step away.
- [ ] Totals shown in more than one place agree.
- [ ] All states in §9 exist and were seen in the browser.
- [ ] Keyboard-only pass: reach and operate everything; focus visible; overlays
      return focus.
- [ ] 320px, tablet and desktop widths checked; light and dark if both exist.
- [ ] No new hard-coded colours, radii or font sizes outside the token system.
- [ ] No new dependency that duplicates one already installed.
- [ ] Lint, typecheck, build and the relevant tests pass.
