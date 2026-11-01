import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (e2e/): the real app in Chromium, with every backend call
// answered in the browser by e2e/support/mock-api.ts — no backend, database
// or sign-in needed. Run with `npm run test:e2e` (first time:
// `npx playwright install chromium`).
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  // The first visit to each route compiles it under `next dev`.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    // A missing button fails in seconds rather than at the test timeout.
    actionTimeout: 15_000,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      // Never a real backend, whatever .env.local says; the mock answers
      // /api/v1 on any host, this just makes sure nothing else could.
      NEXT_PUBLIC_API_BASE_URL: "http://mock-api.local/api/v1",
      // Mock mode serves canned fixtures and refuses writes — the opposite
      // of what these tests check.
      NEXT_PUBLIC_MOCK_MODE: "",
    },
  },
});
