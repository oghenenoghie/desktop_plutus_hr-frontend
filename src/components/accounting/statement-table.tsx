import { formatMoney } from "@/lib/format";
import type { StatementLine, StatementSection } from "@/lib/types";

// One row of a statement in the vertical form. heading: a section's name;
// line: an account; less: a deduction inside a section; total: a section's
// total; result: a figure the statement works out (gross profit, net
// current assets); grand: the line it ends on (net profit, net assets).
export interface StatementRow {
  key: string;
  label: string;
  figure?: number;
  kind: "heading" | "line" | "less" | "total" | "result" | "grand";
}

// An account by its name: a statement is read without the account numbers,
// which belong to the chart and the ledger.
export function accountLabel(line: StatementLine): string {
  return line.account_name;
}

// A section's heading, lines and total — or nothing at all when the section
// holds nothing, since a statement leaves out what it doesn't have.
export function sectionRows(
  section: StatementSection,
  totalLabel: string,
  options: { less?: boolean; lines?: StatementRow[] } = {},
): StatementRow[] {
  if (section.lines.length === 0) return [];
  const lines =
    options.lines ??
    section.lines.map((line): StatementRow => ({
      key: line.account,
      label: accountLabel(line),
      figure: line.balance_minor,
      kind: "line",
    }));
  return [
    { key: `${section.category}-heading`, label: options.less ? `Less: ${section.label}` : section.label, kind: "heading" },
    ...lines,
    { key: `${section.category}-total`, label: totalLabel, figure: section.total_minor, kind: "total" },
  ];
}

// A negative figure in brackets, the way a statement is read.
function figureText(minor: number): string {
  return minor < 0 ? `(${formatMoney(-minor)})` : formatMoney(minor);
}

const ROW_STYLE: Record<StatementRow["kind"], { label: string; figure: string }> = {
  heading: { label: "pt-5 text-[12px] font-extrabold uppercase tracking-[0.04em] text-ink", figure: "" },
  line: { label: "pl-5", figure: "" },
  less: { label: "pl-5 text-ink-soft", figure: "text-ink-soft" },
  total: { label: "font-bold", figure: "font-bold border-t border-border" },
  result: { label: "font-extrabold", figure: "font-extrabold border-t border-ink" },
  grand: { label: "font-extrabold", figure: "font-extrabold border-t border-ink border-b-[3px] border-b-ink" },
};

export function StatementTable({ rows }: { rows: StatementRow[] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className={`py-1.5 pr-4 ${ROW_STYLE[row.kind].label}`}>{row.label}</td>
            <td className={`w-44 py-1.5 text-right tabular-nums ${ROW_STYLE[row.kind].figure}`}>
              {row.figure === undefined ? "" : figureText(row.figure)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
