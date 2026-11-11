import type { BrowserContext } from "@playwright/test";

import type {
  AssetCategory,
  BalanceSheet,
  Customer,
  FixedAsset,
  FixedAssetDepreciationHistory,
  InventoryItem,
  Role,
  StatementLine,
  StatementSection,
  Vendor,
  YearEndDepreciationResult,
} from "@/lib/types";

// Every backend call the app makes is answered here, in the browser, from an
// in-memory store — so these tests need no backend and no database, and can
// assert on exactly what the app tried to write. Behaviour mirrors the API
// where the tests depend on it: duplicate names are refused with the API's
// 400 message, creating customers, vendors and items is refused with 403
// for the roles the API refuses (require_roles / inventory.manage), and a
// fixed asset's opening accumulated depreciation is checked the way
// register_fixed_asset checks it.

export interface Write {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

export interface MockStore {
  role: Role;
  seq: number;
  writes: Write[];
  customers: Customer[];
  vendors: Vendor[];
  items: InventoryItem[];
  invoices: Record<string, unknown>[];
  receiptsByVendor: Record<string, Record<string, unknown>[]>;
  fixedAssets: FixedAsset[];
  assetCategories: AssetCategory[];
  yearEndResult?: YearEndDepreciationResult;
  depreciationHistories: Record<string, FixedAssetDepreciationHistory>;
  balanceSheet: BalanceSheet;
}

const NOW = "2026-11-01T00:00:00Z";
const WRITERS: Role[] = ["admin", "payroll_manager", "accountant"];

const ACCOUNTS = [
  { id: "a1", org_id: "o1", code: "4000", account_number: "4000", category: "revenue", category_label: "Revenue", statement: "profit_and_loss", name: "Sales Revenue", type: "revenue", is_system: true, is_active: true, created_at: NOW },
  { id: "a2", org_id: "o1", code: "5000", account_number: "6000", category: "operating_expense", category_label: "Overheads", statement: "profit_and_loss", name: "Office Expense", type: "expense", is_system: true, is_active: true, created_at: NOW },
];
const UNITS = [
  { id: "u1", code: "PCS", name: "Pieces", allows_fraction: false, is_active: true },
  { id: "u2", code: "BOX", name: "Box", allows_fraction: false, is_active: true },
];
const CATEGORIES = [
  { id: "cat1", name: "Stationery", parent_id: null, is_active: true, expense_account_code: null, created_at: NOW },
];
const WAREHOUSES = [
  { id: "w1", code: "MAIN", name: "Main Store", branch_id: null, address: null, is_active: true, created_at: NOW },
];

export function itemRecord(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: "i?",
    sku: "",
    name: "",
    description: null,
    item_type: "stock",
    category_id: null,
    category_name: null,
    base_unit_id: "u1",
    base_unit_code: "PCS",
    base_unit_allows_fraction: false,
    reorder_level: null,
    max_level: null,
    default_cost_minor: null,
    preferred_vendor_id: null,
    barcode: null,
    is_active: true,
    track_lots: false,
    track_expiry: false,
    created_at: NOW,
    units: [],
    quantity_on_hand: "0",
    value_minor: 0,
    average_cost_minor: 0,
    ...overrides,
  };
}

export function fixedAssetRecord(overrides: Partial<FixedAsset>): FixedAsset {
  const asset: FixedAsset = {
    id: "fa?",
    org_id: "o1",
    department_id: null,
    name: "",
    asset_tag: "",
    acquisition_date: "2026-01-01",
    cost_minor: 0,
    salvage_value_minor: 0,
    useful_life_months: 12,
    accumulated_depreciation_minor: 0,
    book_value_minor: 0,
    status: "active",
    disposed_at: null,
    disposal_proceeds_minor: null,
    category: null,
    assignment_status: null,
    assigned_employee_id: null,
    acquisition_type: "acquired",
    depreciation_method: "straight_line",
    depreciation_rate_ppm: null,
    lease_term_months: null,
    asset_category_id: null,
    created_at: NOW,
    ...overrides,
  };
  return { ...asset, book_value_minor: asset.cost_minor - asset.accumulated_depreciation_minor };
}

type Sections = Partial<Record<"non_current_asset" | "current_asset" | "current_liability" | "non_current_liability" | "equity", StatementLine[]>>;

const SECTION_LABELS = {
  non_current_asset: "Non-current assets",
  current_asset: "Current assets",
  current_liability: "Current liabilities",
  non_current_liability: "Non-current liabilities",
  equity: "Capital and reserves",
} as const;

// A balance sheet the way the API builds one: sections with totals, the
// figures worked out from them, and the same lines by account type.
export function balanceSheetOf(sections: Sections, profitAndLossReserve = 0): BalanceSheet {
  const section = (category: keyof typeof SECTION_LABELS, extra: StatementLine[] = []): StatementSection => {
    const lines = [...(sections[category] ?? []), ...extra];
    return { category, label: SECTION_LABELS[category], lines, total_minor: lines.reduce((sum, line) => sum + line.balance_minor, 0) };
  };
  const nonCurrentAssets = section("non_current_asset");
  const currentAssets = section("current_asset");
  const currentLiabilities = section("current_liability");
  const nonCurrentLiabilities = section("non_current_liability");
  const capital = section("equity", [
    { account: "profit_and_loss_reserve", account_name: "Profit and Loss Reserve", balance_minor: profitAndLossReserve, account_number: null },
  ]);
  const netCurrent = currentAssets.total_minor - currentLiabilities.total_minor;
  const lessCurrent = nonCurrentAssets.total_minor + netCurrent;
  const netAssets = lessCurrent - nonCurrentLiabilities.total_minor;
  return {
    as_of: null,
    non_current_assets: nonCurrentAssets,
    current_assets: currentAssets,
    current_liabilities: currentLiabilities,
    net_current_assets_minor: netCurrent,
    total_assets_less_current_liabilities_minor: lessCurrent,
    non_current_liabilities: nonCurrentLiabilities,
    net_assets_minor: netAssets,
    capital_and_reserves: capital,
    profit_and_loss_reserve_minor: profitAndLossReserve,
    unclassified_accounts: [],
    balanced: netAssets === capital.total_minor,
    assets: [...nonCurrentAssets.lines, ...currentAssets.lines],
    total_assets_minor: nonCurrentAssets.total_minor + currentAssets.total_minor,
    liabilities: [...currentLiabilities.lines, ...nonCurrentLiabilities.lines],
    total_liabilities_minor: currentLiabilities.total_minor + nonCurrentLiabilities.total_minor,
    equity: capital.lines,
    total_equity_minor: capital.total_minor,
  };
}

export function freshStore(role: Role = "admin"): MockStore {
  return {
    role,
    seq: 100,
    writes: [],
    customers: [
      { id: "c1", org_id: "o1", name: "Existing Customer", contact_email: null, contact_phone: null, tin: null, address: null, created_at: NOW },
    ],
    vendors: [
      { id: "v1", org_id: "o1", contractor_id: null, name: "Existing Vendor", contact_email: null, contact_phone: null, tin: null, address: null, created_at: NOW },
    ],
    items: [itemRecord({ id: "i1", sku: "SKU-1", name: "Paper", quantity_on_hand: "10" })],
    invoices: [],
    receiptsByVendor: {
      v1: [{ id: "g1", grn_number: "GRN-0001", po_number: "PO-0001", accrued_minor: 50000, vendor_id: "v1", status: "posted" }],
    },
    fixedAssets: [],
    assetCategories: [],
    depreciationHistories: {},
    balanceSheet: balanceSheetOf({}),
  };
}

export function writesTo(store: MockStore, method: string, path: string): Write[] {
  return store.writes.filter((write) => write.method === method && write.path === path);
}

// Signs the browser in (any token — /auth/me below decides the role) and
// routes every /api/v1 request, on whatever host the build points at, to the
// store.
export async function installMockApi(context: BrowserContext, store: MockStore): Promise<void> {
  await context.addInitScript(() => {
    window.localStorage.setItem("plutus.access_token", "e2e-access");
    window.localStorage.setItem("plutus.refresh_token", "e2e-refresh");
  });

  await context.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const method = request.method();
    const raw = request.postData();
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    if (method !== "GET") store.writes.push({ method, path, body });
    const json = (status: number, data: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    // Enough latency for loading states to be observable.
    await new Promise((resolve) => setTimeout(resolve, method === "GET" ? 120 : 200));

    if (method === "GET" && path === "/auth/me") {
      return json(200, {
        account_id: "acc1",
        org_id: "o1",
        role: store.role,
        org_name: "E2E Org",
        mfa_enabled: false,
        country_code: "NG",
        country_name: "Nigeria",
        currency: "NGN",
        payroll_available: true,
      });
    }

    for (const kind of ["customers", "vendors"] as const) {
      if (path !== `/${kind}`) continue;
      const records: (Customer | Vendor)[] = store[kind];
      if (method === "GET") return json(200, records);
      if (method === "POST" && body) {
        if (!WRITERS.includes(store.role)) return json(403, { detail: "insufficient role" });
        const name = String(body.name).toLowerCase();
        if (records.some((record) => record.name.toLowerCase() === name)) {
          return json(400, { detail: `a ${kind.slice(0, -1)} with this name already exists` });
        }
        const record = {
          id: `${kind[0]}${++store.seq}`,
          org_id: "o1",
          contractor_id: null,
          contact_email: null,
          contact_phone: null,
          tin: null,
          created_at: NOW,
          ...body,
        } as Customer & Vendor;
        records.push(record);
        return json(201, record);
      }
    }

    if (method === "GET" && path === "/chart-of-accounts") return json(200, ACCOUNTS);
    if (method === "GET" && path === "/chart-of-accounts/next-number") {
      return json(200, { category: url.searchParams.get("category"), account_number: "4010", range_from: 4000, range_to: 4799 });
    }
    if (method === "GET" && path === "/invoices") return json(200, store.invoices);
    if (method === "GET" && path === "/invoices/next-number") return json(200, { invoice_number: "INV-0001" });
    if (method === "POST" && path === "/invoices") return json(201, { id: "inv1", status: "draft", ...body });
    if (method === "POST" && path === "/invoices/inv1/send") return json(200, { id: "inv1", status: "sent" });
    if (method === "GET" && path === "/bills") return json(200, []);
    if (method === "POST" && path === "/bills") return json(201, { id: "bill1", status: "draft", ...body });
    if (method === "POST" && path === "/bills/bill1/approve") return json(200, { id: "bill1", status: "approved" });
    if (method === "GET" && path === "/inventory/goods-receipts") {
      return json(200, store.receiptsByVendor[url.searchParams.get("vendor_id") ?? ""] ?? []);
    }
    if (method === "GET" && path === "/inventory/units") return json(200, UNITS);
    if (method === "GET" && path === "/inventory/categories") return json(200, CATEGORIES);
    if (method === "GET" && path === "/inventory/warehouses") return json(200, WAREHOUSES);

    if (path === "/inventory/items") {
      if (method === "GET") return json(200, store.items);
      if (method === "POST" && body) {
        if (!WRITERS.includes(store.role)) return json(403, { detail: "insufficient permission" });
        if (store.items.some((item) => item.sku === body.sku)) {
          return json(400, { detail: "an item with this SKU already exists" });
        }
        const unit = UNITS.find((candidate) => candidate.id === body.base_unit_id);
        const item = itemRecord({
          ...(body as Partial<InventoryItem>),
          id: `i${++store.seq}`,
          base_unit_code: unit?.code ?? "?",
        });
        store.items.push(item);
        return json(201, item);
      }
    }
    const itemPath = path.match(/^\/inventory\/items\/([^/]+)$/);
    if (itemPath && method === "PATCH" && body) {
      const item = store.items.find((candidate) => candidate.id === itemPath[1]);
      if (!item) return json(404, { detail: "item not found" });
      Object.assign(item, body);
      return json(200, item);
    }

    if (method === "POST" && path === "/inventory/purchase-orders") {
      return json(201, { id: "po1", po_number: "PO-0099", status: "draft", ...body, lines: [] });
    }
    if (method === "GET" && path === "/inventory/purchase-orders/po1") {
      return json(200, {
        id: "po1",
        po_number: "PO-0099",
        status: "draft",
        vendor_id: "v1",
        vendor_name: "Existing Vendor",
        warehouse_id: null,
        order_date: "2026-11-01",
        expected_date: null,
        vendor_reference: null,
        notes: null,
        lines: [],
        subtotal_minor: 0,
        tax_minor: 0,
        total_minor: 0,
      });
    }
    if (method === "POST" && path === "/inventory/adjustments") {
      return json(201, { id: "adj1", status: "draft", ...body, lines: [] });
    }

    if (path === "/fixed-assets/categories") {
      if (method === "GET") return json(200, store.assetCategories);
      if (method === "POST" && body) {
        const category: AssetCategory = {
          id: `cat${++store.seq}`,
          name: String(body.name),
          depreciation_method: body.depreciation_method as AssetCategory["depreciation_method"],
          depreciation_rate_ppm: (body.depreciation_rate_ppm as number | null) ?? null,
          useful_life_months: (body.useful_life_months as number | null) ?? null,
          created_at: NOW,
        };
        store.assetCategories.push(category);
        return json(201, category);
      }
    }
    if (method === "POST" && path === "/fixed-assets/year-end-depreciation") {
      return json(200, store.yearEndResult ?? { year: body?.year, charged: [], total_minor: 0, already_run: [] });
    }
    if (path === "/fixed-assets") {
      if (method === "GET") return json(200, store.fixedAssets);
      if (method === "POST" && body) {
        if (!WRITERS.includes(store.role)) return json(403, { detail: "insufficient role" });
        const cost = Number(body.cost_minor);
        const salvage = Number(body.salvage_value_minor ?? 0);
        const opening = Number(body.opening_accumulated_depreciation_minor ?? 0);
        if (opening < 0) {
          return json(400, { detail: "opening_accumulated_depreciation_minor cannot be negative" });
        }
        if (opening > 0 && !body.opening_balance) {
          return json(400, { detail: "only an asset already owned (opening_balance) can have depreciation built up" });
        }
        if (opening > cost - salvage) {
          return json(400, { detail: "opening_accumulated_depreciation_minor cannot exceed cost less salvage value" });
        }
        const asset = fixedAssetRecord({
          id: `fa${++store.seq}`,
          name: String(body.name),
          asset_tag: String(body.asset_tag),
          acquisition_date: String(body.acquisition_date),
          cost_minor: cost,
          salvage_value_minor: salvage,
          useful_life_months: Number(body.useful_life_months),
          accumulated_depreciation_minor: opening,
          acquisition_type: body.acquisition_type === "leased" ? "leased" : "acquired",
          depreciation_method: (body.depreciation_method as FixedAsset["depreciation_method"]) ?? "straight_line",
          depreciation_rate_ppm: (body.depreciation_rate_ppm as number | null) ?? null,
          lease_term_months: (body.lease_term_months as number | null) ?? null,
          asset_category_id: (body.asset_category_id as string | null) ?? null,
        });
        store.fixedAssets.push(asset);
        return json(201, asset);
      }
    }
    const historyPath = path.match(/^\/fixed-assets\/([^/]+)\/depreciation-history$/);
    if (historyPath && method === "GET") {
      const asset = store.fixedAssets.find((candidate) => candidate.id === historyPath[1]);
      if (!asset) return json(404, { detail: "fixed asset not found" });
      return json(
        200,
        store.depreciationHistories[asset.id] ?? {
          fixed_asset_id: asset.id,
          accumulated_depreciation_minor: asset.accumulated_depreciation_minor,
          events: [],
          unexplained_minor: asset.accumulated_depreciation_minor,
        },
      );
    }
    if (method === "GET" && path === "/financial-statements/balance-sheet") {
      return json(200, store.balanceSheet);
    }

    // Anything else the shell asks for (notifications, badges…) is empty.
    if (method === "GET") return json(200, []);
    return json(404, { detail: `not mocked: ${method} ${path}` });
  });
}
