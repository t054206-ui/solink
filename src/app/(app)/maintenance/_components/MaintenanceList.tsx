"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ChevronRight, ClipboardList, Droplets } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Select, Label } from "@/components/ui/Form";
import type { DataMode } from "@/lib/data/mode";
import type { Appointment, MaintenanceCase, MaintenanceKind, MaintenanceStatus, ProviderCompany, SolarSystem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MAINT_KIND, MAINT_KIND_ORDER, MAINT_STATUS, MAINT_STATUS_ORDER, OPEN_MAINT_STATUSES } from "../../_ops/meta";
import { mergeRecords, useLocalAppointments, useLocalMaintenance } from "../../_ops/localRecords";
import { KindBadge, MaintStatusPill, UrgencyBadge } from "../../_ops/Pills";

type StatusFilter = MaintenanceStatus | "all" | "open";
type KindFilter = MaintenanceKind | "all";

export function MaintenanceList({ mode, serverCases, serverAppointments, providers, systems, nowIso }: {
  mode: DataMode; serverCases: MaintenanceCase[]; serverAppointments: Appointment[]; providers: ProviderCompany[]; systems: SolarSystem[];
  /** Request time, passed from the server so render is pure and hydration matches. */
  nowIso: string;
}) {
  const [localCases] = useLocalMaintenance();
  const [localAppts] = useLocalAppointments();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");

  const cases = useMemo(() => {
    const merged = mode === "demo" ? mergeRecords(serverCases, localCases) : serverCases;
    return merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [mode, serverCases, localCases]);
  const appointments = useMemo(() => (mode === "demo" ? mergeRecords(serverAppointments, localAppts) : serverAppointments), [mode, serverAppointments, localAppts]);

  const providerName = (id: string | null) => providers.find((p) => p.id === id)?.name ?? (id ? "Provider" : "No provider yet");
  const systemName = (id: string) => systems.find((s) => s.id === id)?.name ?? "System";

  const openCount = cases.filter((c) => OPEN_MAINT_STATUSES.includes(c.status)).length;
  const now = new Date(nowIso).getTime();
  const upcoming = [
    ...appointments.filter((a) => a.status !== "cancelled" && a.status !== "completed").map((a) => ({ at: a.scheduled_at, label: `${a.kind} · ${a.status}` })),
    ...cases.filter((c) => c.appointment_at && OPEN_MAINT_STATUSES.includes(c.status)).map((c) => ({ at: c.appointment_at as string, label: `${MAINT_KIND[c.kind].label} · ${MAINT_STATUS[c.status].label}` })),
  ].filter((x) => new Date(x.at).getTime() >= now).sort((a, b) => a.at.localeCompare(b.at));
  const nextAppt = upcoming[0] ?? null;
  const lastCleaning = cases.filter((c) => c.kind === "cleaning" && (c.status === "resolved" || c.status === "closed") && c.work_performed)
    .map((c) => c.appointment_at ?? c.updated_at).sort().at(-1) ?? null;

  const filtered = cases.filter((c) => (status === "all" ? true : status === "open" ? OPEN_MAINT_STATUSES.includes(c.status) : c.status === status) && (kind === "all" || c.kind === kind));
  const counts = Object.fromEntries(MAINT_STATUS_ORDER.map((s) => [s, cases.filter((c) => c.status === s).length])) as Record<MaintenanceStatus, number>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary icon={ClipboardList} label="Open cases" value={String(openCount)} sub={`${cases.length} total`} />
        <Summary icon={CalendarClock} label="Next appointment" value={nextAppt ? formatDate(nextAppt.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "None scheduled"} sub={nextAppt ? nextAppt.label : "Book one when needed"} />
        <Summary icon={Droplets} label="Last cleaning" value={lastCleaning ? formatDate(lastCleaning) : "No record"} sub={lastCleaning ? "From a resolved cleaning case" : "No completed cleaning case on file"} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-end md:justify-between">
          <div role="tablist" aria-label="Filter by status" className="flex gap-1 overflow-x-auto -mx-1 px-1">
            {([["all", "All"], ["open", "Open"], ...MAINT_STATUS_ORDER.map((s) => [s, MAINT_STATUS[s].label] as const)] as [StatusFilter, string][]).map(([id, label]) => (
              <button key={id} role="tab" type="button" aria-selected={status === id} onClick={() => setStatus(id)}
                className={cn("shrink-0 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors", status === id ? "border-brand bg-brand-soft text-[var(--brand-strong)]" : "border-border text-fg-secondary hover:bg-inset")}>
                {label}{id !== "all" && id !== "open" && <span className="ml-1 tabular text-fg-muted">{counts[id as MaintenanceStatus]}</span>}
              </button>
            ))}
          </div>
          <div className="w-full md:w-56">
            <Label htmlFor="kind-filter" className="mb-1">Type</Label>
            <Select id="kind-filter" value={kind} onChange={(e) => setKind(e.target.value as KindFilter)}>
              <option value="all">All types</option>
              {MAINT_KIND_ORDER.map((k) => <option key={k} value={k}>{MAINT_KIND[k].label}</option>)}
            </Select>
          </div>
        </div>
        <CardBody className="pt-4">
          {filtered.length === 0 ? (
            <EmptyState title={cases.length === 0 ? "No maintenance cases yet" : "No cases match these filters"}>
              {cases.length === 0 ? <>When Solink detects a signal or you book a service, the case appears here with its full history.</> : <>Try another status or type.</>}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id}>
                  <Link href={`/maintenance/${c.id}`} className="-mx-2 flex items-start gap-3 rounded-[10px] px-2 py-3 hover:bg-inset focus-visible:bg-inset focus-visible:outline-none">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <KindBadge kind={c.kind} />
                        <MaintStatusPill status={c.status} />
                        <UrgencyBadge urgency={c.urgency} />
                        {c.is_demo && <DataBadge cls="demo" compact />}
                        {c.id.includes("-local-") && <Badge tone="neutral">Saved on this device</Badge>}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[14px] text-fg">{c.detected_issue}</p>
                      <p className="mt-1 text-[12.5px] text-fg-muted">
                        {systemName(c.system_id)} · {providerName(c.provider_id)} · opened {formatDate(c.created_at)}
                        {c.appointment_at && <> · appointment {formatDate(c.appointment_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</>}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Summary({ icon: Icon, label, value, sub }: { icon: typeof ClipboardList; label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-fg-secondary"><Icon className="size-4 text-fg-muted" aria-hidden />{label}</div>
      <div className="mt-2 text-xl font-semibold leading-tight text-fg">{value}</div>
      <div className="mt-1 text-[12px] text-fg-muted">{sub}</div>
    </Card>
  );
}
