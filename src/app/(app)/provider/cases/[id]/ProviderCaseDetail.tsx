"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Metric } from "@/components/ui/Metric";
import { EmptyState, Skeleton } from "@/components/ui/States";
import type { DataMode } from "@/lib/data/mode";
import type { Appointment, Incident, MaintenanceCase, ProviderCompany, SolarSystem } from "@/lib/types";
import { productionDeviation } from "@/lib/solar/calculations";
import { formatDate } from "@/lib/utils";
import { MAINT_KIND, stageIndexForCase } from "../../../_ops/meta";
import { isLocalId, useLocalMaintenance } from "../../../_ops/localRecords";
import { CostCell, KindBadge, MaintStatusPill, UrgencyBadge } from "../../../_ops/Pills";
import { WorkflowStrip } from "../../../_ops/WorkflowStrip";
import { appointmentForCase, coarseLocation, panelInfo } from "../../_lib/workflow";
import { PrivacyNote } from "../../_components/ProviderBits";
import { WorkRecordForm } from "./WorkRecordForm";

export function ProviderCaseDetail({ id, mode, providerId, providerName, serverCase, systems, providers, appointments, relatedIncidents, governorate, nowIso }: {
  id: string;
  mode: DataMode;
  providerId: string | null;
  providerName: string | null;
  serverCase: MaintenanceCase | null;
  systems: SolarSystem[];
  providers: ProviderCompany[];
  appointments: Appointment[];
  relatedIncidents: Incident[];
  governorate: string | null;
  /** Request time from the server. */
  nowIso: string;
}) {
  const [localCases, setLocalCases, loaded] = useLocalMaintenance();
  const c = useMemo(
    () => (mode === "demo" ? localCases.find((x) => x.id === id) ?? serverCase : serverCase),
    [mode, localCases, id, serverCase],
  );

  if (!c) {
    if (mode === "demo" && !loaded) return <Skeleton className="h-40 w-full" />;
    return (
      <EmptyState title="Case not found">
        This case does not exist or is not assigned to your company.
        {mode === "demo" && " Cases created in demo mode are stored only on the device where they were created."}
      </EmptyState>
    );
  }

  const system = systems.find((s) => s.id === c.system_id) ?? null;
  const assigned = providers.find((p) => p.id === c.provider_id) ?? null;
  const appointment = appointmentForCase(appointments, c);
  const change = productionDeviation(c.production_after_kwh ?? null, c.production_before_kwh ?? null);
  const changeCls = change.value === null ? change : { ...change, cls: c.is_demo ? ("demo" as const) : change.cls };
  const otherCompany = c.provider_id !== null && providerId !== null && c.provider_id !== providerId;

  return (
    <div className="space-y-4">
      {c.is_demo && <DemoBanner detail="A labeled demo case. No real system, homeowner, technician or measurement is described." />}
      {isLocalId(c.id) && (
        <div className="rounded-[10px] border border-border bg-inset px-3 py-2 text-[13px] text-fg-secondary">
          Saved on this device only (Supabase not connected). Clearing browser data removes it.
        </div>
      )}
      {otherCompany && (
        <div className="rounded-[10px] border border-border bg-inset px-3 py-2 text-[13px] text-fg-secondary">
          This case is on record for {assigned?.name ?? "another company"}, not {providerName ?? "your company"}. In Supabase mode row-level security would not show it to you.
        </div>
      )}

      <Card>
        <CardBody className="pt-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <KindBadge kind={c.kind} /><MaintStatusPill status={c.status} /><UrgencyBadge urgency={c.urgency} />
            <span className="ml-auto font-mono text-[11.5px] text-fg-muted">{c.id}</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-fg">{MAINT_KIND[c.kind].label}{system ? ` — ${system.name}` : ""}</h2>
          <p className="mt-1 text-[13px] text-fg-muted">Opened {formatDate(c.created_at)} · last updated {formatDate(c.updated_at)}</p>
          <WorkflowStrip current={stageIndexForCase(c)} className="mt-5" />
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Detected issue" subtitle={MAINT_KIND[c.kind].description} />
          <CardBody className="space-y-4">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-fg">{c.detected_issue}</p>
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-fg-secondary">
                AI analysis {c.ai_analysis && <DataBadge cls={c.ai_analysis_cls ?? "ai"} compact />}
              </div>
              {c.ai_analysis
                ? <p className="rounded-[10px] border border-border bg-inset p-3 text-[13.5px] leading-relaxed text-fg-secondary">{c.ai_analysis}</p>
                : <p className="text-[13px] text-fg-muted">No AI analysis is attached to this case.</p>}
            </div>
            {relatedIncidents.length > 0 && (
              <div>
                <div className="mb-1.5 text-[12.5px] font-medium text-fg-secondary">Related incidents reported on this system</div>
                <ul className="space-y-1 text-[13.5px]">
                  {relatedIncidents.map((i) => (
                    <li key={i.id} className="text-fg-secondary">
                      {formatDate(i.occurred_at)} — {i.reported_problem}
                      {i.panel_index !== null && i.panel_index !== undefined && <> · panel {i.panel_index}</>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Job details" subtitle="Only what the visit needs." />
          <CardBody className="space-y-3">
            <dl className="grid gap-3 text-[13.5px]">
              <Row k="Customer" v={mode === "demo" ? <span className="inline-flex items-center gap-1.5">Demo homeowner <DataBadge cls="demo" compact /></span> : `Homeowner · ref ${c.user_id.slice(0, 8)}`} />
              <Row k="System" v={system?.name ?? "Not recorded"} />
              <Row k="Panels" v={panelInfo(system) ?? <span className="text-fg-muted">Not recorded</span>} />
              <Row k="Location" v={coarseLocation(governorate)} />
              <Row k="Assigned company" v={assigned ? <span className="inline-flex items-center gap-1.5">{assigned.name}{assigned.is_demo && <DataBadge cls="demo" compact />}</span> : "Not assigned"} />
              <Row k="Appointment" v={c.appointment_at ? formatDate(c.appointment_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not booked"} />
              <Row k="Appointment status" v={appointment ? <Badge tone={appointment.status === "confirmed" ? "good" : appointment.status === "cancelled" ? "neutral" : "warn"}>{appointment.status}</Badge> : "—"} />
              <Row k="Recorded cost" v={<CostCell cost={c.cost} />} />
            </dl>
            <PrivacyNote />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Before / after" subtitle="Photos and daily production recorded around the work." />
        <CardBody className="space-y-4">
          {c.is_demo && (c.production_before_kwh !== null || c.production_after_kwh !== null) && (
            <DemoBanner text="DEMO FIGURES — NOT REAL" detail="The before/after values on this demo case are illustrative." />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <ImageSlot label="Before" path={c.before_image_path} />
            <ImageSlot label="After" path={c.after_image_path} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Production before"
              data={c.production_before_kwh === null || c.production_before_kwh === undefined
                ? { value: null, cls: "unavailable", reason: "Not recorded on this case." }
                : { value: c.production_before_kwh, cls: c.is_demo ? "demo" : "source", source: "Daily kWh recorded with the case" }}
              unit="kWh/day" format={(v) => v.toFixed(1)}
            />
            <Metric
              label="Production after"
              data={c.production_after_kwh === null || c.production_after_kwh === undefined
                ? { value: null, cls: "unavailable", reason: "Not recorded on this case." }
                : { value: c.production_after_kwh, cls: c.is_demo ? "demo" : "source", source: "Daily kWh recorded with the case" }}
              unit="kWh/day" format={(v) => v.toFixed(1)}
            />
            <Metric label="Change" data={changeCls} format={(v) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%`} footnote="(after − before) ÷ before" />
          </div>
          <p className="rounded-[10px] border border-dashed border-border-strong bg-inset p-3 text-[13px] leading-relaxed text-fg-secondary">
            This change coincides with the work; it does not prove the work caused it. Weather, season and other events also move daily production.
          </p>
        </CardBody>
      </Card>

      <WorkRecordForm
        key={`${c.id}:${c.updated_at}`}
        c={c}
        mode={mode}
        appointment={appointment}
        setLocalCases={setLocalCases}
        nowIso={nowIso}
      />

      <p className="text-[12.5px] text-fg-muted">
        The homeowner sees the same record on their <Link href={`/maintenance/${c.id}`} className="text-[var(--brand-strong)] hover:underline">maintenance case page</Link>.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><dt className="text-fg-muted">{k}</dt><dd className="mt-0.5 text-fg">{v}</dd></div>;
}

function ImageSlot({ label, path }: { label: string; path: string | null | undefined }) {
  return (
    <figure className="overflow-hidden rounded-[10px] border border-border bg-inset">
      <div className="grid aspect-[4/3] place-items-center text-fg-muted">
        {path ? (
          // Private storage paths and object URLs: next/image cannot optimise these.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={path} alt={`${label} maintenance photo`} className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-[13px]"><ImageOff className="size-5" aria-hidden />No image recorded</div>
        )}
      </div>
      <figcaption className="border-t border-border px-3 py-1.5 text-[12.5px] font-medium text-fg-secondary">{label}</figcaption>
    </figure>
  );
}
