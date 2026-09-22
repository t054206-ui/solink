"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { InfoTip } from "@/components/help/InfoTip";
import type { DataMode } from "@/lib/data/mode";
import type { Manufacturer } from "@/lib/types";
import { MANUFACTURER_TYPES, MARKET_REGIONS, slugify } from "@/lib/manufacturers/helpers";
import { saveManufacturerAction, type ManufacturerInput } from "../actions";

/**
 * Admin form for a manufacturer company's profile fields. Verification,
 * availability and archive state are deliberately absent: they are decisions
 * with their own panel on the company page, each requiring a note.
 * Nothing here is prefilled with a guess; every field starts from the record
 * or empty.
 */
export function ManufacturerForm({ initial, mode }: { initial?: Manufacturer; mode: DataMode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [f, setF] = useState<ManufacturerInput>({
    id: initial?.id ?? null, name: initial?.name ?? "", legal_name: initial?.legal_name ?? "", slug: initial?.slug ?? "",
    logo_url: initial?.logo_url ?? "", cover_image_url: initial?.cover_image_url ?? "", description: initial?.description ?? "",
    manufacturer_type: initial?.manufacturer_type ?? "", headquarters_country: initial?.headquarters_country ?? "", headquarters_city: initial?.headquarters_city ?? "",
    website: initial?.website ?? "", market_regions: initial?.market_regions ?? [],
  });
  const set = <K extends keyof ManufacturerInput>(k: K, v: ManufacturerInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggleRegion = (r: string) => set("market_regions", f.market_regions.includes(r) ? f.market_regions.filter((x) => x !== r) : [...f.market_regions, r]);

  const save = () => {
    setMsg(null);
    if (!f.name.trim()) { setMsg({ ok: false, text: "Company name is required." }); return; }
    if (mode === "demo") { setMsg({ ok: false, text: "Demo mode: Supabase is not connected, so a company record cannot be saved. Connect Supabase to manage manufacturers." }); return; }
    start(async () => {
      const r = await saveManufacturerAction({ ...f, slug: f.slug?.trim() || slugify(f.name) });
      if (r.ok) { setMsg({ ok: true, text: r.message ?? "Saved." }); if (!initial && r.id) router.push(`/admin/manufacturers/${r.id}`); else router.refresh(); }
      else setMsg({ ok: false, text: r.error });
    });
  };

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
      {mode === "demo" && <DemoBanner text="DEMO MODE" detail="Supabase is not connected. Manufacturer records are read-only here until it is." />}
      <Card>
        <CardHeader title={<>Identity <InfoTip term="manufacturer_record" /></>} subtitle="Source data: as the company or its official website states it. Leave anything you have not confirmed empty; it shows as Not provided." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" help="Short name shown beside every product, e.g. LONGi."><Input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required /></Field>
          <Field label="Legal name" help="e.g. LONGi Green Energy Technology Co., Ltd."><Input value={f.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} maxLength={200} /></Field>
          <Field label="Slug" help={`Address of the profile page. Left empty it becomes “${slugify(f.name || "company-name") || "company-name"}”.`}><Input value={f.slug ?? ""} onChange={(e) => set("slug", e.target.value)} maxLength={80} dir="ltr" placeholder={slugify(f.name)} /></Field>
          <Field label="Official website"><Input type="url" value={f.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" dir="ltr" /></Field>
          <Field label="Headquarters country"><Input value={f.headquarters_country ?? ""} onChange={(e) => set("headquarters_country", e.target.value)} maxLength={80} /></Field>
          <Field label="Headquarters city" help="Only if the company's own page states it."><Input value={f.headquarters_city ?? ""} onChange={(e) => set("headquarters_city", e.target.value)} maxLength={80} /></Field>
          <Field label="Description" className="sm:col-span-2" help="In the company's own words or a neutral summary. No revenue, capacity, market share or partnership claims without a source."><Textarea value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={2000} /></Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Images" subtitle="Addresses of images the company publishes. Solink does not pick images for a company." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo URL"><Input type="url" value={f.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://" dir="ltr" /></Field>
          <Field label="Cover image URL"><Input type="url" value={f.cover_image_url ?? ""} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://" dir="ltr" /></Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={<>Platform classification <InfoTip term="market_classification" /></>} subtitle="Solink's own labels: what the company makes and which market Solink lists it for. Not a claim about where it operates; availability is verified separately on the company page." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Manufacturer type">
            <Select value={f.manufacturer_type ?? ""} onChange={(e) => set("manufacturer_type", e.target.value)}>
              <option value="">Not classified</option>
              {MANUFACTURER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-fg-secondary">Market regions</legend>
            <div className="flex flex-wrap gap-3">
              {MARKET_REGIONS.map((r) => (
                <label key={r} className="flex h-9 items-center gap-1.5 text-[13px] text-fg-secondary"><input type="checkbox" checked={f.market_regions.includes(r)} onChange={() => toggleRegion(r)} className="size-4 accent-[var(--brand)]" /> {r}</label>
              ))}
            </div>
          </fieldset>
        </CardBody>
      </Card>
      {msg && <p role="status" className={msg.ok ? "text-[13px] text-good-fg" : "text-[13px] text-critical-fg"}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}><Save className="size-4" aria-hidden /> {pending ? "Saving…" : initial ? "Save company" : "Create manufacturer"}</Button>
        <Button type="button" variant="ghost" href={initial ? `/admin/manufacturers/${initial.id}` : "/admin/manufacturers"}>Cancel</Button>
      </div>
    </form>
  );
}
