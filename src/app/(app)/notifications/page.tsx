"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { notificationsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";
import type { Notification } from "@/lib/types";

const CAN_BROADCAST = ["admin", "payroll_manager", "accountant"];

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const notifications = useApiResource(() => notificationsApi.mine());

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  async function openNotification(notification: Notification) {
    if (!notification.read_at) {
      try {
        await notificationsApi.markRead(notification.id);
        notifications.reload();
      } catch {
        // best-effort
      }
    }
    if (notification.link) router.push(notification.link);
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      notifications.reload();
    } catch {
      // best-effort
    }
  }

  async function broadcast(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      await notificationsApi.broadcast({
        title,
        body: body || null,
        link: link || null,
      });
      showToast("Broadcast sent to the organisation.", "good");
      setTitle("");
      setBody("");
      setLink("");
      notifications.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Broadcast failed.", "bad");
    } finally {
      setSending(false);
    }
  }

  const unreadCount = (notifications.data ?? []).filter((n) => !n.read_at).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Everything sent to you, in one place"
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {user && CAN_BROADCAST.includes(user.role) ? (
        <Card className="mb-6">
          <CardHeader
            title="Broadcast"
            subtitle="Send a notification to everyone in the organisation"
          />
          <form onSubmit={broadcast} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="broadcast-title">Title</Label>
              <Input
                id="broadcast-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="broadcast-body">Message</Label>
              <Textarea
                id="broadcast-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="broadcast-link">Link (optional)</Label>
              <Input
                id="broadcast-link"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="/payroll"
              />
            </div>
            <div>
              <Button type="submit" disabled={sending}>
                {sending ? "Sending…" : "Send to organisation"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        {notifications.loading ? <LoadingState /> : null}
        {notifications.error ? <ErrorState message={notifications.error} /> : null}
        {notifications.data && notifications.data.length === 0 ? (
          <EmptyState label="No notifications yet." />
        ) : null}
        <div className="flex flex-col">
          {notifications.data?.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => openNotification(notification)}
              className={`flex items-start gap-3 border-b border-border px-1 py-3.5 text-left transition-colors last:border-b-0 hover:bg-bg ${
                notification.read_at ? "" : "bg-primary/5"
              }`}
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  notification.read_at ? "bg-transparent" : "bg-primary"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-bold text-ink">{notification.title}</span>
                  <span className="shrink-0 text-[10.5px] text-ink-soft">
                    {formatDateTime(notification.created_at)}
                  </span>
                </div>
                {notification.body ? (
                  <p className="mt-1 text-[12.5px] text-ink-soft">{notification.body}</p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
