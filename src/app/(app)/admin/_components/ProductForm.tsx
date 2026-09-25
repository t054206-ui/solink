"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Archive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Badge } from "@/components/ui/Badge";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { Manufacturer, Product, ProductCategory, ProviderCompany, VerificationStatus } from "@/lib/types";
import type { DataMode } from "@/lib/data/mode";
import { SpecField } from "./SpecField";
import { FlagList } from "./AdminBits";
import { saveProductAction, type ActionResult, type ProductInput } from "../actions";
import {
  ADMIN_PRODUCTS_STORE, CATEGORIES, CATEGORY_LABEL, COST_FIELDS, PANEL_SPEC_FIELDS, UNAVAILABLE, VERIFICATION_LABEL, VERIFICATION_STATUSES,
  newLocalId, toNumericSpec, validateProductSpecs, type AdminProductStore, type AnySpec,
} from "./admin-helpers";

function specsFromProduct(p?: Product): Record<string, AnySpec> {
  const out: Record<string, AnySpec> = {};
  for (const f of PANEL_SPEC_FIELDS) {
    const v = p?.specs?.[f.key as keyof typeof p.specs] as AnySpec | undefined;
    out[f.key] = v && typeof v === "object" && "value" in v ? v : UNAVAILABLE;
  }
  return out;
}

/** Strip NaN placeholders (an empty "Value" field) → pending_verification, never a fake number. */
function cleanSpec(v: AnySpec): AnySpec {
  if (typeof v.value === "number" && !Number.isFinite(v.value)) return { value: null, status: "pending_verification" };
  if (typeof v.value === "string" && v.value.trim() === "") return { value: null, status: "unavailable" };
  return v;
}

/**
 * One product form for two rooms. Admin: any manufacturer, full verification
 * controls. Manufacturer portal: `lockedManufacturer` pins the company to the
 * signed-in account, `canVerify={false}` removes the verification controls
 * (a manufacturer submits; an admin verifies, with a note), `basePath` points
 * the back link and the after-create redirect at the portal, and `saveAction`
 * is the portal's own server action, which enforces the same rules again.
 */
export function ProductForm({ initial, manufacturers, providers, mode, lockedManufacturer = null, canVerify = true, basePath = "/admin/products", saveAction }: {
  initial?: Product; manufacturers: Manufacturer[]; providers: ProviderCompany[]; mode: DataMode;
  lockedManufacturer?: Manufacturer | null; canVerify?: boolean; basePath?: string;
  saveAction?: (input: ProductInput) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [store, setStore] = useLocalStore<AdminProductStore>(ADMIN_PRODUCTS_STORE, {});
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? "solar_panel");
  const [manufacturerName, setManufacturerName] = useState(lockedManufacturer?.name ?? initial?.manufacturer_name ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [providerId, setProviderId] = useState(initial?.provider_id ?? "");
  const [specs, setSpecs] = useState<Record<string, AnySpec>>(() => specsFromProduct(initial));
  const [costs, setCosts] = useState<Record<string, AnySpec>>(() => Object.fromEntries(COST_FIELDS.map((c) => [c.key, (initial?.[c.key] as AnySpec | undefined) ?? UNAVAILABLE])));
  const [images, setImages] = useState((initial?.images ?? []).join("\n"));
  const [dataSource, setDataSource] = useState(initial?.source.data_source ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.source.source_url ?? "");
  const [datasheetUrl, setDatasheetUrl] = useState(initial?.source.datasheet_url ?? "");
  const [mfrDocUrl, setMfrDocUrl] = useState(initial?.source.manufacturer_doc_url ?? "");
  // Without verification controls, a submission is always pending: a new product
  // starts there, and editing a verified one sends it back for another look.
  const submittedStatus: VerificationStatus = initial && initial.source.verification_status !== "verified" ? initial.source.verification_status : "pending_verification";
  const [verificationState, setVerification] = useState<VerificationStatus>(initial?.source.verification_status ?? "unverified");
  const verification: VerificationStatus = canVerify ? verificationState : submittedStatus;
  const [verificationNote, setVerificationNote] = useState("");
  const [isOutdated, setIsOutdated] = useState(initial?.is_outdated ?? false);
  const [isArchived, setIsArchived] = useState(initial?.is_archived ?? false);

  const cleanedSpecs = useMemo(() => Object.fromEntries(Object.entries(specs).map(([k, v]) => [k, cleanSpec(v)])), [specs]);
  const flags = useMemo(() => validateProductSpecs(cleanedSpecs, category), [cleanedSpecs, category]);
  const needsNote = verification === "verified" && verificationNote.trim() === "";
  const wasVerified = initial?.source.verification_status === "verified";
  const isService = category.endsWith("_package") || category.endsWith("_service");

  const errors: string[] = [];
  if (!model.trim()) errors.push("Model is required.");
  if (!name.trim()) errors.push("Name is required.");
  if (!isService && !manufacturerName.trim()) errors.push("Manufacturer is required for equipment.");
  if (needsNote && !wasVerified) errors.push("Verified requires a “verified against source” note.");
  if (verification === "verified" && flags.length > 0) errors.push("Cannot mark Verified while validation flags exist. Resolve them against the source first (values are never auto-corrected).");

  const buildInput = (): ProductInput => ({
    id: initial?.id ?? null, category, manufacturer_name: manufacturerName, model, name, description: description.trim() || null,
    price: cleanSpec(costs.price), installation_cost: cleanSpec(costs.installation_cost), annual_maintenance_cost: cleanSpec(costs.annual_maintenance_cost),
    cleaning_cost: cleanSpec(costs.cleaning_cost), expected_annual_production_kwh: cleanSpec(costs.expected_annual_production_kwh),
    images: images.split("\n").map((s) => s.trim()).filter(Boolean), specs: cleanedSpecs,
    source: { data_source: dataSource, source_url: sourceUrl.trim() || null, datasheet_url: datasheetUrl.trim() || null, manufacturer_doc_url: mfrDocUrl.trim() || null },
    verification_status: verification, verification_note: verificationNote.trim() || null, is_outdated: isOutdated, is_archived: isArchived,
    is_demo: initial?.is_demo ?? false, provider_id: providerId || null,
  });

  const save = () => {
    if (errors.length) { setResult({ ok: false, text: errors[0] }); return; }
    const input = buildInput();
    if (mode === "demo") {
      const id = initial?.id ?? newLocalId();
      const now = new Date().toISOString();
      const product: Product = {
        id, category: input.category, manufacturer_id: lockedManufacturer?.id ?? initial?.manufacturer_id ?? null, manufacturer_name: input.manufacturer_name || "Manufacturer not stated",
        model: input.model, name: input.name, description: input.description, price: toNumericSpec(input.price), currency: "KWD",
        installation_cost: toNumericSpec(input.installation_cost), annual_maintenance_cost: toNumericSpec(input.annual_maintenance_cost), cleaning_cost: toNumericSpec(input.cleaning_cost),
        expected_annual_production_kwh: toNumericSpec(input.expected_annual_production_kwh), images: input.images, specs: { ...input.specs, additional: {} },
        source: { ...(initial?.source ?? { date_added: now }), data_source: input.source.data_source || "Manual admin entry (local browser only)", source_url: input.source.source_url, datasheet_url: input.source.datasheet_url, manufacturer_doc_url: input.source.manufacturer_doc_url, date_added: initial?.source.date_added ?? now, date_last_updated: now, verification_status: input.verification_status, verified_at: input.verification_status === "verified" ? (initial?.source.verified_at ?? now) : null, verified_by: null },
        is_demo: initial?.is_demo ?? false, is_archived: input.is_archived, is_outdated: input.is_outdated, current_version_id: initial?.current_version_id ?? null, provider_id: input.provider_id ?? null,
      };
      if (input.verification_status === "verified") product.source.verification_note = input.verification_note;
      setStore((prev) => ({ ...prev, [id]: product }));
      setResult({ ok: true, text: "Saved in this browser only (demo mode). Nothing was sent to a server." });
      if (!initial) router.push(`${basePath}/${id}`);
      return;
    }
    start(async () => {
      const r = await (saveAction ?? saveProductAction)(input);
      if (r.ok) { setResult({ ok: true, text: r.message ?? "Saved." }); if (!initial && r.id) router.push(`${basePath}/${r.id}`); else router.refresh(); }
      else setResult({ ok: false, text: r.error });
    });
  };

  const localCopy = initial ? store[initial.id] : undefined;

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
      {mode === "demo" && <DemoBanner text="LOCAL ONLY" detail="Supabase is not connected. This form saves to this browser’s storage; nothing reaches a database." />}
      {localCopy && <p className="text-[12px] text-fg-muted">A locally edited copy of this record exists in this browser and is shown here.</p>}
      {initial?.is_demo && <DemoBanner text="DEMO PRODUCT: NOT REAL" detail="This record is part of the labeled demo dataset." />}

      <Card>
        <CardHeader title="Identity" subtitle="What the product is. Manufacturer + model must be unique." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select>
          </Field>
          {lockedManufacturer ? (
            <Field label="Manufacturer" help="Your company. Products you add are listed under it and only you and Solink's administrators can edit them.">
              <Input value={lockedManufacturer.name} readOnly aria-readonly="true" className="bg-inset" />
            </Field>
          ) : (
            <Field label={isService ? "Company / manufacturer name" : "Manufacturer"} help="Type a new name or pick an existing one. New names are created as Unverified.">
              <Input list="mfr-list" value={manufacturerName} onChange={(e) => setManufacturerName(e.target.value)} placeholder="Manufacturer name" />
              <datalist id="mfr-list">{manufacturers.map((m) => <option key={m.id} value={m.name} />)}</datalist>
            </Field>
          )}
          <Field label="Model"><Input value={model} onChange={(e) => setModel(e.target.value)} required /></Field>
          <Field label="Display name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          {isService && (
            <Field label="Provider company" help="Services are offered by a provider (maps to solar_products.provider_id).">
              <Select value={providerId} onChange={(e) => setProviderId(e.target.value)}><option value="">None</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            </Field>
          )}
        </CardBody>
      </Card>

      {category === "solar_panel" && (
        <Card>
          <CardHeader title="Panel specifications" subtitle="One editor per PanelSpecifications field. Values come from the datasheet; anything missing is recorded as unavailable." action={<Badge tone={flags.length ? "warn" : "good"}>{flags.length} flag{flags.length === 1 ? "" : "s"}</Badge>} />
          <CardBody className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {PANEL_SPEC_FIELDS.map((f) => (
                <SpecField key={f.key} label={f.label} unit={f.unit} kind={f.kind} required={f.required} help={f.help} term={f.term} value={specs[f.key]} onChange={(v) => setSpecs((s) => ({ ...s, [f.key]: v }))} />
              ))}
            </div>
            <div className="rounded-[10px] border border-border bg-inset p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-fg"><AlertTriangle className="size-4 text-warn-fg" aria-hidden /> Validation flags (mirror of the database rules)</div>
              <p className="mb-2 text-[12px] text-fg-muted">Flags are shown for a human to check against the source. Solink never changes a value to make a flag disappear.</p>
              <FlagList flags={flags} />
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Prices & costs" subtitle="Only real quoted amounts. Missing prices show a placeholder in the marketplace: never zero." />
        <CardBody className="grid gap-3 md:grid-cols-2">
          {COST_FIELDS.map((c) => <SpecField key={c.key} label={c.label} unit={c.unit} kind="number" help={c.help} value={costs[c.key]} onChange={(v) => setCosts((s) => ({ ...s, [c.key]: v }))} />)}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Images & source tracking" subtitle="Where every field came from. Required for verification." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Image URLs (one per line)" className="sm:col-span-2"><Textarea value={images} onChange={(e) => setImages(e.target.value)} placeholder="https://…" /></Field>
          <Field label="Data source" help="e.g. “Manufacturer datasheet”, “Participating company”, “CSV import file.csv”."><Input value={dataSource} onChange={(e) => setDataSource(e.target.value)} /></Field>
          <Field label="Source URL"><Input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} /></Field>
          <Field label="Datasheet URL"><Input type="url" value={datasheetUrl} onChange={(e) => setDatasheetUrl(e.target.value)} /></Field>
          <Field label="Manufacturer document URL"><Input type="url" value={mfrDocUrl} onChange={(e) => setMfrDocUrl(e.target.value)} /></Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={canVerify ? "Verification & lifecycle" : "Verification"} subtitle={canVerify ? "Verified is an explicit human decision recorded with a note. Nothing is verified automatically." : "You submit; a Solink administrator verifies against your datasheet and records a note. You cannot set Verified yourself."} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {canVerify ? (
            <>
              <Field label="Verification status">
                <Select value={verification} onChange={(e) => setVerification(e.target.value as VerificationStatus)}>{VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{VERIFICATION_LABEL[s]}</option>)}</Select>
              </Field>
              <Field label="Verified-against-source note" help={verification === "verified" ? "Required: which document/page you checked and the date." : "Optional context for reviewers."} error={needsNote && !wasVerified ? "Required when setting Verified." : undefined}>
                <Textarea value={verificationNote} onChange={(e) => setVerificationNote(e.target.value)} placeholder="e.g. Checked against manufacturer datasheet rev. 2026-03, page 2." />
              </Field>
            </>
          ) : (
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-inset px-3 py-2 text-[13px] text-fg-secondary">
              <span>On save this product will be</span>
              <Badge tone={submittedStatus === "pending_verification" ? "warn" : "neutral"}>{VERIFICATION_LABEL[submittedStatus]}</Badge>
              {wasVerified && <span>because a verified product that changes has to be checked again.</span>}
            </div>
          )}
          <label className="flex items-center gap-2 text-[13.5px]"><input type="checkbox" checked={isOutdated} onChange={(e) => setIsOutdated(e.target.checked)} className="size-4 accent-[var(--brand)]" /> Mark as outdated (a newer datasheet/version exists)</label>
          <label className="flex items-center gap-2 text-[13.5px]"><input type="checkbox" checked={isArchived} onChange={(e) => setIsArchived(e.target.checked)} className="size-4 accent-[var(--brand)]" /> <Archive className="size-4 text-fg-muted" aria-hidden /> Archive (hidden from the marketplace)</label>
        </CardBody>
      </Card>

      {errors.length > 0 && (
        <ul className="rounded-[10px] border border-critical-soft bg-critical-soft p-3 text-[13px] text-critical-fg" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}
      {result && <p role="status" className={result.ok ? "text-[13px] text-good-fg" : "text-[13px] text-critical-fg"}>{result.text}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || errors.length > 0}><Save className="size-4" aria-hidden /> {pending ? "Saving…" : initial ? "Save changes" : "Create product"}</Button>
        <Button type="button" variant="outline" href={basePath}>Back to products</Button>
      </div>
      <p className="text-[12px] text-fg-muted">Saving with changed specs or price creates a new immutable product version (database trigger). Passports keep pointing at the version they were issued with.</p>
    </form>
  );
}
