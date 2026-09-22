"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Form";
import { NotBuiltNote } from "@/components/ui/NotBuilt";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { DataMode } from "@/lib/data/mode";
import type { Manufacturer } from "@/lib/types";
import { VERIFICATION_LABEL } from "@/app/(app)/admin/_components/admin-helpers";
import { updateCompanyAction } from "../actions";
import { InfoTip } from "@/components/help/InfoTip";

/**
 * What the manufacturers table holds today: name, country, website, and a
 * verification status only an administrator sets. Logo, description and
 * contact details are in the owner's brief and need columns proposed in
 * migration 0007, so they are shown as not built rather than faked.
 */
export function CompanyProfileForm({ me, productCount, mode }: { me: Manufacturer; productCount: number; mode: DataMode }) {
  const router = useRouter();
  const [local, setLocal] = useLocalStore<Partial<Manufacturer> | null>("manufacturer:company", null);
  const start0 = mode === "demo" && local ? { ...me, ...local } : me;
  const [name, setName] = useState(start0.name);
  const [country, setCountry] = useState(start0.country ?? "");
  const [website, setWebsite] = useState(start0.website ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    setMsg(null);
    if (!name.trim()) { setMsg({ ok: false, text: "Company name is required." }); return; }
    if (mode === "demo") {
      setLocal({ name: name.trim(), country: country.trim() || null, website: website.trim() || null });
      setMsg({ ok: true, text: "Saved in this browser only (demo mode)." });
      return;
    }
    start(async () => {
      const r = await updateCompanyAction({ name, country: country || null, website: website || null });
      if (r.ok) { setMsg({ ok: true, text: r.message ?? "Saved." }); router.refresh(); } else setMsg({ ok: false, text: r.error });
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader title="Company information" subtitle="Shown on the marketplace beside every one of your products." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" className="sm:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
          <Field label="Country"><Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} /></Field>
          <Field label="Official website"><Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" dir="ltr" /></Field>
          <div className="sm:col-span-2 grid gap-2">
            <NotBuiltNote title="LOGO, DESCRIPTION, CONTACT, CATEGORIES">These fields are in the brief but the manufacturers table has no columns for them yet. Migration 0007 adds them; nothing is shown in their place until it is applied.</NotBuiltNote>
          </div>
          {msg && <p role="status" className={`sm:col-span-2 ${msg.ok ? "text-[13px] text-good-fg" : "text-[13px] text-critical-fg"}`}>{msg.text}</p>}
          <div className="sm:col-span-2"><Button onClick={save} disabled={pending}><Save className="size-4" aria-hidden /> {pending ? "Saving…" : "Save company profile"}</Button></div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title={<>Public profile <InfoTip term="company_verification" /></>} subtitle="What a homeowner sees." />
          <CardBody className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between gap-2"><span className="text-fg-muted">Name</span><span className="font-medium text-fg">{name || "—"}</span></div>
            <div className="flex items-center justify-between gap-2"><span className="text-fg-muted">Country</span><span className="text-fg">{country || <span className="text-fg-muted">Not provided</span>}</span></div>
            <div className="flex items-center justify-between gap-2"><span className="text-fg-muted">Website</span>{website ? <a href={website} target="_blank" rel="noreferrer noopener" className="truncate text-fg underline underline-offset-2" dir="ltr">{website}</a> : <span className="text-fg-muted">Not provided</span>}</div>
            <div className="flex items-center justify-between gap-2"><span className="text-fg-muted">Products listed</span><span className="figure text-fg">{productCount}</span></div>
            <div className="flex items-center justify-between gap-2"><span className="text-fg-muted">Verification</span><Badge tone={me.verification_status === "verified" ? "good" : me.verification_status === "pending_verification" ? "warn" : "neutral"}>{VERIFICATION_LABEL[me.verification_status]}</Badge></div>
          </CardBody>
        </Card>
        <p className="text-[12px] leading-relaxed text-fg-muted">Your account email and password are private and never shown publicly. Company verification is a Solink administrator’s decision, recorded with a note; you can see it here and cannot change it.</p>
      </div>
    </div>
  );
}
