import type { Organisation } from "@/lib/types";

interface Party {
  name: string;
  address: string | null;
  tin: string | null;
}

function PartyBlock({ label, party }: { label: string; party: Party }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink-soft">{label}</p>
      <p className="text-[14px] font-extrabold">{party.name}</p>
      {party.address ? <p className="whitespace-pre-line">{party.address}</p> : null}
      {party.tin ? <p className="mt-1">Tax ID: {party.tin}</p> : null}
    </div>
  );
}

// The two parties at the top of a printed invoice or bill: who it's from
// and who it's to, each with their address and Tax ID.
export function DocumentParties({
  fromLabel,
  from,
  toLabel,
  to,
}: {
  fromLabel: string;
  from: Party;
  toLabel: string;
  to: Party;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-8 text-[12px]">
      <PartyBlock label={fromLabel} party={from} />
      <PartyBlock label={toLabel} party={to} />
    </div>
  );
}

export function organisationParty(organisation: Organisation | null | undefined): Party {
  return {
    name: organisation?.name ?? "",
    address: organisation?.address ?? null,
    tin: organisation?.company_tin ?? null,
  };
}

// Label and value pairs under the parties: dates, status, account.
export function DocumentFacts({ facts }: { facts: [string, string][] }) {
  return (
    <dl className="mb-6 grid grid-cols-4 gap-4 border-y border-border py-3 text-[12px]">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink-soft">{label}</dt>
          <dd className="font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
