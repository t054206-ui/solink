"use client";
import { useId } from "react";
import { Input, Select, Label } from "@/components/ui/Form";
import { InfoTip } from "@/components/help/InfoTip";
import type { FieldAvailability } from "@/lib/types";
import type { AnySpec } from "./admin-helpers";

type Mode = "value" | FieldAvailability;
const MODE_LABEL: Record<Mode, string> = { value: "Value", unavailable: "Unavailable", not_applicable: "Not applicable", pending_verification: "Pending verification" };

/**
 * Editor for one SpecValue: either {value, unit} or {value: null, status}.
 * Missing data is recorded honestly — there is no default number.
 */
export function SpecField({ label, value, onChange, unit, kind = "number", required, help, term, disabled }: {
  label: string; value: AnySpec | undefined; onChange: (v: AnySpec) => void; unit?: string; kind?: "number" | "text"; required?: boolean; help?: string; term?: string; disabled?: boolean;
}) {
  const id = useId();
  const mode: Mode = value && value.value !== null && value.value !== undefined ? "value" : ((value as { status?: FieldAvailability } | undefined)?.status ?? "unavailable");
  const current = value && value.value !== null && value.value !== undefined ? value.value : "";
  const currentUnit = (value as { unit?: string } | undefined)?.unit ?? unit ?? "";

  const setMode = (m: Mode) => {
    if (m === "value") onChange(kind === "number" ? { value: NaN as unknown as number, unit: unit || undefined } : { value: "" });
    else onChange({ value: null, status: m });
  };
  const setValue = (raw: string) => {
    if (kind === "number") {
      const n = raw === "" ? NaN : Number(raw);
      onChange({ value: n, unit: currentUnit || undefined });
    } else onChange({ value: raw });
  };
  const invalid = mode === "value" && kind === "number" && (typeof current !== "number" || !Number.isFinite(current));

  return (
    <div className="rounded-[10px] border border-border bg-inset p-3">
      <Label htmlFor={`${id}-v`} className="mb-1">
        {label}{required && <span className="text-critical-fg" aria-hidden> *</span>}{term && <InfoTip term={term} />}
      </Label>
      <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px]">
        <Select aria-label={`${label} availability`} value={mode} onChange={(e) => setMode(e.target.value as Mode)} disabled={disabled} className="col-span-2 sm:col-span-1">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
        </Select>
        {mode === "value" ? (
          <>
            <Input id={`${id}-v`} type={kind === "number" ? "number" : "text"} inputMode={kind === "number" ? "decimal" : undefined} step="any"
              value={typeof current === "number" ? (Number.isFinite(current) ? current : "") : current} onChange={(e) => setValue(e.target.value)} disabled={disabled}
              aria-invalid={invalid || undefined} aria-describedby={`${id}-h`} placeholder={kind === "number" ? "Enter number" : "Enter text"} />
            {kind === "number" ? (
              <Input aria-label={`${label} unit`} value={currentUnit} onChange={(e) => onChange({ value: current as number, unit: e.target.value || undefined })} disabled={disabled} placeholder="unit" />
            ) : <span aria-hidden className="hidden sm:block" />}
          </>
        ) : (
          <div className="col-span-2 flex items-center text-[12.5px] text-fg-muted sm:col-span-2">Recorded as “{MODE_LABEL[mode]}” — no value is stored.</div>
        )}
      </div>
      <p id={`${id}-h`} className="mt-1 text-[11.5px] text-fg-muted">
        {invalid ? <span className="text-critical-fg">Enter a number or switch to Unavailable / Pending verification.</span> : help ?? (required ? "Required for solar panels; a missing value is flagged, never guessed." : "Leave as Unavailable if the datasheet does not state it.")}
      </p>
    </div>
  );
}
