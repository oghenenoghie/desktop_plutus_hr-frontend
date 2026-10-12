import type {
  InventoryAdjustmentReason,
  InventoryItemType,
  Role,
  StockMovementType,
} from "@/lib/types";

// Mirrors the backend's default grants (app/domain/permissions.py). The API
// is the real check — a per-membership override can widen or narrow these —
// so this only decides which buttons to offer.
const INVENTORY_WRITERS: Role[] = ["admin", "payroll_manager", "accountant"];

export function canManageInventory(role: Role | undefined): boolean {
  return role !== undefined && INVENTORY_WRITERS.includes(role);
}

export function canAdjustInventory(role: Role | undefined): boolean {
  return role !== undefined && INVENTORY_WRITERS.includes(role);
}

// Phase 2 operations follow the same default grants: purchase, receive,
// issue, transfer and approve all sit with the writers.
export function canOperateInventory(role: Role | undefined): boolean {
  return role !== undefined && INVENTORY_WRITERS.includes(role);
}

// Department managers hold inventory.request: they raise stock issues for
// the departments they head, and nothing else.
export function canRequestStock(role: Role | undefined): boolean {
  return role !== undefined && [...INVENTORY_WRITERS, "department_manager"].includes(role);
}

export function isRequesterOnly(role: Role | undefined): boolean {
  return role === "department_manager";
}

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Pending approval",
  partially_received: "Partly received",
  in_transit: "In transit",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

export const ITEM_TYPE_LABELS: Record<InventoryItemType, string> = {
  stock: "Stock",
  consumable: "Consumable",
  non_stock: "Non-stock",
  service: "Service",
};

export const TRACKED_ITEM_TYPES: InventoryItemType[] = ["stock", "consumable"];

export const REASON_LABELS: Record<InventoryAdjustmentReason, string> = {
  opening_balance: "Opening balance",
  found: "Stock found",
  damage: "Damage",
  expiry: "Expiry",
  loss: "Loss / theft",
  write_off: "Write-off",
  correction: "Correction",
};

// Which way each reason moves stock (the backend enforces the same rule):
// "add" and "remove" are fixed, "either" lets each line choose.
export const REASON_DIRECTION: Record<InventoryAdjustmentReason, "add" | "remove" | "either"> = {
  opening_balance: "add",
  found: "add",
  damage: "remove",
  expiry: "remove",
  loss: "remove",
  write_off: "remove",
  correction: "either",
};

export const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  opening_balance: "Opening balance",
  adjustment_gain: "Adjustment in",
  adjustment_loss: "Adjustment out",
  reversal: "Reversal",
  receipt: "Receipt",
  issue: "Issue",
  transfer_out: "Transfer out",
  transfer_in: "Transfer in",
};

const QUANTITY_FORMAT = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 4 });

// Quantities arrive as decimal strings ("12.5000"); shown without trailing
// zeros and with grouping. Display only — never parsed back for maths.
export function formatQuantity(quantity: string | null | undefined): string {
  if (quantity === null || quantity === undefined) return "—";
  const value = Number(quantity);
  return Number.isFinite(value) ? QUANTITY_FORMAT.format(value) : quantity;
}

// A signed movement quantity, with an explicit + for stock coming in.
export function formatSignedQuantity(quantity: string): string {
  const value = Number(quantity);
  const text = formatQuantity(quantity);
  return value > 0 ? `+${text}` : text;
}

export function isPositive(quantity: string): boolean {
  return Number(quantity) > 0;
}

export function isLowStock(quantity: string, reorderLevel: string | null): boolean {
  if (reorderLevel === null) return false;
  const value = Number(quantity);
  return value > 0 && value <= Number(reorderLevel);
}

// The adjustment date the backend accepts (no future dates) is judged in
// Lagos time, so "today" is too.
export function todayInLagos(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// A user-typed quantity: digits with up to 4 decimals, nothing else.
export function isValidQuantityInput(value: string): boolean {
  return /^\d+(\.\d{1,4})?$/.test(value.trim()) && Number(value) > 0;
}
