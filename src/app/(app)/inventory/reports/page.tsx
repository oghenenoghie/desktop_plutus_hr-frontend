"use client";

import Link from "next/link";
import { useState } from "react";

import { InventoryError } from "@/components/inventory/inventory-ui";
import { ExportButtons } from "@/components/inventory/report-ui";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { inventoryApi, inventoryReportsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import {
  MOVEMENT_LABELS,
  canManageInventory,
  canSeeInventoryValues,
  formatQuantity,
  formatSignedQuantity,
  isPositive,
  todayInLagos,
} from "@/lib/inventory";

function firstOfMonth(): string {
  return `${todayInLagos().slice(0, 8)}01`;
}

function Signed({ quantity }: { quantity: string }) {
  if (Number(quantity) === 0) return <span className="text-ink-soft">0</span>;
  return (
    <span className={isPositive(quantity) ? "text-good" : "text-bad"}>{formatSignedQuantity(quantity)}</span>
  );
}

function PeriodPicker({
  idPrefix,
  dateFrom,
  dateTo,
  onChange,
}: {
  idPrefix: string;
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
}) {
  return (
    <>
      <div>
        <Label htmlFor={`${idPrefix}-from`}>From</Label>
        <Input
          id={`${idPrefix}-from`}
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={(e) => onChange(e.target.value, dateTo)}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-to`}>To</Label>
        <Input
          id={`${idPrefix}-to`}
          type="date"
          value={dateTo}
          min={dateFrom}
          max={todayInLagos()}
          onChange={(e) => onChange(dateFrom, e.target.value)}
        />
      </div>
    </>
  );
}

export default function InventoryReportsPage() {
  const { user } = useAuth();
  const values = canSeeInventoryValues(user?.role);
  const tabs = [
    ...(values ? [{ id: "valuation", label: "Valuation", content: <ValuationTab /> }] : []),
    { id: "movements", label: "Movements", content: <MovementsTab /> },
    { id: "variances", label: "Adjustments & variances", content: <VariancesTab /> },
    { id: "expiry", label: "Expiring stock", content: <ExpiryTab /> },
    { id: "orders", label: "Orders outstanding", content: <OutstandingTab /> },
  ];
  return (
    <div>
      <PageHeader
        title="Inventory Reports"
        subtitle="Rebuilt from the stock ledger, so every total agrees with the balances and, when posting to the GL, with the inventory account"
      />
      <Tabs tabs={tabs} />
    </div>
  );
}

function ValuationTab() {
  const { user } = useAuth();
  const [asOf, setAsOf] = useState(todayInLagos());
  const [byWarehouse, setByWarehouse] = useState(false);
  const report = useApiResource(
    () => inventoryReportsApi.valuation({ asOf, byWarehouse }),
    [asOf, byWarehouse],
  );
  const data = report.data;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Stock valuation"
          subtitle="Quantity and value of every item at the end of the day, beside the inventory account on the same date"
          action={
            <ExportButtons
              onDownload={(format) =>
                inventoryReportsApi.download(
                  "reports/valuation",
                  { as_of: asOf, by_warehouse: byWarehouse },
                  format,
                  `stock-valuation-${asOf}`,
                )
              }
            />
          }
        />
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="valuation-as-of">As at</Label>
            <Input
              id="valuation-as-of"
              type="date"
              value={asOf}
              max={todayInLagos()}
              onChange={(e) => setAsOf(e.target.value || todayInLagos())}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-[13px] text-ink">
            <input type="checkbox" checked={byWarehouse} onChange={(e) => setByWarehouse(e.target.checked)} />
            Split by warehouse
          </label>
        </div>
        {report.error ? <InventoryError message={report.error} canManage={canManageInventory(user?.role)} /> : null}
        {report.loading && !data ? <LoadingState /> : null}
        {data ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <KpiTile label="Stock value" value={formatNaira(data.total_value_minor)} caption={`at the end of ${formatDate(data.as_of)}`} />
              <KpiTile
                label="Inventory account (GL)"
                value={data.gl_balance_minor === null ? "—" : formatNaira(data.gl_balance_minor)}
                caption={
                  data.gl_balance_minor === null
                    ? data.posts_to_gl
                      ? "Not comparable before inventory accounting started"
                      : "Inventory doesn't post to the GL yet"
                    : "journals dated on or before"
                }
              />
              <Card padding="compact">
                <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Difference</div>
                <div className="mt-2 flex items-center gap-2">
                  {data.difference_minor === null ? (
                    <span className="text-[13px] text-ink-soft">—</span>
                  ) : data.difference_minor === 0 ? (
                    <Badge tone="good">Reconciled</Badge>
                  ) : (
                    <>
                      <Badge tone="bad">Out by {formatNaira(Math.abs(data.difference_minor))}</Badge>
                      <Link href="/inventory" className="text-[12px] font-bold text-primary hover:underline">
                        See reconciliation
                      </Link>
                    </>
                  )}
                </div>
              </Card>
            </div>
            {data.rows.length === 0 ? (
              <EmptyState label="No stock on that date." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Item</Th>
                    <Th>Category</Th>
                    {data.by_warehouse ? <Th>Warehouse</Th> : null}
                    <Th align="right">Quantity</Th>
                    <Th align="right">Average cost</Th>
                    <Th align="right">Value</Th>
                  </tr>
                </Thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={`${row.item_id}-${row.warehouse_id ?? "all"}`}>
                      <Td>
                        <div className="font-bold">{row.sku}</div>
                        <div className="text-[11px] text-ink-soft">{row.item_name}</div>
                      </Td>
                      <Td>{row.category_name ?? "—"}</Td>
                      {data.by_warehouse ? <Td>{row.warehouse_code}</Td> : null}
                      <Td align="right">
                        {formatQuantity(row.quantity)} <span className="text-[11px] text-ink-soft">{row.base_unit_code}</span>
                      </Td>
                      <Td align="right">{row.average_cost_minor === null ? "—" : formatNaira(row.average_cost_minor)}</Td>
                      <Td align="right">{formatNaira(row.value_minor)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </>
        ) : null}
      </Card>
    </div>
  );
}

function MovementsTab() {
  const { user } = useAuth();
  const warehouses = useApiResource(() => inventoryApi.warehouses(true));
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(todayInLagos());
  const [warehouseId, setWarehouseId] = useState("");
  const report = useApiResource(
    () => inventoryReportsApi.movements({ dateFrom, dateTo, warehouseId }),
    [dateFrom, dateTo, warehouseId],
  );
  const rows = report.data?.rows ?? [];
  const showValues = rows.some((row) => row.closing_value_minor !== null);

  return (
    <Card>
      <CardHeader
        title="Stock movement summary"
        subtitle="Per item: opening balance, what moved in the period (stock out is negative) and the closing balance"
        action={
          <ExportButtons
            onDownload={(format) =>
              inventoryReportsApi.download(
                "reports/movements",
                { date_from: dateFrom, date_to: dateTo, warehouse_id: warehouseId },
                format,
                `stock-movements-${dateFrom}-${dateTo}`,
              )
            }
          />
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PeriodPicker
          idPrefix="movements"
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />
        <div>
          <Label htmlFor="movements-warehouse">Warehouse</Label>
          <Select id="movements-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">All warehouses</option>
            {(warehouses.data ?? []).map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {report.error ? <InventoryError message={report.error} canManage={canManageInventory(user?.role)} /> : null}
      {report.loading && !report.data ? <LoadingState /> : null}
      {report.data && rows.length === 0 ? <EmptyState label="Nothing moved and nothing was held in this period." /> : null}
      {rows.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Item</Th>
              <Th align="right">Opening</Th>
              <Th align="right">Received</Th>
              <Th align="right">Issued</Th>
              <Th align="right">Transfers</Th>
              <Th align="right">Adjusted</Th>
              <Th align="right">Reversed</Th>
              <Th align="right">Closing</Th>
              {showValues ? <Th align="right">Closing value</Th> : null}
            </tr>
          </Thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item_id}>
                <Td>
                  <div className="font-bold">{row.sku}</div>
                  <div className="text-[11px] text-ink-soft">
                    {row.item_name} · {row.base_unit_code}
                  </div>
                </Td>
                <Td align="right">{formatQuantity(row.opening_quantity)}</Td>
                <Td align="right">
                  <Signed quantity={row.received} />
                </Td>
                <Td align="right">
                  <Signed quantity={row.issued} />
                </Td>
                <Td align="right">
                  <Signed quantity={String(Number(row.transferred_in) + Number(row.transferred_out))} />
                </Td>
                <Td align="right">
                  <Signed quantity={row.adjusted} />
                </Td>
                <Td align="right">
                  <Signed quantity={row.reversed} />
                </Td>
                <Td align="right">
                  <span className="font-bold">{formatQuantity(row.closing_quantity)}</span>
                </Td>
                {showValues ? (
                  <Td align="right">{row.closing_value_minor === null ? "—" : formatNaira(row.closing_value_minor)}</Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </Card>
  );
}

const SOURCE_PAGES: Record<string, string> = {
  inventory_adjustment: "/inventory/adjustments",
  stocktake: "/inventory/stocktakes",
  stock_transfer: "/inventory/transfers",
};

function VariancesTab() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(todayInLagos());
  const report = useApiResource(
    () => inventoryReportsApi.variances({ dateFrom, dateTo }),
    [dateFrom, dateTo],
  );
  const data = report.data;
  const showValues = data?.gain_value_minor !== null && data?.gain_value_minor !== undefined;

  return (
    <Card>
      <CardHeader
        title="Adjustments and stocktake variances"
        subtitle="Stock gained and lost outside purchasing and issuing: adjustments, count differences and transit losses"
        action={
          <ExportButtons
            onDownload={(format) =>
              inventoryReportsApi.download(
                "reports/variances",
                { date_from: dateFrom, date_to: dateTo },
                format,
                `stock-variances-${dateFrom}-${dateTo}`,
              )
            }
          />
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PeriodPicker
          idPrefix="variances"
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />
      </div>
      {report.error ? <InventoryError message={report.error} canManage={canManageInventory(user?.role)} /> : null}
      {report.loading && !data ? <LoadingState /> : null}
      {data && showValues ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiTile label="Gains" value={formatNaira(data.gain_value_minor ?? 0)} />
          <KpiTile label="Losses" value={formatNaira(data.loss_value_minor ?? 0)} />
          <KpiTile label="Net" value={formatNaira((data.gain_value_minor ?? 0) - (data.loss_value_minor ?? 0))} />
        </div>
      ) : null}
      {data && data.rows.length === 0 ? <EmptyState label="No adjustments or variances in this period." /> : null}
      {data && data.rows.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Date</Th>
              <Th>Document</Th>
              <Th>Reason</Th>
              <Th>Item</Th>
              <Th>Warehouse</Th>
              <Th align="right">Quantity</Th>
              {showValues ? <Th align="right">Value</Th> : null}
            </tr>
          </Thead>
          <tbody>
            {data.rows.map((row, index) => (
              <tr key={`${row.source_id}-${index}`}>
                <Td>{formatDate(row.entry_date)}</Td>
                <Td>
                  {SOURCE_PAGES[row.source_type] ? (
                    <Link
                      href={`${SOURCE_PAGES[row.source_type]}/${row.source_id}`}
                      className="font-bold text-primary hover:underline"
                    >
                      {row.source_number ?? "Document"}
                    </Link>
                  ) : (
                    (row.source_number ?? "—")
                  )}
                </Td>
                <Td>{row.reason ?? MOVEMENT_LABELS[row.movement_type]}</Td>
                <Td>
                  <div className="font-bold">{row.sku}</div>
                  <div className="text-[11px] text-ink-soft">
                    {row.item_name}
                    {row.lot_number ? ` · lot ${row.lot_number}` : ""}
                  </div>
                </Td>
                <Td>{row.warehouse_code}</Td>
                <Td align="right">
                  <Signed quantity={row.quantity} /> <span className="text-[11px] text-ink-soft">{row.base_unit_code}</span>
                </Td>
                {showValues ? <Td align="right">{row.value_minor === null ? "—" : formatNaira(row.value_minor)}</Td> : null}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </Card>
  );
}

function ExpiryTab() {
  const { user } = useAuth();
  const [withinDays, setWithinDays] = useState(30);
  const report = useApiResource(() => inventoryReportsApi.expiry(withinDays), [withinDays]);
  const data = report.data;
  const showValues = data?.expired_value_minor !== null && data?.expired_value_minor !== undefined;

  return (
    <Card>
      <CardHeader
        title="Expiring stock"
        subtitle="Lots already expired or expiring soon. Issues and transfers never hand out expired lots; write them off with an Expiry adjustment."
        action={
          <ExportButtons
            onDownload={(format) =>
              inventoryReportsApi.download("reports/expiry", { within_days: withinDays }, format, "expiring-stock")
            }
          />
        }
      />
      <div className="mb-4 max-w-xs">
        <Label htmlFor="expiry-window">Expiring within</Label>
        <Select id="expiry-window" value={String(withinDays)} onChange={(e) => setWithinDays(Number(e.target.value))}>
          {[0, 7, 30, 60, 90, 180].map((days) => (
            <option key={days} value={days}>
              {days === 0 ? "Already expired" : `${days} days`}
            </option>
          ))}
        </Select>
      </div>
      {report.error ? <InventoryError message={report.error} canManage={canManageInventory(user?.role)} /> : null}
      {report.loading && !data ? <LoadingState /> : null}
      {data && showValues ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <KpiTile label="Expired" value={formatNaira(data.expired_value_minor ?? 0)} caption="at average cost" />
          <KpiTile label="Expiring" value={formatNaira(data.expiring_value_minor ?? 0)} caption={`within ${data.within_days} days`} />
        </div>
      ) : null}
      {data && data.rows.length === 0 ? <EmptyState label="No lots expiring in that window." /> : null}
      {data && data.rows.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Expiry</Th>
              <Th>Item</Th>
              <Th>Lot</Th>
              <Th>Warehouse</Th>
              <Th align="right">Quantity</Th>
              {showValues ? <Th align="right">Value</Th> : null}
            </tr>
          </Thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={`${row.lot_id}-${row.warehouse_id}`}>
                <Td>
                  <div>{formatDate(row.expiry_date)}</div>
                  {row.expired ? (
                    <Badge tone="bad">Expired</Badge>
                  ) : (
                    <span className="text-[11px] text-ink-soft">in {row.days_to_expiry} days</span>
                  )}
                </Td>
                <Td>
                  <div className="font-bold">{row.sku}</div>
                  <div className="text-[11px] text-ink-soft">{row.item_name}</div>
                </Td>
                <Td>{row.lot_number}</Td>
                <Td>{row.warehouse_code}</Td>
                <Td align="right">
                  {formatQuantity(row.quantity)} <span className="text-[11px] text-ink-soft">{row.base_unit_code}</span>
                </Td>
                {showValues ? <Td align="right">{row.value_minor === null ? "—" : formatNaira(row.value_minor)}</Td> : null}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </Card>
  );
}

function OutstandingTab() {
  const { user } = useAuth();
  const report = useApiResource(() => inventoryReportsApi.outstandingOrders());
  const data = report.data;

  return (
    <Card>
      <CardHeader
        title="Purchase orders outstanding"
        subtitle="Order lines issued to vendors and not yet fully received, at net price before tax"
        action={
          <ExportButtons
            onDownload={(format) =>
              inventoryReportsApi.download("reports/outstanding-orders", {}, format, "purchase-orders-outstanding")
            }
          />
        }
      />
      {report.error ? <InventoryError message={report.error} canManage={canManageInventory(user?.role)} /> : null}
      {report.loading && !data ? <LoadingState /> : null}
      {data && data.rows.length === 0 ? <EmptyState label="Nothing outstanding: every issued order is received." /> : null}
      {data && data.rows.length > 0 ? (
        <>
          <div className="mb-4 max-w-xs">
            <KpiTile label="Outstanding" value={formatNaira(data.total_value_minor)} caption={`${data.rows.length} order lines`} />
          </div>
          <Table>
            <Thead>
              <tr>
                <Th>Order</Th>
                <Th>Vendor</Th>
                <Th>Expected</Th>
                <Th>Item</Th>
                <Th align="right">Ordered</Th>
                <Th align="right">Received</Th>
                <Th align="right">Outstanding</Th>
                <Th align="right">Value</Th>
              </tr>
            </Thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={`${row.purchase_order_id}-${row.item_id}-${row.ordered}`}>
                  <Td>
                    <Link
                      href={`/inventory/purchase-orders/${row.purchase_order_id}`}
                      className="font-bold text-primary hover:underline"
                    >
                      {row.po_number}
                    </Link>
                    <div className="text-[11px] text-ink-soft">{formatDate(row.order_date)}</div>
                  </Td>
                  <Td>{row.vendor_name}</Td>
                  <Td>{row.expected_date ? formatDate(row.expected_date) : "—"}</Td>
                  <Td>
                    <div className="font-bold">{row.sku}</div>
                    <div className="text-[11px] text-ink-soft">{row.item_name}</div>
                  </Td>
                  <Td align="right">{formatQuantity(row.ordered)}</Td>
                  <Td align="right">{formatQuantity(row.received)}</Td>
                  <Td align="right">
                    <span className="font-bold">{formatQuantity(row.outstanding)}</span>{" "}
                    <span className="text-[11px] text-ink-soft">{row.base_unit_code}</span>
                  </Td>
                  <Td align="right">{formatNaira(row.outstanding_value_minor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : null}
    </Card>
  );
}
