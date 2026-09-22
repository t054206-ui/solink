import { Bell, CalendarClock, TriangleAlert, FileText, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { EmptyState } from "@/components/ui/States";
import { listNotifications } from "@/lib/data/repositories";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import { InfoTip } from "@/components/help/InfoTip";

export const metadata = {
  title: "Notifications",
  description: "Alerts, reminders and updates about your solar system.",
};

const ICON: Record<string, typeof Bell> = {
  alert: TriangleAlert,
  appointment: CalendarClock,
  report: FileText,
  maintenance: Wrench,
};

/** Notification kinds Solink raises, and what each one will need to be delivered. */
const KINDS = [
  "Maintenance and cleaning reminders",
  "System and production alerts",
  "Appointment confirmations and changes",
  "Monthly report ready",
  "Purchase and installation updates",
];

export default async function NotificationsPage() {
  const { data: notifications, mode } = await listNotifications();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Notifications"
        description="Everything Solink has raised about your system, newest first."
        actions={unread > 0 ? <Badge tone="brand">{unread} unread</Badge> : undefined}
      />

      {mode === "demo" && <DemoBanner className="mb-4" detail="These are demo notifications for the demo system." />}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {notifications.length === 0 ? (
            <EmptyState title="Nothing to show yet">
              Alerts, reminders and appointment updates will appear here as your system is monitored
              and maintained.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} />
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={<>Delivery <InfoTip term="notifications_delivery" /></>} subtitle="In-app only for now." />
            <CardBody className="space-y-3">
              <p className="text-[13.5px] leading-relaxed text-fg-secondary">
                Notifications are recorded and shown on this page, but nothing is sent by email, SMS or
                push, because no provider has been chosen. Solink will not claim to have contacted you
                when it has not.
              </p>
              <PlaceholderNote k="EMAIL_NOTIFICATION_PROVIDER" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="What will be sent once a provider is connected" />
            <CardBody>
              <ul className="space-y-2 text-[13px] leading-relaxed text-fg-secondary">
                {KINDS.map((k) => (
                  <li key={k} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand-strong)]" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function NotificationRow({ notification: n }: { notification: Notification }) {
  const Icon = ICON[n.kind] ?? Bell;
  return (
    <li
      className={cn(
        "flex gap-3 rounded-[var(--radius-lg)] border p-4 shadow-sm",
        n.read ? "border-border bg-elevated" : "border-[var(--brand)]/40 bg-brand-soft",
      )}
    >
      <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-[10px]", n.read ? "bg-inset text-fg-muted" : "bg-elevated text-[var(--brand-strong)]")}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[14px] font-semibold text-fg">{n.title}</h2>
          {!n.read && <Badge tone="brand">New</Badge>}
        </div>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-fg-secondary">{n.body}</p>
        <p className="mt-1 text-[12px] text-fg-muted">
          {formatDate(n.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          <span aria-hidden> · </span>
          In-app only
        </p>
      </div>
    </li>
  );
}
