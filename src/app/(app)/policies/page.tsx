"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { policiesApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Policy } from "@/lib/types";

export default function PoliciesPage() {
  const policies = useApiResource(() => policiesApi.list());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);

  return (
    <div>
      <PageHeader
        title="Policies"
        subtitle="Company-wide HR policies, visible to every employee"
        action={<Button onClick={() => setCreating(true)}>New Policy</Button>}
      />

      {policies.loading ? <LoadingState /> : null}
      {policies.error ? <ErrorState message={policies.error} /> : null}
      {policies.data && policies.data.length === 0 ? (
        <Card>
          <EmptyState label="No policies published yet." />
        </Card>
      ) : null}
      {policies.data && policies.data.length > 0 ? (
        <div className="flex flex-col gap-4">
          {policies.data.map((policy) => (
            <Card key={policy.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-extrabold text-ink">{policy.title}</h3>
                    {policy.category ? <Badge>{policy.category}</Badge> : null}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-soft">
                    {policy.effective_date ? `Effective ${formatDate(policy.effective_date)}` : "No effective date set"}
                  </div>
                </div>
                <Button size="md" variant="secondary" onClick={() => setEditing(policy)}>
                  Edit
                </Button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[13px] text-ink-soft">{policy.body}</p>
            </Card>
          ))}
        </div>
      ) : null}

      {creating ? (
        <PolicyModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            policies.reload();
          }}
        />
      ) : null}

      {editing ? (
        <PolicyModal
          policy={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            policies.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function PolicyModal({
  policy,
  onClose,
  onSaved,
}: {
  policy?: Policy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(policy?.title ?? "");
  const [category, setCategory] = useState(policy?.category ?? "");
  const [body, setBody] = useState(policy?.body ?? "");
  const [effectiveDate, setEffectiveDate] = useState(policy?.effective_date ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body_ = {
        title,
        body,
        category: category || null,
        effective_date: effectiveDate || null,
      };
      if (policy) {
        await policiesApi.update(policy.id, body_);
        showToast("Policy updated", "good");
      } else {
        await policiesApi.create(body_);
        showToast("Policy created", "good");
      }
      onSaved();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={policy ? "Edit Policy" : "New Policy"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Leave Policy"
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category ?? ""}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Optional, e.g. HR, Compliance"
          />
        </div>
        <div>
          <Label htmlFor="effective-date">Effective Date</Label>
          <Input
            id="effective-date"
            type="date"
            value={effectiveDate ?? ""}
            onChange={(event) => setEffectiveDate(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="body">Policy Text</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="The full policy text employees will read"
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : policy ? "Save Changes" : "Create Policy"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
