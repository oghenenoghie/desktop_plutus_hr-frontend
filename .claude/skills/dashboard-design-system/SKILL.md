---
name: dashboard-design-system
description: 'Define, extend and enforce the design tokens and theming behind dashboard UIs: colour (semantic, status, chart), typography scale and numeric figures, spacing, borders, shadows and elevation, corner radius, icon sizing, z-index, motion, breakpoints and layout dimensions, component variants, and light and dark themes. Use when adding or changing tokens, building a dark theme, mapping Figma variables or a third-party component to project tokens, choosing chart or status colours, fixing inconsistent radii, colours or spacing, or auditing hard-coded values. Implements tokens as CSS variables with Tailwind utilities, supports Tailwind 4 (@theme, @theme inline, @custom-variant) and Tailwind 3 configs, and extends the existing system in place instead of replacing it.'
---

# Dashboard Design System

Tokens make a dashboard look like one product. This skill owns the values and how
they reach components. Page structure is in `dashboard-design-engineer`;
chart-specific colour use in `dashboard-data-visualization`.

**Extend, never replace.** If the project already has tokens, add to them with
the same naming and file layout. Do not introduce a parallel token set, rename
existing tokens, or swap the Tailwind configuration style as a side effect.

---

## 1. Find what exists

```bash
npm ls tailwindcss --depth=0
ls tailwind.config.* postcss.config.* components.json 2>/dev/null
grep -rln "@theme\|@import \"tailwindcss\"\|@tailwind base" src app styles 2>/dev/null
grep -rn "^\s*--[a-z]" src/app/globals.css src/styles 2>/dev/null | head -60
```

Signs of the setup:

| Setup | Signs | Tokens live in |
|---|---|---|
| Tailwind 4 | `@import "tailwindcss"` in CSS, `@tailwindcss/postcss` or `@tailwindcss/vite` installed | `@theme` / `@theme inline` blocks and `:root` variables in the main CSS file |
| Tailwind 3 | `tailwind.config.{js,ts}`, `@tailwind base;` directives | `theme.extend` in the config, often pointing at `:root` CSS variables |
| shadcn/ui | `components.json` with `cssVariables: true` | `:root` and `.dark` variables (`--background`, `--foreground`, `--primary`, `--muted-foreground`, `--border`, `--ring`, `--chart-1` …) mapped in `@theme inline` |
| Component framework | MUI, Mantine or HeroUI provider | The framework's theme object; map tokens there, not in parallel CSS |

Write down the existing names before adding any. A new token uses the same
prefixing, casing and layering.

---

## 2. Token layers

1. **Primitive**: raw scales (`--green-600`, `--gray-100`). Only semantic tokens
   reference them.
2. **Semantic**: purpose (`--surface`, `--fg-muted`, `--border`, `--primary`,
   `--positive`, `--focus-ring`). Components use these.
3. **Component** (only when needed): `--sidebar-width`, `--table-row-height`.

Components never reference primitives or raw values. That is what makes a dark
theme a matter of swapping semantic values.

---

## 3. Token reference for dashboards

Use these as defaults only when the project has no value for a category. Prefer
the project's values wherever they exist.

### Colour (semantic)

| Token role | Purpose | Rule |
|---|---|---|
| Background | App canvas | Slightly off the surface colour so surfaces read without shadows |
| Surface (and raised surface) | Cards, panels, table bodies; overlays | Opaque |
| Foreground, muted foreground | Body text; secondary text | Muted text still at least 4.5:1 on surface |
| Border, strong border | Hairlines, dividers; inputs and focus-adjacent edges | Inputs need at least 3:1 against their background |
| Primary, primary foreground, primary tint | Main actions, selection, links | One primary hue |
| Status: positive, warning, negative, info | Meaning only | Each with a **tint** (background) and an **ink** (text on tint) at 4.5:1 |
| Focus ring | `:focus-visible` outline | At least 3:1 against adjacent colours |
| Chart categorical 1 to 6 (or 8) | Series colours | Distinguishable in both themes and for common colour-vision deficiencies; not reused for status |
| Chart sequential and diverging | Heatmaps, ranges | Single hue light to dark; diverging around a neutral midpoint |

Status pairs matter in dashboards: badges, banners and toasts put text on a tint,
which is where contrast usually fails.

### Typography

| Use | Size (px) | Weight | Notes |
|---|---|---|---|
| Caption, table meta | 12 | 400 to 500 | Not for body text |
| Table cells, dense UI | 13 to 14 | 400 | |
| Body, inputs | 14 to 16 | 400 | |
| Section heading | 16 | 600 | |
| Page title | 20 to 24 | 600 | Dashboards do not need display sizes |
| KPI value | 24 to 30 | 600 | Tabular figures |

- Numbers in tables and KPIs use tabular figures (`tabular-nums`).
- One sans family for UI (the project's), optionally a mono for ids and codes.
- Line height around 1.4 to 1.5 for body, tighter (1.2 to 1.3) for headings.

### Spacing

A 4px base (Tailwind 4's default `--spacing: 0.25rem`, so `p-4` is 16px). Common
steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Inside components use 4 to 16; between
sections 24 to 32. Pick the density (comfortable or compact) per product, not per
page.

### Borders, shadows and elevation

- 1px borders do most of the separation work.
- Shadows only for things that float above the page: menus, popovers, drawers,
  modals, toasts. Cards on the page are flat. Keep at most three elevation levels.
- In dark themes shadows barely show; use a lighter surface and a border for
  elevation instead.

### Radius

- A short scale (for example 4, 6, 8, 12, 16px) with one radius per component
  type: chips and badges, buttons and inputs, cards and panels, overlays.
- Nested corners: inner radius = outer radius minus the padding between them, so
  a card's contents do not look pinched.
- Never mix arbitrary values (`rounded-[7px]`) with the scale.

### Icons

| Context | Size | Notes |
|---|---|---|
| Inline with 12 to 14px text, table cells, badges | 14 to 16px | |
| Buttons, inputs, nav items | 16 to 20px | Match the text's cap height visually |
| Empty states, feature callouts | 24 to 32px | |

One icon set (the project's; Lucide by default in React projects), one stroke
width, `aria-hidden` when decorative, an accessible name when the icon is the
only content of a control.

### Z-index, motion and layout

- **Z-index scale**: base content, sticky headers, dropdowns and popovers,
  drawers, modals, toasts, tooltips. Name the levels; do not use ad-hoc
  `z-[9999]`.
- **Motion**: two or three durations (for example 100, 150 and 250ms) and one or
  two easing curves; disabled or reduced under `prefers-reduced-motion`.
- **Breakpoints**: Tailwind 4 defaults are `sm` 40rem, `md` 48rem, `lg` 64rem,
  `xl` 80rem, `2xl` 96rem. Change them only for the whole product.
- **Layout**: sidebar expanded and rail widths, top bar height, page padding per
  breakpoint, content max width (if any), grid gutter. Define them once as
  tokens; components read them.

---

## 4. Implementing with Tailwind 4

- `@theme { ... }` defines tokens that generate utilities: `--color-*` makes
  `bg-*`, `text-*`, `border-*`; `--radius-*` makes `rounded-*`; `--shadow-*`,
  `--font-*`, `--text-*` (with `--text-*--line-height`), `--breakpoint-*`,
  `--ease-*` and `--animate-*` work the same way.
- `@theme inline { ... }` is for tokens whose value is another variable
  (`--color-surface: var(--surface)`). The utility then uses the variable directly,
  so swapping `--surface` under `.dark` re-themes everything.
- Runtime values (the ones dark mode swaps) live on `:root` and the dark selector;
  `@theme inline` maps them to utilities.
- Manual theme switching: `@custom-variant dark (&:where(.dark, .dark *));` (or a
  `data-theme` attribute selector) makes `dark:` follow a class instead of the
  operating system preference. Without it, `dark:` follows
  `prefers-color-scheme`.
- Prefer swapping semantic variables over writing `dark:` utilities in
  components. `dark:` is for the rare case a component needs different structure,
  not a different colour.

```css
/* Adding a dark theme and chart tokens to an existing Tailwind 4 setup.
   Merge into the project's CSS file; keep its existing names and values. */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  color-scheme: light;
  --surface: oklch(99% 0.005 95);
  --fg: oklch(22% 0.02 95);
  --fg-muted: oklch(48% 0.02 95);
  --border: oklch(90% 0.02 95);
  --chart-1: oklch(55% 0.12 152);
  --chart-2: oklch(62% 0.12 55);
  --chart-3: oklch(55% 0.12 250);
  --chart-grid: oklch(92% 0.01 95);
}

.dark {
  color-scheme: dark;
  --surface: oklch(22% 0.01 95);
  --fg: oklch(94% 0.01 95);
  --fg-muted: oklch(72% 0.01 95);
  --border: oklch(34% 0.01 95);
  --chart-1: oklch(72% 0.12 152);
  --chart-2: oklch(76% 0.12 55);
  --chart-3: oklch(72% 0.12 250);
  --chart-grid: oklch(30% 0.01 95);
}

@theme inline {
  --color-surface: var(--surface);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-border: var(--border);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
}
```

The values are illustrative. Derive real ones from the project's existing
palette, then check contrast (§7).

### Tailwind 3

- Map variables in `tailwind.config` under `theme.extend` (for example
  `colors: { surface: 'var(--surface)' }`); to keep opacity modifiers working,
  store channels (`--surface: 255 255 255`) and use
  `'rgb(var(--surface) / <alpha-value>)'`.
- Class-based dark mode uses `darkMode: 'class'` (or `'selector'` on 3.4.1 and
  later).
- Do not migrate a project from 3 to 4 unless that is the task.

---

## 5. Dark theme rules

- **Not an inversion.** Dark surfaces get lighter as they rise (canvas darkest,
  overlays lightest). Avoid pure black canvases; very dark grey reads better.
- **Lower saturation** for status and chart colours, raised lightness so they
  keep 3:1 against dark surfaces.
- **Re-check every pair**: body text 4.5:1, large text 3:1, borders of inputs and
  focus rings 3:1, status ink on status tint 4.5:1, chart marks 3:1.
- **Set `color-scheme`** in each theme so form controls and scrollbars match.
- **Default to the system preference, allow an override**, and persist the
  choice. Apply the theme class before first paint (an inline script in the root
  layout or the theming library the project already uses) to avoid a flash; in
  Next.js, read the installed version's docs on the root layout before adding
  scripts there.
- **Images and logos** need dark variants or a transparent background that works
  on both.
- If the product has no dark theme, adding one is its own task, not a side effect.

---

## 6. Component variants

Use one vocabulary across the kit:

| Axis | Values |
|---|---|
| `tone` | `neutral`, `primary`, `positive`, `warning`, `negative`, `info` |
| `size` | `sm`, `md`, `lg` |
| `emphasis` | `solid`, `soft`, `outline`, `ghost` |

Implement with the mechanism the project already uses (`class-variance-authority`,
`tailwind-variants`, or a typed map). Without one, a typed map needs no
dependency:

```tsx
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'positive' | 'warning' | 'negative' | 'info'

// Complete class names (never assembled from strings) so Tailwind detects them.
const badgeTone: Record<Tone, string> = {
  neutral: 'bg-neutral-tint text-neutral-ink',
  positive: 'bg-positive-tint text-positive-ink',
  warning: 'bg-warning-tint text-warning-ink',
  negative: 'bg-negative-tint text-negative-ink',
  info: 'bg-info-tint text-info-ink',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-badge px-2 py-0.5 text-xs font-medium ${badgeTone[tone]}`}>
      {children}
    </span>
  )
}
```

---

## 7. Validating contrast and consistency

- Run the project's accessibility tooling in both themes (for example axe through
  Playwright with `@axe-core/playwright` if installed:
  `await page.emulateMedia({ colorScheme: 'dark' })` before the scan when the
  theme follows the system preference, or toggle the theme class).
- Check status ink on tint and chart colours by hand too; automated tools miss
  text inside SVG and canvas.
- Audit drift before and after a change:

```bash
# Hard-coded colours in components (adjust paths)
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|oklch\(" src/components src/app --include=*.tsx | grep -v "var(--"
# Arbitrary Tailwind values that bypass tokens
grep -rnoE "(bg|text|border|rounded|shadow|p|m|gap|w|h)-\[[^]]+\]" src --include=*.tsx | sort | uniq -c | sort -rn | head -30
# Inline styles carrying visual values
grep -rn "style={{" src --include=*.tsx | grep -E "color|background|border|radius|shadow|font" | head
```

Fix by reusing a token or adding one in the right layer.

---

## 8. Mapping external sources to tokens

- **Figma variables** (`get_variable_defs` via the Figma MCP server, or Dev
  Mode): map each to an existing token by role, not by hex value. Add a token only
  for a role the system lacks.
- **shadcn/ui or registry components**: replace their token utilities
  (`bg-background`, `text-muted-foreground`, `ring-ring`) with the project's, or
  alias the shadcn variable names to the project's semantic variables in one
  place if the project adopts shadcn wholesale.
- **Library themes** (MUI, Mantine, HeroUI): feed the same semantic values into
  the library's theme object so both systems agree.

---

## 9. Done when

- [ ] Existing tokens were found and extended in place, with matching names.
- [ ] Components use semantic tokens only; no new hard-coded visual values.
- [ ] Both themes (if both exist) pass contrast checks, including status pairs
      and chart colours.
- [ ] Radius, spacing and type follow their scales; no arbitrary values added.
- [ ] Variants use the shared vocabulary and the project's variant mechanism.
- [ ] Lint, typecheck and build pass; the change was checked in the browser in
      each theme.
