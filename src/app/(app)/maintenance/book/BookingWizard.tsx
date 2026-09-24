"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Badge } from "@/components/ui/Badge";
import type { DataMode } from "@/lib/data/mode";
import type { Appointment, MaintenanceCase, MaintenanceKind, ProviderCompany, SolarSystem, Urgency } from "@/lib/types";
import { DEMO_USER_ID } from "@/lib/demo/data";
import { cn, formatDate } from "@/lib/utils";
import { MAINT_KIND, MAINT_KIND_ORDER, URGENCY, appointmentKindFor, providerKindsFor, stageIndexForCase } from "../../_ops/meta";
import { newLocalId, upsertRecord, useLocalAppointments, useLocalMaintenance } from "../../_ops/localRecords";
import { WorkflowStrip } from "../../_ops/WorkflowStrip";
import { createMaintenanceCase } from "../actions";

const STEPS = ["Problem", "Provider", "Time slot", "Confirm"] as const;
const WINDOWS = [{ id: "morning", label: "Morning (07:00–11:00)", hour: 7 }, { id: "midday", label: "Midday (11:00–15:00)", hour: 11 }, { id: "afternoon", label: "Afternoon (15:00–18:00)", hour: 15 }] as const;

interface Draft { system_id: string; kind: MaintenanceKind; urgency: Urgency; description: string; provider_id: string | null; date: string; window: (typeof WINDOWS)[number]["id"] }

export function BookingWizard({ mode, providers, systems, initialKind, initialSystemId }: {
  mode: DataMode; providers: ProviderCompany[]; systems: SolarSystem[]; initialKind: MaintenanceKind; initialSystemId: string;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({ system_id: initialSystemId, kind: initialKind, urgency: "routine", description: "", provider_id: null, date: "", window: "morning" });
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ caseRecord: MaintenanceCase; appointment: Appointment | null; local: boolean } | null>(null);
  const [, setLocalCases] = useLocalMaintenance();
  const [, setLocalAppts] = useLocalAppointments();

  const eligible = providers.filter((p) => p.kind.some((k) => providerKindsFor(draft.kind).includes(k)));
  const provider = providers.find((p) => p.id === draft.provider_id) ?? null;
  const system = systems.find((s) => s.id === draft.system_id) ?? null;
  const minDate = new Date().toISOString().slice(0, 10);

  const appointmentIso = draft.date ? new Date(`${draft.date}T${String(WINDOWS.find((w) => w.id === draft.window)!.hour).padStart(2, "0")}:00:00`).toISOString() : null;

  const canNext = step === 0 ? draft.description.trim().length >= 3 : step === 1 ? true : step === 2 ? Boolean(appointmentIso) : true;

  async function submit() {
    setSaving(true); setError(null);
    const detected_issue = `${draft.description.trim()}${files.length ? `\n(${files.length} image${files.length > 1 ? "s" : ""} attached at booking. Previews only; image storage requires Supabase.)` : ""}`;
    const input = { system_id: draft.system_id, provider_id: draft.provider_id, kind: draft.kind, urgency: draft.urgency, detected_issue, appointment_at: appointmentIso, notes: null };
    const res = await createMaintenanceCase(input);
    if (res.ok) { setDone({ caseRecord: res.caseRecord, appointment: res.appointment, local: false }); setSaving(false); return; }
    if (res.reason !== "demo") { setError(res.message); setSaving(false); return; }
    // Demo mode: persist on this device.
    const now = new Date().toISOString();
    const id = newLocalId("mc");
    const caseRecord: MaintenanceCase = {
      id, system_id: draft.system_id, user_id: DEMO_USER_ID, provider_id: draft.provider_id, kind: draft.kind, status: "new", urgency: draft.urgency,
      detected_issue, ai_analysis: null, ai_analysis_cls: undefined, appointment_at: appointmentIso, technician_name: null, work_performed: null, parts: null,
      cost: { value: null, status: "unavailable" }, before_image_path: null, after_image_path: null, production_before_kwh: null, production_after_kwh: null,
      notes: `[${now.slice(0, 16).replace("T", " ")}] Booking requested by homeowner (saved on this device).`, created_at: now, updated_at: now, is_demo: false,
    };
    const appointment: Appointment | null = appointmentIso ? { id: newLocalId("ap"), kind: appointmentKindFor(draft.kind), system_id: draft.system_id, provider_id: draft.provider_id, scheduled_at: appointmentIso, status: "requested", notes: `Maintenance case ${id}` } : null;
    setLocalCases((prev) => upsertRecord(prev, caseRecord));
    if (appointment) setLocalAppts((prev) => upsertRecord(prev, appointment));
    setDone({ caseRecord, appointment, local: true });
    setSaving(false);
  }

  if (done) {
    const c = done.caseRecord;
    return (
      <Card>
        <CardHeader title={<><Check className="size-4 text-good-fg" aria-hidden /> Booking requested</>} subtitle={done.local ? "Saved on this device (demo mode). No provider has been contacted." : "Your case is open and the appointment has been requested. The provider confirms the slot."} />
        <CardBody className="space-y-5">
          <WorkflowStrip current={stageIndexForCase(c)} />
          <dl className="grid gap-3 text-[13.5px] sm:grid-cols-2">
            <Row k="Case" v={<span className="font-mono text-[12.5px]">{c.id}</span>} />
            <Row k="Type" v={MAINT_KIND[c.kind].label} />
            <Row k="Provider" v={provider ? <span className="inline-flex items-center gap-1.5">{provider.name}{provider.is_demo && <DataBadge cls="demo" compact />}</span> : "To be assigned"} />
            <Row k="Requested slot" v={c.appointment_at ? `${formatDate(c.appointment_at)} · ${WINDOWS.find((w) => w.id === draft.window)?.label}` : "Not requested"} />
            <Row k="Status" v={<Badge tone="data">New</Badge>} />
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button href={`/maintenance/${c.id}`}>Open case</Button>
            <Button href="/maintenance" variant="outline">All cases</Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="flex gap-2" aria-label="Booking steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1.5" aria-current={i === step ? "step" : undefined}>
            <span className={cn("h-1 rounded-full", i <= step ? "bg-brand" : "bg-border")} />
            <span className={cn("text-[12px]", i === step ? "font-semibold text-fg" : "text-fg-muted")}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      <Card>
        <CardBody className="pt-5">
          {step === 0 && (
            <div className="grid gap-4">
              {systems.length > 1 && (
                <Field label="System">
                  <Select value={draft.system_id} onChange={(e) => setDraft({ ...draft, system_id: e.target.value })}>{systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                </Field>
              )}
              <Field label="What kind of service?" help={MAINT_KIND[draft.kind].description}>
                <Select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as MaintenanceKind, provider_id: null })}>
                  {MAINT_KIND_ORDER.map((k) => <option key={k} value={k}>{MAINT_KIND[k].label}</option>)}
                </Select>
              </Field>
              <Field label="How urgent does it feel?" help="Your own assessment. A technician decides the real priority after inspection.">
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(URGENCY) as Urgency[]).map((u) => (
                    <button key={u} type="button" onClick={() => setDraft({ ...draft, urgency: u })} aria-pressed={draft.urgency === u}
                      className={cn("rounded-[10px] border p-3 text-left text-[13px] transition-colors", draft.urgency === u ? "border-brand bg-brand-soft" : "border-border hover:bg-inset")}>
                      <span className="block font-medium text-fg">{URGENCY[u].label}</span><span className="text-fg-muted">{URGENCY[u].description}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Describe the problem" help="What you noticed, since when, and anything a technician should know." error={draft.description && draft.description.trim().length < 3 ? "Please write a few words." : undefined}>
                <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. Production has dropped since the last sandstorm; panels look dusty." />
              </Field>
              <Field label="Photos (optional)" help={mode === "demo" ? "Previews only. Image storage requires Supabase." : "Previews only at booking; the technician can attach before/after photos to the case."}>
                <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-border-strong bg-inset px-3 py-3 text-[13px] text-fg-secondary hover:bg-elevated">
                  <ImagePlus className="size-4" aria-hidden /> Add images
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))} />
                </label>
                {previews.length > 0 && (
                  <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {previews.map((p) => <li key={p.url} className="aspect-square overflow-hidden rounded-md border border-border">{/* Object URLs and private storage paths: next/image cannot optimise these. */}
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={p.url} alt={p.name} className="size-full object-cover" /></li>)}
                  </ul>
                )}
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3">
              <p className="text-[13.5px] text-fg-secondary">Providers offering <strong className="text-fg">{MAINT_KIND[draft.kind].label.toLowerCase()}</strong>. You may also leave this open and let Solink route the case.</p>
              <button type="button" onClick={() => setDraft({ ...draft, provider_id: null })} aria-pressed={draft.provider_id === null}
                className={cn("rounded-[10px] border p-3 text-left text-[13.5px]", draft.provider_id === null ? "border-brand bg-brand-soft" : "border-border hover:bg-inset")}>
                <span className="block font-medium text-fg">No preference</span><span className="text-fg-muted">A provider is assigned when the case is reviewed.</span>
              </button>
              {eligible.map((p) => (
                <button key={p.id} type="button" onClick={() => setDraft({ ...draft, provider_id: p.id })} aria-pressed={draft.provider_id === p.id}
                  className={cn("rounded-[10px] border p-3 text-left text-[13.5px]", draft.provider_id === p.id ? "border-brand bg-brand-soft" : "border-border hover:bg-inset")}>
                  <span className="flex flex-wrap items-center gap-1.5 font-medium text-fg">{p.name}{p.is_demo && <DataBadge cls="demo" compact />}<Badge tone={p.verification_status === "verified" ? "good" : "neutral"}>{p.verification_status.replace("_", " ")}</Badge></span>
                  <span className="block text-fg-muted">{p.kind.join(", ")}{p.service_area ? ` · ${p.service_area}` : ""}</span>
                </button>
              ))}
              {eligible.length === 0 && <p className="text-[13px] text-fg-muted">No provider currently offers this service type.</p>}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred date">
                <Input type="date" min={minDate} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </Field>
              <Field label="Time window" help="The provider confirms an exact time within the window.">
                <Select value={draft.window} onChange={(e) => setDraft({ ...draft, window: e.target.value as Draft["window"] })}>{WINDOWS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}</Select>
              </Field>
            </div>
          )}

          {step === 3 && (
            <dl className="grid gap-3 text-[13.5px] sm:grid-cols-2">
              <Row k="System" v={system?.name ?? "—"} />
              <Row k="Type" v={MAINT_KIND[draft.kind].label} />
              <Row k="Urgency (your assessment)" v={URGENCY[draft.urgency].label} />
              <Row k="Provider" v={provider ? <span className="inline-flex items-center gap-1.5">{provider.name}{provider.is_demo && <DataBadge cls="demo" compact />}</span> : "No preference"} />
              <Row k="Requested slot" v={appointmentIso ? `${formatDate(appointmentIso)} · ${WINDOWS.find((w) => w.id === draft.window)?.label}` : "—"} />
              <div className="sm:col-span-2"><dt className="text-fg-muted">Problem</dt><dd className="mt-0.5 whitespace-pre-wrap text-fg">{draft.description}</dd></div>
              {files.length > 0 && <Row k="Images" v={`${files.length} attached (preview only)`} />}
              <p className="text-[12.5px] text-fg-muted sm:col-span-2">Submitting opens a case with status <em>New</em> and requests the appointment. {mode === "demo" ? "In demo mode nothing is sent anywhere." : "The provider sees the request in Solink and confirms the time."}</p>
            </dl>
          )}

          {error && <p role="alert" className="mt-3 text-[13px] text-critical-fg">{error}</p>}

          <div className="mt-5 flex items-center justify-between gap-2">
            {step > 0 ? <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" aria-hidden /> Back</Button> : <Link href="/maintenance" className="text-[13px] text-fg-muted hover:text-fg">Cancel</Link>}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => setStep(step + 1)} disabled={!canNext}>Next <ArrowRight className="size-4" aria-hidden /></Button>
            ) : (
              <Button type="button" onClick={submit} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} Confirm booking</Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><dt className="text-fg-muted">{k}</dt><dd className="mt-0.5 text-fg">{v}</dd></div>;
}
