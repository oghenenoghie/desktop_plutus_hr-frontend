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
- `formatNaira` and `nairaToMinor` in `src/lib/format.ts` are Naira-only. Do not use them for another country's amounts. `formatMoney(minor, currency)` in `src/lib/analytics/format.ts` takes the currency's own minor units from `Intl` (RWF and XOF have none). Every screen showing amounts must move to the organisation's currency before a country other than Nigeria is made active.
- End-to-end tests: `e2e/countries.spec.ts` in `plutus-hr-system-frontend` (sign-up, Setup, the catalogue, and the API's refusals); this repo has no e2e suite.
