"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataBadge } from "@/components/ui/DataBadge";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { DataMode } from "@/lib/data/mode";
import type { Manufacturer } from "@/lib/types";
import { headquartersText, hostOf, manufacturerHref } from "@/lib/manufacturers/helpers";
import { ManufacturerLogo } from "@/components/manufacturers/ManufacturerLogo";
import { AvailabilityBadge } from "@/components/manufacturers/AvailabilityBadge";
import { VerificationBadge } from "@/app/(app)/marketplace/_components/VerificationBadge";
import { updateCompanyAction, type CompanyProfileInput } from "../actions";
import { InfoTip } from "@/components/help/InfoTip";

/**
 * What a manufacturer may edit about its own company: identity, description,
 * headquarters, website, logo and cover image. What it may only read:
 * verification, Kuwait/GCC availability, type and market classification.
 * Those are Solink's decisions; the server action leaves them out and the
 * database refuses them from a manufacturer account regardless.
 */
export function CompanyProfileForm({ me, productCount, mode }: { me: Manufacturer; productCount: number; mode: DataMode }) {
  const router = useRouter();
  const [local, setLocal] = useLocalStore<Partial<CompanyProfileInput> | null>("manufacturer:company", null);
  const start0 = mode === "demo" && local ? { ...me, ...local } : me;
  const [f, setF] = useState<CompanyProfileInput>({
    name: start0.name, legal_name: start0.legal_name ?? "", description: start0.description ?? "",
    headquarters_country: start0.headquarters_country ?? "", headquarters_city: start0.headquarters_city ?? "",
    website: start0.website ?? "", logo_url: start0.logo_url ?? "", cover_image_url: start0.cover_image_url ?? "",
    contact_email: start0.contact_email ?? "", phone: start0.phone ?? "",
  });
  const set = <K extends keyof CompanyProfileInput>(k: K, v: CompanyProfileInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    setMsg(null);
    if (!f.name.trim()) { setMsg({ ok: false, text: "Company name is required." }); return; }
    if (mode === "demo") { setLocal(f); setMsg({ ok: true, text: "Saved in this browser only (demo mode)." }); return; }
    start(async () => {
      const r = await updateCompanyAction(f);
      if (r.ok) { setMsg({ ok: true, text: r.message ?? "Saved." }); router.refresh(); } else setMsg({ ok: false, text: r.error });
    });
  };

  const preview: Manufacturer = { ...me, ...f, legal_name: f.legal_name || null, description: f.description || null, headquarters_country: f.headquarters_country || null, headquarters_city: f.headquarters_city || null, website: f.website || null, logo_url: f.logo_url || null, cover_image_url: f.cover_image_url || null };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <Card>
          <CardHeader title="Company information" subtitle="Shown on the marketplace beside every one of your products and on your company page. Enter only what your company states about itself." action={<DataBadge cls="source" compact source="Your company" />} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required /></Field>
            <Field label="Legal name" help="The registered name, e.g. … Co., Ltd."><Input value={f.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} maxLength={200} /></Field>
            <Field label="Headquarters country"><Input value={f.headquarters_country ?? ""} onChange={(e) => set("headquarters_country", e.target.value)} maxLength={80} /></Field>
            <Field label="Headquarters city"><Input value={f.headquarters_city ?? ""} onChange={(e) => set("headquarters_city", e.target.value)} maxLength={80} /></Field>
            <Field label="Official website" className="sm:col-span-2"><Input type="url" value={f.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" dir="ltr" /></Field>
            <Field label="Description" className="sm:col-span-2" help="What your company makes, in plain words. Solink's administrators may ask for a source for any claim."><Textarea value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={2000} /></Field>
            <Field label="Contact email" help="A public business address for requests; your sign-in email stays private."><Input type="email" value={f.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} dir="ltr" /></Field>
            <Field label="Phone"><Input type="tel" value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} dir="ltr" /></Field>
            <Field label="Logo URL" help="Address of your logo as published on your website."><Input type="url" value={f.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://" dir="ltr" /></Field>
            <Field label="Cover image URL"><Input type="url" value={f.cover_image_url ?? ""} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://" dir="ltr" /></Field>
            {msg && <p role="status" className={`sm:col-span-2 ${msg.ok ? "text-[13px] text-good-fg" : "text-[13px] text-critical-fg"}`}>{msg.text}</p>}
            <div className="sm:col-span-2"><Button type="submit" disabled={pending}><Save className="size-4" aria-hidden /> {pending ? "Saving…" : "Save company profile"}</Button></div>
          </CardBody>
        </Card>
      </form>

      <div className="space-y-4">
        <Card>
          <CardHeader title={<>Public profile <InfoTip term="company_verification" /></>} subtitle="What a homeowner sees. The rows marked Solink are Solink's decisions and are read-only here." />
          <CardBody className="space-y-2.5 text-[13px]">
            <div className="flex items-center gap-3"><ManufacturerLogo name={preview.name} logoUrl={preview.logo_url} /><div className="min-w-0"><div className="truncate font-medium text-fg">{preview.name || "—"}</div><div className="truncate text-[12px] text-fg-muted">{preview.legal_name ?? "Legal name not provided"}</div></div></div>
            <Line k="Headquarters" v={headquartersText(preview) ?? <span className="text-fg-muted">Not provided</span>} />
            <Line k="Website" v={preview.website ? <a href={preview.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 truncate text-fg underline underline-offset-2" dir="ltr">{hostOf(preview.website)} <ExternalLink className="size-3" aria-hidden /></a> : <span className="text-fg-muted">Not provided</span>} />
            <Line k="Products listed" v={<span className="figure text-fg">{productCount}</span>} />
            <Line k={<>Type <Badge tone="neutral">Solink</Badge></>} v={me.manufacturer_type ?? <span className="text-fg-muted">Not classified</span>} />
            <Line k={<>Market <InfoTip term="market_classification" /></>} v={me.market_regions.length ? me.market_regions.join(" / ") : <span className="text-fg-muted">Not classified</span>} />
            <Line k="Verification" v={<VerificationBadge status={me.verification_status} />} />
            <Line k={<>Kuwait <InfoTip term="kuwait_availability" /></>} v={<AvailabilityBadge value={me.kuwait_available} region="kuwait" />} />
            <Line k="GCC" v={<AvailabilityBadge value={me.gcc_available} region="gcc" />} />
            {me.verification_note && (me.verification_status === "needs_changes" || me.verification_status === "rejected") && <p className="rounded-[var(--radius)] bg-inset p-2 text-[12.5px] text-fg-secondary"><span className="font-medium text-fg">From Solink&apos;s administrators:</span> {me.verification_note}</p>}
            <a href={manufacturerHref(me)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-fg-secondary underline-offset-2 hover:text-fg hover:underline">Open the public page <ExternalLink className="size-3" aria-hidden /></a>
          </CardBody>
        </Card>
        <p className="text-[12px] leading-relaxed text-fg-muted">Your account email and password are private and never shown publicly. Verification, Kuwait and GCC availability, type and market classification are a Solink administrator&apos;s decisions, recorded with a note; you can see them here and cannot change them.</p>
      </div>
    </div>
  );
}

function Line({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1 text-fg-muted">{k}</span><span className="min-w-0 text-right text-fg">{v}</span></div>;
}
