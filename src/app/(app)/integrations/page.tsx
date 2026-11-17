"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { apiKeysApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { ApiKeyCreated } from "@/lib/types";

export default function IntegrationsPage() {
  const keys = useApiResource(() => apiKeysApi.list());
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<ApiKeyCreated | null>(null);

  async function revoke(id: string) {
    await apiKeysApi.revoke(id);
    keys.reload();
  }

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="API keys for external systems to access this org's data"
        action={<Button onClick={() => setCreating(true)}>New API Key</Button>}
      />

      <Card>
        {keys.loading ? <LoadingState /> : null}
        {keys.error ? <ErrorState message={keys.error} /> : null}
        {keys.data && keys.data.length === 0 ? (
          <EmptyState label="No API keys have been created yet." />
        ) : null}
        {keys.data && keys.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Key</Th>
                <Th>Created</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {keys.data.map((key) => (
                <tr key={key.id}>
                  <Td className="font-bold">{key.name}</Td>
                  <Td>
                    <code className="text-[12px] text-ink-soft">{key.key_prefix}…</code>
                  </Td>
                  <Td>{formatDate(key.created_at)}</Td>
                  <Td>
                    <Badge tone={key.revoked_at ? "neutral" : "good"}>
                      {key.revoked_at ? "revoked" : "active"}
                    </Badge>
                  </Td>
                  <Td align="right">
                    {!key.revoked_at ? (
                      <ConfirmActionButton
                        action={() => revoke(key.id)}
                        label="Revoke"
                        tone="danger"
                        confirmTitle="Revoke this API key?"
                        confirmMessage={`Any system using "${key.name}" will immediately lose access. This can't be undone.`}
                        confirmLabel="Revoke"
                      />
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewApiKeyModal
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setCreating(false);
            setRevealed(created);
            keys.reload();
          }}
        />
      ) : null}

      {revealed ? <RevealKeyModal apiKey={revealed} onClose={() => setRevealed(null)} /> : null}
    </div>
  );
}

function NewApiKeyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (created: ApiKeyCreated) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await apiKeysApi.create({ name });
      onCreated(created);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New API Key" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Zapier integration"
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Key"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RevealKeyModal({ apiKey, onClose }: { apiKey: ApiKeyCreated; onClose: () => void }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(apiKey.key);
      setCopied(true);
      showToast("Copied to clipboard", "good");
    } catch {
      showToast("Couldn't copy — select and copy manually.", "bad");
    }
  }

  return (
    <Modal title="API Key Created" onClose={onClose}>
      <div className="flex flex-1 flex-col gap-4">
        <Card>
          <p className="text-[12px] font-bold text-bad">
            This key is shown only once. Copy it now — it can&apos;t be retrieved again.
          </p>
          <div className="mt-3 break-all rounded-panel border border-border bg-bg px-3 py-2.5 font-mono text-[12px]">
            {apiKey.key}
          </div>
        </Card>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Button type="button" onClick={copyKey}>
            {copied ? "Copied ✓" : "Copy Key"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
