"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { complianceApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatDateTime, formatMoneyExact, formatPpmAsPercent } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { todayInLagos } from "@/lib/inventory";
import type {
  CountryRuleLine,
  CountryRules,
  TaxSetting,
  TaxSettings,
  TaxSource,
  UpcomingTaxRules,
} from "@/lib/types";

// The figures this organisation enters for its country's payroll rules:
// those the sources behind the rules didn't settle. Only an admin enters
// them (the API refuses everyone else), and every entry is kept and audited.
const COMPANY_SOURCE = "company-settings";

function errorText(err: unknown): string {
  return err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.";
}

function nextDay(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

// The earliest date a new figure can take effect: not before the rules
// start, and after every locked pay run.
function earliestDate(data: TaxSettings): string {
  const candidates = [data.effective_from ?? "0000-01-01"];
  if (data.locked_through) candidates.push(nextDay(data.locked_through));
  return candidates.sort().at(-1)!;
}

export default function TaxSettingsPage() {
  const { user } = useAuth();
  const canChange = user?.role === "admin";
  const settings = useApiResource(() => complianceApi.taxSettings());
  const data = settings.data;

  return (
    <div>
      <PageHeader
        title="Tax Settings"
        subtitle={
          data
            ? `${data.country_name}'s payroll rules, and the figures your organisation enters for them`
            : "Your country's payroll rules, and the figures your organisation enters for them"
        }
      />
      {settings.loading && !data ? <LoadingState /> : null}
      {settings.error ? <ErrorState message={settings.error} /> : null}
      {data && !data.applies ? (
        <Card>
          <EmptyState label={`${data.country_name}'s rules take no Tax Settings.`} />
        </Card>
      ) : null}
      {data && data.applies ? (
        <div className="flex flex-col gap-6">
          <RulesCard data={data} />
          {data.missing.length > 0 ? <MissingCard data={data} canChange={canChange} /> : null}
          <SettingsCard data={data} canChange={canChange} onSaved={settings.reload} />
          {data.upcoming && data.upcoming.settings.length > 0 ? (
            <UpcomingCard data={data} upcoming={data.upcoming} canChange={canChange} onSaved={settings.reload} />
          ) : null}
          {data.rules ? <RulesInForce data={data} rules={data.rules} /> : null}
          {data.rules_problem ? (
            <Card>
              <CardHeader title="These figures don't make usable rules" />
              <p className="text-[13px] text-bad-ink">{data.rules_problem}</p>
            </Card>
          ) : null}
          <HistoryCard data={data} />
          <SourcesCard sources={data.sources} />
        </div>
      ) : null}
    </div>
  );
}

function RulesCard({ data }: { data: TaxSettings }) {
  return (
    <Card>
      <CardHeader
        title={`${data.country_name}'s payroll rules`}
        subtitle={`Rule set ${data.rule_set_id}, in force from ${formatDate(data.effective_from)}${
          data.effective_to ? ` to ${formatDate(data.effective_to)} (not inclusive)` : ""
        }`}
        action={
          <Badge tone="good">
            Approved by {data.approved_by ?? "—"} {data.approved_on ? `on ${formatDate(data.approved_on)}` : ""}
          </Badge>
        }
      />
      <div className="space-y-3 text-[13px] text-ink-soft">
        {data.summary.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {data.approval_basis === "owner_approved" ? (
          <p>
            Approved from published sources without a local tax adviser&apos;s review. Each
            source below says whether it is the authority&apos;s own publication or a secondary
            one, such as a firm or payroll vendor.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function MissingCard({ data, canChange }: { data: TaxSettings; canChange: boolean }) {
  const labels = new Map(data.settings.map((setting) => [setting.key, setting.label]));
  return (
    <Card className="border-warn">
      <CardHeader
        title={`Payroll can't run until ${data.missing.length === 1 ? "this figure is" : `these ${data.missing.length} figures are`} entered`}
        subtitle={
          canChange
            ? "Enter them below. Pay runs are refused until then, so nothing is calculated on a guess."
            : "An admin enters them on this page. Pay runs are refused until then."
        }
        action={<Badge tone="warn">{data.missing.length} missing</Badge>}
      />
      <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink">
        {data.missing.map((key) => (
          <li key={key}>{labels.get(key) ?? key}</li>
        ))}
      </ul>
    </Card>
  );
}

// What each setting is now, in the form's own state: the value entered
// here, or else the one in effect.
function currentValue(setting: TaxSetting, edits: Record<string, string>): string | null {
  return setting.key in edits ? edits[setting.key]! : setting.entry;
}

function isAsked(setting: TaxSetting, settings: TaxSetting[], edits: Record<string, string>): boolean {
  if (!setting.required_when_key) return true;
  const other = settings.find((candidate) => candidate.key === setting.required_when_key);
  return other ? currentValue(other, edits) === setting.required_when_value : true;
}

function SettingsCard({
  data,
  canChange,
  onSaved,
}: {
  data: TaxSettings;
  canChange: boolean;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const earliest = earliestDate(data);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [effectiveFrom, setEffectiveFrom] = useState(() => {
    const today = todayInLagos();
    return today > earliest ? today : earliest;
  });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const changed = Object.entries(edits).filter(([key, value]) => {
    const setting = data.settings.find((candidate) => candidate.key === key);
    return setting && value.trim() !== "" && value !== setting.entry && isAsked(setting, data.settings, edits);
  });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (changed.length === 0) return;
    setSaving(true);
    try {
      await complianceApi.enterTaxSettings({
        effective_from: effectiveFrom,
        values: Object.fromEntries(changed),
        note: note.trim() || null,
      });
      showToast(
        `${changed.length === 1 ? "Figure" : `${changed.length} figures`} saved from ${formatDate(effectiveFrom)}`,
        "good",
      );
      setEdits({});
      setNote("");
      onSaved();
    } catch (err) {
      showToast(errorText(err), "bad");
    } finally {
      setSaving(false);
    }
  }

  const asked = data.settings.filter((setting) => isAsked(setting, data.settings, edits));

  return (
    <Card>
      <CardHeader
        title="Figures your organisation enters"
        subtitle="Where the sources didn't settle a figure, or disagree. Each option says which source gives it."
        action={<Badge tone="neutral">Entered by your company</Badge>}
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {asked.map((setting) => (
          <SettingField
            key={setting.key}
            setting={setting}
            currency={data.currency}
            value={currentValue(setting, edits) ?? ""}
            canChange={canChange}
            onChange={(value) => setEdits((prev) => ({ ...prev, [setting.key]: value }))}
          />
        ))}
        {canChange ? (
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <div className="grid gap-3 sm:grid-cols-[16rem_1fr]">
              <div>
                <Label htmlFor="tax-settings-from">Takes effect from</Label>
                <Input
                  id="tax-settings-from"
                  type="date"
                  value={effectiveFrom}
                  min={earliest}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tax-settings-note">Note (optional)</Label>
                <Textarea
                  id="tax-settings-note"
                  rows={2}
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Why, or who advised it"
                />
              </div>
            </div>
            <p className="text-[12px] text-ink-soft">
              Pay runs whose period ends on or after this date use the new figures.
              {data.locked_through
                ? ` Pay runs up to ${formatDate(data.locked_through)} are locked and keep the figures they used.`
                : " Locked pay runs always keep the figures they used."}
            </p>
            <div>
              <Button type="submit" disabled={saving || changed.length === 0}>
                {saving
                  ? "Saving…"
                  : changed.length === 0
                    ? "Save figures"
                    : `Save ${changed.length} figure${changed.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-ink-soft">Only an admin can enter these figures.</p>
        )}
      </form>
    </Card>
  );
}

// The figures the next rules add, entered before they start so the first
// pay run under them isn't refused.
function UpcomingCard({
  data,
  upcoming,
  canChange,
  onSaved,
}: {
  data: TaxSettings;
  upcoming: UpcomingTaxRules;
  canChange: boolean;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const earliest = [upcoming.effective_from, data.locked_through ? nextDay(data.locked_through) : ""].sort().at(-1)!;
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const changed = Object.entries(edits).filter(([key, value]) => {
    const setting = upcoming.settings.find((candidate) => candidate.key === key);
    return setting && value.trim() !== "" && value !== setting.entry;
  });
  const missing = upcoming.missing.length;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (changed.length === 0) return;
    setSaving(true);
    try {
      await complianceApi.enterTaxSettings({ effective_from: earliest, values: Object.fromEntries(changed) });
      showToast(`Saved from ${formatDate(earliest)}`, "good");
      setEdits({});
      onSaved();
    } catch (err) {
      showToast(errorText(err), "bad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={missing > 0 ? "border-warn" : ""}>
      <CardHeader
        title={`From ${formatDate(upcoming.effective_from)}: rule set ${upcoming.rule_set_id}`}
        subtitle={`${data.country_name}'s next rules ask for ${upcoming.settings.length === 1 ? "one more figure" : `${upcoming.settings.length} more figures`}. Enter ${upcoming.settings.length === 1 ? "it" : "them"} now so the first pay run under them isn't refused.`}
        action={<Badge tone={missing > 0 ? "warn" : "good"}>{missing > 0 ? `${missing} missing` : "Ready"}</Badge>}
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {upcoming.settings.map((setting) => (
          <SettingField
            key={setting.key}
            setting={setting}
            currency={data.currency}
            value={currentValue(setting, edits) ?? ""}
            canChange={canChange}
            onChange={(value) => setEdits((prev) => ({ ...prev, [setting.key]: value }))}
          />
        ))}
        {canChange ? (
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <p className="text-[12px] text-ink-soft">Takes effect from {formatDate(earliest)}.</p>
            <div>
              <Button type="submit" disabled={saving || changed.length === 0}>
                {saving ? "Saving…" : `Save for ${formatDate(upcoming.effective_from)}`}
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </Card>
  );
}

function SettingField({
  setting,
  currency,
  value,
  canChange,
  onChange,
}: {
  setting: TaxSetting;
  currency: string;
  value: string;
  canChange: boolean;
  onChange: (value: string) => void;
}) {
  const id = `tax-setting-${setting.key}`;
  const unit =
    setting.kind === "percent" ? "%" : setting.kind === "amount" ? currency : setting.kind === "day" ? "day" : null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{setting.label}</Label>
        {setting.display === null && setting.required ? <Badge tone="warn">Missing</Badge> : null}
      </div>
      <p className="text-[12px] text-ink-soft">{setting.help}</p>
      {canChange ? (
        setting.kind === "choice" ? (
          <Select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="sm:max-w-xl">
            <option value="">Choose…</option>
            {setting.options.map((option) => (
              <option key={option.value} value={option.entry}>
                {option.label} — {option.source}
              </option>
            ))}
          </Select>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 sm:max-w-xs">
              <Input
                id={id}
                inputMode="decimal"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={setting.kind === "day" ? "1 to 28" : undefined}
              />
              {unit ? <span className="text-[12px] text-ink-soft">{unit}</span> : null}
            </div>
            {setting.options.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {setting.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.entry)}
                    className="rounded-badge border border-border bg-bg px-3 py-[5px] text-left text-[12px] text-ink hover:border-primary"
                  >
                    Use {option.display}: {option.label} ({option.source})
                  </button>
                ))}
              </div>
            ) : null}
            {setting.minimum || setting.maximum ? (
              <p className="text-[11px] text-ink-soft">
                {setting.minimum && setting.maximum
                  ? `Between ${setting.minimum} and ${setting.maximum}`
                  : setting.minimum
                    ? `At least ${setting.minimum}`
                    : `At most ${setting.maximum}`}
                {unit === "%" ? "%" : unit && unit !== "day" ? ` ${unit}` : ""}
              </p>
            ) : null}
          </div>
        )
      ) : null}
      <p className="text-[12px] text-ink-soft">
        {setting.display !== null ? (
          <>
            Now: <strong className="text-ink">{setting.display}</strong>, from {formatDate(setting.effective_from)}
            {setting.entered_by ? `, entered by ${setting.entered_by}` : ""}
            {setting.entered_at ? ` on ${formatDateTime(setting.entered_at)}` : ""}.
          </>
        ) : setting.required ? (
          "Not entered yet."
        ) : (
          "Not needed with your other answers."
        )}
      </p>
    </div>
  );
}

function sourceLabel(sourceId: string, sources: Map<string, TaxSource>): React.ReactNode {
  if (sourceId === COMPANY_SOURCE) return <Badge tone="neutral">Your figure</Badge>;
  const source = sources.get(sourceId);
  if (!source) return sourceId;
  return <Badge tone={source.official ? "good" : "warn"}>{source.official ? "Official" : "Secondary"}</Badge>;
}

const KIND_LABELS: Record<CountryRuleLine["kind"], string> = {
  employee_contribution: "Employee",
  employer_contribution: "Employer",
  payroll_levy: "Employer (whole payroll)",
  tax_credit: "Off the employee's tax",
};

const APPLIES_LABELS: Record<CountryRuleLine["applies_to"], string> = {
  all: "",
  local_staff: " (local staff)",
  expatriates: " (expatriates)",
};

function lineFigure(line: CountryRuleLine, currency: string): string {
  if (line.rate_ppm !== null) {
    const limits = [
      line.base_ceiling_minor !== null ? `up to ${formatMoneyExact(line.base_ceiling_minor, currency)}` : null,
      line.amount_floor_minor !== null ? `at least ${formatMoneyExact(line.amount_floor_minor, currency)}` : null,
      line.amount_cap_minor !== null ? `at most ${formatMoneyExact(line.amount_cap_minor, currency)}` : null,
    ].filter(Boolean);
    return `${formatPpmAsPercent(line.rate_ppm)} of ${line.base.toLowerCase()}${limits.length ? `, ${limits.join(", ")}` : ""}`;
  }
  if (line.amount_minor !== null) {
    return line.kind === "tax_credit"
      ? `${formatMoneyExact(line.amount_minor, currency)} ${line.name.split(", ").at(-1)}`
      : `${formatMoneyExact(line.amount_minor, currency)} a month`;
  }
  return "—";
}

function RulesInForce({ data, rules }: { data: TaxSettings; rules: CountryRules }) {
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  const tax = rules.income_tax;
  // Each band runs from the previous band's upper limit.
  const lowerLimits = tax.bands.map((_, index) => (index === 0 ? 0 : (tax.bands[index - 1]!.up_to_minor ?? 0)));
  return (
    <Card>
      <CardHeader
        title="The rules as they stand today"
        subtitle="Built from the approved rules and your figures. Pay runs calculate with exactly these."
      />
      <h3 className="mb-2 text-[13px] font-extrabold text-ink">
        {tax.name} ({tax.authority}), each month on its own · {tax.due} · {sourceLabel(tax.source, sources)}
      </h3>
      <Table>
        <Thead>
          <tr>
            <Th>Monthly taxable income</Th>
            <Th>Rate</Th>
          </tr>
        </Thead>
        <tbody>
          {tax.bands.map((band, index) => {
            const from = lowerLimits[index]!;
            return (
              <tr key={`${band.up_to_minor}-${band.rate_ppm}`}>
                <Td>
                  {band.up_to_minor === null
                    ? `Above ${formatMoneyExact(from, data.currency)}`
                    : `${formatMoneyExact(from, data.currency)} – ${formatMoneyExact(band.up_to_minor, data.currency)}`}
                </Td>
                <Td>{formatPpmAsPercent(band.rate_ppm)}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <h3 className="mb-2 mt-6 text-[13px] font-extrabold text-ink">Contributions, levies and reliefs</h3>
      <Table>
        <Thead>
          <tr>
            <Th>Line</Th>
            <Th>Paid by</Th>
            <Th>Figure</Th>
            <Th>Paid to</Th>
            <Th>Due</Th>
            <Th>Source</Th>
          </tr>
        </Thead>
        <tbody>
          {rules.lines.map((line) => (
            <tr key={line.code}>
              <Td>
                <span className="font-bold">{line.name}</span>
                <span className="ml-2 text-ink-soft">{line.code}</span>
                {line.tax_deductible ? (
                  <span className="block text-[11px] text-ink-soft">Deducted before {tax.name}</span>
                ) : null}
              </Td>
              <Td>
                {KIND_LABELS[line.kind]}
                {APPLIES_LABELS[line.applies_to]}
              </Td>
              <Td>{lineFigure(line, data.currency)}</Td>
              <Td className="max-w-xs">{line.authority}</Td>
              <Td>{line.due}</Td>
              <Td>{sourceLabel(line.source, sources)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function HistoryCard({ data }: { data: TaxSettings }) {
  return (
    <Card>
      <CardHeader
        title="History"
        subtitle="Every figure your organisation has entered. Nothing is ever overwritten."
      />
      {data.history.length === 0 ? (
        <EmptyState label="Nothing entered yet." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Entered</Th>
              <Th>Figure</Th>
              <Th>Value</Th>
              <Th>From</Th>
              <Th>By</Th>
              <Th>Note</Th>
            </tr>
          </Thead>
          <tbody>
            {data.history.map((entry) => (
              <tr key={entry.id}>
                <Td>{formatDateTime(entry.entered_at)}</Td>
                <Td className="max-w-xs">{entry.label}</Td>
                <Td>{entry.display}</Td>
                <Td>{formatDate(entry.effective_from)}</Td>
                <Td>{entry.entered_by ?? "—"}</Td>
                <Td className="max-w-xs">{entry.note ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function SourcesCard({ sources }: { sources: TaxSource[] }) {
  return (
    <Card>
      <CardHeader
        title="Sources"
        subtitle="Where each built-in figure comes from. Official means the law or the authority's own publication."
      />
      <ul className="space-y-3 text-[13px]">
        {sources.map((source) => (
          <li key={source.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
            <span className="shrink-0">
              {source.id === COMPANY_SOURCE ? (
                <Badge tone="neutral">Your figures</Badge>
              ) : (
                <Badge tone={source.official ? "good" : "warn"}>{source.official ? "Official" : "Secondary"}</Badge>
              )}
            </span>
            <span className="text-ink">
              {source.title}
              {source.reference.startsWith("http") ? (
                <>
                  {" "}
                  <a
                    href={source.reference}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-primary hover:underline"
                  >
                    Open
                  </a>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
