"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { trainingCoursesApi } from "@/lib/api/endpoints";
import { useApiResource } from "@/lib/hooks";

export default function LearningPage() {
  const router = useRouter();
  const courses = useApiResource(() => trainingCoursesApi.list());
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const courseList = courses.data ?? [];
  const providerCount = new Set(
    courseList.map((course) => course.provider?.trim()).filter((provider): provider is string => Boolean(provider)),
  ).size;
  const durationTrackedCount = courseList.filter((course) => course.duration_hours != null).length;
  const filteredCourses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return courseList;
    return courseList.filter((course) =>
      [course.title, course.provider ?? ""].some((value) => value.toLocaleLowerCase().includes(term)),
    );
  }, [courseList, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning and Development"
        subtitle="Manage the training catalogue and monitor employee learning activity"
        action={<Button onClick={() => setCreating(true)}>New Course</Button>}
      />

      <section aria-label="Learning catalogue overview" className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Total courses</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{courseList.length}</p>
          <p className="mt-1 text-[12px] text-ink-soft">Courses in the catalogue</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Providers recorded</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{providerCount}</p>
          <p className="mt-1 text-[12px] text-ink-soft">Distinct named providers</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">Duration recorded</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{durationTrackedCount}</p>
          <p className="mt-1 text-[12px] text-ink-soft">Courses with a defined duration</p>
        </Card>
      </section>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search course title or provider"
              aria-label="Search courses by title or provider"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="whitespace-nowrap text-[12px] font-bold text-ink-soft" aria-live="polite">
              {filteredCourses.length} of {courseList.length} courses
            </span>
            {search ? (
              <Button size="md" variant="ghost" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-[14px] font-extrabold text-ink">Course catalogue</h2>
          <p className="mt-1 text-[12px] text-ink-soft">Open a course to manage enrollments, materials and assessments.</p>
        </div>
        {courses.loading ? <LoadingState /> : null}
        {courses.error ? <ErrorState message={courses.error} /> : null}
        {courses.data && courseList.length === 0 ? (
          <EmptyState label="No training courses on record yet. Add a course to start building your learning catalogue." />
        ) : null}
        {courses.data && courseList.length > 0 && filteredCourses.length === 0 ? (
          <EmptyState label="No courses match your search. Try another title or provider, or clear the search." />
        ) : null}
        {filteredCourses.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Title</Th>
                <Th>Provider</Th>
                <Th align="right">Duration</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {filteredCourses.map((course) => (
                <tr key={course.id}>
                  <Td className="font-bold">{course.title}</Td>
                  <Td>{course.provider ?? "—"}</Td>
                  <Td align="right">
                    {course.duration_hours != null ? `${course.duration_hours}h` : "—"}
                  </Td>
                  <Td align="right">
                    <Button size="md" variant="secondary" onClick={() => router.push(`/learning/${course.id}`)}>
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
        <NewCourseDrawer
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/learning/${id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function NewCourseDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const course = await trainingCoursesApi.create({
        title,
        provider: provider || null,
        duration_hours: durationHours ? Number(durationHours) : null,
        description: description || null,
      });
      showToast("Training course created", "good");
      onCreated(course.id);
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Training Course" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Payroll Compliance 101"
            required
          />
        </div>
        <div>
          <Label htmlFor="provider">Provider</Label>
          <Input
            id="provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="duration">Duration (hours)</Label>
          <Input
            id="duration"
            type="number"
            min={0}
            value={durationHours}
            onChange={(event) => setDurationHours(event.target.value)}
            placeholder="Optional"
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
            {submitting ? "Creating…" : "Create Course"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
