"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  return (
    <div>
      <PageHeader
        title="Learning and Development"
        subtitle="Training course catalogue and enrollments"
        action={<Button onClick={() => setCreating(true)}>New Course</Button>}
      />

      <Card>
        {courses.loading ? <LoadingState /> : null}
        {courses.error ? <ErrorState message={courses.error} /> : null}
        {courses.data && courses.data.length === 0 ? (
          <EmptyState label="No training courses on record yet." />
        ) : null}
        {courses.data && courses.data.length > 0 ? (
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
              {courses.data.map((course) => (
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
