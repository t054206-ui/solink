"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Check, LoaderCircle, Video, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Badge } from "@/components/ui/Badge";
import type { RoofScanResult } from "@/app/api/ai/inspect-roof/route";
import type { HouseType, RoofOrientation } from "@/lib/types";
import type { ProfileDraft } from "../_plan/profileStore";

const FRAME_COUNT = 5;
const FRAME_MAX_EDGE = 1280;

/**
 * Pulls evenly spaced stills out of a video in the browser.
 *
 * Deliberately not done on the server: a roof video off a phone is tens of
 * megabytes, ffmpeg is not in the serverless runtime, and the homeowner would
 * be uploading the whole file over mobile data to get six pictures out of it.
 * Decoding locally means only the frames travel.
 */
async function extractFrames(file: File, count = FRAME_COUNT): Promise<File[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("That video could not be read."));
    });

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    if (duration === 0) throw new Error("That video could not be read.");

    const scale = Math.min(1, FRAME_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.max(1, Math.round(video.videoWidth * scale));
    const h = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot read video frames.");

    const out: File[] = [];
    for (let i = 0; i < count; i++) {
      // Skip the very start and end: the first and last frames of a handheld
      // clip are usually the phone being raised or lowered.
      const t = duration * ((i + 0.5) / count);
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("That video could not be read."));
        video.currentTime = Math.min(t, Math.max(0, duration - 0.05));
      });
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
      if (blob) out.push(new File([blob], `frame-${i + 1}.jpg`, { type: "image/jpeg" }));
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type State =
  | { s: "idle" }
  | { s: "preparing"; label: string }
  | { s: "analyzing" }
  | { s: "done"; result: RoofScanResult; frames: string[] }
  | { s: "error"; message: string }
  | { s: "not_configured"; message: string };

export function RoofCapture({
  roofAreaM2,
  onApply,
}: {
  roofAreaM2: number | null;
  onApply: (patch: ProfileDraft) => void;
}) {
  const [state, setState] = useState<State>({ s: "idle" });
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const run = useCallback(
    async (files: File[], previews: string[]) => {
      setState({ s: "analyzing" });
      setApplied(new Set());
      const body = new FormData();
      for (const f of files) body.append("frames", f);
      if (roofAreaM2 !== null) body.append("roof_area_m2", String(roofAreaM2));
      try {
        const res = await fetch("/api/ai/inspect-roof", { method: "POST", body });
        const json = await res.json();
        if (!json.ok) {
          setState(
            json.reason === "not_configured"
              ? { s: "not_configured", message: json.message }
              : { s: "error", message: json.message ?? "That did not work." },
          );
          return;
        }
        setState({ s: "done", result: json.result as RoofScanResult, frames: previews });
      } catch {
        setState({ s: "error", message: "Could not reach the analysis service." });
      }
    },
    [roofAreaM2],
  );

  const onPhotos = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const files = Array.from(list).slice(0, FRAME_COUNT);
      await run(files, files.map((f) => URL.createObjectURL(f)));
    },
    [run],
  );

  const onVideo = useCallback(
    async (list: FileList | null) => {
      const file = list?.[0];
      if (!file) return;
      setState({ s: "preparing", label: "Reading the video on your device…" });
      try {
        const frames = await extractFrames(file);
        if (frames.length === 0) throw new Error("No frames could be read from that video.");
        await run(frames, frames.map((f) => URL.createObjectURL(f)));
      } catch (e) {
        setState({ s: "error", message: e instanceof Error ? e.message : "That video could not be read." });
      }
    },
    [run],
  );

  const apply = (key: string, patch: ProfileDraft) => {
    onApply(patch);
    setApplied((prev) => new Set(prev).add(key));
  };

  const done = state.s === "done" ? state : null;
  const r = done?.result ?? null;
  const busy = state.s === "preparing" || state.s === "analyzing";

  return (
    <Card>
      <CardHeader
        title="Or photograph the roof"
        subtitle="Take pictures or a short video and Solink will read what it can. You confirm every suggestion before it goes into the form."
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => void onPhotos(e.target.files)}
          />
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(e) => void onVideo(e.target.files)}
          />
          <Button type="button" variant="outline" onClick={() => photoInput.current?.click()} disabled={busy}>
            <Camera className="size-4" aria-hidden="true" />
            Photos
          </Button>
          <Button type="button" variant="outline" onClick={() => videoInput.current?.click()} disabled={busy}>
            <Video className="size-4" aria-hidden="true" />
            Video
          </Button>
          {state.s === "done" && (
            <Button type="button" variant="ghost" onClick={() => setState({ s: "idle" })}>
              <X className="size-4" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>

        <p className="text-[12.5px] leading-snug text-fg-muted">
          Up to {FRAME_COUNT} photos, or one video. A video is read on your phone and only {FRAME_COUNT} still frames are
          sent, so a large clip does not get uploaded. Nothing is stored.
        </p>

        {busy && (
          <div className="flex items-center gap-2 text-[13.5px] text-fg-secondary">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {state.s === "preparing" ? state.label : "Reading the roof…"}
          </div>
        )}

        {state.s === "not_configured" && (
          <p className="rounded-[var(--radius)] border border-dashed border-[var(--cls-estimated)] bg-[var(--cls-estimated-soft)] p-3 text-[13px] text-fg-secondary">
            {state.message}
          </p>
        )}
        {state.s === "error" && (
          <p className="rounded-[var(--radius)] border border-critical bg-critical-soft p-3 text-[13px] text-critical-fg">
            {state.message}
          </p>
        )}

        {r && (
          <div className="space-y-4">
            {done && done.frames.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {done.frames.map((src: string) => (
                  <li key={src}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="size-16 rounded-[var(--radius)] border border-border object-cover" />
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <DataBadge cls="ai" />
              <Badge tone={r.image_quality.rating === "good" ? "good" : r.image_quality.rating === "fair" ? "warn" : "serious"}>
                Image quality: {r.image_quality.rating}
              </Badge>
              <span className="text-[12.5px] text-fg-muted">{r.image_quality.notes}</span>
            </div>

            <div className="space-y-2">
              <h4 className="micro">Suggestions — confirm each one</h4>
              <SuggestionRow
                label="Building type"
                s={r.suggestions.house_type}
                render={(v) => String(v)}
                applied={applied.has("house_type")}
                onApply={(v) => apply("house_type", { house_type: v as HouseType })}
              />
              <SuggestionRow
                label="Roof orientation"
                s={r.suggestions.roof_orientation}
                render={(v) => String(v)}
                applied={applied.has("roof_orientation")}
                onApply={(v) => apply("roof_orientation", { roof_orientation: v as RoofOrientation })}
              />
              <SuggestionRow
                label="Roof tilt"
                s={r.suggestions.roof_tilt_deg}
                render={(v) => `${v}°`}
                applied={applied.has("roof_tilt_deg")}
                onApply={(v) => apply("roof_tilt_deg", { roof_tilt_deg: Number(v) })}
              />
              {r.suggestions.obstructed_fraction && roofAreaM2 !== null && (
                <SuggestionRow
                  label="Usable roof area"
                  s={{
                    ...r.suggestions.obstructed_fraction,
                    value: Math.round(roofAreaM2 * (1 - r.suggestions.obstructed_fraction.value) * 10) / 10,
                  }}
                  render={(v) => `${v} m² of your ${roofAreaM2} m²`}
                  applied={applied.has("available")}
                  onApply={(v) => apply("available", { available_roof_area_m2: Number(v) })}
                />
              )}
              {r.shading_notes && (
                <SuggestionRow
                  label="Shading notes"
                  s={{ value: r.shading_notes, confidence: "medium", why: "Written from what is visible in the images." }}
                  render={(v) => String(v)}
                  applied={applied.has("shading_notes")}
                  onApply={(v) => apply("shading_notes", { shading_notes: String(v) })}
                />
              )}
            </div>

            {r.obstructions.length > 0 && (
              <Detail title="On the roof" items={r.obstructions.map((o) => `${o.item} — ${o.note}`)} />
            )}
            {r.shading.length > 0 && (
              <Detail title="Possible shading" items={r.shading.map((o) => `${o.source} — ${o.note}`)} />
            )}

            <div className="rounded-[var(--radius)] border border-dashed border-border-strong p-3">
              <h4 className="micro">Could not be determined from the images</h4>
              <ul className="mt-1.5 list-inside list-disc text-[13px] leading-snug text-fg-secondary">
                {r.cannot_determine.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-2 text-[12.5px] text-fg-muted">{r.disclaimer}</p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SuggestionRow<T extends string | number>({
  label,
  s,
  render,
  applied,
  onApply,
}: {
  label: string;
  s: { value: T; confidence: "low" | "medium" | "high"; why: string } | null | undefined;
  render: (v: T) => string;
  applied: boolean;
  onApply: (v: T) => void;
}) {
  if (!s) return null;
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 border-b border-border pb-2 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="micro">{label}</span>
          <Badge tone={s.confidence === "high" ? "good" : s.confidence === "medium" ? "warn" : "neutral"}>
            {s.confidence} confidence
          </Badge>
        </div>
        <p className="mt-0.5 text-[14px] font-medium text-fg">{render(s.value)}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-fg-muted">{s.why}</p>
      </div>
      <Button type="button" size="sm" variant={applied ? "ghost" : "outline"} disabled={applied} onClick={() => onApply(s.value)}>
        {applied ? <Check className="size-3.5" aria-hidden="true" /> : null}
        {applied ? "Added" : "Use this"}
      </Button>
    </div>
  );
}

function Detail({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="micro">{title}</h4>
      <ul className="mt-1.5 list-inside list-disc text-[13px] leading-snug text-fg-secondary">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
