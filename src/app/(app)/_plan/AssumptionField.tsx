"use client";
import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { DataBadge } from "@/components/ui/DataBadge";
import { Placeholder } from "@/components/ui/Placeholder";
import { Input, Label } from "@/components/ui/Form";
import { InfoTip } from "@/components/help/InfoTip";
import type { PlaceholderKey } from "@/lib/config/placeholders";
import type { DataClass } from "@/lib/classification";

export interface PlatformValue { value: number; source: string }

/** Resolve an assumption: the user's own value wins, then the platform setting, else nothing. */
export function resolveAssumption(user: number | null | undefined, platform: PlatformValue | null | undefined): { value: number | null; cls: DataClass; source?: string } {
  if (typeof user === "number" && Number.isFinite(user)) return { value: user, cls: "user" };
  if (platform && Number.isFinite(platform.value)) return { value: platform.value, cls: "source", source: platform.source };
  return { value: null, cls: "unavailable" };
}

/**
 * One assumption row: pre-filled from a platform setting (badge: source) when an
 * admin has supplied it, otherwise empty with the matching [PLACEHOLDER] and a
 * field for the user to enter their own value (badge: user-provided).
 * No default number is ever suggested.
 */
export function AssumptionField({ label, term, placeholderKey, unit, platform, value, onChange, help, step = "any", min, note }: {
  label: string; term?: string; placeholderKey: PlaceholderKey; unit?: string;
  platform: PlatformValue | null | undefined; value: number | null; onChange: (v: number | null) => void;
  help: string; step?: string; min?: number;
  /** Why the platform value is what it is, or why there is none, when a sentence is owed (e.g. the tariff sector). */
  note?: string | null;
}) {
  const id = useId();
  const resolved = resolveAssumption(value, platform);
  const shown = value ?? platform?.value ?? null;
  return (
    <div className="rounded-[10px] border border-border bg-inset p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id} className="mb-0">{label}{term && <InfoTip term={term} />}</Label>
        <DataBadge cls={resolved.cls} compact={resolved.cls !== "source"} source={resolved.source} />
      </div>
      <p className="mt-1 text-[12px] text-fg-muted leading-snug">{help}</p>
      <div className="mt-2 flex items-center gap-2">
        <Input id={id} type="number" inputMode="decimal" step={step} min={min} value={shown ?? ""} placeholder={platform ? undefined : "Enter a value"}
          aria-describedby={`${id}-help`}
          onChange={(e) => { const raw = e.target.value; onChange(raw === "" ? null : Number(raw)); }} />
        {unit && <span className="shrink-0 text-[12.5px] text-fg-muted">{unit}</span>}
        {value !== null && platform && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[10px] border border-border px-2 text-[12px] text-fg-secondary hover:bg-elevated" aria-label={`Reset ${label} to platform value`}>
            <RotateCcw className="size-3.5" aria-hidden /> Reset
          </button>
        )}
      </div>
      <div id={`${id}-help`} className="mt-1.5 text-[11.5px] text-fg-muted">
        {resolved.cls === "unavailable" && <>Not set by the platform: <Placeholder k={placeholderKey} />. Any value you enter is labeled user-provided.</>}
        {resolved.cls === "source" && <>From platform setting: {resolved.source}. Edit to override with your own value.</>}
        {resolved.cls === "user" && (platform ? <>Your override replaces the platform value {platform.value}{unit ? ` ${unit}` : ""}.</> : <>Your value. Solink has not verified it.</>)}
        {note && resolved.cls !== "user" && <p className="mt-1 text-fg-secondary">{note}</p>}
      </div>
    </div>
  );
}
