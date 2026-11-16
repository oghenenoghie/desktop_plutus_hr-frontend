---
name: dashboard-component-library
description: 'Find, select, verify and integrate UI components for dashboards and admin interfaces from the project itself first, then from shadcn/ui, 21st.dev, Aceternity UI, Magic UI, React Bits, Tremor, Radix UI, HeroUI, Mantine or MUI. Use when a screen needs a component that may not exist yet (date picker, combobox, command palette, sheet, data grid shell, stat card, sidebar, stepper, chart wrapper), when choosing between libraries, when installing a component with the shadcn CLI or a registry, or when checking whether a library fits the installed React, Tailwind and framework versions. Enforces: inspect existing components before adding anything, verify install commands and props in official docs, never invent component names, props or APIs, avoid duplicate or unnecessary dependencies, and adapt every imported component to the project design system.'
---

# Dashboard Component Library

You source components. The goal is the smallest, most consistent set of
components that does the job, not the newest library. Layout and behaviour rules
live in `dashboard-design-engineer`; token rules in `dashboard-design-system`;
MCP setup in `dashboard-mcp-tooling`.

**Rule zero: the project's own components come first.** A component that already
exists in this repository, even an imperfect one, is the default. Extend it with
a variant before you add a second way to do the same thing.

---

## 1. Inspect the project before sourcing anything

Run these from the app root and read the results before choosing:

```bash
# What is installed, and at which versions?
cat package.json
npm ls react react-dom next tailwindcss --depth=0 2>/dev/null

# Which UI, headless, icon, chart, table and motion libraries are present?
grep -E '"(@radix-ui/[^"]+|radix-ui|@base-ui[^"]*|react-aria[^"]*|@headlessui/react|@heroui/[^"]+|@mantine/[^"]+|@mui/[^"]+|@tremor/[^"]+|lucide-react|@tabler/icons-react|react-icons|motion|framer-motion|recharts|echarts|chart.js|@visx/[^"]+|@tanstack/[^"]+|class-variance-authority|tailwind-variants|clsx|tailwind-merge|cmdk|vaul|sonner)"' package.json

# Is shadcn/ui set up? (components.json is its config)
ls components.json 2>/dev/null && cat components.json

# What does the local kit contain, and how is it used?
ls src/components src/components/ui 2>/dev/null
grep -rhoE "from ['\"]@/components/[^'\"]+['\"]" src | sort | uniq -c | sort -rn | head -30
```

Then read the source of the closest existing components (props, variants,
how they take `className`, whether they are client components). Write down:

- the primitives available (button, input, select, dialog, drawer, tabs, table,
  badge, toast, tooltip, and so on);
- the styling approach (Tailwind utilities with tokens, CSS modules,
  CSS-in-JS, a provider theme);
- the variant approach (`cva`, `tailwind-variants`, a typed map, or props);
- the package manager, from the lockfile (`package-lock.json`, `pnpm-lock.yaml`,
  `yarn.lock`, `bun.lock` or `bun.lockb`). Use only that one.

---

## 2. Decision flow

```
Does the project already have it?
├─ Yes → use it. Missing a variant? Add the variant in the same file and style.
└─ No
   Does an installed library provide it?
   ├─ Yes → use that library's version, styled with project tokens.
   └─ No
      Is it a small, self-contained piece (a few files)?
      ├─ Yes → copy-in source from the priority list (§3), adapted to tokens.
      └─ No (complex widget: date range picker, combobox, virtualised grid)
         → a headless primitive the project can share (Radix UI, React Aria, Base UI),
           or a focused package, after the compatibility check (§4).
         → If none fits, build it on headless primitives and say why.
```

Never add a whole UI framework (HeroUI, Mantine, MUI) to get one component.

---

## 3. Sources in priority order

Use this order when the project does not already decide. "Copy-in" means the
source is written into your repo (you own and restyle it); "package" means a
runtime dependency.

| # | Source | Model | Best for in dashboards | Watch out for |
|---|---|---|---|---|
| 1 | **shadcn/ui** | Copy-in via the `shadcn` CLI and registries | Accessible primitives (dialog, sheet, popover, command, select, tabs, calendar, table, sidebar, chart wrapper) styled with Tailwind and CSS variables | Needs `components.json` (`npx shadcn@latest init`). The CLI can target different headless bases (its `docs` command accepts `base`, `radix` or `aria`); match what `components.json` already uses. Generated files use shadcn token names (`bg-background`, `text-muted-foreground`), which must be mapped to the project's tokens if it has its own |
| 2 | **21st.dev** | Community registry of shadcn-compatible components; also an MCP server | Finding a ready-made pattern (sidebars, stat blocks, filter bars, empty states) | Quality and accessibility vary by author. Read every file before keeping it. Install with the exact command on the component's page or via its MCP server |
| 3 | **Aceternity UI** | Copy-in, mostly via a shadcn registry | Marketing and onboarding moments: landing sections, empty-state illustrations, feature highlights | Animation-heavy, usually needs Motion. Keep it off dense data surfaces |
| 4 | **Magic UI** | Copy-in, shadcn registry | Animated accents: marquee, border beam, animated list | Same as Aceternity. Do not use number tickers on financial or statutory figures |
| 5 | **React Bits** | Copy-in | Text and background effects for marketing pages | Rarely appropriate inside a working dashboard |
| 6 | **Tremor** | Package (`@tremor/react`) and copy-in blocks (tremor.so) | Dashboard-specific KPI cards, bar lists, chart wrappers built on Recharts | `@tremor/react` 3.18.x declares a peer of React ^18 only (checked November 2026), so it does not officially support React 19. Prefer the copy-in components on React 19, and check their Tailwind version requirements before installing |
| 7 | **Radix UI** | Package: unified `radix-ui` or per-primitive `@radix-ui/react-*` | Headless, accessible primitives styled entirely by you | Do not mix the unified package with per-primitive packages in one project; follow what is installed |
| 8 | **HeroUI** | Package (`@heroui/react`) | A full styled kit on React Aria | v3 requires React 19 or later and Tailwind 4 or later (checked November 2026). Brings its own theme layer, so adopt only for a new project or one already on it |
| 9 | **Mantine** | Package (`@mantine/core` and friends) | A complete kit with strong form and date components | v9 requires React ^19.2 (checked November 2026). Ships its own CSS and provider rather than Tailwind. Only when the project already uses Mantine |
| 10 | **MUI** | Package (`@mui/material`) | Projects already on Material UI | Uses Emotion (CSS-in-JS) by default and a distinct visual language. Only when the project already uses it |

If specialist skills for a library are available in the session (for example an
Aceternity UI, Magic UI or React Bits skill), use them for that library's
details; this skill decides whether to use the library at all.

---

## 4. Verify before you install or write the import

Version numbers and peer requirements above are a snapshot. Re-check every time.

1. **Find the official page** for the component (library docs or the
   registry item). Do not rely on memory or blog posts for names and props.
2. **Copy the exact install command** from that page. Do not reconstruct
   registry URLs or namespaces.
3. **Check compatibility with what is installed:**
   ```bash
   npm view <package>@<version> peerDependencies dependencies --json
   npm view <package> dist-tags --json
   ```
   Compare against the installed React, React DOM, Tailwind and framework
   versions from §1. A peer range that excludes your React major is a blocker,
   not a warning to silence with `--legacy-peer-deps` or `--force`.
4. **Preview copy-in components before writing files.** With the shadcn CLI:
   ```bash
   npx shadcn@latest view <item>              # inspect a registry item
   npx shadcn@latest search <registry> -q <query>
   npx shadcn@latest add <item> --dry-run     # list files and dependencies it would write
   npx shadcn@latest add <item> --diff        # compare with files you already have
   npx shadcn@latest docs <component>         # API reference and usage
   ```
   `<item>` is whatever the source's page gives you: a component name, a
   `@namespace/name`, or a URL. Never add `--overwrite` on files you have not
   diffed.
5. **Read the props from the source of truth**: the installed type definitions
   (`node_modules/<pkg>/dist/*.d.ts`), the copied source file, or the official
   API reference. Context7 can help if it is connected (`dashboard-mcp-tooling`).
6. **If you cannot verify a component, prop or command, say so.** Build from
   primitives, or ask. Do not guess an API and hope the typechecker catches it.

---

## 5. Evaluate a candidate

Score each candidate quickly against these; one hard failure rules it out.

| Criterion | Pass | Hard failure |
|---|---|---|
| Accessibility | Correct roles, labels, keyboard support, visible focus; built on a tested primitive | Div-buttons, hover-only content, focus traps that cannot be escaped |
| Version fit | Peer ranges include installed React, framework and Tailwind | Requires a different React or Tailwind major |
| Rendering model | Works in the framework's server/client split (`'use client'` where needed) | Touches `window` at import time in a server-rendered file |
| Styling | Takes `className`, uses CSS variables or utilities you can map to tokens | Hard-coded colours or inline styles throughout |
| Weight | Adds little or nothing new to the bundle | Pulls a second icon set, animation library or CSS-in-JS runtime |
| API shape | Controlled and uncontrolled modes, typed props, composable parts | Monolithic props bag, no way to reach inner elements |
| Maintenance and licence | Recent releases, permissive licence | Abandoned, or a licence the project cannot ship |

---

## 6. Adapt every imported component

After copying or installing, make it look and behave like the rest of the kit:

- **Tokens.** Replace hard-coded colours, radii, shadows and font sizes with the
  project's tokens. Map shadcn's names if the project uses different ones (for
  example `bg-background` → the project's background utility).
- **Variants.** Express variants with the project's mechanism and vocabulary
  (`tone`, `size`, `emphasis`), not the import's.
- **Location and naming.** Put it where siblings live, with the same file and
  export conventions.
- **Icons.** Use the project's icon set at its standard sizes. Remove imports of
  a second icon library.
- **Motion.** Remove decorative animation; keep transitions that explain state.
  Respect `prefers-reduced-motion`.
- **Copy.** Replace demo text and data. Never ship sample metrics.
- **States.** Add disabled, loading, error and empty presentations if the source
  lacks them.

---

## 7. Dependency hygiene

- One library per job: one dialog system, one toast system, one icon set, one
  date library, one class-merging helper. If two exist, use the one most of the
  codebase uses and do not add a third.
- Prefer copy-in over a runtime package for small components.
- Match the project's version pinning style (exact or caret) and package manager.
- Do not upgrade a major version of an existing dependency as a side effect.
  Raise it as a separate change.
- Remove dependencies you added and then stopped using.

---

## 8. Example: recording the decision

Leave a short note in the PR or task summary so reviewers can follow the choice.
The example is illustrative; re-run the checks for your own case.

```md
Component: date range picker for the pay-period filter

Checked in repo: no date picker; `Popover` and `Button` exist in src/components/ui.
Options considered:
- shadcn/ui calendar + popover (copy-in). Requires components.json, which this
  repo does not have, and a date library.
- React Aria DateRangePicker (package). Peer range includes React 19; accessible;
  styles via className.
Chosen: React Aria DateRangePicker, styled with existing tokens, wrapped as
`DateRangeField` beside `Select` in src/components/ui.
Verified: peerDependencies via `npm view`; props from installed .d.ts.
Not added: a second popover implementation; the existing Popover wraps it.
```

---

## 9. Done when

- [ ] You inspected the project's components and dependencies first (§1).
- [ ] The source was chosen by the decision flow, not by preference.
- [ ] Install command, peer requirements and props were verified (§4).
- [ ] The component uses project tokens, variants, icons and conventions (§6).
- [ ] No duplicate or unused dependency was introduced (§7).
- [ ] Lint, typecheck and build pass; the component was checked in the browser
      with keyboard only.
