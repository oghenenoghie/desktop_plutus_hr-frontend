"use client";

import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { candidatesApi, departmentsApi, jobPostingsApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { CandidateStatus } from "@/lib/types";

const CANDIDATE_STATUSES: CandidateStatus[] = ["applied", "interviewing", "offered", "hired", "rejected"];

export default function JobPostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const posting = useApiResource(() => jobPostingsApi.get(id), [id]);
  const candidates = useApiResource(() => jobPostingsApi.candidates(id), [id]);
  const departments = useApiResource(() => departmentsApi.list());
  const departmentsById = new Map((departments.data ?? []).map((department) => [department.id, department]));
  const [addingCandidate, setAddingCandidate] = useState(false);

  async function closePosting() {
    try {
      await jobPostingsApi.update(id, {
        status: "closed",
        closed_date: new Date().toISOString().slice(0, 10),
      });
      showToast("Job posting closed", "good");
      posting.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function updateCandidateStatus(candidateId: string, status: CandidateStatus) {
    try {
      await candidatesApi.update(candidateId, { status });
      showToast("Candidate updated", "good");
      candidates.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      {posting.loading ? <LoadingState /> : null}
      {posting.error ? <ErrorState message={posting.error} /> : null}
      {posting.data ? (
        <>
          <PageHeader
            title={posting.data.title}
            subtitle={
              posting.data.department_id
                ? (departmentsById.get(posting.data.department_id)?.name ?? "No department")
                : "No department"
            }
            action={
              posting.data.status === "open" ? (
                <ConfirmActionButton
                  action={closePosting}
                  label="Close Posting"
                  tone="danger"
                  confirmTitle="Close this job posting?"
                  confirmMessage={`"${posting.data.title}" will be marked closed as of today.`}
                  confirmLabel="Close Posting"
                />
              ) : undefined
            }
          />

          <Card className="mb-6">
            <div className="flex items-center gap-3">
              <StatusBadge status={posting.data.status} />
              <span className="text-[12px] text-ink-soft">
                Opened {formatDate(posting.data.opened_date)}
                {posting.data.closed_date ? ` · Closed ${formatDate(posting.data.closed_date)}` : ""}
              </span>
            </div>
            {posting.data.description ? (
              <p className="mt-3 whitespace-pre-wrap text-[13px] text-ink-soft">{posting.data.description}</p>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Candidates" action={<Button onClick={() => setAddingCandidate(true)}>New Candidate</Button>} />
            {candidates.loading ? <LoadingState /> : null}
            {candidates.error ? <ErrorState message={candidates.error} /> : null}
            {candidates.data && candidates.data.length === 0 ? (
              <EmptyState label="No candidates yet." />
            ) : null}
            {candidates.data && candidates.data.length > 0 ? (
              <Table>
                <Thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Contact</Th>
                    <Th>Applied</Th>
                    <Th>Status</Th>
                  </tr>
                </Thead>
                <tbody>
                  {candidates.data.map((candidate) => (
                    <tr key={candidate.id}>
                      <Td className="font-bold">{candidate.full_name}</Td>
                      <Td>{candidate.email ?? candidate.phone ?? "—"}</Td>
                      <Td>{formatDate(candidate.applied_date)}</Td>
                      <Td>
                        <Select
                          value={candidate.status}
                          onChange={(event) =>
                            updateCandidateStatus(candidate.id, event.target.value as CandidateStatus)
                          }
                          className="w-auto"
                        >
                          {CANDIDATE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </Card>

          {addingCandidate ? (
            <NewCandidateModal
              jobPostingId={id}
              onClose={() => setAddingCandidate(false)}
              onAdded={() => {
                setAddingCandidate(false);
                candidates.reload();
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function NewCandidateModal({
  jobPostingId,
  onClose,
  onAdded,
}: {
  jobPostingId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [appliedDate, setAppliedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await jobPostingsApi.addCandidate(jobPostingId, {
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        applied_date: appliedDate,
      });
      showToast("Candidate added", "good");
      onAdded();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Candidate" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="full-name">Full Name</Label>
          <Input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="applied-date">Applied Date</Label>
          <Input
            id="applied-date"
            type="date"
            value={appliedDate}
            onChange={(event) => setAppliedDate(event.target.value)}
            required
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add Candidate"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
