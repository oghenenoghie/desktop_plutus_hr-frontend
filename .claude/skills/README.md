# Project skills

Claude Code loads every `SKILL.md` in this folder. A skill activates when a task
matches its `description` (in the YAML frontmatter), or when you invoke it by
name (`/dashboard-design-engineer`).

This folder holds two groups:

- **Product skills (`plutus-*`)**: what Plutus is, what already exists, and the
  domain rules (payroll compliance, multi-country tax, inventory, the UX audit
  method). These are the ground truth for this product.
- **Dashboard skills (`dashboard-*`)**: a general method for building premium
  enterprise dashboards. They apply to any React and Tailwind project, and they
  defer to the product skills on what to build and what things are called.

When the two disagree, the product skills win on scope, names, information
architecture and domain rules; the dashboard skills govern how the work is
built.

---

## Dashboard skills

| Skill | Activates for | Owns |
|---|---|---|
| [`dashboard-design-engineer`](dashboard-design-engineer/SKILL.md) | Creating, redesigning or reviewing a dashboard page or the app shell | The 13-step implementation workflow, page archetypes, information hierarchy, sidebar and headers, responsive rules, KPI cards, filters, tabs, drawers, modals, menus, keyboard access, page states, motion, and the quality bar |
| [`dashboard-component-library`](dashboard-component-library/SKILL.md) | Needing a component, choosing a library, installing from shadcn/ui or a registry | Inspecting the project first, the source priority order (shadcn/ui, 21st.dev, Aceternity UI, Magic UI, React Bits, Tremor, Radix UI, HeroUI, Mantine, MUI), verification of commands and props, compatibility checks, adaptation and dependency hygiene |
| [`dashboard-data-visualization`](dashboard-data-visualization/SKILL.md) | Any chart, trend indicator, progress or gauge, or date-range control | Choosing the chart from the message, integrity rules, Recharts, ECharts, Tremor, Chart.js and Visx, date ranges, accessibility, empty and missing data |
| [`dashboard-data-table-engineer`](dashboard-data-table-engineer/SKILL.md) | Any list of records with sorting, filtering, selection, export or server data | TanStack Table v9 and v8 (detected), server-side tables, virtualisation, bulk actions, inline editing, CSV export, mobile layouts, table accessibility |
| [`dashboard-design-system`](dashboard-design-system/SKILL.md) | Tokens, theming, dark mode, variants, consistency audits | Colour, type, spacing, borders, shadows, radius, icons, z-index, motion, breakpoints and layout tokens; Tailwind 4 and 3 implementation; dark theme rules; contrast checks |
| [`dashboard-mcp-tooling`](dashboard-mcp-tooling/SKILL.md) | Figma, 21st.dev, shadcn registry, Iconify, Context7 or browser checks | Discovering what is really connected, setup commands, workflows, and a manual fallback for each integration |

### How they work together

```
dashboard-design-engineer        (what goes on the page and the workflow)
 ├─ needs a component      → dashboard-component-library
 ├─ needs a chart          → dashboard-data-visualization
 ├─ needs a table          → dashboard-data-table-engineer
 ├─ needs tokens or themes → dashboard-design-system
 └─ needs an MCP server    → dashboard-mcp-tooling   (each skill may call it)
```

Each rule lives in exactly one skill; the others link to it instead of repeating
it.

### Principles shared by all six

- Inspect the project before adding anything; existing components and tokens
  come first.
- Respect the installed framework and package versions. No major upgrades or
  config replacements as a side effect.
- Never invent component names, props, package APIs, metrics or data.
- Verify install commands and APIs in official docs or installed type
  definitions.
- Never assume an MCP server is connected; always have a manual fallback.
- Finish with the project's lint, typecheck and build, and a visual check in the
  browser.

### Complementary skills

Other skills may be available in your Claude session (for example specialist
skills for Aceternity UI, Magic UI, React Bits or Motion). Use them for that
library's details; the dashboard skills decide whether the library belongs in a
dashboard at all.

---

## State of this repository (when these skills were added, November 2026)

These facts will drift. The skills tell agents to re-inspect, so treat this as
orientation, not a specification.

- The same frontend lives in two repositories with identical copies of these
  skills: the cloud app (`plutus-hr-system-frontend`) and the desktop app
  (`desktop_plutus_hr-frontend`, the same Next.js app run as a standalone server
  inside Electron). Change both when you change a skill.
- Next.js 16, React 19, Tailwind CSS 4 (via `@tailwindcss/postcss`),
  `lucide-react` for icons. Read `AGENTS.md`: this Next.js version has breaking
  changes, and its docs ship in `node_modules/next/dist/docs/`.
- An in-house UI kit in `src/components/ui` (button, card, badge, input, select,
  modal, drawer, tabs, table, toast, KPI tile, data state, confirm dialog, and
  more) and analytics components in `src/components/analytics` (shell, filter
  bar, KPI card, chart card, hand-rolled SVG charts with table twins, records
  drawer).
- Tokens are CSS variables in `src/app/globals.css` (`oklch` colours, status
  tint and ink pairs, a radius scale), mapped to utilities with `@theme inline`.
  There is no dark theme yet.
- shadcn/ui is not set up (no `components.json`), and no chart or table library
  is installed. Adopting one is a decision, not a default; the skills say how to
  make it.
- Playwright is a dev dependency in both repositories (the cloud app also has
  `@axe-core/playwright`), which the browser-check fallback can use.

## MCP setup for Claude Code

No MCP servers are configured in this repository (`.mcp.json` does not exist).
To enable the integrations the dashboard skills can use, see
[`dashboard-mcp-tooling`](dashboard-mcp-tooling/SKILL.md) §4. In short:

| Integration | Setup |
|---|---|
| Figma | `claude plugin install figma@claude-plugins-official`, or `claude mcp add --transport http figma https://mcp.figma.com/mcp` and sign in with `/mcp` |
| 21st.dev | `npx @21st-dev/cli@latest init --client claude` (needs an API key from 21st.dev) |
| shadcn | `npx shadcn@latest mcp init --client claude` (needs `components.json`) |
| Context7 | `npx ctx7 setup --claude`, or the remote server with an API key |
| Playwright | `claude mcp add playwright npx @playwright/mcp@latest` |
| Iconify | No official server; use the public API or icon-sets.iconify.design |

Do not commit API keys. A shared `.mcp.json` may reference environment variables
(`${VAR}`).

## Adding or changing a skill

- One folder per skill, with a `SKILL.md` starting with YAML frontmatter:
  `name` (lowercase letters, digits and hyphens; 64 characters at most, matching
  the folder) and `description` (1,024 characters at most, saying what the skill
  does and when to use it).
- Keep each skill focused. Link to another skill instead of copying its rules.
- Date any version-specific fact ("checked November 2026") so readers know when
  to re-verify it.
