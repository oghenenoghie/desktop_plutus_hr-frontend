import type { Payslip, PayslipStatutoryLine, StatutoryAmount, StatutoryLineKind } from "@/lib/types";

// A payslip from the country rule engine (every country but Nigeria) keeps
// its statutory figures as lines; a Nigerian payslip keeps them in its own
// pension, NHF and PAYE fields.
export function isEnginePayslip(slip: Pick<Payslip, "statutory_lines" | "derivation">): boolean {
  return (slip.statutory_lines?.length ?? 0) > 0 || Boolean(slip.derivation && "engine" in slip.derivation);
}

// What came out of the employee's pay: their contributions and income tax.
export function employeeLines<T extends PayslipStatutoryLine | StatutoryAmount>(lines: T[] | undefined): T[] {
  return (lines ?? []).filter((line) => line.kind !== "employer_contribution");
}

// What the employer paid on top of gross pay.
export function employerLines<T extends PayslipStatutoryLine | StatutoryAmount>(lines: T[] | undefined): T[] {
  return (lines ?? []).filter((line) => line.kind === "employer_contribution");
}

export function sumLines(lines: { amount_minor: number }[]): number {
  return lines.reduce((total, line) => total + line.amount_minor, 0);
}

export const LINE_KIND_LABELS: Record<StatutoryLineKind, string> = {
  employee_contribution: "Employee contribution",
  employer_contribution: "Employer contribution",
  income_tax: "Income tax",
};

export interface LineColumn {
  code: string;
  name: string;
  kind: StatutoryLineKind;
}

// One column per line code across a report's rows, in the order the engine
// first calculates them.
export function lineColumns(lineSets: (StatutoryAmount[] | undefined)[]): LineColumn[] {
  const columns = new Map<string, LineColumn>();
  for (const lines of lineSets) {
    for (const line of lines ?? []) {
      if (!columns.has(line.code)) columns.set(line.code, { code: line.code, name: line.name, kind: line.kind });
    }
  }
  return [...columns.values()];
}

export function amountFor(lines: StatutoryAmount[] | undefined, code: string): number {
  return sumLines((lines ?? []).filter((line) => line.code === code));
}
