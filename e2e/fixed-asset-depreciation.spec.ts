import { expect, test, type Page } from "@playwright/test";

import { trackPageErrors } from "./support/dialogs";
import { balanceSheetOf, fixedAssetRecord, freshStore, installMockApi, writesTo, type MockStore } from "./support/mock-api";

// Accumulated depreciation: an asset already owned comes onto the books with
// the depreciation it had built up, the register totals what's on the books,
// each asset lists its depreciation history, and the balance sheet shows
// fixed assets at cost less accumulated depreciation.

let store: MockStore;
let errors: ReturnType<typeof trackPageErrors>;

test.beforeEach(async ({ context, page }) => {
  store = freshStore();
  store.fixedAssets = [
    fixedAssetRecord({
      id: "fa1",
      name: "Delivery Van",
      asset_tag: "FA-001",
      cost_minor: 1_200_000_00,
      accumulated_depreciation_minor: 300_000_00,
    }),
    fixedAssetRecord({
      id: "fa2",
      name: "Generator",
      asset_tag: "FA-002",
      cost_minor: 500_000_00,
      accumulated_depreciation_minor: 100_000_00,
    }),
    fixedAssetRecord({
      id: "fa3",
      name: "Old Printer",
      asset_tag: "FA-003",
      cost_minor: 999_000_00,
      status: "disposed",
      disposed_at: "2026-06-01T12:00:00Z",
    }),
  ];
  await installMockApi(context, store);
  errors = trackPageErrors(page);
});

test.afterEach(() => errors.expectNone());

const tiles = (page: Page) => page.getByRole("region", { name: "Fixed asset totals" }).locator(":scope > *");
const newAssetDrawer = (page: Page) => page.getByRole("dialog", { name: "New Fixed Asset" });

async function startNewAsset(page: Page, tag: string) {
  await page.goto("/fixed-assets");
  await page.getByRole("button", { name: "New Fixed Asset" }).click();
  await expect(newAssetDrawer(page)).toBeVisible();
  await page.fill("#name", "Forklift");
  await page.fill("#assetTag", tag);
  await page.fill("#acquisitionDate", "2023-03-01");
  await page.fill("#cost", "800000");
  await page.fill("#salvageValue", "50000");
  await page.fill("#usefulLifeMonths", "60");
}

test("the totals add up cost, accumulated depreciation and book value of active assets", async ({ page }) => {
  await page.goto("/fixed-assets");
  await expect(tiles(page)).toContainText([
    "Total cost₦1,700,000",
    "Accumulated depreciation₦400,000",
    "Net book value₦1,300,000",
  ]);
  await expect(tiles(page).first()).toContainText("2 active assets · 1 disposed not counted");
});

test("an asset already owned comes on with the depreciation it had built up", async ({ page }) => {
  await startNewAsset(page, "FA-010");
  await expect(page.locator("#acquisitionSourceHint")).toHaveText("Posts the cost against Cash and Bank.");
  await expect(page.locator("#openingDepreciation")).toHaveCount(0);

  await page.selectOption("#acquisitionSource", "opening");
  await expect(page.locator("#acquisitionSourceHint")).toContainText("against Opening Balance Equity");

  // More than cost less salvage value is refused before anything is sent.
  const create = newAssetDrawer(page).getByRole("button", { name: "Create Asset" });
  await page.fill("#openingDepreciation", "760000");
  await expect(page.locator("#openingDepreciationHint")).toHaveText(
    "Can't be more than cost less salvage value (₦750,000).",
  );
  await expect(page.locator("#openingDepreciation")).toHaveAttribute("aria-invalid", "true");
  await expect(create).toBeDisabled();

  await page.fill("#openingDepreciation", "320000");
  await expect(page.locator("#openingDepreciationHint")).toHaveText(
    "Book value brought on: ₦480,000. Depreciation continues from here.",
  );
  await expect(create).toBeEnabled();
  await create.click();
  await expect(newAssetDrawer(page)).toBeHidden();

  const writes = writesTo(store, "POST", "/fixed-assets");
  expect(writes).toHaveLength(1);
  expect(writes[0].body).toMatchObject({
    asset_tag: "FA-010",
    cost_minor: 800_000_00,
    salvage_value_minor: 50_000_00,
    opening_balance: true,
    opening_accumulated_depreciation_minor: 320_000_00,
  });
  const row = page.getByRole("row", { name: /FA-010/ });
  await expect(row).toContainText("₦320,000");
  await expect(row).toContainText("₦480,000");
  await expect(tiles(page)).toContainText([
    "Total cost₦2,500,000",
    "Accumulated depreciation₦720,000",
    "Net book value₦1,780,000",
  ]);
});

test("switching back to bought now drops the opening depreciation", async ({ page }) => {
  await startNewAsset(page, "FA-011");
  await page.selectOption("#acquisitionSource", "opening");
  await page.fill("#openingDepreciation", "100000");
  await page.selectOption("#acquisitionSource", "purchase");
  await expect(page.locator("#openingDepreciation")).toHaveCount(0);

  await newAssetDrawer(page).getByRole("button", { name: "Create Asset" }).click();
  await expect(newAssetDrawer(page)).toBeHidden();
  expect(writesTo(store, "POST", "/fixed-assets")[0].body).toMatchObject({
    asset_tag: "FA-011",
    opening_balance: false,
    opening_accumulated_depreciation_minor: 0,
  });
  await expect(page.getByRole("row", { name: /FA-011/ })).toContainText("₦800,000");
});

test("an asset's history lists each change with the running total", async ({ page }) => {
  store.depreciationHistories.fa1 = {
    fixed_asset_id: "fa1",
    accumulated_depreciation_minor: 300_000_00,
    events: [
      {
        kind: "opening",
        date: "2026-01-05",
        amount_minor: 200_000_00,
        accumulated_minor: 200_000_00,
        journal_entry_id: "j1",
        description: "Built up before Plutus (opening balance)",
      },
      {
        kind: "depreciation",
        date: "2026-02-15",
        amount_minor: 150_000_00,
        accumulated_minor: 350_000_00,
        journal_entry_id: "j2",
        description: "Depreciation for the period",
      },
      {
        kind: "revaluation",
        date: "2026-03-15",
        amount_minor: -350_000_00,
        accumulated_minor: 0,
        journal_entry_id: null,
        description: "Revalued: market appraisal",
      },
      {
        kind: "depreciation",
        date: "2026-04-15",
        amount_minor: 250_000_00,
        accumulated_minor: 250_000_00,
        journal_entry_id: "j3",
        description: "Depreciation for the period",
      },
    ],
    unexplained_minor: 50_000_00,
  };
  await page.goto("/fixed-assets");
  await page.getByRole("button", { name: "History of FA-001" }).click();
  const drawer = page.getByRole("dialog", { name: "Depreciation History — FA-001" });
  await expect(drawer).toBeVisible();

  const rows = drawer.locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText(/Opening balance\s*Built up before Plutus.*\+₦200,000\s*₦200,000$/);
  await expect(rows.nth(1)).toContainText(/Depreciation\s*\+₦150,000\s*₦350,000$/);
  await expect(rows.nth(2)).toContainText(/Revaluation\s*Revalued: market appraisal\s*−₦350,000\s*₦0$/);
  await expect(rows.nth(3)).toContainText(/Depreciation\s*\+₦250,000\s*₦250,000$/);
  await expect(drawer.getByRole("note")).toContainText(
    "₦50,000 of this asset's accumulated depreciation was recorded without a posting this history can trace",
  );

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("a disposed asset's history is still available", async ({ page }) => {
  await page.goto("/fixed-assets");
  const row = page.getByRole("row", { name: /FA-003/ });
  await expect(row.getByRole("button", { name: "Depreciate" })).toHaveCount(0);
  await row.getByRole("button", { name: "History of FA-003" }).click();
  const drawer = page.getByRole("dialog", { name: "Depreciation History — FA-003" });
  await expect(drawer).toContainText("No depreciation recorded for this asset yet.");
  await expect(drawer).toContainText("its cost and accumulated depreciation were taken off the books");
  await expect(drawer.getByRole("note")).toHaveCount(0);
});

test("the balance sheet is vertical: fixed assets at cost less depreciation, then current assets, then capital", async ({ page }) => {
  store.balanceSheet = balanceSheetOf(
    {
      non_current_asset: [
        { account: "fixed_assets", account_name: "Fixed Assets", balance_minor: 1_700_000_00, account_number: "1500" },
        { account: "accumulated_depreciation", account_name: "Accumulated Depreciation", balance_minor: -400_000_00, account_number: "1590" },
      ],
      current_asset: [{ account: "cash", account_name: "Cash and Bank", balance_minor: 250_000_00, account_number: "1000" }],
      equity: [{ account: "opening_balance_equity", account_name: "Opening Balance Equity", balance_minor: 1_300_000_00, account_number: "3900" }],
    },
    250_000_00,
  );
  await page.goto("/balance-sheet");
  const rows = page.locator("main table tbody tr");
  await expect(rows).toHaveText([
    "Non-current assets",
    "1500  Fixed Assets at cost₦1,700,000",
    "Less: 1590  Accumulated Depreciation(₦400,000)",
    "Net book value₦1,300,000",
    "Total fixed assets₦1,300,000",
    "Current assets",
    "1000  Cash and Bank₦250,000",
    "Total current assets₦250,000",
    "Less: Current liabilities",
    "Total current liabilities₦0",
    "Net current assets₦250,000",
    "Total assets less current liabilities₦1,550,000",
    "Net assets₦1,550,000",
    "Capital and reserves",
    "3900  Opening Balance Equity₦1,300,000",
    "Profit and Loss Reserve₦250,000",
    "Total capital and reserves₦1,550,000",
  ]);
});

test("a leased asset takes its category's method and goes on the leased register", async ({ page }) => {
  await startNewAsset(page, "LEASE-1");
  await page.selectOption("#acquisitionSource", "leased");
  await expect(page.locator("#acquisitionSourceHint")).toContainText("right-of-use asset against Lease Liability");
  await page.fill("#leaseTerm", "36");

  // A category made from the form fills in its usual depreciation.
  await newAssetDrawer(page).getByRole("button", { name: "+ New Category" }).click();
  const modal = page.getByRole("dialog", { name: "New Asset Category" });
  await modal.locator("#new-category-name").fill("Leased Vehicles");
  await modal.locator("#new-category-method").selectOption("reducing_balance");
  await modal.locator("#new-category-rate").fill("25");
  await modal.getByRole("button", { name: "Create Category" }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator("#depreciationMethod")).toHaveValue("reducing_balance");
  await expect(page.locator("#depreciationRate")).toHaveValue("25");

  await newAssetDrawer(page).getByRole("button", { name: "Create Asset" }).click();
  await expect(newAssetDrawer(page)).toBeHidden();
  expect(writesTo(store, "POST", "/fixed-assets")[0].body).toMatchObject({
    asset_tag: "LEASE-1",
    acquisition_type: "leased",
    lease_term_months: 36,
    depreciation_method: "reducing_balance",
    depreciation_rate_ppm: 250_000,
    asset_category_id: store.assetCategories[0]!.id,
    opening_balance: false,
  });

  await expect(page.getByRole("row", { name: /LEASE-1/ })).toHaveCount(0);
  await page.getByRole("tab", { name: /Leased assets/ }).click();
  const row = page.getByRole("row", { name: /LEASE-1/ });
  await expect(row).toContainText("Leased Vehicles");
  await expect(row).toContainText("Reducing balance · 25% a year");
  await expect(row).toContainText("Lease term 36 months");
  await expect(row.getByRole("button", { name: "Lease Payment" })).toBeVisible();
  await expect(row.getByRole("button", { name: "Amortise" })).toBeVisible();
});

test("the year-end run reports each asset's charge and the ones already done", async ({ page }) => {
  store.yearEndResult = {
    year: 2026,
    charged: [
      {
        fixed_asset_id: "fa1",
        asset_tag: "FA-001",
        name: "Generator",
        acquisition_type: "acquired",
        depreciation_method: "reducing_balance",
        charge_minor: 187_500_00,
        accumulated_depreciation_minor: 437_500_00,
        book_value_minor: 562_500_00,
      },
    ],
    total_minor: 187_500_00,
    already_run: ["FA-002"],
  };
  await page.goto("/fixed-assets");
  await page.getByRole("button", { name: "Year-End Depreciation" }).click();
  const drawer = page.getByRole("dialog", { name: "Year-End Depreciation" });
  await drawer.locator("#yearEndYear").fill("2026");
  await drawer.getByRole("button", { name: "Run for 2026" }).click();
  const result = drawer.getByLabel("Year-end depreciation result");
  await expect(result).toContainText("₦187,500 charged for 2026 across 1 asset.");
  await expect(result).toContainText("FA-001");
  await expect(result).toContainText("Reducing balance");
  await expect(result).toContainText("Already charged for 2026, not charged again: FA-002.");
  expect(writesTo(store, "POST", "/fixed-assets/year-end-depreciation")[0].body).toEqual({ year: 2026 });
});
