"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ACCOUNT_CATEGORIES, categoryInfo } from "@/lib/accounting";
import { ApiError } from "@/lib/api/client";
import { chartAccountsApi } from "@/lib/api/endpoints";
import type { AccountCategory, ChartAccount } from "@/lib/types";

// A new account in the chart, numbered in its category's range: the next
// free number is filled in, and can be changed to any free one in range.
// Opened from the chart itself, or from an invoice (sales accounts) or a
// bill (cost of sales and overheads) when the account isn't there yet.
export function AccountCreateModal({
  categories,
  onClose,
  onCreated,
}: {
  categories?: AccountCategory[];
  onClose: () => void;
  onCreated: (account: ChartAccount) => void;
}) {
  const { showToast } = useToast();
  const options = ACCOUNT_CATEGORIES.filter((entry) => !categories || categories.includes(entry.value));
  const [category, setCategory] = useState<AccountCategory>(options[0]!.value);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const info = categoryInfo(category);

  useEffect(() => {
    let cancelled = false;
    chartAccountsApi
      .nextNumber(category)
      .then((next) => {
        if (!cancelled) setNumber(next.account_number);
      })
      .catch(() => {
        if (!cancelled) setNumber("");
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSubmitting(true);
    try {
      const account = await chartAccountsApi.create({
        name,
        type: info.type,
        category,
        account_number: number.trim() || undefined,
      });
      showToast(`Account ${account.account_number} created`, "good");
      onCreated(account);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Account" onClose={onClose} size="sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="new-account-category">Category</Label>
          <Select
            id="new-account-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as AccountCategory)}
          >
            {options.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label} ({entry.from}–{entry.to})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="new-account-number">Account Number</Label>
          <Input
            id="new-account-number"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            inputMode="numeric"
            pattern="[0-9]{4}"
            placeholder={String(info.from)}
          />
          <p className="mt-1 text-[11px] text-ink-soft">
            Any free number from {info.from} to {info.to}. Left blank, the next free one.
          </p>
        </div>
        <div>
          <Label htmlFor="new-account-name">Name</Label>
          <Input
            id="new-account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={info.type === "revenue" ? "e.g. Consulting Fees" : info.type === "expense" ? "e.g. Office Rent" : "e.g. Petty Cash"}
            required
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
