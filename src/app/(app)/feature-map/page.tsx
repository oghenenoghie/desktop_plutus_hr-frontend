"use client";

import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { NAV_GROUPS, ROLE_LABELS, type NavItem } from "@/lib/nav";

export default function FeatureMapPage() {
  return (
    <div>
      <PageHeader
        title="Full Feature Map"
        subtitle="Every screen in Plutus, grouped by area, and which roles can reach it"
      />

      <div className="flex flex-col gap-6">
        {NAV_GROUPS.map((group) => (
          <Card key={group.heading}>
            <CardHeader title={group.heading} />
            {group.subgroups ? (
              <div className="flex flex-col gap-5">
                {group.subgroups.map((subgroup) => (
                  <div key={subgroup.heading}>
                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.03em] text-ink-soft">
                      {subgroup.heading}
                    </p>
                    <FeatureList items={subgroup.items} />
                  </div>
                ))}
              </div>
            ) : (
              <FeatureList items={group.items ?? []} />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function FeatureList({ items }: { items: NavItem[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <div
          key={item.href}
          className="flex flex-col gap-1.5 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <Link href={item.href} className="text-[13px] font-bold text-ink hover:text-primary">
            {item.label}
          </Link>
          <div className="flex flex-wrap gap-1.5">
            {item.roles.map((role) => (
              <span
                key={role}
                className="rounded-badge border border-border bg-bg px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.02em] text-ink-soft"
              >
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
