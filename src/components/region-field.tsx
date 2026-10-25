"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-context";
import { NIGERIA_STATES } from "@/lib/nigeria-states";

// Plutus holds a list of first-level regions only for Nigeria (its 36
// states and the FCT, which state PAYE filing needs). Elsewhere a region is
// free text until that country's payroll is built.
export function useIsNigeria(): boolean {
  const { user } = useAuth();
  return (user?.country_code ?? "NG") === "NG";
}

// "State" in Nigeria, "Region" elsewhere.
export function useRegionLabel(): string {
  return useIsNigeria() ? "State" : "Region";
}

export function RegionField({
  id,
  value,
  onChange,
  required,
  emptyLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  emptyLabel: string;
}) {
  const isNigeria = useIsNigeria();
  if (!isNigeria) {
    return (
      <Input
        id={id}
        value={value}
        required={required}
        maxLength={64}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Region, county or province"
      />
    );
  }
  return (
    <Select id={id} value={value} required={required} onChange={(event) => onChange(event.target.value)}>
      <option value="">{emptyLabel}</option>
      {NIGERIA_STATES.map((state) => (
        <option key={state} value={state}>
          {state}
        </option>
      ))}
    </Select>
  );
}
