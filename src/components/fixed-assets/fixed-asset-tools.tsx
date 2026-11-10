"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { fixedAssetsApi } from "@/lib/api/endpoints";
import { currencyLabel, formatMoney, toMinorUnits } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { AssetCategory, DepreciationMethod, FixedAsset, YearEndDepreciationResult } from "@/lib/types";

export const METHOD_LABELS: Record<DepreciationMethod, string> = {
  straight_line: "Straight line",
  reducing_balance: "Reducing balance",
  write_off: "Write off at once",
};

// "25%" from 250000 parts per million; a percentage typed in back to ppm.
export function ratePercent(ppm: number | null): string {
  return ppm === null ? "" : `${Number((ppm / 10_000).toFixed(4))}%`;
}

export function percentToPpm(percent: string): number | null {
  const value = Number(percent.trim());
  return percent.trim() === "" || !Number.isFinite(value) ? null : Math.round(value * 10_000);
}

// How the asset is written down, in a line: "Reducing balance · 25% a year".
export function methodSummary(asset: Pick<FixedAsset, "depreciation_method" | "depreciation_rate_ppm" | "useful_life_months">): string {
  if (asset.depreciation_method === "write_off") return METHOD_LABELS.write_off;
  if (asset.depreciation_rate_ppm !== null) {
    return `${METHOD_LABELS[asset.depreciation_method]} · ${ratePercent(asset.depreciation_rate_ppm)} a year`;
  }
  return `${METHOD_LABELS[asset.depreciation_method]} · ${asset.useful_life_months} months`;
}

function errorText(err: unknown, fallback = "Action failed."): string {
  return err instanceof ApiError ? String(err.detail ?? err.message) : fallback;
}

export function AssetCategoryModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (category: AssetCategory) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [method, setMethod] = useState<DepreciationMethod>("straight_line");
  const [rate, setRate] = useState("");
  const [life, setLife] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSubmitting(true);
    try {
      const category = await fixedAssetsApi.createCategory({
        name,
        depreciation_method: method,
        depreciation_rate_ppm: method === "write_off" ? null : percentToPpm(rate),
        useful_life_months: life ? Number(life) : null,
      });
      showToast(`Category "${category.name}" created`, "good");
      onCreated(category);
    } catch (err) {
      showToast(errorText(err), "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Asset Category" onClose={onClose} size="sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="new-category-name">Name</Label>
          <Input
            id="new-category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Motor Vehicles"
            required
          />
        </div>
        <div>
          <Label htmlFor="new-category-method">Usual Depreciation Method</Label>
          <Select
            id="new-category-method"
            value={method}
            onChange={(event) => setMethod(event.target.value as DepreciationMethod)}
          >
            {Object.entries(METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {method !== "write_off" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-category-rate">Rate (% a year)</Label>
              <Input
                id="new-category-rate"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                inputMode="decimal"
                placeholder={method === "reducing_balance" ? "e.g. 25" : "optional"}
                required={method === "reducing_balance"}
              />
            </div>
            <div>
              <Label htmlFor="new-category-life">Useful Life (months)</Label>
              <Input
                id="new-category-life"
                value={life}
                onChange={(event) => setLife(event.target.value)}
                inputMode="numeric"
                placeholder="e.g. 48"
              />
            </div>
          </div>
        ) : null}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AssetCategoriesDrawer({ onClose }: { onClose: () => void }) {
  const categories = useApiResource(() => fixedAssetsApi.categories());
  const [creating, setCreating] = useState(false);
  return (
    <Drawer title="Asset Categories" onClose={onClose}>
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Your own classes of asset, with the depreciation each usually takes. A new asset in a category starts from these
          and can differ.
        </p>
        {categories.data && categories.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Category</Th>
                <Th>Method</Th>
                <Th align="right">Useful life</Th>
              </tr>
            </Thead>
            <tbody>
              {categories.data.map((category) => (
                <tr key={category.id}>
                  <Td className="font-bold">{category.name}</Td>
                  <Td>
                    {METHOD_LABELS[category.depreciation_method]}
                    {category.depreciation_rate_ppm !== null ? ` · ${ratePercent(category.depreciation_rate_ppm)} a year` : ""}
                  </Td>
                  <Td align="right">{category.useful_life_months ? `${category.useful_life_months} months` : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-[13px] text-ink-soft">{categories.loading ? "Loading…" : "No categories yet."}</p>
        )}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => setCreating(true)}>New Category</Button>
        </div>
      </div>
      {creating ? (
        <AssetCategoryModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            categories.reload();
          }}
        />
      ) : null}
    </Drawer>
  );
}

export function YearEndDepreciationDrawer({ onClose, onRun }: { onClose: () => void; onRun: () => void }) {
  const { showToast } = useToast();
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<YearEndDepreciationResult | null>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    setRunning(true);
    try {
      const outcome = await fixedAssetsApi.yearEndDepreciation(Number(year));
      setResult(outcome);
      onRun();
    } catch (err) {
      showToast(errorText(err), "bad");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Drawer title="Year-End Depreciation" onClose={onClose}>
      <form onSubmit={run} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Charges each active asset&apos;s depreciation for the year by its own method: straight line, reducing balance (the
          rate on net book value at the start of the year) or write off; leased assets are amortised the same way. An asset
          bought during the year is charged for the months it was held. The charge is dated 31 December and posted to the
          profit and loss account and to accumulated depreciation. Each asset is charged once a year, so running it again
          only picks up assets added since.
        </p>
        <div className="w-40">
          <Label htmlFor="yearEndYear">Financial Year</Label>
          <Input
            id="yearEndYear"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            inputMode="numeric"
            pattern="[0-9]{4}"
            required
          />
        </div>
        {result ? (
          <div aria-label="Year-end depreciation result">
            <p className="mb-2 text-[13px] font-bold">
              {result.charged.length === 0
                ? `Nothing to charge for ${result.year}.`
                : `${formatMoney(result.total_minor)} charged for ${result.year} across ${result.charged.length} asset${result.charged.length === 1 ? "" : "s"}.`}
            </p>
            {result.charged.length > 0 ? (
              <Table>
                <Thead>
                  <tr>
                    <Th>Asset</Th>
                    <Th>Method</Th>
                    <Th align="right">Charge</Th>
                    <Th align="right">Net book value</Th>
                  </tr>
                </Thead>
                <tbody>
                  {result.charged.map((line) => (
                    <tr key={line.fixed_asset_id}>
                      <Td>
                        <span className="font-bold">{line.asset_tag}</span> {line.name}
                      </Td>
                      <Td>{METHOD_LABELS[line.depreciation_method]}</Td>
                      <Td align="right">{formatMoney(line.charge_minor)}</Td>
                      <Td align="right">{formatMoney(line.book_value_minor)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
            {result.already_run.length > 0 ? (
              <p className="mt-2 text-[12px] text-ink-soft">
                Already charged for {result.year}, not charged again: {result.already_run.join(", ")}.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" disabled={running}>
            {running ? "Running…" : `Run for ${year || "the year"}`}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

export function LeasePaymentDrawer({
  asset,
  onClose,
  onPaid,
}: {
  asset: FixedAsset;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const perPeriod = asset.lease_term_months ? Math.round(asset.cost_minor / asset.lease_term_months) : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fixedAssetsApi.leasePayment(asset.id, { amount_minor: toMinorUnits(amount), payment_date: paymentDate });
      showToast("Lease payment recorded", "good");
      onPaid();
    } catch (err) {
      showToast(errorText(err), "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title={`Lease Payment — ${asset.asset_tag}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <p className="text-[13px] text-ink-soft">
          Reduces the lease liability and pays from Cash and Bank.
          {perPeriod ? ` Over a ${asset.lease_term_months}-month lease, that's about ${formatMoney(perPeriod)} a month.` : ""}
        </p>
        <div>
          <Label htmlFor="leaseAmount">Amount ({currencyLabel()})</Label>
          <Input id="leaseAmount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required />
        </div>
        <div>
          <Label htmlFor="leaseDate">Payment Date</Label>
          <Input id="leaseDate" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Recording…" : "Record Payment"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
