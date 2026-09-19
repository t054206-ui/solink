"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/Form";
import { Placeholder } from "@/components/ui/Placeholder";
import type { DataMode } from "@/lib/data/mode";
import type { Appointment, MaintenanceCase, MaintenanceStatus, SpecValue } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { MAINT_STATUS, MAINT_STATUS_ORDER, appointmentKindFor } from "../../../_ops/meta";
import { newLocalId, upsertRecord, useLocalAppointments } from "../../../_ops/localRecords";
import { canMoveTo, transitionReason } from "../../_lib/workflow";
import { saveWorkRecord } from "../../actions";

type Pick_ = { file: File; url: string } | null;

/**
 * The technician's work record. One form, two backends:
 *  - Supabase: posted to the saveWorkRecord server action (which re-checks
 *    access, enforces the same forward-only status rule and uploads photos to
 *    maintenance-images/<userId>/).
 *  - Demo: the action reports "demo" and the same record is written to this
 *    browser's local store, so the homeowner's maintenance pages show it too.
 *
 * Cost is a SpecValue: a positive amount, or an explicit "not provided"
 * ({ value: null, status: "unavailable" }). Never 0, never assumed.
 */
export function WorkRecordForm({ c, mode, appointment, setLocalCases, nowIso }: {
  c: MaintenanceCase;
  mode: DataMode;
  appointment: Appointment | null;
  setLocalCases: (v: MaintenanceCase[] | ((prev: MaintenanceCase[]) => MaintenanceCase[])) => void;
  nowIso: string;
}) {
  const router = useRouter();
  const [, setLocalAppts] = useLocalAppointments();

  const [when, setWhen] = useState("");
  const [technician, setTechnician] = useState(c.technician_name ?? "");
  const [work, setWork] = useState(c.work_performed ?? "");
  const [parts, setParts] = useState(c.parts ?? "");
  const [costKnown, setCostKnown] = useState(c.cost.value !== null && c.cost.value !== undefined);
  const [costValue, setCostValue] = useState(c.cost.value === null || c.cost.value === undefined ? "" : String(c.cost.value));
  const [status, setStatus] = useState<MaintenanceStatus>(c.status);
  const [notes, setNotes] = useState(c.notes ?? "");
  const [before, setBefore] = useState<Pick_>(null);
  const [after, setAfter] = useState<Pick_>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const objectUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = objectUrls.current;
    return () => { for (const u of urls) URL.revokeObjectURL(u); };
  }, []);

  /** Object URLs are created here, in the event handler — never while rendering. */
  function pickImage(which: "before" | "after", file: File | null) {
    const prev = which === "before" ? before : after;
    if (prev) URL.revokeObjectURL(prev.url);
    let next: Pick_ = null;
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      next = { file, url };
    }
    if (which === "before") setBefore(next); else setAfter(next);
  }

  const costNumber = costValue.trim() === "" ? null : Number(costValue);
  const costError = costKnown
    ? costNumber === null || !Number.isFinite(costNumber) || costNumber <= 0
      ? "Enter an amount above 0, or choose “Cost not provided”."
      : undefined
    : undefined;
  const whenIso = when === "" ? null : (() => { const d = new Date(when); return Number.isNaN(d.getTime()) ? null : d.toISOString(); })();
  const whenInPast = whenIso !== null && whenIso < nowIso;
  const statusBlocked = transitionReason(c.status, status);
  const valid = !costError && !statusBlocked && (when === "" || whenIso !== null);

  function buildCost(): SpecValue {
    return costKnown && costNumber !== null ? { value: costNumber, unit: "KWD" } : { value: null, status: "unavailable" };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setError(null); setMessage(null);

    const fd = new FormData();
    fd.set("id", c.id);
    if (whenIso) fd.set("appointment_at", whenIso);
    fd.set("technician_name", technician.trim());
    fd.set("work_performed", work.trim());
    fd.set("parts", parts.trim());
    fd.set("cost_unavailable", costKnown ? "" : "1");
    if (costKnown && costNumber !== null) fd.set("cost_value", String(costNumber));
    fd.set("status", status);
    fd.set("notes", notes.trim());
    if (before) fd.set("before_image", before.file);
    if (after) fd.set("after_image", after.file);

    const res = await saveWorkRecord(fd);
    if (res.ok) { setMessage(res.message); setBusy(false); router.refresh(); return; }
    if (res.reason !== "demo") { setError(res.error); setBusy(false); return; }

    const now = new Date().toISOString();
    const next: MaintenanceCase = {
      ...c,
      appointment_at: whenIso ?? c.appointment_at ?? null,
      technician_name: technician.trim() || null,
      work_performed: work.trim() || null,
      parts: parts.trim() || null,
      cost: buildCost(),
      status,
      notes: notes.trim() || null,
      updated_at: now,
    };
    setLocalCases((prev) => upsertRecord(prev, next));
    if (whenIso) {
      const existing = appointment;
      const appt: Appointment = existing
        ? { ...existing, scheduled_at: whenIso, status: "confirmed" }
        : { id: newLocalId("ap"), kind: appointmentKindFor(c.kind), system_id: c.system_id, provider_id: c.provider_id, scheduled_at: whenIso, status: "confirmed", notes: `Maintenance case ${c.id}` };
      setLocalAppts((prev) => upsertRecord(prev, appt));
    }
    setBusy(false);
    setMessage(`Saved on this device${before || after ? ". Photos stayed as previews. Image storage requires Supabase" : ""}. The homeowner's maintenance page reads the same record.`);
  }

  return (
    <Card>
      <CardHeader
        title="Record the work"
        subtitle={mode === "demo"
          ? "Supabase is not connected: this record is stored in this browser and shared with the homeowner pages on this device."
          : "Saved to the case row your company owns. Photos go to your private maintenance-images folder."}
      />
      <CardBody>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Appointment date and time"
              help={c.appointment_at ? `Recorded: ${formatDate(c.appointment_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}. Leave empty to keep it.` : "No appointment recorded yet. Leave empty to leave it unbooked."}
            >
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </Field>
            <Field label="Technician name" help="The person who attended, as you want it on the record.">
              <Input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="e.g. A. Technician" maxLength={120} />
            </Field>
          </div>
          {whenInPast && <p className="text-[12.5px] text-fg-muted">That time is in the past. It will be recorded as a visit that has already happened.</p>}

          <Field label="Work performed" help="What was actually done. This is what the homeowner reads.">
            <Textarea value={work} onChange={(e) => setWork(e.target.value)} placeholder="e.g. Cleaned all panels, checked string voltages, re-torqued the DC connectors." maxLength={4000} />
          </Field>

          <Field label="Parts used" help="Leave empty if no parts were used. Do not guess part numbers.">
            <Textarea value={parts} onChange={(e) => setParts(e.target.value)} className="min-h-20" placeholder="e.g. 1 × DC fuse, 10 A" maxLength={2000} />
          </Field>

          <fieldset className="rounded-[10px] border border-border p-4">
            <legend className="px-1 text-[13px] font-medium text-fg-secondary">Cost</legend>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-[13.5px] text-fg">
                  <input type="radio" name="cost-mode" checked={costKnown} onChange={() => setCostKnown(true)} className="size-4 accent-[var(--brand)]" />
                  Enter the cost
                </label>
                <label className="flex items-center gap-2 text-[13.5px] text-fg">
                  <input type="radio" name="cost-mode" checked={!costKnown} onChange={() => setCostKnown(false)} className="size-4 accent-[var(--brand)]" />
                  Cost not provided
                </label>
              </div>
              {costKnown ? (
                <Field label="Amount (KWD)" error={costError} help="A real figure only. There is no default and no zero.">
                  <Input type="number" inputMode="decimal" min="0" step="0.001" value={costValue} onChange={(e) => setCostValue(e.target.value)} placeholder="e.g. 25" />
                </Field>
              ) : (
                <p className="flex flex-wrap items-center gap-2 text-[13px] text-fg-secondary">
                  Recorded as unavailable: the homeowner sees <Placeholder k="MAINTENANCE_PRICE" /> rather than a number.
                </p>
              )}
            </div>
          </fieldset>

          <fieldset className="rounded-[10px] border border-border p-4">
            <legend className="px-1 text-[13px] font-medium text-fg-secondary">Photos</legend>
            <p className="mb-3 text-[12.5px] text-fg-muted">
              {mode === "demo"
                ? "Demo mode shows a preview only; uploading needs Supabase, so nothing is stored and no path is written to the case."
                : "Uploaded to maintenance-images/<your user id>/. Only you and the homeowner's case can reference them."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ImagePicker id="before-image" label="Before photo" pick={before} onPick={(f) => pickImage("before", f)} />
              <ImagePicker id="after-image" label="After photo" pick={after} onPick={(f) => pickImage("after", f)} />
            </div>
          </fieldset>

          <Field
            label="Case status"
            error={statusBlocked ?? undefined}
            help="A case moves forward through the workflow. It can skip ahead, but it cannot go back. Except to Reviewing, when it needs re-assessment."
          >
            <Select value={status} onChange={(e) => setStatus(e.target.value as MaintenanceStatus)} aria-describedby="status-rule">
              {MAINT_STATUS_ORDER.map((s) => {
                const allowed = canMoveTo(c.status, s);
                return (
                  <option key={s} value={s} disabled={!allowed}>
                    {MAINT_STATUS[s].label}{s === c.status ? " (current)" : allowed ? "" : ": backward step not allowed"}
                  </option>
                );
              })}
            </Select>
          </Field>
          <p id="status-rule" className="text-[12.5px] text-fg-muted">
            Current status: <span className="font-medium text-fg-secondary">{MAINT_STATUS[c.status].label}</span>. Greyed-out options would move the case backwards through the recorded history.
          </p>

          <Field label="Notes" help="Anything the homeowner or the next technician should know.">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" maxLength={4000} />
          </Field>

          {error && <p role="alert" className="text-[13px] text-critical-fg">{error}</p>}
          {message && <p role="status" className="text-[13px] text-good-fg">{message}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || !valid}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />} Save work record
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function ImagePicker({ id, label, pick, onPick }: { id: string; label: string; pick: Pick_; onPick: (f: File | null) => void }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id} type="file" accept="image/*"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="block w-full cursor-pointer rounded-[10px] border border-dashed border-border-strong bg-inset px-3 py-2.5 text-[13px] text-fg-secondary file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-2 file:py-1 file:text-[12.5px] file:text-fg"
      />
      <div className="mt-2 overflow-hidden rounded-[10px] border border-border bg-inset">
        <div className="grid aspect-[4/3] place-items-center text-fg-muted">
          {pick ? (
            // Object URL: next/image cannot optimise a blob: source.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pick.url} alt={`${label} preview`} className="size-full object-cover" />
          ) : (
            <span className="flex items-center gap-1.5 text-[13px]"><ImagePlus className="size-4" aria-hidden />No file chosen</span>
          )}
        </div>
      </div>
      {pick && <p className="mt-1 truncate text-[12px] text-fg-muted">{pick.file.name}</p>}
    </div>
  );
}
