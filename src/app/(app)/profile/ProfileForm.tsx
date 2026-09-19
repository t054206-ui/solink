"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, MapPin, Search, Sun, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { InfoTip } from "@/components/help/InfoTip";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { DataMode } from "@/lib/data/mode";
import type { HouseType, RoofOrientation, SolarProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapView } from "./MapView";
import { saveProfile, uploadRoofPhoto } from "./actions";
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

type GeoCandidate = { formatted_address: string; lat: number; lng: number };
type GeoState = { status: "idle" } | { status: "loading" } | { status: "results"; items: GeoCandidate[] } | { status: "not_configured" } | { status: "zero" } | { status: "error"; message: string };
type SaveState = { tone: "good" | "warn" | "critical"; message: string } | null;

const toNum = (raw: string): number | null => { if (raw.trim() === "") return null; const n = Number(raw); return Number.isFinite(n) ? n : null; };
const show = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function toDraft(p: SolarProfile | null): ProfileDraft {
  if (!p) return { country_code: "KW", currency: "KWD" };
  const { id: _id, user_id: _uid, updated_at: _u, ...rest } = p;
  void _id; void _uid; void _u;
  return rest;
}

export function ProfileForm({ profile, mode, existingPhotoUrl }: { profile: SolarProfile | null; mode: DataMode; existingPhotoUrl: string | null }) {
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

  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [manualCoords, setManualCoords] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [save, setSave] = useState<SaveState>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const payload: ProfileDraft = { ...values, roof_area_m2: roofArea };
  const completeness = profileCompleteness(mergeProfile(profile, payload));
  const hasLocalEdits = mode === "demo" && localLoaded && local !== null;

  async function findOnMap() {
    const q = (values.address ?? "").trim();
    if (q.length < 2) { setErrors((e) => ({ ...e, address: "Enter an address to search." })); return; }
    setErrors((e) => { const { address: _a, ...rest } = e; void _a; return rest; });
    setGeo({ status: "loading" });
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(q)}`);
      const json = (await res.json()) as { ok: true; data: GeoCandidate[] } | { ok: false; reason: string; message?: string };
      if (json.ok) setGeo(json.data.length ? { status: "results", items: json.data } : { status: "zero" });
      else if (json.reason === "not_configured") { setGeo({ status: "not_configured" }); setManualCoords(true); }
      else if (json.reason === "zero_results") setGeo({ status: "zero" });
      else setGeo({ status: "error", message: json.message ?? "Geocoding failed." });
    } catch { setGeo({ status: "error", message: "Could not reach the geocoding service." }); }
  }

  function pickCandidate(c: GeoCandidate) {
    update({ address: c.formatted_address, lat: c.lat, lng: c.lng });
    setGeo({ status: "idle" });
  }

  function onPhotoChange(f: File | null) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const hasUse = typeof payload.monthly_consumption_kwh === "number" || typeof payload.monthly_bill === "number";
    if (!hasUse) e.consumption = "Enter your monthly electricity use in kWh or your monthly bill.";
    if (roofArea === null) e.roof = effectiveAreaMode === "dimensions" ? "Enter roof length and width (or switch to entering the area directly)." : "Enter your roof area.";
    if (typeof payload.available_roof_area_m2 === "number" && roofArea !== null && payload.available_roof_area_m2 > roofArea) e.available = "Available area cannot exceed the total roof area.";
    if ((typeof payload.lat === "number") !== (typeof payload.lng === "number")) e.coords = "Enter both latitude and longitude.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setSave(null);
    if (!validate()) { setSave({ tone: "critical", message: "Please fix the highlighted fields." }); return; }
    setSaving(true);
    try {
      let toSave: ProfileDraft = { ...payload };
      let photoNote = "";
      if (photoFile) {
        const fd = new FormData(); fd.append("file", photoFile);
        const up = await uploadRoofPhoto(fd);
        if (up.ok) toSave = { ...toSave, roof_photo_path: up.path };
        else if (up.reason === "demo") photoNote = " Photo kept as a preview only. Storage requires Supabase.";
        else { setSave({ tone: "critical", message: `Photo upload failed: ${up.message}` }); setSaving(false); return; }
      }
      const res = await saveProfile(toSave);
      if (res.ok) {
        setDraft(null);
        setSave({ tone: "good", message: `Profile saved.${photoNote}` });
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

      {/* Location */}
      <Card>
        <CardHeader title="Location" subtitle="Where the roof is. Used for the site map and, once connected, weather and solar-resource lookups." />
        <CardBody className="grid gap-4">
          <Field label="Address" hint={<DataBadge cls="user" compact />} error={errors.address} help="Street, area and governorate. Only the address text is sent to the geocoder.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="address" aria-label="Address" name="address" autoComplete="street-address" value={values.address ?? ""} onChange={(e) => update({ address: e.target.value || null })} placeholder="e.g. Block 3, Street 12, Salmiya" />
              <Button type="button" variant="outline" onClick={findOnMap} disabled={geo.status === "loading"} className="sm:shrink-0">
                {geo.status === "loading" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />} Find on map
              </Button>
            </div>
          </Field>

          {geo.status === "results" && (
            <ul className="divide-y divide-border rounded-[10px] border border-border" aria-label="Address matches">
              {geo.items.map((c, i) => (
                <li key={i}>
                  <button type="button" onClick={() => pickCandidate(c)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-[13px] hover:bg-inset">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
                    <span className="min-w-0"><span className="block text-fg">{c.formatted_address}</span><span className="tabular text-[11.5px] text-fg-muted">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {geo.status === "zero" && <p className="text-[13px] text-fg-secondary">No location matched that address. Try adding the area or governorate, or enter coordinates manually.</p>}
          {geo.status === "error" && <p className="text-[13px] text-critical-fg" role="alert">{geo.message}</p>}
          {geo.status === "not_configured" && <PlaceholderNote k="GOOGLE_MAPS_API_KEY" />}

          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <span className="text-fg-secondary">Coordinates</span>
            {typeof values.lat === "number" && typeof values.lng === "number" ? (
              <span className="inline-flex items-center gap-2"><span className="tabular text-fg">{values.lat.toFixed(6)}, {values.lng.toFixed(6)}</span><DataBadge cls={manualCoords ? "user" : "source"} compact source={manualCoords ? undefined : "Geocoder"} /></span>
            ) : <span className="text-fg-muted">not set</span>}
            <button type="button" onClick={() => setManualCoords((m) => !m)} className="text-[12.5px] font-medium text-[var(--brand-strong)] hover:underline">{manualCoords ? "Hide manual entry" : "Enter coordinates manually"}</button>
          </div>
          {manualCoords && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" hint={<DataBadge cls="user" compact />} error={errors.coords}>
                <Input id="lat" aria-label="Latitude" type="number" inputMode="decimal" step="any" min={-90} max={90} value={show(values.lat)} onChange={(e) => update({ lat: toNum(e.target.value) })} placeholder="29.3…" />
              </Field>
              <Field label="Longitude" hint={<DataBadge cls="user" compact />}>
                <Input id="lng" aria-label="Longitude" type="number" inputMode="decimal" step="any" min={-180} max={180} value={show(values.lng)} onChange={(e) => update({ lng: toNum(e.target.value) })} placeholder="47.9…" />
              </Field>
            </div>
          )}

          <MapView lat={values.lat} lng={values.lng} address={values.address} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Governorate" hint={<DataBadge cls="user" compact />}>
              <Input id="governorate" aria-label="Governorate" value={values.governorate ?? ""} onChange={(e) => update({ governorate: e.target.value || null })} placeholder="e.g. Hawalli" />
            </Field>
            <Field label="House type" hint={<DataBadge cls="user" compact />}>
              <Select id="house_type" aria-label="House type" value={values.house_type ?? ""} onChange={(e) => update({ house_type: (e.target.value || null) as HouseType | null })}>
                <option value="">Select…</option>
                {HOUSE_TYPES.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Roof */}
      <Card>
        <CardHeader title="Roof" subtitle="Size, orientation and anything that casts shade. Roof area is required." />
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
        <CardHeader title="Electricity and budget" subtitle="Enter your monthly consumption in kWh or your monthly bill. One is required." />
        <CardBody className="grid gap-4">
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

      {/* Roof photo */}
      <Card>
        <CardHeader title="Roof photo" subtitle={mode === "supabase" ? "Stored privately in your own folder (roof-photos/<your id>/…)." : "Preview only in demo mode. Storing photos requires Supabase."} />
        <CardBody className="grid gap-3">
          <input ref={fileInput} id="roof_photo" type="file" accept="image/*" className="sr-only" onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}><Upload className="size-4" aria-hidden /> Choose photo</Button>
            {photoFile && <button type="button" onClick={() => { onPhotoChange(null); if (fileInput.current) fileInput.current.value = ""; }} className="inline-flex items-center gap-1 text-[13px] text-fg-secondary hover:text-fg"><X className="size-3.5" aria-hidden /> Remove</button>}
            <span className="text-[12.5px] text-fg-muted">{photoFile ? `${photoFile.name} (${Math.round(photoFile.size / 1024)} KB)` : "JPG or PNG, up to 8 MB."}</span>
          </div>
          {(photoPreview || existingPhotoUrl) && (
            // eslint-disable-next-line @next/next/no-img-element -- object URL / signed URL preview; not an optimisable static asset
            <img src={photoPreview ?? existingPhotoUrl ?? ""} alt="Roof photo preview" className="max-h-72 w-full rounded-[var(--radius-lg)] border border-border object-cover" />
          )}
          {!photoPreview && !existingPhotoUrl && values.roof_photo_path && <p className="text-[12.5px] text-fg-muted">A photo is stored at <code className="font-mono">{values.roof_photo_path}</code>.</p>}
          {mode === "demo" && photoFile && <PlaceholderNote k="SUPABASE_PROJECT" />}
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
