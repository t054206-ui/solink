"use client";
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Placeholder } from "@/components/ui/Placeholder";
import { InfoTip } from "@/components/help/InfoTip";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { DataMode } from "@/lib/data/mode";
import type { HouseType, RoofOrientation, SolarProfile, TariffCategory } from "@/lib/types";
import { TARIFF_CATEGORIES, TARIFF_CATEGORY_LABELS } from "@/lib/solar/tariff";
import { cn } from "@/lib/utils";
import { saveProfile } from "./actions";
import { PROFILE_STORE_KEY, mergeProfile, profileCompleteness, resolveRoofArea, type ProfileDraft } from "../_plan/profileStore";

const HOUSE_TYPES: { value: HouseType; label: string }[] = [
  { value: "villa", label: "Villa" }, { value: "townhouse", label: "Townhouse" }, { value: "apartment_building", label: "Apartment building" },
  { value: "commercial", label: "Commercial" }, { value: "other", label: "Other" },
];
const ORIENTATIONS: { value: RoofOrientation; label: string }[] = [
  { value: "unknown", label: "Unknown" }, { value: "flat", label: "Flat roof" }, { value: "N", label: "North" }, { value: "NE", label: "North-east" },
  { value: "E", label: "East" }, { value: "SE", label: "South-east" }, { value: "S", label: "South" }, { value: "SW", label: "South-west" },
  { value: "W", label: "West" }, { value: "NW", label: "North-west" },
];

/**
 * MEW bills by the property's sector, so the house type usually decides the
 * tariff sector. Offered as a suggestion the moment a house type is chosen and
 * the sector is still blank; never overwrites a sector the user has set.
 * Yearbook 2020, p. 113: private houses are Residential, apartment buildings
 * are Investmental & Commercial. "Other" suggests nothing.
 */
const SUGGESTED_TARIFF_CATEGORY: Partial<Record<HouseType, TariffCategory>> = {
  villa: "residential", townhouse: "residential", apartment_building: "investment_commercial", commercial: "investment_commercial",
};

type SaveState = { tone: "good" | "warn" | "critical"; message: string } | null;

const toNum = (raw: string): number | null => { if (raw.trim() === "") return null; const n = Number(raw); return Number.isFinite(n) ? n : null; };
const show = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function toDraft(p: SolarProfile | null): ProfileDraft {
  if (!p) return { country_code: "KW", currency: "KWD" };
  const { id: _id, user_id: _uid, updated_at: _u, ...rest } = p;
  void _id; void _uid; void _u;
  return rest;
}

export function ProfileForm({ profile, mode }: { profile: SolarProfile | null; mode: DataMode }) {
  const [local, setLocal, localLoaded] = useLocalStore<ProfileDraft | null>(PROFILE_STORE_KEY, null);
  // `draft` is null until the user edits; until then the form shows the stored values (server profile merged with local edits in demo mode).
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const stored = useMemo(() => toDraft(mergeProfile(profile, mode === "demo" ? local : null)), [profile, local, mode]);
  const values: ProfileDraft = draft ?? stored;
  const update = (patch: ProfileDraft) => setDraft({ ...values, ...patch });

  const [areaMode, setAreaMode] = useState<"dimensions" | "direct" | null>(null);
  const effectiveAreaMode = areaMode ?? (typeof values.roof_area_m2 === "number" && !(typeof values.roof_length_m === "number" && typeof values.roof_width_m === "number") ? "direct" : "dimensions");
  const dims = resolveRoofArea({ roof_area_m2: null, roof_length_m: values.roof_length_m ?? null, roof_width_m: values.roof_width_m ?? null });
  const roofArea = effectiveAreaMode === "dimensions" ? dims.value : (values.roof_area_m2 ?? null);

  const [saving, setSaving] = useState(false);
  const [save, setSave] = useState<SaveState>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});


  const payload: ProfileDraft = { ...values, roof_area_m2: roofArea };
  const completeness = profileCompleteness(mergeProfile(profile, payload));
  const hasLocalEdits = mode === "demo" && localLoaded && local !== null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    const hasUse = typeof payload.monthly_consumption_kwh === "number" || typeof payload.monthly_bill === "number";
    if (!hasUse) e.consumption = "Enter your monthly electricity use in kWh or your monthly bill.";
    if (roofArea === null) e.roof = effectiveAreaMode === "dimensions" ? "Enter roof length and width (or switch to entering the area directly)." : "Enter your roof area.";
    if (typeof payload.available_roof_area_m2 === "number" && roofArea !== null && payload.available_roof_area_m2 > roofArea) e.available = "Available area cannot exceed the total roof area.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setSave(null);
    if (!validate()) { setSave({ tone: "critical", message: "Please fix the highlighted fields." }); return; }
    setSaving(true);
    try {
      const toSave: ProfileDraft = { ...payload };
      const res = await saveProfile(toSave);
      if (res.ok) {
        setDraft(null);
        setSave({ tone: "good", message: "Profile saved." });
      } else if (res.reason === "demo") {
        setLocal(toSave);
        setDraft(null);
        setSave({ tone: "warn", message: `Saved on this device (demo mode: Supabase not connected).${photoNote}` });
      } else {
        setSave({ tone: "critical", message: res.message });
      }
    } catch (err) {
      setSave({ tone: "critical", message: err instanceof Error ? err.message : "Saving failed." });
    } finally { setSaving(false); }
  }

  function resetLocal() {
    setLocal(null);
    try { localStorage.removeItem(`solink:${PROFILE_STORE_KEY}`); } catch {}
    setDraft(null);
    setSave({ tone: "warn", message: "Local edits cleared; showing the demo profile again." });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {mode === "demo" && (
        <DemoBanner detail={hasLocalEdits ? "You have edited this profile on this device; your edits are labeled user-provided and never leave the browser." : "This is a sample profile. Edit it and your values are saved on this device only."} />
      )}

      <CompletenessCard completeness={completeness} />

      {/* Your home. The address, the map and the coordinates left this page on
          2026-09-23: Solar Potential and the Placement Guide resolve a location
          properly, and what they resolve is saved to this profile. What stays
          here is what only the owner can say. */}
      <Card>
        <CardHeader title="Your home" subtitle="What kind of property it is, and where in Kuwait. The exact location comes from Solar Potential or the Placement Guide, so it is not asked for twice." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Governorate" hint={<DataBadge cls="user" compact />}>
            <Input id="governorate" aria-label="Governorate" value={values.governorate ?? ""} onChange={(e) => update({ governorate: e.target.value || null })} placeholder="e.g. Hawalli" />
          </Field>
          <Field label="House type" hint={<DataBadge cls="user" compact />}>
            <Select id="house_type" aria-label="House type" value={values.house_type ?? ""} onChange={(e) => {
              const house_type = (e.target.value || null) as HouseType | null;
              const suggested = house_type ? SUGGESTED_TARIFF_CATEGORY[house_type] : undefined;
              update({ house_type, ...(values.tariff_category == null && suggested ? { tariff_category: suggested } : {}) });
            }}>
              <option value="">Select…</option>
              {HOUSE_TYPES.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </Select>
          </Field>
          {typeof values.lat === "number" && typeof values.lng === "number" && (
            <p className="text-[12.5px] leading-relaxed text-fg-muted sm:col-span-2">
              A location is on record for this profile{values.address ? <>: <span className="text-fg-secondary">{values.address}</span></> : null}. It came from Solar Potential or the Placement Guide, and running either again replaces it.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Roof */}
      <Card>
        <CardHeader title={<>Roof <InfoTip term="roof_size" /></>} subtitle="Size, orientation and anything that casts shade. Roof area is required. To work from a photo of the roof instead, use the Solar Designer: it reads a picture and traces what is on it." />
        <CardBody className="grid gap-4">
          <div role="radiogroup" aria-label="How to enter roof area" className="inline-flex w-fit rounded-[10px] border border-border bg-inset p-0.5 text-[13px]">
            {(["dimensions", "direct"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={effectiveAreaMode === m} onClick={() => setAreaMode(m)}
                className={cn("rounded-[8px] px-3 py-1.5 font-medium", effectiveAreaMode === m ? "bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg-secondary")}>
                {m === "dimensions" ? "Length × width" : "Area directly"}
              </button>
            ))}
          </div>

          {effectiveAreaMode === "dimensions" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Roof length (m)" hint={<DataBadge cls="user" compact />} error={errors.roof}>
                <Input id="roof_length_m" aria-label="Roof length in metres" type="number" inputMode="decimal" step="0.1" min={0} value={show(values.roof_length_m)} onChange={(e) => update({ roof_length_m: toNum(e.target.value) })} />
              </Field>
              <Field label="Roof width (m)" hint={<DataBadge cls="user" compact />}>
                <Input id="roof_width_m" aria-label="Roof width in metres" type="number" inputMode="decimal" step="0.1" min={0} value={show(values.roof_width_m)} onChange={(e) => update({ roof_width_m: toNum(e.target.value) })} />
              </Field>
              <Field label="Roof area (m²)" hint={<DataBadge cls="calculated" compact />} help="length × width">
                <div className="flex h-10 items-center rounded-[10px] border border-dashed border-border-strong bg-inset px-3 text-sm tabular text-fg" aria-live="polite">{dims.value === null ? "—" : dims.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}</div>
              </Field>
            </div>
          ) : (
            <Field label="Roof area (m²)" hint={<DataBadge cls="user" compact />} error={errors.roof} className="sm:max-w-xs">
              <Input id="roof_area_m2" aria-label="Roof area in square metres" type="number" inputMode="decimal" step="0.1" min={0} value={show(values.roof_area_m2)} onChange={(e) => update({ roof_area_m2: toNum(e.target.value) })} />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Available area for panels (m²)" hint={<DataBadge cls="user" compact />} error={errors.available} help="Excluding tanks, AC units, walkways and shaded parts.">
              <Input id="available_roof_area_m2" aria-label="Available roof area for panels in square metres" type="number" inputMode="decimal" step="0.1" min={0} value={show(values.available_roof_area_m2)} onChange={(e) => update({ available_roof_area_m2: toNum(e.target.value) })} />
            </Field>
            <Field label={<>Roof orientation <InfoTip term="orientation" /></>} hint={<DataBadge cls="user" compact />}>
              <Select id="roof_orientation" aria-label="Roof orientation" value={values.roof_orientation ?? ""} onChange={(e) => update({ roof_orientation: (e.target.value || null) as RoofOrientation | null })}>
                <option value="">Select…</option>
                {ORIENTATIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label={<>Roof tilt (°) <InfoTip term="tilt" /></>} hint={<DataBadge cls="user" compact />} help="0° for a flat roof.">
              <Input id="roof_tilt_deg" aria-label="Roof tilt in degrees" type="number" inputMode="decimal" step="1" min={0} max={90} value={show(values.roof_tilt_deg)} onChange={(e) => update({ roof_tilt_deg: toNum(e.target.value) })} />
            </Field>
          </div>

          <Field label={<>Shading notes <InfoTip term="shading" /></>} hint={<DataBadge cls="user" compact />} help="Water tanks, neighbouring buildings, parapets, trees: and when they cast shade.">
            <Textarea id="shading_notes" aria-label="Shading notes" value={values.shading_notes ?? ""} onChange={(e) => update({ shading_notes: e.target.value || null })} placeholder="e.g. Two water tanks on the north-east corner; neighbour's building shades the west edge after 3 pm." />
          </Field>
        </CardBody>
      </Card>

      {/* Electricity & budget */}
      <Card>
        <CardHeader title={<>Electricity and budget <InfoTip term="monthly_consumption" /></>} subtitle="Enter your monthly consumption in kWh or your monthly bill. One is required." />
        <CardBody className="grid gap-4">
          <Field label="Electricity tariff sector" hint={<DataBadge cls="user" compact />} className="sm:max-w-md"
            help="MEW prices a kWh by the sector the property is billed under, not by who lives there. A private house is Residential; an apartment building is Investmental & Commercial. Savings estimates use this sector's rate when the platform has one.">
            <Select id="tariff_category" aria-label="Electricity tariff sector" value={values.tariff_category ?? ""} onChange={(e) => update({ tariff_category: (e.target.value || null) as TariffCategory | null })}>
              <option value="">Not sure / not stated</option>
              {TARIFF_CATEGORIES.map((c) => <option key={c} value={c}>{TARIFF_CATEGORY_LABELS[c]}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={<>Monthly consumption (kWh) <InfoTip term="kwh" /></>} hint={<DataBadge cls="user" compact />} error={errors.consumption} help="From your electricity bill or meter.">
              <Input id="monthly_consumption_kwh" aria-label="Monthly consumption in kWh" type="number" inputMode="decimal" step="1" min={0} value={show(values.monthly_consumption_kwh)} onChange={(e) => update({ monthly_consumption_kwh: toNum(e.target.value) })} />
            </Field>
            <Field label="Monthly bill" hint={<DataBadge cls="user" compact />} help={<>Converting a bill to kWh needs the tariff: <Placeholder k="ELECTRICITY_TARIFF" /></>}>
              <div className="flex gap-2">
                <Input id="monthly_bill" aria-label="Monthly bill" type="number" inputMode="decimal" step="0.001" min={0} value={show(values.monthly_bill)} onChange={(e) => update({ monthly_bill: toNum(e.target.value) })} />
                <Select id="currency" aria-label="Currency" value={values.currency ?? "KWD"} onChange={(e) => update({ currency: e.target.value })} className="w-24 shrink-0"><option value="KWD">KWD</option></Select>
              </div>
            </Field>
            <Field label="Budget" hint={<DataBadge cls="user" compact />} help="Optional. Helps the recommendation stay realistic.">
              <div className="flex gap-2">
                <Input id="budget" aria-label="Budget" type="number" inputMode="decimal" step="1" min={0} value={show(values.budget)} onChange={(e) => update({ budget: toNum(e.target.value) })} />
                <span className="flex h-10 shrink-0 items-center text-[13px] text-fg-muted">{values.currency ?? "KWD"}</span>
              </div>
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-elevated/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-[var(--radius-lg)] sm:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-[13px]" role="status" aria-live="polite">
            {save && (
              <span className={cn("inline-flex items-start gap-1.5", save.tone === "good" && "text-good-fg", save.tone === "warn" && "text-warn-fg", save.tone === "critical" && "text-critical-fg")}>
                {save.tone === "good" && <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}{save.message}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {hasLocalEdits && <Button type="button" variant="ghost" onClick={resetLocal}>Clear local edits</Button>}
            {completeness.readyForAnalysis && <Button href="/analysis" variant="outline"><Sun className="size-4" aria-hidden /> Solar Potential</Button>}
            <Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}{saving ? "Saving…" : "Save profile"}</Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function CompletenessCard({ completeness }: { completeness: ReturnType<typeof profileCompleteness> }) {
  const next = completeness.missingRequired[0] ?? completeness.missingOptional[0];
  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[15px] font-semibold text-fg">Profile {completeness.pct}% complete</div>
          {completeness.readyForAnalysis
            ? <span className="inline-flex items-center gap-1 text-[13px] text-good-fg"><CheckCircle2 className="size-4" aria-hidden /> Ready for <Link href="/analysis" className="underline">Solar Potential</Link></span>
            : <span className="text-[13px] text-fg-secondary">Add {next?.label.toLowerCase()} to unlock Solar Potential</span>}
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-inset" role="progressbar" aria-valuenow={completeness.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
          <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${completeness.pct}%` }} />
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
          {completeness.items.map((i) => (
            <li key={i.key} className={cn("rounded-full border px-2 py-0.5", i.done ? "border-transparent bg-good-soft text-good-fg" : i.required ? "border-transparent bg-warn-soft text-warn-fg" : "border-border text-fg-muted")}>
              {i.done ? "✓ " : ""}{i.label}{!i.done && i.required ? " (required)" : ""}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
