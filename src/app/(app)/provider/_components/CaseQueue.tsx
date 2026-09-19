"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, HeartPulse, Images, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Label, Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import type { DataMode } from "@/lib/data/mode";
import type { Appointment, MaintenanceCase, MaintenanceKind, MaintenanceStatus, ProviderCompany, SolarSystem, Urgency } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { MAINT_KIND, MAINT_KIND_ORDER, MAINT_STATUS, MAINT_STATUS_ORDER, OPEN_MAINT_STATUSES, URGENCY } from "../../_ops/meta";
import { mergeRecords, isLocalId, useLocalAppointments, useLocalMaintenance } from "../../_ops/localRecords";
import { KindBadge, MaintStatusPill, UrgencyBadge } from "../../_ops/Pills";
import { appointmentForCase, caseImageCount, coarseLocation, isoDay, panelInfo } from "../_lib/workflow";
import { Fact, LocalBadge, PrivacyNote, StatTile } from "./ProviderBits";

type StatusFilter = MaintenanceStatus | "all" | "open";
type KindFilter = MaintenanceKind | "all";

/** Urgency groups, most urgent first. Routine work is kept visible rather than hidden. */
const URGENCY_ORDER: Urgency[] = ["urgent", "inspection", "routine"];

export function CaseQueue({ mode, providerId, serverCases, serverAppointments, providers, systems, governorateBySystem, nowIso }: {
  mode: DataMode;
  providerId: string | null;
  serverCases: MaintenanceCase[];
  serverAppointments: Appointment[];
  providers: ProviderCompany[];
  systems: SolarSystem[];
  /** Coarse location per system; null when the homeowner has not shared a governorate. */
  governorateBySystem: Record<string, string | null>;
  /** Request time from the server, so this component renders purely. */
  nowIso: string;
}) {
  const [localCases] = useLocalMaintenance();
  const [localAppts] = useLocalAppointments();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");

  const cases = useMemo(() => {
    const merged = mode === "demo" ? mergeRecords(serverCases, localCases) : serverCases;
    return [...merged].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [mode, serverCases, localCases]);
  const appointments = useMemo(
    () => (mode === "demo" ? mergeRecords(serverAppointments, localAppts) : serverAppointments),
    [mode, serverAppointments, localAppts],
  );

  const openCases = cases.filter((c) => OPEN_MAINT_STATUSES.includes(c.status));
  const systemsWithOpenCase = new Set(openCases.map((c) => c.system_id));
  const healthySystems = systems.filter((s) => !systemsWithOpenCase.has(s.id));

  const today = isoDay(nowIso);
  const casesToday = openCases.filter((c) => isoDay(c.appointment_at) === today);
  const apptsToday = appointments.filter((a) => a.status !== "cancelled" && isoDay(a.scheduled_at) === today && !casesToday.some((c) => a.notes?.includes(c.id)));
  const scheduledToday = casesToday.length + apptsToday.length;
  const urgentOpen = openCases.filter((c) => c.urgency === "urgent").length;
  const unassigned = openCases.filter((c) => c.provider_id === null).length;

  const filtered = cases.filter(
    (c) => (status === "all" ? true : status === "open" ? OPEN_MAINT_STATUSES.includes(c.status) : c.status === status) && (kind === "all" || c.kind === kind),
  );
  const counts = Object.fromEntries(MAINT_STATUS_ORDER.map((s) => [s, cases.filter((c) => c.status === s).length])) as Record<MaintenanceStatus, number>;

  const historyCount = (systemId: string) => cases.filter((c) => c.system_id === systemId).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Urgent open cases" value={String(urgentOpen)} sub={`${openCases.length} open of ${cases.length} cases`} />
        <StatTile label="Scheduled today" value={String(scheduledToday)} sub={`Appointments dated ${formatDate(nowIso)}`} />
        <StatTile label="Unassigned" value={String(unassigned)} sub="Open cases with no provider on the record" />
      </div>

      <PrivacyNote />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-end md:justify-between">
          <div role="tablist" aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {([["all", "All"], ["open", "Open"], ...MAINT_STATUS_ORDER.map((s) => [s, MAINT_STATUS[s].label] as const)] as [StatusFilter, string][]).map(([id, label]) => (
              <button key={id} role="tab" type="button" aria-selected={status === id} onClick={() => setStatus(id)}
                className={cn("shrink-0 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors", status === id ? "border-brand bg-brand-soft text-[var(--brand-strong)]" : "border-border text-fg-secondary hover:bg-inset")}>
                {label}{id !== "all" && id !== "open" && <span className="tabular ml-1 text-fg-muted">{counts[id as MaintenanceStatus]}</span>}
              </button>
            ))}
          </div>
          <div className="w-full md:w-56">
            <Label htmlFor="provider-kind-filter" className="mb-1">Service type</Label>
            <Select id="provider-kind-filter" value={kind} onChange={(e) => setKind(e.target.value as KindFilter)}>
              <option value="all">All types</option>
              {MAINT_KIND_ORDER.map((k) => <option key={k} value={k}>{MAINT_KIND[k].label}</option>)}
            </Select>
          </div>
        </div>

        <CardBody className="space-y-6 pt-5">
          {URGENCY_ORDER.map((u) => {
            const group = filtered.filter((c) => c.urgency === u);
            return (
              <section key={u} aria-labelledby={`group-${u}`}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 id={`group-${u}`} className="text-[15px] font-semibold text-fg">{URGENCY[u].label}</h2>
                  <UrgencyBadge urgency={u} />
                  <span className="tabular text-[12.5px] text-fg-muted">{group.length}</span>
                </div>
                <p className="mb-3 text-[12.5px] text-fg-muted">{URGENCY[u].description}</p>
                {group.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-border-strong bg-inset px-3 py-3 text-[13px] text-fg-muted">No cases in this group with the current filters.</p>
                ) : (
                  <ul className="grid gap-3 lg:grid-cols-2">
                    {group.map((c) => (
                      <CaseCard
                        key={c.id}
                        c={c}
                        mode={mode}
                        providerId={providerId}
                        system={systems.find((s) => s.id === c.system_id) ?? null}
                        providerName={providers.find((p) => p.id === c.provider_id)?.name ?? null}
                        appointment={appointmentForCase(appointments, c)}
                        historyCount={historyCount(c.system_id)}
                        governorate={governorateBySystem[c.system_id] ?? null}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <section aria-labelledby="group-healthy">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 id="group-healthy" className="text-[15px] font-semibold text-fg">Healthy</h2>
              <Badge tone="good" icon={<HeartPulse className="size-3" aria-hidden />}>No open case</Badge>
              <span className="tabular text-[12.5px] text-fg-muted">{healthySystems.length}</span>
            </div>
            <p className="mb-3 text-[12.5px] text-fg-muted">Systems with no case in New, Reviewing, Scheduled or In progress. Nothing is being claimed about their condition. Only that no case is open.</p>
            {healthySystems.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-border-strong bg-inset px-3 py-3 text-[13px] text-fg-muted">Every system you can see has an open case.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {healthySystems.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-inset px-3 py-2 text-[13px]">
                    <span className="font-medium text-fg">{s.name}</span>
                    {s.is_demo && <DataBadge cls="demo" compact />}
                    <span className="text-fg-muted">{panelInfo(s) ?? "Panel details not recorded"}</span>
                    <span className="ml-auto text-[12px] text-fg-muted">{historyCount(s.id)} past cases</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {cases.length === 0 && (
            <EmptyState title="No cases assigned yet">
              {mode === "supabase"
                ? "Cases appear here as soon as a homeowner books your company or an administrator assigns one. Row-level security limits this list to your company."
                : "Demo mode has no cases on file. Anything booked on this device appears here."}
            </EmptyState>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function CaseCard({ c, mode, providerId, system, providerName, appointment, historyCount, governorate }: {
  c: MaintenanceCase;
  mode: DataMode;
  providerId: string | null;
  system: SolarSystem | null;
  providerName: string | null;
  appointment: Appointment | null;
  historyCount: number;
  governorate: string | null;
}) {
  const images = caseImageCount(c);
  const panels = panelInfo(system);
  const otherCompany = c.provider_id !== null && providerId !== null && c.provider_id !== providerId;
  const when = c.appointment_at ?? appointment?.scheduled_at ?? null;

  return (
    <li>
      <Link href={`/provider/cases/${c.id}`} className="flex h-full items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-elevated p-4 shadow-sm transition-colors hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-none">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <KindBadge kind={c.kind} />
            <MaintStatusPill status={c.status} />
            <UrgencyBadge urgency={c.urgency} />
            {c.is_demo && <DataBadge cls="demo" compact />}
            {isLocalId(c.id) && <LocalBadge />}
            {otherCompany && <Badge tone="neutral">Assigned to {providerName ?? "another company"}</Badge>}
          </div>

          <h3 className="mt-2 text-[14.5px] font-semibold leading-snug text-fg">{system?.name ?? "System"}</h3>
          <p className="mt-0.5 text-[12.5px] text-fg-muted">
            {mode === "demo" ? "Demo homeowner" : `Homeowner · ref ${c.user_id.slice(0, 8)}`}
          </p>

          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-fg">{c.detected_issue}</p>

          {c.ai_analysis && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-fg-muted">
              <DataBadge cls={c.ai_analysis_cls ?? "ai"} compact />
              <span className="truncate">AI analysis attached: check it against what you find.</span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
            {panels && <Fact k="Panels">{panels}</Fact>}
            <Fact k="Location">{coarseLocation(governorate)}</Fact>
            <Fact k="History">{historyCount === 1 ? "first case on this system" : `${historyCount} cases on this system`}</Fact>
            <span className="inline-flex items-center gap-1 text-fg-secondary">
              <Images className="size-3.5 text-fg-muted" aria-hidden />
              {images === 0 ? "No photos" : images === 1 ? "1 photo" : `${images} photos`}
            </span>
            <Fact k="Appointment">
              {when ? formatDate(when, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not booked"}
              {appointment && ` · ${appointment.status}`}
            </Fact>
            <Fact k="Opened">{formatDate(c.created_at)}</Fact>
          </div>

          <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--brand-strong)]">
            <Wrench className="size-3.5" aria-hidden /> Open work record
          </span>
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
      </Link>
    </li>
  );
}
