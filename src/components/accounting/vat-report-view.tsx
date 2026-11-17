import { printTd, printTdRight, printTh, printThRight } from "@/components/print/print-page";
import { formatDate, formatMoneyExact } from "@/lib/format";
import type { VatReport, VatReportGroup } from "@/lib/types";

const KINDS = { invoice: "Invoice", credit_note: "Credit note", bill: "Bill" } as const;

// To the kobo, as a VAT return asks; a figure taken off (a credit note) in
// brackets, as accounts show it.
function money(minor: number): string {
  return minor < 0 ? `(${formatMoneyExact(-minor)})` : formatMoneyExact(minor);
}

// "2026-11" -> "November 2026".
export function monthTitle(month: string): string {
  const [year, mm] = month.split("-").map(Number);
  if (!year || !mm) return month;
  return new Date(Date.UTC(year, mm - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function netLabel(report: VatReport): string {
  if (report.position === "payable") return "Net VAT payable";
  if (report.position === "refundable") return "Net VAT refundable (credit)";
  return "Net VAT";
}

const SCREEN = {
  th: "border-b border-border px-1 pb-2.5 text-left text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft",
  thRight:
    "border-b border-border px-1 pb-2.5 text-right text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft",
  td: "border-b border-border px-1 py-2.5 text-left align-top text-[13px] text-ink",
  tdRight: "border-b border-border px-1 py-2.5 text-right align-top text-[13px] tabular-nums text-ink",
};
const PRINT = { th: printTh, thRight: printThRight, td: printTd, tdRight: printTdRight };

function GroupTable({
  caption,
  groups,
  emptyLabel,
  extra,
  totalLabel,
  totalNet,
  totalVat,
  cls,
}: {
  caption: string;
  groups: VatReportGroup[];
  emptyLabel: string;
  extra?: { label: string; count: number; net: number; vat: number } | null;
  totalLabel: string;
  totalNet: number;
  totalVat: number;
  cls: typeof SCREEN;
}) {
  return (
    <table className="w-full border-collapse" aria-label={caption}>
      <thead>
        <tr>
          <th className={cls.th}>{caption}</th>
          <th className={cls.thRight}>Documents</th>
          <th className={cls.thRight}>Net</th>
          <th className={cls.thRight}>VAT</th>
        </tr>
      </thead>
      <tbody>
        {groups.length === 0 ? (
          <tr>
            <td className={`${cls.td} text-ink-soft`} colSpan={4}>
              {emptyLabel}
            </td>
          </tr>
        ) : (
          groups.map((group) => (
            <tr key={`${group.treatment}-${group.label}-${group.rate_ppm}`}>
              <td className={cls.td}>{group.label}</td>
              <td className={cls.tdRight}>{group.document_count}</td>
              <td className={cls.tdRight}>{money(group.net_minor)}</td>
              <td className={cls.tdRight}>{money(group.vat_minor)}</td>
            </tr>
          ))
        )}
        {extra ? (
          <tr>
            <td className={cls.td}>{extra.label}</td>
            <td className={cls.tdRight}>{extra.count}</td>
            <td className={cls.tdRight}>{money(extra.net)}</td>
            <td className={cls.tdRight}>{money(extra.vat)}</td>
          </tr>
        ) : null}
        <tr className="font-extrabold">
          <td className={cls.td}>{totalLabel}</td>
          <td className={cls.tdRight} />
          <td className={cls.tdRight}>{money(totalNet)}</td>
          <td className={cls.tdRight}>{money(totalVat)}</td>
        </tr>
      </tbody>
    </table>
  );
}

// The month's VAT: sales by rate, purchases by rate, the net between them,
// and every document behind the figures. The same layout on screen and on
// paper (variant "print" uses plain borders for black-and-white printers).
export function VatReportView({ report, variant }: { report: VatReport; variant: "screen" | "print" }) {
  const cls = variant === "print" ? PRINT : SCREEN;
  const sectionTitle = variant === "print" ? "mb-2 mt-6 text-[13px] font-extrabold uppercase" : "mb-2 mt-6 text-[14px] font-extrabold text-ink";
  return (
    <div>
      <section aria-label="VAT summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:grid-cols-3">
        {[
          { label: "Output VAT", hint: "Charged to customers", figure: report.output_vat_minor },
          { label: "Input VAT", hint: "Charged by vendors", figure: report.input_vat_minor },
          {
            label: netLabel(report),
            hint:
              report.position === "payable"
                ? "Owed to the tax authority"
                : report.position === "refundable"
                  ? "To carry forward or claim back"
                  : "Nothing owed or due back",
            figure: Math.abs(report.net_vat_minor),
          },
        ].map((card, index) => (
          <div
            key={card.label}
            className={`rounded-panel border px-4 py-3 ${index === 2 ? "border-primary bg-primary-tint print:border-ink print:bg-white" : "border-border"}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-soft">{card.label}</p>
            <p className="mt-1 text-[20px] font-extrabold tabular-nums text-ink">{money(card.figure)}</p>
            <p className="text-[11px] text-ink-soft">{card.hint}</p>
          </div>
        ))}
      </section>

      <h2 className={sectionTitle}>Output VAT: sales</h2>
      <GroupTable
        caption="Sales by VAT rate"
        groups={report.output_groups}
        emptyLabel="No invoices sent this month."
        extra={
          report.credit_note_count
            ? {
                label: "Less: credit notes",
                count: report.credit_note_count,
                net: report.credit_note_net_minor,
                vat: report.credit_note_vat_minor,
              }
            : null
        }
        totalLabel="Output VAT"
        totalNet={report.sales_net_minor - report.credit_note_net_minor}
        totalVat={report.output_vat_minor}
        cls={cls}
      />

      <h2 className={sectionTitle}>Input VAT: purchases</h2>
      <GroupTable
        caption="Purchases by VAT rate"
        groups={report.input_groups}
        emptyLabel="No vendor bills approved for this month."
        totalLabel="Input VAT"
        totalNet={report.purchases_net_minor}
        totalVat={report.input_vat_minor}
        cls={cls}
      />

      <h2 className={sectionTitle}>Summary</h2>
      <table className="w-full max-w-[480px] border-collapse" aria-label="VAT position">
        <tbody>
          <tr>
            <td className={cls.td}>Output VAT</td>
            <td className={cls.tdRight}>{money(report.output_vat_minor)}</td>
          </tr>
          <tr>
            <td className={cls.td}>Less: input VAT</td>
            <td className={cls.tdRight}>{money(report.input_vat_minor)}</td>
          </tr>
          <tr className="font-extrabold">
            <td className={`${cls.td} border-b-2 border-ink`}>{netLabel(report)}</td>
            <td className={`${cls.tdRight} border-b-2 border-ink`}>{money(Math.abs(report.net_vat_minor))}</td>
          </tr>
        </tbody>
      </table>

      <h2 className={sectionTitle}>Documents</h2>
      {report.documents.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No invoices, credit notes or bills count towards this month.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" aria-label="Documents in this VAT report">
            <thead>
              <tr>
                <th className={cls.th}>Date</th>
                <th className={cls.th}>Type</th>
                <th className={cls.th}>Number</th>
                <th className={cls.th}>Customer or vendor</th>
                <th className={cls.th}>Rate</th>
                <th className={cls.thRight}>Net</th>
                <th className={cls.thRight}>VAT</th>
              </tr>
            </thead>
            <tbody>
              {report.documents.map((document) => (
                <tr key={`${document.kind}-${document.id}`}>
                  <td className={cls.td}>{formatDate(document.date)}</td>
                  <td className={cls.td}>{KINDS[document.kind]}</td>
                  <td className={cls.td}>{document.number}</td>
                  <td className={cls.td}>{document.party_name || "—"}</td>
                  <td className={cls.td}>{document.rate_label}</td>
                  <td className={cls.tdRight}>{money(document.net_minor)}</td>
                  <td className={cls.tdRight}>{money(document.vat_minor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-1 text-[11px] text-ink-soft">
        <p>
          Invoices count once sent and bills once approved, each in the month of its own date; credit notes count in the
          month they were issued.
        </p>
        {report.draft_invoice_count || report.draft_bill_count ? (
          <p>
            Not included: {report.draft_invoice_count} draft invoice{report.draft_invoice_count === 1 ? "" : "s"} and{" "}
            {report.draft_bill_count} draft bill{report.draft_bill_count === 1 ? "" : "s"} dated this month.
          </p>
        ) : null}
        <p>Check the figures against the tax authority&apos;s return before filing.</p>
      </div>
    </div>
  );
}
