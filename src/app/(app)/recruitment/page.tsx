"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { departmentsApi, jobPostingsApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

type PostingFilter = "all" | "open" | "closed";

export default function RecruitmentPage() {
  const router = useRouter();
  const jobPostings = useApiResource(() => jobPostingsApi.list());
  const departments = useApiResource(() => departmentsApi.list());
  const departmentsById = new Map((departments.data ?? []).map((department) => [department.id, department]));
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostingFilter>("all");

  const postings = jobPostings.data ?? [];
  const openCount = postings.filter((posting) => posting.status === "open").length;
  const closedCount = postings.filter((posting) => posting.status === "closed").length;
  const filteredPostings = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return postings.filter((posting) => {
      const departmentName = posting.department_id
        ? departmentsById.get(posting.department_id)?.name ?? ""
        : "";
      const matchesSearch =
        !term ||
        posting.title.toLocaleLowerCase().includes(term) ||
        departmentName.toLocaleLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || posting.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [postings, departmentsById, search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        subtitle="Manage vacancies and move candidates through your hiring pipeline"
        action={<Button onClick={() => setCreating(true)}>New Job Posting</Button>}
      />

      <section aria-label="Recruitment overview" className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Total postings</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{postings.length}</p>
          <p className="mt-1 text-[12px] text-ink-soft">All recorded vacancies</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Open postings</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{openCount}</p>
          <p className="mt-1 text-[12px] text-ink-soft">Currently accepting candidates</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Closed postings</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{closedCount}</p>
          <p className="mt-1 text-[12px] text-ink-soft">No longer accepting candidates</p>
        </Card>
      </section>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search job title or department"
              aria-label="Search job postings by title or department"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as PostingFilter)}
              aria-label="Filter job postings by status"
              className="w-full sm:w-44"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
            <span className="whitespace-nowrap text-[12px] font-bold text-ink-soft" aria-live="polite">
              {filteredPostings.length} of {postings.length} postings
            </span>
            {search || statusFilter !== "all" ? (
              <Button
                size="md"
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-extrabold text-ink">Job postings</h2>
            <p className="mt-1 text-[12px] text-ink-soft">Select a vacancy to review its candidates and hiring status.</p>
          </div>
        </div>
        {jobPostings.loading ? <LoadingState /> : null}
        {jobPostings.error ? <ErrorState message={jobPostings.error} /> : null}
        {jobPostings.data && postings.length === 0 ? (
          <EmptyState label="No job postings on record yet. Create a posting to start building your candidate pipeline." />
        ) : null}
        {jobPostings.data && postings.length > 0 && filteredPostings.length === 0 ? (
          <EmptyState label="No job postings match these filters. Try a different search or clear the filters." />
        ) : null}
        {filteredPostings.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Title</Th>
                <Th>Department</Th>
                <Th>Status</Th>
                <Th>Opened</Th>
                <Th>Closed</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {filteredPostings.map((posting) => (
                <tr key={posting.id}>
                  <Td className="font-bold">{posting.title}</Td>
                  <Td>
                    {posting.department_id
                      ? (departmentsById.get(posting.department_id)?.name ?? "—")
                      : "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={posting.status} />
                  </Td>
                  <Td>{formatDate(posting.opened_date)}</Td>
                  <Td>{posting.closed_date ? formatDate(posting.closed_date) : "—"}</Td>
                  <Td align="right">
                    <Button size="md" variant="secondary" onClick={() => router.push(`/recruitment/${posting.id}`)}>
                      View
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewJobPostingDrawer
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/recruitment/${id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function NewJobPostingDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { showToast } = useToast();
  const departments = useApiResource(() => departmentsApi.list());
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [openedDate, setOpenedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const posting = await jobPostingsApi.create({
        title,
        department_id: departmentId || null,
        description: description || null,
        opened_date: openedDate,
      });
      showToast("Job posting created", "good");
      onCreated(posting.id);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Job Posting" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Backend Engineer"
            required
          />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Select id="department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
            <option value="">Not specified</option>
            {(departments.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="opened-date">Opened Date</Label>
          <Input
            id="opened-date"
            type="date"
            value={openedDate}
            onChange={(event) => setOpenedDate(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Job Posting"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
