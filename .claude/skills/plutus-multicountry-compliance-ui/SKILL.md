---
name: plutus-multicountry-compliance-ui
description: Build and maintain Plutus country selection, tax settings, VAT/WHT controls, compliance dashboards and jurisdiction-specific forms in the Next.js frontend.
---

# Plutus multi-country compliance UI

- Inspect existing route groups, UI primitives, API clients, auth/session conventions, loading/error/empty states and design skills before implementation.
- Do not hardcode tax rates or assume a country listed in the catalogue is active for calculations.
- Read country and rule status from authenticated backend APIs. Never treat browser state as authoritative for country, tax registration, permission, or effective date.
- Show the currency and jurisdiction beside monetary values. Avoid Naira-only formatters on multi-country pages; use `Intl.NumberFormat` with the country currency where appropriate.
- Display status clearly: setup required, draft, awaiting review, active, superseded, or blocked. Do not offer a live-posting action for unapproved rules.
- Preserve existing keyboard accessibility, responsive layout, loading/error states, and the Plutus design system.
- Mutations must use the established API client and server-side authorisation; do not store long-lived secrets in localStorage. Follow the project’s current authentication architecture and raise any mismatch before adding a new token-storage pattern.
- Add tests for country switching, missing tax configuration, permission failures, currency display, and historical-period warnings.

## Where things are in this repository
- Catalogue screen: `src/app/(app)/compliance/countries/page.tsx`, reading `complianceApi.countries()` (`GET /compliance/countries`) through `useApiResource`. The Nigerian rule screen is `src/app/(app)/compliance/page.tsx`.
- The organisation's country: chosen at sign-up (`src/app/signup/page.tsx`, from the public `organisationApi.countries()`), shown and changed in Setup & Onboarding (`src/app/(app)/setup/page.tsx`). `Organisation` carries `country_code`, `country_name` and `currency`. Only a country with `selectable: true` can be chosen; the server refuses any other (422) and any change once there's a pay run or posted journal (409).
- Status labels and badges for `CountryTaxStatus` (`active`, `in_review`, `draft`, `configuration_required`) are in `src/components/country-status.tsx`. Use them rather than writing new labels.
- API calls go through `apiFetch` in `src/lib/api/client.ts`. It attaches the token, refreshes on 401 and serves mock mode. Add endpoints to `src/lib/api/endpoints.ts` and types to `src/lib/types.ts`. Do not call `fetch` from a page.
- Read-only mock data for `NEXT_PUBLIC_MOCK_MODE=1` is in `src/lib/api/mock-fixtures.ts`. Keep it in step with the backend's `COUNTRY_PROFILES`.
- Navigation: `src/lib/nav.ts`; icons: `src/components/layout/sidebar.tsx`. Primitives: `Badge` (tones good/warn/bad/neutral), `Card`/`CardHeader`, `Table`, and `LoadingState`/`ErrorState`/`EmptyState`.
- Money: `formatMoney(minor)` and `toMinorUnits(value)` in `src/lib/format.ts` use the signed-in organisation's currency (set from `/auth/me` in `auth-context.tsx`) and its own decimal places; `currencyLabel()` labels amount fields ("₦" or "KES"). Never divide by 100 or write "₦" by hand.
- Payroll availability: `user.payroll_available` from `useAuth()`. Mark a payroll-only nav item `payrollOnly: true` in `src/lib/nav.ts`; the app shell then hides it and shows `PayrollUnavailable` on its routes where payroll isn't available.
- A screen built on Nigeria's own rule versions (Compliance Engine, PAYE Calculator, Simulation, Contractors) is `nigeriaOnly: true`; elsewhere the shell hides it and shows `NigeriaOnly`. Tax Settings is `engineOnly: true` (hidden in Nigeria, `EngineOnly` shown). `lockedReason` in `src/lib/nav.ts` decides which notice a route gets.
- Tax Settings: `src/app/(app)/tax-settings/page.tsx` reads `complianceApi.taxSettings()` and posts `complianceApi.enterTaxSettings()` (admin only; the API refuses others). It shows the country's approved rules and sources, the figures the organisation enters (each option naming its source), what's missing, the rules as they stand and the history. Values go to the API as typed ("5.75", "1500.00", "15", an option's value); never convert them in the page. `TaxSettingsNotice` (`src/components/tax-settings-notice.tsx`) lists missing figures on payroll screens outside Nigeria.
- Nigerian-only inputs: use `RegionField`, `useIsNigeria` and `useRegionLabel` from `src/components/region-field.tsx` rather than `NIGERIA_STATES` directly.
- Payslips from the country rule engine (every country but Nigeria) carry `statutory_lines`; a Nigerian payslip has none and uses its pension, NHF and PAYE fields.
  - Use `isEnginePayslip`, `employeeLines`, `employerLines` and `lineColumns` from `src/lib/payslip-lines.ts` rather than reading `paye_minor` alone.
  - Name a statutory liability with `liabilityLabel` (`src/lib/liabilities.ts`): a `country` liability is named by its `line_code`.
  - Family shares (`tax_half_shares`, in halves) and `is_expatriate` are shown only for a non-Nigerian organisation, only to someone who can see the employee's pay. Send them only when changed.
- End-to-end tests: `e2e/countries.spec.ts` in `plutus-hr-system-frontend` (sign-up, a Kenyan company's journey including Tax Settings, Setup, the catalogue, and the API's refusals); this repo has no e2e suite.
