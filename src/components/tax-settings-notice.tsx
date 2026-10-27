"use client";

import Link from "next/link";

import { useIsNigeria } from "@/components/region-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { complianceApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";

// On payroll screens outside Nigeria: the Tax Settings figures still
// missing, which the API needs before it will calculate a pay run.
export function TaxSettingsNotice() {
  const isNigeria = useIsNigeria();
  if (isNigeria) return null;
  return <MissingTaxSettings />;
}

function MissingTaxSettings() {
  const settings = useApiResource(() => complianceApi.taxSettings());
  const data = settings.data;
  if (!data || !data.applies || data.missing.length === 0) return null;
  const labels = new Map(data.settings.map((setting) => [setting.key, setting.label]));
  return (
    <Card className="mb-6 border-warn">
      <CardHeader
        title={`Enter ${data.country_name}'s Tax Settings before running payroll`}
        subtitle="Pay runs are refused until your organisation has entered these figures"
        action={<Badge tone="warn">{data.missing.length} missing</Badge>}
      />
      <ul className="mb-3 list-disc space-y-1 pl-5 text-[13px] text-ink">
        {data.missing.map((key) => (
          <li key={key}>{labels.get(key) ?? key}</li>
        ))}
      </ul>
      <Link href="/tax-settings" className="text-[13px] font-bold text-primary hover:underline">
        Open Tax Settings
      </Link>
    </Card>
  );
}
