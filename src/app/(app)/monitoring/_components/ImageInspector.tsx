"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Upload, Loader2, X, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataBadge } from "@/components/ui/DataBadge";
import { Field, Textarea } from "@/components/ui/Form";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { ErrorState, UnavailableState } from "@/components/ui/States";
import type { InspectionResult } from "@/app/api/ai/inspect-image/route";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "not_configured"; message: string }
  | { kind: "error"; message: string }
  | { kind: "done"; result: InspectionResult };

const CONF_TONE: Record<InspectionResult["findings"][number]["confidence"], "neutral" | "warn" | "serious"> = { low: "neutral", medium: "warn", high: "serious" };
const QUALITY_TONE: Record<InspectionResult["image_quality"]["rating"], "good" | "warn" | "serious"> = { good: "good", fair: "warn", poor: "serious" };

/**
 * Photo upload → AI visual screening. Camera capture on phones. The result is
 * an AI interpretation with confidence and uncertainty — never a diagnosis.
 */
export function ImageInspector() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  // The object URL is created in the event handler (a side effect belongs there,
  // not in render or an effect) and revoked when it is replaced or unmounted.
  const previewRef = useRef<string | null>(null);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  function setChosen(f: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = f ? URL.createObjectURL(f) : null;
    previewRef.current = url;
    setFile(f);
    setPreview(url);
  }

  function choose(f: File | null) {
    setState({ kind: "idle" });
    if (!f) { setChosen(null); return; }
    if (!ALLOWED.includes(f.type)) { setChosen(null); setState({ kind: "invalid", message: "Use a JPEG, PNG, WEBP or GIF image." }); return; }
    if (f.size > MAX_BYTES) { setChosen(null); setState({ kind: "invalid", message: `The image is ${(f.size / 1024 / 1024).toFixed(1)} MB; the limit is 6 MB.` }); return; }
    setChosen(f);
  }

  async function submit() {
    if (!file) { setState({ kind: "invalid", message: "Please choose or take a photo first." }); return; }
    setState({ kind: "loading" });
    const fd = new FormData(); fd.append("image", file); if (note.trim()) fd.append("note", note.trim());
    try {
      const res = await fetch("/api/ai/inspect-image", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        if (json.reason === "not_configured") setState({ kind: "not_configured", message: json.message });
        else if (json.reason === "invalid_input") setState({ kind: "invalid", message: json.message });
        else setState({ kind: "error", message: json.message ?? "Inspection failed." });
        return;
      }
      setState({ kind: "done", result: json.result as InspectionResult });
    } catch {
      setState({ kind: "error", message: "The inspection service could not be reached." });
    }
  }

  const busy = state.kind === "loading";
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Choose a photo of your panels" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
        {!preview ? (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-border-strong bg-inset px-6 py-12 text-center hover:border-brand">
            <span className="grid size-12 place-items-center rounded-full bg-elevated text-[var(--brand-strong)] shadow-sm"><Camera className="size-6" aria-hidden /></span>
            <span className="text-[14px] font-medium text-fg">Take or choose a photo</span>
            <span className="text-[12.5px] text-fg-muted">JPEG, PNG, WEBP or GIF · up to 6 MB · one panel area in daylight works best</span>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-inset">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={preview} alt="Preview of the selected panel photo" className="max-h-80 w-full object-contain" />
            <button type="button" onClick={() => choose(null)} aria-label="Remove photo" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-elevated/90 text-fg shadow-sm hover:bg-elevated"><X className="size-4" /></button>
            <div className="border-t border-border px-3 py-2 text-[12px] text-fg-muted truncate">{file?.name} · {file ? (file.size / 1024).toFixed(0) : 0} KB</div>
          </div>
        )}
        <Field label="Note for the agent (optional)" help="What made you take the photo? Anything you noticed on the panel or in the production charts.">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. A brownish patch appeared on the lower-left panel after last week's dust." />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={busy || !file}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />} Analyse photo</Button>
          {preview && <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>Choose another</Button>}
        </div>
        {state.kind === "invalid" && <p role="alert" className="text-[13px] text-critical-fg">{state.message}</p>}
      </div>

      <div>
        {state.kind === "idle" && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-inset p-5 text-[13px] leading-relaxed text-fg-secondary">
            <p className="font-medium text-fg">What you will get</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>An image-quality check (good / fair / poor) — a blurry or distant photo limits what can be seen.</li>
              <li>Visible observations with a possible cause and a confidence level.</li>
              <li>A statement of what cannot be determined from the photo.</li>
              <li>A recommended next step. Anything concerning points to a qualified inspection.</li>
            </ul>
            <p className="mt-3 text-fg-muted">This is a visual screening from a photograph, not a professional engineering diagnosis.</p>
          </div>
        )}
        {state.kind === "loading" && <div className="flex h-full min-h-40 items-center justify-center gap-2 text-[13px] text-fg-secondary"><Loader2 className="size-4 animate-spin" aria-hidden /> Looking at the photo…</div>}
        {state.kind === "not_configured" && (
          <div className="space-y-3">
            <UnavailableState title="Image inspection is not connected">{state.message}</UnavailableState>
            <PlaceholderNote k="CLAUDE_API_KEY" />
          </div>
        )}
        {state.kind === "error" && <ErrorState title="Inspection failed">{state.message}</ErrorState>}
        {state.kind === "done" && <Result r={state.result} />}
      </div>
    </div>
  );
}

function Result({ r }: { r: InspectionResult }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DataBadge cls="ai" source="AI visual screening" />
        <Badge tone={QUALITY_TONE[r.image_quality?.rating] ?? "neutral"}>Image quality: {r.image_quality?.rating ?? "unknown"}</Badge>
      </div>
      {r.image_quality?.notes && <p className="text-[13px] text-fg-secondary">{r.image_quality.notes}</p>}
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">Findings</div>
        {r.findings?.length ? (
          <ul className="mt-2 space-y-2">
            {r.findings.map((f, i) => (
              <li key={i} className="rounded-[var(--radius-md)] border border-border bg-inset p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-medium text-fg">{f.observation}</p>
                  <Badge tone={CONF_TONE[f.confidence] ?? "neutral"}>{f.confidence} confidence</Badge>
                </div>
                <p className="mt-1 text-[13px] text-fg-secondary"><span className="text-fg-muted">Possible cause:</span> {f.possible_cause}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-[13px] text-fg-muted">No visible findings were reported for this photo.</p>}
      </div>
      <Block title="Uncertainty" text={r.uncertainty} />
      <Block title="Recommended next step" text={r.recommended_next_step} strong />
      <p className="text-[12px] text-fg-muted">{r.disclaimer || "This is a visual screening from a photograph, not a professional engineering diagnosis."}</p>
      <Link href="/incidents/new" className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-elevated px-3 py-2 text-[13px] font-medium text-fg hover:bg-inset">
        <AlertOctagon className="size-4 text-serious-fg" aria-hidden /> Create an incident from this
      </Link>
    </div>
  );
}

function Block({ title, text, strong }: { title: string; text: string | undefined; strong?: boolean }) {
  if (!text) return null;
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">{title}</div>
      <p className={`mt-1 text-[13.5px] leading-relaxed ${strong ? "font-medium text-fg" : "text-fg-secondary"}`}>{text}</p>
    </div>
  );
}
