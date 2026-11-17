"use client";

import { useState } from "react";

import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { VatOptions, VatTreatment } from "@/lib/types";

export interface VatChoice {
  options: VatOptions | null;
  error: string | null;
  treatment: VatTreatment | "";
  setTreatment: (treatment: VatTreatment) => void;
  otherName: string;
  setOtherName: (name: string) => void;
  otherPercent: string;
  setOtherPercent: (percent: string) => void;
  label: string;
  ratePpm: number | null;
}

// The VAT a document charges: one of the organisation's options (its
// standard rate first, then exempt, zero-rated and "other"), or a rate the
// user names. Until one is chosen, the first option applies.
export function useVatChoice(load: () => Promise<VatOptions>): VatChoice {
  const options = useApiResource(load);
  const [chosen, setTreatment] = useState<VatTreatment | "">("");
  const [otherName, setOtherName] = useState("");
  const [otherPercent, setOtherPercent] = useState("");
  const treatment = chosen || options.data?.options[0]?.treatment || "";
  const option = options.data?.options.find((candidate) => candidate.treatment === treatment);
  const ratePpm =
    treatment === "other"
      ? otherPercent.trim() === ""
        ? null
        : Math.round(Number(otherPercent) * 10_000)
      : (option?.rate_ppm ?? 0);
  const label = treatment === "other" ? otherName.trim() || "VAT" : (option?.label ?? "VAT");
  return {
    options: options.data,
    error: options.error,
    treatment,
    setTreatment,
    otherName,
    setOtherName,
    otherPercent,
    setOtherPercent,
    label,
    ratePpm,
  };
}

// A preview only: the server works out the VAT (half up) and stores it.
export function previewVat(netMinor: number, ratePpm: number | null): number {
  return ratePpm === null ? 0 : Math.floor((netMinor * ratePpm + 500_000) / 1_000_000);
}

// What a create request sends for the choice.
export function vatBody(choice: VatChoice) {
  return {
    vat_treatment: choice.treatment || null,
    vat_rate_name: choice.treatment === "other" ? choice.otherName.trim() : null,
    vat_rate_ppm: choice.treatment === "other" ? choice.ratePpm : null,
  };
}

export function VatFields({
  choice,
  netMinor,
  totalLabel,
  otherHint,
}: {
  choice: VatChoice;
  netMinor: number;
  totalLabel: string;
  otherHint: string;
}) {
  const vatMinor = previewVat(netMinor, choice.ratePpm);
  return (
    <>
      <div>
        <Label htmlFor="vat">VAT</Label>
        <Select
          id="vat"
          value={choice.treatment}
          onChange={(event) => choice.setTreatment(event.target.value as VatTreatment)}
          required
        >
          {(choice.options?.options ?? []).map((option) => (
            <option key={option.treatment} value={option.treatment}>
              {option.label}
            </option>
          ))}
        </Select>
        {choice.error ? <p className="mt-1 text-[11px] text-bad">{choice.error}</p> : null}
      </div>
      {choice.treatment === "other" ? (
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <Label htmlFor="vatRateName">Rate name</Label>
            <Input
              id="vatRateName"
              value={choice.otherName}
              onChange={(event) => choice.setOtherName(event.target.value)}
              placeholder="Ghana VAT 15%"
              maxLength={64}
              required
            />
          </div>
          <div>
            <Label htmlFor="vatRatePercent">Rate (%)</Label>
            <Input
              id="vatRatePercent"
              value={choice.otherPercent}
              onChange={(event) => choice.setOtherPercent(event.target.value)}
              inputMode="decimal"
              placeholder="15"
              required
            />
          </div>
          <p className="col-span-2 -mt-1 text-[11px] text-ink-soft">{otherHint}</p>
        </div>
      ) : null}
      {netMinor > 0 ? (
        <dl className="grid grid-cols-[1fr_auto] gap-y-1 rounded-panel border border-border bg-bg px-3 py-2 text-[13px]">
          <dt className="text-ink-soft">Amount before VAT</dt>
          <dd className="text-right font-bold">{formatMoney(netMinor)}</dd>
          <dt className="text-ink-soft">{choice.label}</dt>
          <dd className="text-right font-bold">{formatMoney(vatMinor)}</dd>
          <dt className="font-extrabold">{totalLabel}</dt>
          <dd className="text-right font-extrabold">{formatMoney(netMinor + vatMinor)}</dd>
        </dl>
      ) : null}
    </>
  );
}
