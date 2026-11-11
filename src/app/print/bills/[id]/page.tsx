"use client";

import { use } from "react";

import { DocumentFacts, DocumentParties, organisationParty } from "@/components/print/document-parties";
import { PrintPage, printTd, printTdRight, printTh, printThRight } from "@/components/print/print-page";
import { accountLabel } from "@/lib/accounting";
import { billsApi, chartAccountsApi, organisationApi, vendorsApi } from "@/lib/api/endpoints";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

// What each status means for the books, printed so the copy on file says it.
const IN_THE_BOOKS: Record<string, string> = {
  draft: "Not yet in the books: approving it posts the expense and the amount payable.",
  approved: "In the books: the expense is in the profit and loss account and the amount is in accounts payable.",
  paid: "In the books and paid: accounts payable has been cleared against Cash and Bank.",
  void: "Void: nothing from this bill is in the books.",
};

// One vendor bill laid out to print, from the figures stored on it.
export default function PrintBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const bill = useApiResource(() => billsApi.get(id), [id]);
  const vendors = useApiResource(() => vendorsApi.list());
  const organisation = useApiResource(() => organisationApi.get());
  const accounts = useApiResource(() => chartAccountsApi.list());
  const data = bill.data;
  const vendor = (vendors.data ?? []).find((entry) => entry.id === data?.vendor_id);
  const account = (accounts.data ?? []).find((entry) => entry.code === data?.expense_account_code);

  return (
    <PrintPage
      title="Vendor Bill"
      subtitle={data ? `Bill ${data.bill_number}` : undefined}
      allow={["admin", "payroll_manager", "accountant", "auditor"]}
      loading={bill.loading || vendors.loading || organisation.loading}
      error={bill.error ?? vendors.error ?? organisation.error}
      ready={Boolean(data && vendors.data && organisation.data)}
    >
      {data ? (
        <>
          <DocumentParties
            fromLabel="Vendor"
            from={{ name: vendor?.name ?? "—", address: vendor?.address ?? null, tin: vendor?.tin ?? null }}
            toLabel="Billed to"
            to={organisationParty(organisation.data)}
          />
          <DocumentFacts
            facts={[
              ["Vendor's bill number", data.bill_number],
              ["Bill date", formatDate(data.bill_date)],
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
                <td className={printTd}>{account ? accountLabel(account) : data.expense_account_code}</td>
                <td className={printTdRight}>{formatMoney(data.amount_minor)}</td>
              </tr>
              {data.vat_minor > 0 ? (
                <tr>
                  <td className={printTd} colSpan={2}>
                    VAT
                  </td>
                  <td className={printTdRight}>{formatMoney(data.vat_minor)}</td>
                </tr>
              ) : null}
              {data.wht_amount_minor > 0 ? (
                <tr>
                  <td className={printTd} colSpan={2}>
                    Less: withholding tax{data.wht_category ? ` (${data.wht_category})` : ""}
                  </td>
                  <td className={printTdRight}>({formatMoney(data.wht_amount_minor)})</td>
                </tr>
              ) : null}
              <tr className="font-extrabold">
                <td className={printTd} colSpan={2}>
                  Net payable
                </td>
                <td className={printTdRight}>{formatMoney(data.net_payable_minor)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-6 text-[11px] text-ink-soft">{IN_THE_BOOKS[data.status] ?? ""}</p>
        </>
      ) : null}
    </PrintPage>
  );
}
