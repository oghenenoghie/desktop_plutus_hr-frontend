# Plutus HR System — Frontend

Next.js (App Router) frontend for [`plutus-hr-system`](https://github.com/oghenenoghie/plutus-hr-system), the FastAPI backend for Plutus Technologies' compliance-native payroll and HR platform.

## Stack

- **Next.js 16** (App Router, TypeScript, client-rendered auth/data — no server-side session)
- **Tailwind CSS v4**, themed with the "Ledger" design system (see `src/app/globals.css`)
- **Manrope** via `next/font/google`
- Plain `fetch` against the FastAPI backend — no data-fetching library

## Getting started

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_BASE_URL at your backend
npm run dev
```

The app expects `plutus-hr-system` running locally (default `http://localhost:8000/api/v1`) with at least one seeded `Account` + `Membership` to sign in with. To preview the UI without a backend at all, set `NEXT_PUBLIC_MOCK_MODE=1` in `.env.local` — every screen renders from `src/lib/api/mock-fixtures.ts` and skips login entirely.

## Structure

```
src/
  app/
    login/               sign-in screen
    (app)/                admin/manager shell: sidebar nav + dashboard, employees,
                          payroll, leave, expenses, loans, benefits, contractors,
                          reports, settlement, simulation, analytics
    me/                   employee self-service surface (single page, no admin nav)
  components/
    layout/               Sidebar, TopBar, PageHeader
    ui/                   Card, Badge, Button, Input, Table, KpiTile, Avatar, ...
    analytics/            analytics shell, filter bar, KPI cards, chart cards,
                          drill-down drawer, and the SVG charts in charts/
    employee-picker.tsx   shared employee <select> used by benefits/settlement/simulation
  lib/
    api/                  apiFetch client (token refresh, 401 handling) + typed endpoints
    auth/                 token storage, AuthProvider/useAuth, route AuthGate
    types.ts              TypeScript mirror of the backend's Pydantic schemas
    format.ts             ₦ currency formatting (whole naira, en-NG), dates, initials
    nav.ts                role → nav item mapping
    analytics/            analytics types, API calls, URL filters, formatting
```

## Analytics & Insights

`/analytics` and its nine section pages (workforce, payroll, attendance, leave, recruitment, performance, compliance, financial, custom reports) render the backend's `/api/v1/analytics` responses. Every figure is computed on the server; the screens only format and draw it.

- **Filters** live in the URL, under the API's own parameter names, so a view can be bookmarked or shared, and the section tabs keep them (`src/lib/analytics/filters.ts`).
- **Access:** the tabs and pages follow `GET /analytics/access`. A hidden tab is a convenience; the API refuses the data either way.
- **Charts** are plain SVG with no chart library. Each one works from the keyboard, announces the focused point, and has a table view.
- **Drill-down and export:** every KPI and chart with a dataset opens its source records in a drawer, and exports CSV, XLSX or PDF from the API.

Metric definitions and the security model are in the backend's `docs/analytics-metrics.md` and `docs/analytics-security.md`.

## Auth model

The backend issues JWT access/refresh token pairs from `POST /auth/login` (no cookies). This app:

1. Stores both tokens in `localStorage` (`src/lib/auth/token-store.ts`).
2. Attaches `Authorization: Bearer <access_token>` to every request.
3. On a `401`, transparently calls `POST /auth/refresh` once and retries; if that fails, clears the session and redirects to `/login`.

Roles are `admin`, `payroll_manager`, `manager`, `employee` (from `GET /auth/me`). Admin/payroll_manager/manager land in the sidebar shell at `/dashboard`; `employee` lands on the single-surface self-service page at `/me`. `AuthGate` (`src/lib/auth/auth-gate.tsx`) enforces this client-side — the real authorization boundary is the backend's RLS + `require_roles`, not this nav filter.

## Design system

Colors, type scale, spacing and component patterns follow Plutus's "Ledger" design system — flat, bordered, institutional, no shadows, whole-naira currency. Tokens live as CSS custom properties in `src/app/globals.css` and are exposed to Tailwind via `@theme inline` (`bg-primary`, `text-good`, `rounded-card`, etc.).

## Desktop app

`electron/` packages this app as a fully offline desktop build: an
Electron shell that spawns an embedded Postgres, the `plutus-hr-system`
backend (bundled by that repo's `desktop/build.sh` into a standalone
executable), and this app's own Next.js standalone server — all on
127.0.0.1, no cloud backend or network access required.

```bash
# 1. Build the backend executable in a sibling checkout of
#    desktop_plutus_hr-backend (or set BACKEND_DIST_DIR to point elsewhere):
#    cd ../desktop_plutus_hr-backend && ./desktop/build.sh

npm run electron:build-frontend    # next build with output: 'standalone'
npm run electron:prepare-resources # copies both bundles into resources/
npm run electron:package           # electron-builder -> release/
```

On launch the app opens a window straight away (`electron/startup.html`)
and keeps it up while Postgres, the backend and the Next server start,
then loads the app in it; if startup fails it says so in a dialog rather
than closing. On Windows, `electron/stop-plutus.ps1` stops every process a
Plutus install runs. The installer runs it before replacing an installed
version (`electron/installer.nsh`), since electron-builder's own check
closes only the window and the backend and Postgres otherwise keep the old
files locked; the app runs it at startup when leftovers from a crashed run
still hold its ports.

The Linux AppImage is built with AppImage's static runtime (`toolsets.appimage`
in `electron-builder.yml`), so it opens on Ubuntu 22.04 and later without
libfuse2; it needs only FUSE's `fusermount3`, which those systems install.
The build workflow opens the Linux and macOS apps that way, with no locale
set, on every run.

`npm run electron:dist` runs all three in sequence. `.github/workflows/build-desktop.yml`
does the same for macOS/Windows/Linux on `workflow_dispatch` or a
`desktop-v*` tag.

### Code signing

Unsigned by default — no repo secrets configured means mac/win builds are
exactly as before (Gatekeeper/SmartScreen warnings on first launch). Add
these as repo secrets to turn signing (and macOS notarization) on with no
further workflow changes:

| Secret | Purpose |
| --- | --- |
| `MAC_CSC_LINK` / `MAC_CSC_KEY_PASSWORD` | Developer ID Application cert (base64 `.p12`, or a URL to one) + its password |
| `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` | Notarization — electron-builder notarizes automatically once all three are set |
| `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` | Authenticode cert (base64 `.pfx`, or a URL to one) + its password |

## Accounting audit

The accounting / chart-of-accounts audit and implementation plan lives in one place, the backend repo:
[`ACCOUNTING_IMPLEMENTATION_AUDIT.md`](https://github.com/oghenenoghie/plutus-hr-system/blob/main/ACCOUNTING_IMPLEMENTATION_AUDIT.md).
It covers this desktop edition too, because `desktop_plutus_hr-backend` runs the same code and migrations as `plutus-hr-system` (see its §2.4).
Any accounting UI change planned there applies to this app and to `plutus-hr-system-frontend` alike.

## What's scaffolded vs. stubbed

Every backend list/read endpoint is wired up and rendering real data. Write actions are wired where they're a single click (leave/expense approvals, statutory filing/remittance, benefit lookups). Multi-field create forms are done for the two that unblock everything else — **New Employee** (`/employees/new`) and **New Pay Run** (`/payroll/new`). Still not built: new loan/expense/benefit application forms — that's the natural next slice of work on top of this scaffold.
