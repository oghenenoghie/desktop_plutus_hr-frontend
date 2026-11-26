"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthGate } from "@/lib/auth/auth-gate";
import type { Role } from "@/lib/types";

// A document laid out for paper (an invoice, a bill, a payroll register),
// outside the app's sidebar and top bar. This page is the document preview;
// printing only starts when the user explicitly chooses Print / Save as PDF.
export function PrintPage({
  title,
  subtitle,
  aside,
  allow,
  loading,
  error,
  ready,
  children,
}: {
  title: string;
  subtitle?: string;
  // Printed under the title, top right: a tax invoice's TIN and number.
  aside?: React.ReactNode;
  allow: Role[];
  loading: boolean;
  error: string | null;
  ready: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthGate allow={allow}>
      <PrintBody title={title} subtitle={subtitle} aside={aside} loading={loading} error={error} ready={ready}>
        {children}
      </PrintBody>
    </AuthGate>
  );
}

function PrintBody({
  title,
  subtitle,
  aside,
  loading,
  error,
  ready,
  children,
}: {
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
  loading: boolean;
  error: string | null;
  ready: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface print:bg-white">
      <div className="mx-auto flex max-w-[900px] items-center justify-between gap-3 px-6 pt-6 print:hidden">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        <div className="flex flex-col items-end gap-1">
          <p className="text-right text-xs text-ink-soft">
            Preview the document below. Printing starts only when you choose this action.
          </p>
          <Button
            onClick={() => {
              window.focus();
              window.print();
            }}
            disabled={!ready}
          >
            Print / Save as PDF
          </Button>
        </div>
      </div>
      <main aria-label="Document preview" className="mx-auto max-w-[900px] px-6 py-8 text-ink print:max-w-none print:px-0 print:py-0">
        <header className="mb-6 flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
          <div>
            <p className="text-[18px] font-extrabold">{user?.org_name ?? ""}</p>
            {subtitle ? <p className="mt-1 text-[12px] text-ink-soft">{subtitle}</p> : null}
          </div>
          <div className="text-right">
            <h1 className="text-[22px] font-extrabold uppercase tracking-[0.04em]">{title}</h1>
            {aside && ready ? <div className="mt-1 text-[12px]">{aside}</div> : null}
          </div>
        </header>
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} /> : null}
        {ready ? children : null}
      </main>
    </div>
  );
}

// Label and figure columns for a printed table: plain borders that survive
// black-and-white printers.
export const printTh = "border-b-2 border-ink px-2 py-2 text-left text-[11px] font-extrabold uppercase";
export const printThRight = `${printTh} text-right`;
export const printTd = "border-b border-border px-2 py-1.5 text-[12px] align-top";
export const printTdRight = `${printTd} text-right tabular-nums`;
