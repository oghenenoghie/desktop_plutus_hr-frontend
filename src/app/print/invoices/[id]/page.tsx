"use client";

import { use } from "react";

import { DocumentFacts, DocumentParties, organisationParty } from "@/components/print/document-parties";
import { PrintPage, printTd, printTdRight, printTh, printThRight } from "@/components/print/print-page";
import { accountLabel } from "@/lib/accounting";
import { chartAccountsApi, customersApi, invoicesApi, organisationApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

// One customer invoice laid out to print, from the figures stored on it.
export default function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const invoice = useApiResource(() => invoicesApi.get(id), [id]);
  const customers = useApiResource(() => customersApi.list());
  const organisation = useApiResource(() => organisationApi.get());
  const accounts = useApiResource(() => chartAccountsApi.list());
  const data = invoice.data;
  const customer = (customers.data ?? []).find((entry) => entry.id === data?.customer_id);
  const account = (accounts.data ?? []).find((entry) => entry.code === data?.revenue_account_code);

  return (
    <PrintPage
      title="Invoice"
      subtitle={data ? `Invoice ${data.invoice_number}` : undefined}
      aside={
        data ? (
          <dl className="grid grid-cols-[auto_auto] justify-end gap-x-3 gap-y-0.5">
            <dt className="font-bold">TIN</dt>
            <dd className={organisation.data?.company_tin ? "" : "text-bad"}>
              {organisation.data?.company_tin ?? "Not set"}
            </dd>
            {organisation.data?.rc_number ? (
              <>
                <dt className="font-bold">RC number</dt>
                <dd>{organisation.data.rc_number}</dd>
              </>
            ) : null}
            <dt className="font-bold">Invoice no.</dt>
            <dd>{data.invoice_number}</dd>
            <dt className="font-bold">Issue date</dt>
            <dd>{formatDate(data.issue_date)}</dd>
          </dl>
        ) : null
      }
      allow={["admin", "payroll_manager", "accountant", "auditor"]}
      loading={invoice.loading || customers.loading || organisation.loading}
      error={invoice.error ?? customers.error ?? organisation.error}
      ready={Boolean(data && customers.data && organisation.data)}
    >
      {data ? (
        <>
          <DocumentParties
            fromLabel="From"
            from={{ ...organisationParty(organisation.data), tin: null }}
            toLabel="Bill to"
            to={{ name: customer?.name ?? "—", address: customer?.address ?? null, tin: customer?.tin ?? null }}
          />
          <DocumentFacts
            facts={[
              ["Invoice number", data.invoice_number],
              ["Issue date", formatDate(data.issue_date)],
              ["Due date", formatDate(data.due_date)],
              ["Status", titleCase(data.status)],
            ]}
          />
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={printTh}>Description</th>
                <th className={printTh}>Account</th>
                <th className={printThRight}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={printTd}>{data.description || "Goods and services"}</td>
                <td className={printTd}>{account ? accountLabel(account) : data.revenue_account_code}</td>
                <td className={printTdRight}>{formatMoney(data.amount_minor)}</td>
              </tr>
              <tr>
                <td className={printTd} colSpan={2}>
                  Subtotal (before VAT)
                </td>
                <td className={printTdRight}>{formatMoney(data.amount_minor)}</td>
              </tr>
              <tr>
                <td className={printTd} colSpan={2}>
                  {data.vat_rate_name ?? "VAT"}
                </td>
                <td className={printTdRight}>{formatMoney(data.vat_minor ?? 0)}</td>
              </tr>
              <tr className="font-extrabold">
                <td className={printTd} colSpan={2}>
                  Total due
                </td>
                <td className={printTdRight}>{formatMoney(data.total_minor ?? data.amount_minor)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-6 text-[11px] text-ink-soft">
            Please pay by {formatDate(data.due_date)}, quoting invoice {data.invoice_number}.
          </p>
        </>
      ) : null}
    </PrintPage>
  );
}
