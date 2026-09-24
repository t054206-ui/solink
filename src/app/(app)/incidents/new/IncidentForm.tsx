"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, ScanSearch, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import type { DataMode } from "@/lib/data/mode";
import type { Incident, SolarSystem } from "@/lib/types";
import { newLocalId, upsertRecord, useLocalIncidents } from "../../_ops/localRecords";
import { createIncident } from "../actions";

function localDateTimeNow() {
  const d = new Date(); d.setSeconds(0, 0);
  const off = d.getTimezoneOffset(); const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

export function IncidentForm({ mode, systems, initialSystemId, initialPanel }: { mode: DataMode; systems: SolarSystem[]; initialSystemId: string; initialPanel: number | null }) {
  const router = useRouter();
  const [, setLocal] = useLocalIncidents();
  const [systemId, setSystemId] = useState(initialSystemId);
  const [when, setWhen] = useState(localDateTimeNow);
  const [panel, setPanel] = useState(initialPanel === null ? "" : String(initialPanel));
  const [problem, setProblem] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const system = systems.find((s) => s.id === systemId);
  const panelMax = system?.panel_count ?? null;
  const panelNum = panel.trim() === "" ? null : Number(panel);
  const panelError = panelNum !== null && (!Number.isInteger(panelNum) || panelNum < 1 || (panelMax !== null && panelNum > panelMax)) ? `Panel index must be a whole number${panelMax ? ` between 1 and ${panelMax}` : ""}.` : undefined;
  const valid = problem.trim().length >= 3 && when !== "" && !panelError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true); setError(null);
    const occurredIso = new Date(when).toISOString();
    const fd = new FormData();
    fd.set("system_id", systemId); fd.set("occurred_at", occurredIso); fd.set("panel_index", panel.trim()); fd.set("reported_problem", problem.trim());
    for (const f of files) fd.append("images", f);
    const res = await createIncident(fd);
    if (res.ok) { router.push(`/incidents/${res.incident.id}`); return; }
    if (res.reason !== "demo") { setError(res.message); setSaving(false); return; }
    const incident: Incident = {
      id: newLocalId("inc"), system_id: systemId, panel_index: panelNum, occurred_at: occurredIso,
      reported_problem: `${problem.trim()}${files.length ? `\n(${files.length} image${files.length > 1 ? "s" : ""} attached. Previews only; storage requires Supabase.)` : ""}`,
      ai_analysis: null, images: [], action_taken: null, technician_name: null, cost: { value: null, status: "unavailable" }, result: null, status: "open", maintenance_case_id: null, is_demo: false,
    };
    setLocal((prev) => upsertRecord(prev, incident));
    router.push(`/incidents/${incident.id}`);
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardBody className="grid gap-4 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="System">
              <Select value={systemId} onChange={(e) => setSystemId(e.target.value)}>{systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            </Field>
            <Field label="Date and time">
              <Input type="datetime-local" value={when} max={localDateTimeNow()} onChange={(e) => setWhen(e.target.value)} required />
            </Field>
            <Field label="Panel index (optional)" help={panelMax ? `Your system has ${panelMax} panels. Leave empty if the whole system is affected.` : "Leave empty if the whole system is affected."} error={panelError}>
              <Input type="number" inputMode="numeric" min={1} max={panelMax ?? undefined} value={panel} onChange={(e) => setPanel(e.target.value)} placeholder="e.g. 7" />
            </Field>
          </div>
          <Field label="Reported problem" help="What you saw or measured, in your own words." error={problem && problem.trim().length < 3 ? "Please write a few words." : undefined}>
            <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. The inverter shows a red light and this morning's production was zero." required />
          </Field>
          <Field label="Photos (optional)" help={mode === "demo" ? "Previews only in demo mode." : "Uploaded to your private incident-images folder."}>
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
          <div className="rounded-[10px] border border-border bg-inset p-3 text-[13px] text-fg-secondary">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5"><ScanSearch className="size-4 text-fg-muted" aria-hidden /> Want an AI screening of your photos first?</span>
              <Link href="/monitoring/inspection" className="text-[13px] font-medium text-[var(--brand-strong)] hover:underline">Run AI screening</Link>
            </div>
            <p className="mt-1 text-[12px] text-fg-muted">The screening is an AI interpretation, when available. It never replaces a technician.</p>
          </div>
          {error && <p role="alert" className="text-[13px] text-critical-fg">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <Link href="/incidents" className="text-[13px] text-fg-muted hover:text-fg">Cancel</Link>
            <Button type="submit" disabled={!valid || saving}>{saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Save incident</Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
