"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/data-state";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { formatDate, formatNaira } from "@/lib/format";
import { MOVEMENT_LABELS, formatSignedQuantity, isPositive } from "@/lib/inventory";
import type { InventoryMovement } from "@/lib/types";

const NOT_ENABLED = "inventory is not enabled";

export function isInventoryOff(error: string | null): boolean {
  return error !== null && error.toLowerCase().includes(NOT_ENABLED);
}

// The API answers 409 on every inventory page until the module is switched
// on; show the way to switch it on instead of a raw error.
export function InventoryError({ message, canManage }: { message: string; canManage: boolean }) {
  if (!isInventoryOff(message)) return <ErrorState message={message} />;
  return <InventoryOffNotice canManage={canManage} />;
}

export function InventoryOffNotice({ canManage }: { canManage: boolean }) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-sm font-extrabold text-ink">Inventory is switched off</h2>
        <p className="text-[13px] text-ink-soft">
          Inventory tracks stock items, warehouses, stock on hand and every stock movement at
          weighted-average cost. It is off until an administrator switches it on for the
          organisation.
        </p>
        {canManage ? (
          <Link
            href="/inventory/settings"
            className="rounded-btn bg-primary px-[22px] py-[11px] text-[13px] font-extrabold text-white hover:bg-primary-dark"
          >
            Set up inventory
          </Link>
        ) : (
          <p className="text-[13px] text-ink-soft">Ask an administrator to switch it on.</p>
        )}
      </div>
    </Card>
  );
}

// A value the caller may not be allowed to see (null without
// inventory.valuation). Negative values read "-₦25,000", not "₦-25,000".
export function MoneyOrHidden({ minor }: { minor: number | null }) {
  if (minor === null) return <span className="text-ink-soft">—</span>;
  return <>{minor < 0 ? `-${formatNaira(-minor)}` : formatNaira(minor)}</>;
}

export function MovementTypeBadge({ type }: { type: InventoryMovement["movement_type"] }) {
  const tone = type === "reversal" ? "warn" : "neutral";
  return <Badge tone={tone}>{MOVEMENT_LABELS[type]}</Badge>;
}

export function MovementsTable({
  movements,
  emptyLabel = "No stock movements yet.",
}: {
  movements: InventoryMovement[];
  emptyLabel?: string;
}) {
  if (movements.length === 0) return <EmptyState label={emptyLabel} />;
  const showValues = movements.some((movement) => movement.value_minor !== null);
  return (
    <Table>
      <Thead>
        <tr>
          <Th>Date</Th>
          <Th>Item</Th>
          <Th>Warehouse</Th>
          <Th>Type</Th>
          <Th align="right">Quantity</Th>
          {showValues ? <Th align="right">Unit cost</Th> : null}
          {showValues ? <Th align="right">Value</Th> : null}
          <Th>Source</Th>
        </tr>
      </Thead>
      <tbody>
        {movements.map((movement) => (
          <tr key={movement.id}>
            <Td>{formatDate(movement.entry_date)}</Td>
            <Td>
              <div className="font-bold">{movement.sku}</div>
              <div className="text-[11px] text-ink-soft">{movement.item_name}</div>
            </Td>
            <Td>{movement.warehouse_code}</Td>
            <Td>
              <MovementTypeBadge type={movement.movement_type} />
            </Td>
            <Td align="right">
              <span className={isPositive(movement.quantity) ? "font-bold text-good" : "font-bold text-bad"}>
                {formatSignedQuantity(movement.quantity)}
              </span>{" "}
              <span className="text-[11px] text-ink-soft">{movement.base_unit_code}</span>
            </Td>
            {showValues ? (
              <Td align="right">
                <MoneyOrHidden minor={movement.unit_cost_minor} />
              </Td>
            ) : null}
            {showValues ? (
              <Td align="right">
                <MoneyOrHidden minor={movement.value_minor} />
              </Td>
            ) : null}
            <Td>
              {movement.source_type === "inventory_adjustment" ? (
                <Link
                  href={`/inventory/adjustments/${movement.source_id}`}
                  className="font-bold text-primary hover:underline"
                >
                  {movement.source_number ?? "Adjustment"}
                </Link>
              ) : (
                (movement.source_number ?? "—")
              )}
              {movement.reason ? (
                <div className="text-[11px] text-ink-soft">{movement.reason.replace(/_/g, " ")}</div>
              ) : null}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
