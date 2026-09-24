"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ChevronRight, ClipboardList, Droplets } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { MaintenanceArt } from "@/components/illustrations/Illustrations";
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
      {/* The maintenance path: the same three figures as before, in the order the work happens.
          A step's colour follows its own record: done green, due amber, nothing on file neutral. */}
      <ol aria-label="Maintenance path" className="grid gap-3 sm:grid-cols-3">
        <PathStep n={1} icon={Droplets} label="Clean · last cleaning" value={lastCleaning ? formatDate(lastCleaning) : "Not yet"} sub={lastCleaning ? "From a resolved cleaning case" : "Book one when dust builds up"} tone={lastCleaning ? "good" : "none"} />
        <PathStep n={2} icon={CalendarClock} label="Next appointment" value={nextAppt ? formatDate(nextAppt.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "None scheduled"} sub={nextAppt ? nextAppt.label : "Book one when needed"} tone={nextAppt ? "due" : "none"} />
        <PathStep n={3} icon={ClipboardList} label="Maintain · open cases" value={String(openCount)} sub={`${cases.length} total`} tone={openCount > 0 ? "due" : "good"} last />
      </ol>

      {cases.length === 0 ? (
        // No cases at all: a small, settled status with the booking actions,
        // instead of an empty list with filters (owner, 2026-09-24).
        <Card>
          <CardBody className="grid items-center gap-5 p-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <MaintenanceArt className="mx-auto max-w-[10rem]" />
            <div>
              <p className="micro" style={{ color: "var(--fg-mustard)" }}>Maintenance history</p>
              <p className="mt-1.5 text-[16px] font-semibold text-fg-heading">No maintenance booked yet</p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">Every cleaning, inspection and repair you book is kept here with its full history.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="/maintenance/book?kind=cleaning" size="sm"><Droplets className="size-4" aria-hidden /> Book cleaning</Button>
                <Button href="/maintenance/book?kind=inspection" size="sm" variant="outline"><ClipboardList className="size-4" aria-hidden /> Book inspection</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
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
            <EmptyState title="No cases match these filters" className="py-6">Try another status or type.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id}>
                  <Link href={`/maintenance/${c.id}`} className="-mx-2 flex items-start gap-3 rounded-[10px] px-2 py-3 transition-colors hover:bg-inset focus-visible:bg-inset focus-visible:outline-none">
                    {/* A rail from the case's own status and urgency: done green, open amber, open and urgent red. The pills beside it say the same in words. */}
                    <span aria-hidden="true" className={cn("mt-1 w-1 shrink-0 self-stretch rounded-full", OPEN_MAINT_STATUSES.includes(c.status) ? (c.urgency === "urgent" ? "bg-critical" : "bg-warn") : "bg-good")} />
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
      )}
    </div>
  );
}

const PATH_TONE = {
  good: { dot: "bg-good", value: "var(--good-fg)" },
  due: { dot: "bg-warn", value: "var(--warn-fg)" },
  none: { dot: "bg-border-strong", value: "var(--fg)" },
} as const;

function PathStep({ n, icon: Icon, label, value, sub, tone, last = false }: { n: number; icon: typeof ClipboardList; label: string; value: string; sub: string; tone: keyof typeof PATH_TONE; last?: boolean }) {
  const t = PATH_TONE[tone];
  return (
    <li className="relative">
      <Card className="lift h-full p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[var(--brand-strong)]"><Icon className="size-4" aria-hidden /></span>
          <span className="micro">{label}</span>
          <span className={cn("ms-auto size-2 rounded-full", t.dot)} aria-hidden />
        </div>
        <div className="display mt-3 text-[24px] leading-tight" style={{ color: t.value }}>{value}</div>
        <div className="mt-1 text-[12px] text-fg-muted">{sub}</div>
        <span className="figure absolute end-3 top-3 hidden text-[11px] text-fg-muted" aria-hidden>{n}</span>
      </Card>
      {!last && <span aria-hidden className="absolute -end-3 top-1/2 z-10 hidden h-px w-3 bg-border-strong sm:block" />}
    </li>
  );
}
