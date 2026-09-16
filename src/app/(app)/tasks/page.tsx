"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Drawer } from "@/components/ui/drawer";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { membershipsApi, tasksApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import { useAuth } from "@/lib/auth/auth-context";
import type { Task, TaskPriority } from "@/lib/types";

const PRIORITY_TONE: Record<TaskPriority, "neutral" | "warn" | "bad"> = {
  low: "neutral",
  medium: "neutral",
  high: "bad",
};

export default function TasksPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const tasks = useApiResource(() => tasksApi.list(scope), [scope]);
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  async function toggleDone(task: Task) {
    try {
      await tasksApi.update(task.id, { status: task.status === "done" ? "todo" : "done" });
      tasks.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  async function remove(task: Task) {
    try {
      await tasksApi.remove(task.id);
      showToast("Task deleted", "good");
      tasks.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    }
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Work items assigned to a person's login — a lightweight to-do list shared across the team"
        action={<Button onClick={() => setCreating(true)}>New Task</Button>}
      />

      <div className="mb-4 flex gap-2">
        <Button variant={scope === "mine" ? "primary" : "secondary"} onClick={() => setScope("mine")}>
          My Tasks
        </Button>
        <Button variant={scope === "all" ? "primary" : "secondary"} onClick={() => setScope("all")}>
          All Tasks
        </Button>
      </div>

      <Card>
        {tasks.loading ? <LoadingState /> : null}
        {tasks.error ? <ErrorState message={tasks.error} /> : null}
        {tasks.data && tasks.data.length === 0 ? (
          <EmptyState label={scope === "mine" ? "No tasks assigned to or created by you." : "No tasks yet."} />
        ) : null}
        {tasks.data && tasks.data.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Title</Th>
                <Th>Assigned To</Th>
                <Th>Priority</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </Thead>
            <tbody>
              {tasks.data.map((task) => (
                <tr key={task.id}>
                  <Td>
                    <div className="font-bold text-ink">{task.title}</div>
                    {task.description ? (
                      <div className="mt-0.5 text-[12px] text-ink-soft">{task.description}</div>
                    ) : null}
                  </Td>
                  <Td>{task.assigned_to_email}</Td>
                  <Td>
                    <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
                  </Td>
                  <Td>{task.due_date ? formatDate(task.due_date) : "—"}</Td>
                  <Td>
                    <StatusBadge status={task.status} />
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-2">
                      {task.status !== "cancelled" &&
                      (task.assigned_to_account_id === user?.account_id ||
                        task.created_by_account_id === user?.account_id) ? (
                        <Button variant="secondary" onClick={() => toggleDone(task)}>
                          {task.status === "done" ? "Reopen" : "Mark Done"}
                        </Button>
                      ) : null}
                      {task.created_by_account_id === user?.account_id ? (
                        <Button variant="ghost" onClick={() => remove(task)}>
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      {creating ? (
        <NewTaskDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            tasks.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function NewTaskDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  // Assigning a task to someone else requires looking up the org's other
  // logins, and /memberships is ADMIN-only server-side — so only an ADMIN
  // gets a picker here. Every other role still gets a personal to-do list
  // (defaults to assigning to themselves), just not delegation.
  const memberships = useApiResource(
    () => (user?.role === "admin" ? membershipsApi.list() : Promise.resolve([])),
    [user?.role],
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await tasksApi.create({
        title,
        description: description || undefined,
        assigned_to_account_id: assignedTo || undefined,
        priority,
        due_date: dueDate || undefined,
      });
      showToast("Task created", "good");
      onCreated();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="New Task" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Follow up on outstanding filing"
            required
          />
        </div>
        <div>
          <Label htmlFor="task-description">Description</Label>
          <Input
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional detail"
          />
        </div>
        {memberships.data && memberships.data.length > 0 ? (
          <div>
            <Label htmlFor="task-assignee">Assign To</Label>
            <Select
              id="task-assignee"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
            >
              <option value="">Myself</option>
              {memberships.data.map((membership) => (
                <option key={membership.id} value={membership.account_id}>
                  {membership.email}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div>
          <Label htmlFor="task-priority">Priority</Label>
          <Select
            id="task-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="task-due-date">Due Date</Label>
          <Input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Task"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
