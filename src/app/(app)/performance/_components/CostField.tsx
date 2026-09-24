"use client";
import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { DataBadge } from "@/components/ui/DataBadge";
import { Input, Label } from "@/components/ui/Form";
import { InfoTip } from "@/components/help/InfoTip";
import type { PlaceholderKey } from "@/lib/config/placeholders";
import type { DataClass } from "@/lib/classification";
import type { PrefilledCost } from "./rows";

export interface ResolvedCost {
  value: number | null;
  cls: DataClass;
  source?: string;
  notes: string[];
}

/**
 * Resolve a cost input: what you typed wins, then a figure derived from your own
 * records, otherwise nothing. No cost is ever defaulted to zero or to a market
 * average — an unknown cost stays unknown.
 */
export function resolveCost(user: number | null | undefined, recorded: PrefilledCost | null | undefined): ResolvedCost {
  if (typeof user === "number" && Number.isFinite(user)) return { value: user, cls: "user", notes: ["You entered this figure. Solink has not verified it."] };
  if (recorded && typeof recorded.value === "number" && Number.isFinite(recorded.value)) {
    return { value: recorded.value, cls: "calculated", source: recorded.source ?? "Your records", notes: recorded.notes };
  }
  return { value: null, cls: "unavailable", notes: recorded?.notes ?? [] };
}

/**
 * One cost row for the TCO model. Pre-filled from the costs recorded against
 * this system when they exist (labeled calculated, with the formula); otherwise
 * an ordinary optional input for your own quote (owner, 2026-09-24: no
 * placeholder text for homeowners). Anything you type is labeled user-provided.
 */
export function CostField({ label, term, placeholderKey, unit = "KWD", recorded, value, onChange, help }: {
  label: string;
  term?: string;
  placeholderKey?: PlaceholderKey;
  unit?: string;
  recorded?: PrefilledCost | null;
  value: number | null;
  onChange: (v: number | null) => void;
  help: string;
}) {
  const id = useId();
  const resolved = resolveCost(value, recorded);
  const shown = value ?? (typeof recorded?.value === "number" ? recorded.value : null);
  return (
    <div className="rounded-[10px] border border-border bg-inset p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id} className="mb-0">{label}{term && <InfoTip term={term} />}</Label>
        <DataBadge cls={resolved.cls} compact />
      </div>
      <p className="mt-1 text-[12px] leading-snug text-fg-muted">{help}</p>
      <div className="mt-2 flex items-center gap-2">
        <Input id={id} type="number" inputMode="decimal" step="any" min={0} value={shown ?? ""} placeholder="Enter amount"
          aria-describedby={`${id}-help`} onChange={(e) => { const raw = e.target.value; onChange(raw === "" ? null : Number(raw)); }} />
        <span className="shrink-0 text-[12.5px] text-fg-muted">{unit}</span>
        {value !== null && (
          <button type="button" onClick={() => onChange(null)} aria-label={`Clear ${label}`}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[10px] border border-border px-2 text-[12px] text-fg-secondary hover:bg-elevated">
            <RotateCcw className="size-3.5" aria-hidden /> Clear
          </button>
        )}
      </div>
      <div id={`${id}-help`} className="mt-1.5 space-y-0.5 text-[11.5px] leading-snug text-fg-muted">
        {resolved.cls === "unavailable" && (
          <div data-placeholder={placeholderKey}>Optional · your quote. It is labelled as yours.</div>
        )}
        {resolved.cls === "calculated" && <div>From your own records: {resolved.source}. Type your own figure to override it.</div>}
        {resolved.cls === "user" && recorded?.value !== null && recorded?.value !== undefined && <div>Your figure replaces the {recorded.value} {unit} derived from your records.</div>}
        {resolved.notes.map((n, i) => <div key={i} className="break-words">· {n}</div>)}
      </div>
    </div>
  );
}
