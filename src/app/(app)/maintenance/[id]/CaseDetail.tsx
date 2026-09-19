"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Ban, ImageOff, Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Field, Textarea } from "@/components/ui/Form";
import { Metric } from "@/components/ui/Metric";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/States";
import type { DataMode } from "@/lib/data/mode";
import type { Appointment, Incident, MaintenanceCase, MaintenanceStatus, ProviderCompany, SolarSystem } from "@/lib/types";
import { productionDeviation } from "@/lib/solar/calculations";
import { cn, formatDate } from "@/lib/utils";
import { MAINT_KIND, MAINT_STATUS, MAINT_STATUS_ORDER, stageIndexForCase } from "../../_ops/meta";
import { isLocalId, upsertRecord, useLocalMaintenance } from "../../_ops/localRecords";
import { CostCell, KindBadge, MaintStatusPill, UrgencyBadge } from "../../_ops/Pills";
import { WorkflowStrip } from "../../_ops/WorkflowStrip";
import { addMaintenanceNote, cancelMaintenanceCase } from "../actions";

const CANCELLABLE: MaintenanceStatus[] = ["new", "reviewing", "scheduled"];

export function CaseDetail({ id, mode, serverCase, providers, systems, appointments, relatedIncidents }: {
  id: string; mode: DataMode; serverCase: MaintenanceCase | null; providers: ProviderCompany[]; systems: SolarSystem[]; appointments: Appointment[]; relatedIncidents: Incident[];
}) {
  const router = useRouter();
  const [localCases, setLocalCases, loaded] = useLocalMaintenance();
  const c = useMemo(() => (mode === "demo" ? localCases.find((x) => x.id === id) ?? serverCase : serverCase), [mode, localCases, id, serverCase]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"note" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!c) {
    if (mode === "demo" && !loaded) return <Skeleton className="h-40 w-full" />;
    return <EmptyState title="Case not found">This case does not exist or belongs to another account.{mode === "demo" && " Cases created in demo mode are stored only on the device where they were created."}</EmptyState>;
  }

  const provider = providers.find((p) => p.id === c.provider_id) ?? null;
  const system = systems.find((s) => s.id === c.system_id) ?? null;
  const appointment = appointments.find((a) => a.notes?.includes(c.id)) ?? appointments.find((a) => a.system_id === c.system_id && a.scheduled_at === c.appointment_at) ?? null;
  const change = productionDeviation(c.production_after_kwh ?? null, c.production_before_kwh ?? null);
  const changeCls = change.value === null ? change : { ...change, cls: c.is_demo ? ("demo" as const) : change.cls };
  const canCancel = CANCELLABLE.includes(c.status);

  function persistLocal(next: MaintenanceCase) { setLocalCases((prev) => upsertRecord(prev, next)); }

  async function submitNote() {
    if (!c || note.trim().length === 0) return;
    setBusy("note"); setError(null);
    const res = await addMaintenanceNote({ id: c.id, note: note.trim() });
    if (res.ok) { setNote(""); router.refresh(); setBusy(null); return; }
    if (res.reason !== "demo") { setError(res.message); setBusy(null); return; }
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    persistLocal({ ...c, notes: `${c.notes ? `${c.notes}\n` : ""}[${stamp}] ${note.trim()}`, updated_at: new Date().toISOString() });
    setNote(""); setBusy(null);
  }

  async function cancel() {
    if (!c || !window.confirm("Cancel this maintenance request? The case is closed and the appointment request is withdrawn.")) return;
    setBusy("cancel"); setError(null);
    const res = await cancelMaintenanceCase({ id: c.id });
    if (res.ok) { router.refresh(); setBusy(null); return; }
    if (res.reason !== "demo") { setError(res.message); setBusy(null); return; }
    const now = new Date().toISOString();
    persistLocal({ ...c, status: "closed", notes: `${c.notes ? `${c.notes}\n` : ""}[${now.slice(0, 16).replace("T", " ")}] Cancelled by homeowner.`, updated_at: now });
    setBusy(null);
  }

  const reachedIdx = MAINT_STATUS_ORDER.indexOf(c.status);

  return (
    <div className="space-y-4">
      {c.is_demo && <DemoBanner detail="This is a labeled demo case. No real system, technician or measurement is described." />}
      {isLocalId(c.id) && <div className="rounded-[10px] border border-border bg-inset px-3 py-2 text-[13px] text-fg-secondary">Saved on this device only (Supabase not connected). Clearing browser data removes it.</div>}

      <Card>
        <CardBody className="pt-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <KindBadge kind={c.kind} /><MaintStatusPill status={c.status} /><UrgencyBadge urgency={c.urgency} />
            <span className="ml-auto font-mono text-[11.5px] text-fg-muted">{c.id}</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-fg">{MAINT_KIND[c.kind].label}{system ? `. ${system.name}` : ""}</h2>
          <p className="mt-1 text-[13px] text-fg-muted">Opened {formatDate(c.created_at)} · last updated {formatDate(c.updated_at)}</p>
          <WorkflowStrip current={stageIndexForCase(c)} className="mt-5" />
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Detected issue" />
          <CardBody className="space-y-4">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-fg">{c.detected_issue}</p>
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-fg-secondary">AI analysis {c.ai_analysis && <DataBadge cls={c.ai_analysis_cls ?? "ai"} compact />}</div>
              {c.ai_analysis ? <p className="rounded-[10px] border border-border bg-inset p-3 text-[13.5px] leading-relaxed text-fg-secondary">{c.ai_analysis}</p> : <p className="text-[13px] text-fg-muted">No AI analysis is attached to this case.</p>}
            </div>
            {relatedIncidents.length > 0 && (
              <div>
                <div className="mb-1.5 text-[12.5px] font-medium text-fg-secondary">Related incidents</div>
                <ul className="space-y-1 text-[13.5px]">{relatedIncidents.map((i) => <li key={i.id}><Link href={`/incidents/${i.id}`} className="text-[var(--brand-strong)] hover:underline">{formatDate(i.occurred_at)}: {i.reported_problem}</Link></li>)}</ul>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Status timeline" subtitle="Only recorded timestamps are shown." />
          <CardBody>
            <ol className="relative ml-2 border-l border-border pl-4">
              {MAINT_STATUS_ORDER.map((s, i) => {
                const reached = i <= reachedIdx && !(c.status === "closed" && (s === "resolved" || s === "in_progress") && !c.work_performed);
                const when = s === "new" ? c.created_at : s === "scheduled" && c.appointment_at ? c.appointment_at : s === c.status ? c.updated_at : null;
                return (
                  <li key={s} className="relative pb-4 last:pb-0">
                    <span className={cn("absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-elevated", reached ? "bg-brand" : "bg-border")} aria-hidden />
                    <div className={cn("text-[13.5px]", reached ? "font-medium text-fg" : "text-fg-muted")}>{MAINT_STATUS[s].label}</div>
                    <div className="text-[12px] text-fg-muted">{reached ? (when ? formatDate(when, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Reached: time not recorded") : "Not reached"}</div>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Appointment & technician" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-3 text-[13.5px]">
              <Row k="Provider" v={provider ? <span className="inline-flex items-center gap-1.5">{provider.name}{provider.is_demo && <DataBadge cls="demo" compact />}</span> : "Not assigned"} />
              <Row k="Appointment" v={c.appointment_at ? formatDate(c.appointment_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "None"} />
              <Row k="Appointment status" v={appointment ? <Badge tone={appointment.status === "confirmed" ? "good" : appointment.status === "cancelled" ? "neutral" : "warn"}>{appointment.status}</Badge> : c.appointment_at ? "Requested" : "—"} />
              <Row k="Technician" v={c.technician_name ?? "Not assigned yet"} />
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Work, parts & cost" />
          <CardBody>
            <dl className="grid gap-3 text-[13.5px]">
              <Row k="Work performed" v={c.work_performed ?? <span className="text-fg-muted">Not recorded yet</span>} />
              <Row k="Parts" v={c.parts ?? <span className="text-fg-muted">None recorded</span>} />
              <Row k="Cost" v={<CostCell cost={c.cost} />} />
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Before / after" subtitle="Photos and production around the maintenance. The change is calculated; the cause is not." />
        <CardBody className="space-y-4">
          {c.is_demo && (c.production_before_kwh !== null || c.production_after_kwh !== null) && <DemoBanner text="DEMO FIGURES — NOT REAL" detail="The before/after values on this demo case are illustrative." />}
          <div className="grid gap-3 sm:grid-cols-2">
            <ImageSlot label="Before" path={c.before_image_path} />
            <ImageSlot label="After" path={c.after_image_path} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Production before" data={c.production_before_kwh === null || c.production_before_kwh === undefined ? { value: null, cls: "unavailable", reason: "Not recorded on this case." } : { value: c.production_before_kwh, cls: c.is_demo ? "demo" : "source", source: "Daily kWh recorded with the case" }} unit="kWh/day" format={(v) => v.toFixed(1)} />
            <Metric label="Production after" data={c.production_after_kwh === null || c.production_after_kwh === undefined ? { value: null, cls: "unavailable", reason: "Not recorded on this case." } : { value: c.production_after_kwh, cls: c.is_demo ? "demo" : "source", source: "Daily kWh recorded with the case" }} unit="kWh/day" format={(v) => v.toFixed(1)} />
            <Metric label="Change" data={changeCls} format={(v) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%`} footnote="(after − before) ÷ before" />
          </div>
          <p className="rounded-[10px] border border-dashed border-border-strong bg-inset p-3 text-[13px] leading-relaxed text-fg-secondary">
            This change coincides with the maintenance; it does not prove the maintenance caused it. Weather, season and other events also move daily production.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notes" />
        <CardBody className="space-y-4">
          {c.notes ? <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-fg-secondary">{c.notes}</pre> : <p className="text-[13px] text-fg-muted">No notes yet.</p>}
          <Field label="Add a note" help={mode === "demo" ? "Stored on this device." : "Visible to you and the assigned provider."}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Gate code for the technician, best time to call…" className="min-h-20" />
          </Field>
          {error && <p role="alert" className="text-[13px] text-critical-fg">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={submitNote} disabled={busy !== null || note.trim().length === 0}>{busy === "note" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MessageSquarePlus className="size-4" aria-hidden />} Add note</Button>
            {canCancel && <Button type="button" size="sm" variant="outline" onClick={cancel} disabled={busy !== null}><Ban className="size-4" aria-hidden /> Cancel request</Button>}
          </div>
        </CardBody>
      </Card>
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
          // eslint-disable-next-line @next/next/no-img-element
          <img src={path} alt={`${label} maintenance photo`} className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-[13px]"><ImageOff className="size-5" aria-hidden />No image</div>
        )}
      </div>
      <figcaption className="border-t border-border px-3 py-1.5 text-[12.5px] font-medium text-fg-secondary">{label}</figcaption>
    </figure>
  );
}
