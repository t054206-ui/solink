"use client";
import Link from "next/link";
import { useMemo } from "react";
import { CalendarClock, CalendarCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import type { DataMode } from "@/lib/data/mode";
import type { Appointment, MaintenanceCase, SolarSystem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { MAINT_KIND } from "../../_ops/meta";
import { isLocalId, mergeRecords, useLocalAppointments, useLocalMaintenance } from "../../_ops/localRecords";
import { MaintStatusPill } from "../../_ops/Pills";
import { caseForAppointment } from "../_lib/workflow";
import { LocalBadge } from "./ProviderBits";

const APPOINTMENT_KIND_LABEL: Record<Appointment["kind"], string> = {
  installation: "Installation", maintenance: "Maintenance", inspection: "Inspection", cleaning: "Cleaning",
};

function statusTone(status: Appointment["status"]) {
  if (status === "confirmed") return "good" as const;
  if (status === "completed") return "neutral" as const;
  if (status === "cancelled") return "neutral" as const;
  return "warn" as const;
}

export function AppointmentsList({ mode, serverAppointments, serverCases, systems, nowIso }: {
  mode: DataMode;
  serverAppointments: Appointment[];
  serverCases: MaintenanceCase[];
  systems: SolarSystem[];
  /** Request time from the server, used to split upcoming from past. */
  nowIso: string;
}) {
  const [localAppts] = useLocalAppointments();
  const [localCases] = useLocalMaintenance();

  const appointments = useMemo(
    () => (mode === "demo" ? mergeRecords(serverAppointments, localAppts) : serverAppointments),
    [mode, serverAppointments, localAppts],
  );
  const cases = useMemo(
    () => (mode === "demo" ? mergeRecords(serverCases, localCases) : serverCases),
    [mode, serverCases, localCases],
  );

  const upcoming = appointments.filter((a) => a.scheduled_at >= nowIso).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const past = appointments.filter((a) => a.scheduled_at < nowIso).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  if (appointments.length === 0) {
    return (
      <EmptyState title="No appointments booked">
        {mode === "supabase"
          ? "Appointments appear here when a homeowner books your company or you set a date on a case. Row-level security limits this list to your company."
          : "Demo mode has no appointments on file yet. Setting a date on a case records one on this device."}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <Group icon={CalendarClock} title="Upcoming" subtitle={`From ${formatDate(nowIso, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} onwards.`} appointments={upcoming} cases={cases} systems={systems} emptyText="Nothing is booked ahead." />
      <Group icon={CalendarCheck2} title="Past" subtitle="Visits whose scheduled time has passed. The status is whatever was last recorded. It is not inferred." appointments={past} cases={cases} systems={systems} emptyText="No past appointments on record." />
    </div>
  );
}

function Group({ icon: Icon, title, subtitle, appointments, cases, systems, emptyText }: {
  icon: typeof CalendarClock;
  title: string;
  subtitle: string;
  appointments: Appointment[];
  cases: MaintenanceCase[];
  systems: SolarSystem[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Icon className="size-4 text-fg-muted" aria-hidden />{title}<span className="tabular text-[12.5px] font-normal text-fg-muted">{appointments.length}</span></span>} subtitle={subtitle} />
      <CardBody>
        {appointments.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-border-strong bg-inset px-3 py-3 text-[13px] text-fg-muted">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border">
            {appointments.map((a) => {
              const linked = caseForAppointment(cases, a);
              const system = systems.find((s) => s.id === a.system_id) ?? null;
              return (
                <li key={a.id} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="sm:w-52 sm:shrink-0">
                    <div className="text-[13.5px] font-medium text-fg">
                      {formatDate(a.scheduled_at, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">{APPOINTMENT_KIND_LABEL[a.kind]}</Badge>
                      <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                      {isLocalId(a.id) && <LocalBadge />}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-[13px]">
                    <div className="text-fg">{system?.name ?? "System not recorded"}</div>
                    {linked ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <MaintStatusPill status={linked.status} />
                        <span className="text-fg-muted">{MAINT_KIND[linked.kind].label}</span>
                        <Link href={`/provider/cases/${linked.id}`} className="text-[var(--brand-strong)] hover:underline">Open case</Link>
                      </div>
                    ) : (
                      <div className="mt-1 text-fg-muted">No maintenance case is linked to this appointment.</div>
                    )}
                    {a.notes && <p className="mt-1 line-clamp-2 text-[12.5px] text-fg-muted">{a.notes}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
