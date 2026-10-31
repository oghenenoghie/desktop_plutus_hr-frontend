"use client";

import Link from "next/link";

import { useIsNigeria } from "@/components/region-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { complianceApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
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
  if (!data || !data.applies) return null;
  const labels = new Map(
    [...data.settings, ...(data.upcoming?.settings ?? [])].map((setting) => [setting.key, setting.label]),
  );
  if (data.missing.length === 0) {
    const upcoming = data.upcoming;
    if (!upcoming || upcoming.missing.length === 0) return null;
    // Not refused yet: the first pay run under the next rules will be.
    return (
      <Card className="mb-6 border-warn">
        <CardHeader
          title={`From ${formatDate(upcoming.effective_from)}, ${data.country_name}'s payroll needs more Tax Settings`}
          subtitle="Pay runs from that date are refused until your organisation has entered them"
          action={<Badge tone="warn">{upcoming.missing.length} missing</Badge>}
        />
        <ul className="mb-3 list-disc space-y-1 pl-5 text-[13px] text-ink">
          {upcoming.missing.map((key) => (
            <li key={key}>{labels.get(key) ?? key}</li>
          ))}
        </ul>
        <Link href="/tax-settings" className="text-[13px] font-bold text-primary hover:underline">
          Open Tax Settings
        </Link>
      </Card>
    );
  }
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
