"use client";

import { useState } from "react";

import { EmployeePicker } from "@/components/employee-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { documentTemplatesApi, generatedDocumentsApi } from "@/lib/api/endpoints";
import { formatDateTime, titleCase } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { DocumentType } from "@/lib/types";

const DOCUMENT_TYPES: DocumentType[] = [
  "offer_letter",
  "confirmation_letter",
  "employment_contract",
  "salary_certificate",
  "other",
];

export default function DocumentGenerationPage() {
  return (
    <div>
      <PageHeader title="Documents" subtitle="Templates and generated HR documents with click-to-sign" />
      <Tabs
        tabs={[
          { id: "templates", label: "Templates", content: <TemplatesTab /> },
          { id: "generate", label: "Generate for Employee", content: <GenerateTab /> },
        ]}
      />
    </div>
  );
}

function TemplatesTab() {
  const templates = useApiResource(() => documentTemplatesApi.list());
  const [creating, setCreating] = useState(false);

  return (
    <Card>
      <CardHeader title="Document Templates" action={<Button onClick={() => setCreating(true)}>New Template</Button>} />
      {templates.loading ? <LoadingState /> : null}
      {templates.error ? <ErrorState message={templates.error} /> : null}
      {templates.data && templates.data.length === 0 ? <EmptyState label="No templates yet." /> : null}
      {templates.data && templates.data.length > 0 ? (
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
            </tr>
          </Thead>
          <tbody>
            {templates.data.map((template) => (
              <tr key={template.id}>
                <Td className="font-bold">{template.name}</Td>
                <Td>
                  <Badge tone="neutral">{titleCase(template.document_type)}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}

      {creating ? (
        <NewTemplateModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            templates.reload();
          }}
        />
      ) : null}
    </Card>
  );
}

function NewTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [documentType, setDocumentType] = useState<DocumentType>("offer_letter");
  const [name, setName] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await documentTemplatesApi.create({ document_type: documentType, name, body_template: bodyTemplate });
      showToast("Template created", "good");
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Document Template" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="documentType">Document Type</Label>
          <Select id="documentType" value={documentType} onChange={(event) => setDocumentType(event.target.value as DocumentType)}>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {titleCase(type)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Standard Offer Letter" required />
        </div>
        <div>
          <Label htmlFor="bodyTemplate">Body Template</Label>
          <Textarea
            id="bodyTemplate"
            value={bodyTemplate}
            onChange={(event) => setBodyTemplate(event.target.value)}
            rows={10}
            placeholder={"Dear {{full_name}},\n\nWe are pleased to offer you the position of {{job_title}}..."}
            required
          />
          <p className="mt-1.5 text-[11px] text-ink-soft">
            Use {"{{placeholder}}"} tokens filled from the employee&apos;s record — unknown placeholders render blank.
          </p>
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Template"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function GenerateTab() {
  const { showToast } = useToast();
  const templates = useApiResource(() => documentTemplatesApi.list());
  const [employeeId, setEmployeeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [generating, setGenerating] = useState(false);
  const documents = useApiResource(
    () => (employeeId ? generatedDocumentsApi.forEmployee(employeeId) : Promise.resolve([])),
    [employeeId],
  );

  async function generate() {
    setGenerating(true);
    try {
      await generatedDocumentsApi.generate(employeeId, { template_id: templateId });
      showToast("Document generated", "good");
      documents.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setGenerating(false);
    }
  }

  async function send(documentId: string) {
    try {
      await generatedDocumentsApi.send(documentId);
      documents.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function downloadPdf(documentId: string) {
    try {
      await generatedDocumentsApi.downloadPdf(documentId, "document.pdf");
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Download failed.", "bad");
    }
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader title="Generate a Document" />
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="employee">Employee</Label>
            <EmployeePicker value={employeeId} onChange={setEmployeeId} />
          </div>
          <div>
            <Label htmlFor="template">Template</Label>
            <Select id="template" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              <option value="">Select a template</option>
              {(templates.data ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={generate} disabled={!employeeId || !templateId || generating}>
            {generating ? "Generating…" : "Generate"}
          </Button>
        </div>
      </Card>

      {employeeId ? (
        <Card>
          <CardHeader title="Generated Documents" />
          {documents.loading ? <LoadingState /> : null}
          {documents.error ? <ErrorState message={documents.error} /> : null}
          {documents.data && documents.data.length === 0 ? (
            <EmptyState label="No documents generated for this employee yet." />
          ) : null}
          {documents.data && documents.data.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th>Signed By</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </Thead>
              <tbody>
                {documents.data.map((doc) => (
                  <tr key={doc.id}>
                    <Td>
                      <Badge tone="neutral">{titleCase(doc.document_type)}</Badge>
                    </Td>
                    <Td>
                      <StatusBadge status={doc.status} />
                    </Td>
                    <Td>{formatDateTime(doc.created_at)}</Td>
                    <Td>{doc.signed_by_name ?? "—"}</Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        {doc.status === "draft" ? (
                          <ConfirmActionButton
                            action={() => send(doc.id)}
                            label="Send for Signature"
                            tone="primary"
                            confirmTitle="Send this document for signature?"
                            confirmMessage="The employee will be able to sign it from their workspace."
                            confirmLabel="Send"
                          />
                        ) : null}
                        <Button size="md" variant="secondary" onClick={() => downloadPdf(doc.id)}>
                          Download PDF
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
