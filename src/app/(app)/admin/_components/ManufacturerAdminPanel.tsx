"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Link2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { InfoTip } from "@/components/help/InfoTip";
import type { DataMode } from "@/lib/data/mode";
import type { Manufacturer, VerificationStatus } from "@/lib/types";
import { SOURCE_FIELD_LABEL, SOURCE_TYPES, SOURCE_TYPE_LABEL } from "@/lib/manufacturers/helpers";
import { VERIFICATION_LABEL, VERIFICATION_STATUSES } from "./admin-helpers";
import { addManufacturerSourceAction, archiveManufacturerAction, setManufacturerVerificationAction } from "../actions";

type Tri = "" | "true" | "false";
const tri = (v: boolean | null): Tri => (v === null ? "" : v ? "true" : "false");
const untri = (v: Tri): boolean | null => (v === "" ? null : v === "true");

/**
 * The administrator's decisions about a company: verification status with
 * its source and note, Kuwait/GCC availability with the source checked,
 * archive, and new source rows. A manufacturer account never sees this
 * panel and the database refuses these columns from it regardless.
 */
export function ManufacturerAdminPanel({ m, mode }: { m: Manufacturer; mode: DataMode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = useState<VerificationStatus>(m.verification_status);
  const [note, setNote] = useState(m.verification_note ?? "");
  const [source, setSource] = useState(m.verification_source ?? "");
  const [sourceUrl, setSourceUrl] = useState(m.verification_source_url ?? "");
  const [kw, setKw] = useState<Tri>(tri(m.kuwait_available));
  const [gcc, setGcc] = useState<Tri>(tri(m.gcc_available));
  const [availNote, setAvailNote] = useState(m.availability_note ?? "");
  const [src, setSrc] = useState({ field: "company", source_name: "", source_url: "", source_type: SOURCE_TYPES[0] as string, date_checked: "", notes: "" });

  const demoGuard = () => { if (mode === "demo") { setMsg({ ok: false, text: "Demo mode: Supabase is not connected, so nothing can be saved." }); return true; } return false; };
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => { setMsg(null); if (demoGuard()) return; start(async () => { const r = await fn(); setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Saved.") : (r.error ?? "Failed.") }); if (r.ok) router.refresh(); }); };

  return (
    <div className="space-y-4">
      {msg && <p role="status" className={msg.ok ? "text-[13px] text-good-fg" : "text-[13px] text-critical-fg"}>{msg.text}</p>}

      <Card>
        <CardHeader title={<><ShieldCheck className="size-4 text-[var(--brand-strong)]" aria-hidden /> Verification &amp; availability <InfoTip term="company_verification" /></>} subtitle="An administrator's decision, recorded with what was checked. Verified needs a source and a note; availability needs a note naming the source." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Verification status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as VerificationStatus)}>{VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{VERIFICATION_LABEL[s]}</option>)}</Select>
          </Field>
          <Field label="Checked against (source)" help="e.g. Official website, company registry page."><Input value={source} onChange={(e) => setSource(e.target.value)} maxLength={200} /></Field>
          <Field label="Source URL" className="sm:col-span-2"><Input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" dir="ltr" /></Field>
          <Field label="Note" className="sm:col-span-2" help={status === "verified" ? "Required: what was verified and how." : status === "needs_changes" || status === "rejected" ? "Required: what the manufacturer must change." : "Optional."}><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></Field>
          <Field label={<span className="inline-flex items-center gap-1">Kuwait availability <InfoTip term="kuwait_availability" /></span>}>
            <Select value={kw} onChange={(e) => setKw(e.target.value as Tri)}><option value="">Not yet verified</option><option value="true">Available in Kuwait</option><option value="false">Not available in Kuwait</option></Select>
          </Field>
          <Field label="GCC availability">
            <Select value={gcc} onChange={(e) => setGcc(e.target.value as Tri)}><option value="">Not yet verified</option><option value="true">Available in the GCC</option><option value="false">Not available in the GCC</option></Select>
          </Field>
          <Field label="Availability note" className="sm:col-span-2" help="Required when either availability is set: which source shows the company's products sold or supported in the region. A retailer listing is not manufacturer presence; say so if that is all there is."><Textarea value={availNote} onChange={(e) => setAvailNote(e.target.value)} maxLength={1000} /></Field>
          <div className="sm:col-span-2">
            <Button disabled={pending} onClick={() => run(() => setManufacturerVerificationAction({ id: m.id, status, note: note || null, source: source || null, source_url: sourceUrl || null, kuwait_available: untri(kw), gcc_available: untri(gcc), availability_note: availNote || null }))}>
              <ShieldCheck className="size-4" aria-hidden /> {pending ? "Saving…" : "Save decision"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={<><Link2 className="size-4 text-[var(--brand-strong)]" aria-hidden /> Record a source</>} subtitle="Where a fact about this company came from. Arrives Unverified; verifying the company above records the check itself as a source." />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Field label="Supports">
            <Select value={src.field} onChange={(e) => setSrc((p) => ({ ...p, field: e.target.value }))}>{Object.entries(SOURCE_FIELD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          </Field>
          <Field label="Source type">
            <Select value={src.source_type} onChange={(e) => setSrc((p) => ({ ...p, source_type: e.target.value }))}>{SOURCE_TYPES.map((t) => <option key={t} value={t}>{SOURCE_TYPE_LABEL[t]}</option>)}</Select>
          </Field>
          <Field label="Source name"><Input value={src.source_name} onChange={(e) => setSrc((p) => ({ ...p, source_name: e.target.value }))} maxLength={200} /></Field>
          <Field label="Date checked"><Input type="date" value={src.date_checked} onChange={(e) => setSrc((p) => ({ ...p, date_checked: e.target.value }))} /></Field>
          <Field label="Source URL" className="sm:col-span-2"><Input type="url" value={src.source_url} onChange={(e) => setSrc((p) => ({ ...p, source_url: e.target.value }))} placeholder="https://" dir="ltr" /></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea value={src.notes} onChange={(e) => setSrc((p) => ({ ...p, notes: e.target.value }))} maxLength={1000} /></Field>
          <div className="sm:col-span-2">
            <Button variant="outline" disabled={pending || !src.source_name.trim()} onClick={() => run(async () => { const r = await addManufacturerSourceAction({ manufacturer_id: m.id, field: src.field, source_name: src.source_name, source_url: src.source_url || null, source_type: src.source_type, date_checked: src.date_checked || null, notes: src.notes || null }); if (r.ok) setSrc({ field: "company", source_name: "", source_url: "", source_type: SOURCE_TYPES[0], date_checked: "", notes: "" }); return r; })}>
              <Link2 className="size-4" aria-hidden /> Record source
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={m.is_archived ? "Archived" : "Archive"} subtitle="Never deleted: products, orders and Solar Passports reference this company. Archiving removes it from the active directory and the marketplace filter; its page stays reachable." />
        <CardBody>
          <Button variant={m.is_archived ? "outline" : "danger"} disabled={pending} onClick={() => run(() => archiveManufacturerAction({ id: m.id, archived: !m.is_archived }))}>
            {m.is_archived ? <><ArchiveRestore className="size-4" aria-hidden /> Restore as active</> : <><Archive className="size-4" aria-hidden /> Archive manufacturer</>}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
