---
name: dashboard-data-visualization
description: 'Choose, build and review charts and data displays for dashboards: bar, line, area, pie and donut, progress, gauge and bullet, comparison and variance, sparklines and trend indicators, with date-range filters, tooltips and legends. Use when a screen needs to show a metric over time, compare categories, show part-to-whole or progress to target, when picking between Recharts, Apache ECharts, Tremor, Chart.js, Visx or an existing in-house chart kit, or when a chart is misleading, inaccessible, unresponsive or breaks on empty or missing data. Chooses the chart from the message, keeps axes and scales honest, never invents metrics or sample numbers, labels units and periods, and gives every chart an accessible name, a text summary and a table alternative.'
---

# Dashboard Data Visualization

A chart earns its space only if it answers a question faster than a number or a
table would. Page layout and KPI cards belong to `dashboard-design-engineer`;
colour tokens to `dashboard-design-system`; library installation to
`dashboard-component-library`.

---

## 1. Start from the message, not the chart type

Write the sentence the chart must prove ("Overtime cost rose for three months and
is now 18% over budget"), then pick the form:

| The message is about | Use | Avoid |
|---|---|---|
| Change over time | Line (several series) or area (one series, volume matters) | Bars for long daily series; pie |
| Comparing categories | Bar; horizontal when labels are long or there are many categories | Pie with more than 5 slices; 3D |
| Ranking | Sorted horizontal bar | Unsorted bars |
| Part-to-whole, one moment | Stacked bar or a single 100% bar; donut only with 2 to 5 parts | Pie of 12 departments |
| Part-to-whole over time | Stacked bar (few periods) or stacked area (many) | Several pies side by side |
| Actual against target or budget | Bullet chart, or bar with a target line, plus a variance column | Gauge for every metric |
| Progress to a goal | Progress bar with the numbers ("312 of 400 payslips sent") | Circular progress without a number |
| A single value against thresholds | Bullet chart; a gauge only on a sparse executive view | Several gauges in a row |
| Distribution | Histogram or box plot | Average alone |
| Relationship between two measures | Scatter | Dual-axis line |
| Stages and drop-off | Funnel or horizontal bar of stages | Pie |
| Variance between periods or plans | Grouped bar, or a table with signed variance and % | Two separate charts the reader must compare |

**Do not chart:**

- a single number (use a KPI card);
- fewer than three data points (use text or a small table);
- data people need to look up exactly (use a table);
- anything you cannot label with a unit and a period.

---

## 2. Integrity rules

These are not style preferences. Breaking them misleads people about money.

- **Bar and area charts start at zero.** Length encodes value.
- **Line charts may use a non-zero baseline**, but mark it clearly and do not
  exaggerate small changes.
- **Same scale for charts compared side by side** (small multiples share axes).
- **No dual Y axes** unless both are labelled with units and there is no clearer
  option; two aligned charts are usually better.
- **Evenly spaced time.** Missing months are gaps, not skipped categories.
- **Missing is not zero.** Render gaps for nulls. Check how the library treats
  `null` with line connection and stacking options in the installed version
  before relying on it.
- **Partial periods are marked.** The current month-to-date is dashed, lighter or
  labelled "MTD", and not compared with full periods as if equal.
- **Units, currency and period on the chart** (axis title, subtitle, or tooltip).
  Percent and percentage points are different units.
- **Never invent, interpolate or smooth away data.** No sample numbers in
  production code, no "trend" lines that are not computed from the data, no
  rounding that changes a total. If the metric does not exist in the API, build
  the empty state and say what is missing.
- **Aggregation is stated.** Sum, average, median or end-of-period balance:
  the reader must be able to tell which.
- **No 3D, no decorative gradients, no shadows on marks.**

---

## 3. Choose the library

Check what is installed first. If the project already draws charts some way
(an in-house SVG kit, a wrapper component), extend that before adding a library.

| Library | Model | Choose when | Notes (checked November 2026; re-verify) |
|---|---|---|---|
| **Recharts** | React components rendering SVG | Typical dashboard charts: line, bar, area, pie, composed | 3.x is current (3.10.1). `accessibilityLayer` defaults to `true`. Charts accept `title`, `desc` and `role`. A `responsive` prop on the chart exists in 3.10 as an alternative to `ResponsiveContainer`; on older versions use `ResponsiveContainer`. Read the 3.0 migration guide when upgrading from 2.x |
| **Apache ECharts** (`echarts`) | Imperative, canvas or SVG renderer | Large datasets, dense interaction (zoom, brush), heatmaps, maps, Sankey | 6.x is current. Import from `echarts/core` and register only the charts and components you use. Has a built-in `aria` option that generates a description. Wrappers such as `echarts-for-react` are community packages; a small `useEffect` wrapper (§9) avoids the dependency |
| **Tremor** | React components on Recharts | The project already uses Tremor | `@tremor/react` 3.18.x declares a React ^18 peer only; see `dashboard-component-library` §3 before adding it to a React 19 project |
| **Chart.js** with `react-chartjs-2` | Canvas | Simple charts where canvas performance matters | Register every scale, element and plugin you use (`Chart.register(...)`). Canvas output needs an explicit text alternative |
| **Visx** | Low-level D3-based primitives | Custom visuals the others cannot express | You build axes, scales and interaction yourself. More code, full control |

In frameworks with server components (Next.js App Router), chart components run
on the client: put `'use client'` at the top of the chart file, and keep data
fetching and aggregation on the server.

---

## 4. Build rules

- **Prepare data outside the chart.** Aggregate, sort and fill time gaps (with
  `null`) in a function or on the server; memoise with `useMemo` when it is
  derived on the client. Charts receive ready rows.
- **Format with `Intl`.** One formatter per unit (currency in the record's
  currency, percent, count, duration), shared by axis ticks and tooltips.
- **Size explicitly.** Give the chart or its container a fixed height or an
  aspect ratio. Percentage heights inside an auto-height parent collapse to zero.
- **Colour by meaning and keep it stable.** The same metric keeps the same colour
  across the page. Use the design system's categorical chart tokens; status
  colours (positive, warning, negative) only when the series means that.
- **At most about six series.** More than that, use small multiples, a table, or
  highlight one series and grey the rest.
- **Label directly when you can.** A legend is needed only for more than one
  series that cannot be labelled at the line end. Put it above or below on
  narrow screens, never over the plot.
- **Tooltips show the exact value, unit and full date**, and never contain
  information that is not reachable another way.
- **Ticks:** few and round. Abbreviate large numbers on the axis (`₦1.2m`), exact
  values in the tooltip. Avoid rotated labels; switch to horizontal bars instead.
- **Animation off for dashboards** or very short, and always off with
  `prefers-reduced-motion` (Recharts: `isAnimationActive={false}`).
- **Check dark mode.** Gridlines, axis text and series colours must keep at least
  3:1 contrast against the dark surface.

---

## 5. Date-range filters and comparison

- **Presets first:** Today, Last 7 days, Last 30 days, Month to date, Quarter to
  date, Year to date, Last year, Custom. Add fiscal-year presets where the
  organisation's year does not start in January (common in accounting).
- **Show the resolved dates** ("1 Oct – 31 Oct 2026"), not only the preset name.
- **Granularity follows the range:** days up to about 31 days, weeks up to about
  six months, months beyond. Let users override if the product needs it.
- **Comparison toggle:** previous period of equal length, or the same period last
  year. Draw the comparison as a lighter or dashed series and say which it is.
- **Time zone and locale:** compute period boundaries in the organisation's time
  zone and state it when users span zones.
- **State in the URL** so the view can be shared (see `dashboard-design-engineer`
  §7).
- **One range drives the page** unless a block says otherwise in its header.

---

## 6. Trend indicators and sparklines

- A trend indicator is: signed change, percent change, direction icon, and the
  comparison label ("+₦2.1m (+4.2%) vs Sep").
- Colour follows the metric's good direction (configured per metric), and is
  never the only signal.
- When the base is zero or missing, show "New" or "No comparison", not a
  percentage.
- Sparklines have no axes, so they only appear next to the number they describe,
  and use the same period as the comparison. Do not use them to show anything the
  reader must read precisely.

---

## 7. Accessibility

Every chart needs:

1. **An accessible name**: the chart's title, linked by `aria-labelledby` or a
   `<figcaption>`.
2. **A text summary of the message** (one or two sentences, computed from the
   data, not hard-coded): "Gross pay rose 6% from June to October; October was
   the highest month at ₦48.2m."
3. **A table alternative** with the same numbers: a "View as table" toggle, or a
   table in a disclosure below the chart. For canvas renderers this is required.
4. **Not colour alone**: direct labels, markers or patterns distinguish series.
5. **Contrast**: marks and essential gridlines at least 3:1 against the
   background (WCAG 1.4.11); text at least 4.5:1.
6. **Keyboard access to tooltips** if tooltips hold detail (Recharts'
   accessibility layer supports arrow keys; ECharts needs the table alternative).
7. **Reduced motion** respected.

---

## 8. Empty, loading and missing data

| Case | Show |
|---|---|
| Loading | A skeleton of the chart frame at the final height |
| No data in the selected range | The frame, axes hidden, and "No payroll runs between 1 and 31 Oct" with a way to change the range |
| Metric not set up | What is needed to start ("Connect a bank account to see cash flow") |
| Some periods missing | Gaps in the line, and a note ("No data for August") |
| Error | Contained message and retry, inside the chart frame |
| All values zero | A flat line at zero is data; say so in the summary |

---

## 9. Examples

### Recharts line chart with accessible wrapper

```tsx
'use client'

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

type Point = { period: string; label: string; gross: number | null }

export function GrossPayTrend({
  rows,
  currency,
  summary,
}: {
  rows: Point[] // aggregated on the server, gaps filled with null
  currency: string // from the organisation's settings
  summary: string // computed from rows by the caller
}) {
  const money = new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 })
  const compact = new Intl.NumberFormat(undefined, { style: 'currency', currency, notation: 'compact' })
  const hasData = rows.some((r) => r.gross != null)

  return (
    <figure aria-labelledby="gross-trend-title">
      <figcaption>
        <h3 id="gross-trend-title" className="text-sm font-medium">Gross pay by month</h3>
        <p className="text-sm text-fg-muted">{hasData ? summary : 'No payroll runs in this range.'}</p>
      </figcaption>

      {hasData && (
        <LineChart
          data={rows}
          responsive // Recharts 3.10+; on older versions wrap in <ResponsiveContainer height={260}>
          style={{ width: '100%', height: 260 }}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
          title="Gross pay by month"
          desc={summary}
        >
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tickFormatter={(v: number) => compact.format(v)} tickLine={false} axisLine={false} width={72} />
          <Tooltip formatter={(value) => money.format(Number(value))} />
          <Line
            type="monotone"
            dataKey="gross"
            name="Gross pay"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      )}

      <details className="mt-2 text-sm">
        <summary>View as table</summary>
        <table>
          <thead>
            <tr><th scope="col">Month</th><th scope="col" className="text-right">Gross pay</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period}>
                <td>{r.label}</td>
                <td className="text-right tabular-nums">{r.gross == null ? 'No data' : money.format(r.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
```

`--chart-1` and `--chart-grid` are placeholder token names; use the design
system's chart tokens.

### ECharts without a wrapper package

```tsx
'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'

echarts.use([BarChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer])

export function EChart({ option, height = 280, label }: { option: EChartsCoreOption; height?: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    chart.current = echarts.init(ref.current, undefined, { renderer: 'svg' })
    const observer = new ResizeObserver(() => chart.current?.resize())
    observer.observe(ref.current)
    return () => {
      observer.disconnect()
      chart.current?.dispose()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    chart.current?.setOption({ aria: { enabled: true }, animation: false, ...option }, true)
  }, [option])

  return <div ref={ref} role="img" aria-label={label} style={{ height }} />
}
```

Pair it with a table alternative as in the Recharts example. Check the
`EChartsCoreOption` type name against the installed version's type definitions.

### Progress to target

```tsx
export function TargetProgress({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(done / total, 1) : 0
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">{done.toLocaleString()} of {total.toLocaleString()}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-1 h-2 rounded-full bg-track"
      >
        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}
```

---

## 10. Review checklist

- [ ] The chart's message sentence is true and is shown as its summary.
- [ ] The form matches the message (§1); a number or table would not be better.
- [ ] Axes honest (§2): zero baseline for bars and areas, shared scales, no
      unlabelled dual axes, gaps for missing data, partial periods marked.
- [ ] Units, currency, period and aggregation visible.
- [ ] Every number comes from real data; nothing invented or hard-coded.
- [ ] Accessible name, text summary, table alternative, not colour alone (§7).
- [ ] Empty, loading, missing and error cases built and seen (§8).
- [ ] Readable at phone width and in dark mode; animation off with reduced motion.
