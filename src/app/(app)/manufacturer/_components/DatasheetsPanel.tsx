"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Link2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { formatDate } from "@/lib/utils";
import type { DataMode } from "@/lib/data/mode";
import type { Product } from "@/lib/types";
import type { ProductDocumentRow } from "@/app/(app)/admin/_lib/data";
import { addDatasheetLinkAction, uploadProductDocumentAction } from "../actions";
import { InfoTip } from "@/components/help/InfoTip";

interface LocalDoc { id: string; product_id: string; title: string; url: string; created_at: string }

/**
 * Datasheets: every document row attached to the manufacturer's products, plus
 * the datasheet URL recorded on each product itself. Two ways in: link the
 * PDF where the company publishes it, or upload it into Solink's private
 * product-documents bucket under the product (storage policy from migration
 * 0008 §8; the bucket refuses another company's product). Nothing is ever
 * deleted here: a replaced datasheet is a newer row, and the older one stays
 * for the Solar Passports that cite it.
 */
export function DatasheetsPanel({ products, docs, mode }: { products: Product[]; docs: ProductDocumentRow[]; mode: DataMode }) {
  const router = useRouter();
  const [local, setLocal] = useLocalStore<LocalDoc[]>("manufacturer:datasheets", []);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [upMsg, setUpMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [upKind, setUpKind] = useState("datasheet");
  const [upTitle, setUpTitle] = useState("");

  const upload = (form: HTMLFormElement) => {
    setUpMsg(null);
    if (mode === "demo") { setUpMsg({ ok: false, text: "Demo mode: files cannot be stored without Supabase. Link the datasheet by URL instead." }); return; }
    const fd = new FormData(form);
    fd.set("productId", productId); fd.set("kind", upKind); fd.set("title", upTitle);
    start(async () => {
      const r = await uploadProductDocumentAction(fd);
      if (r.ok) { setUpMsg({ ok: true, text: r.message ?? "Uploaded." }); setUpTitle(""); form.reset(); router.refresh(); }
      else setUpMsg({ ok: false, text: r.error });
    });
  };

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? "Unknown product";
  const rows: { id: string; product: string; title: string; url: string | null; created_at: string; origin: "document" | "product record" | "local" }[] = [
    ...docs.map((d) => ({ id: d.id, product: nameOf(d.product_id), title: d.title ?? d.kind, url: d.url ?? d.storage_path, created_at: d.created_at, origin: "document" as const })),
    ...(mode === "demo" ? local : []).map((d) => ({ id: d.id, product: nameOf(d.product_id), title: d.title, url: d.url, created_at: d.created_at, origin: "local" as const })),
    ...products.filter((p) => p.source.datasheet_url).map((p) => ({ id: `src-${p.id}`, product: p.name, title: "Datasheet URL on the product record", url: p.source.datasheet_url!, created_at: p.source.date_last_updated, origin: "product record" as const })),
  ];

  const submit = () => {
    setMsg(null);
    if (!productId) { setMsg({ ok: false, text: "Choose a product." }); return; }
    if (!/^https?:\/\//.test(url.trim())) { setMsg({ ok: false, text: "Enter the full https:// address of the datasheet." }); return; }
    if (mode === "demo") {
      setLocal((l) => [{ id: `local-${Date.now().toString(36)}`, product_id: productId, title: title.trim() || "Datasheet", url: url.trim(), created_at: new Date().toISOString() }, ...(l ?? [])]);
      setMsg({ ok: true, text: "Linked in this browser only (demo mode)." }); setTitle(""); setUrl("");
      return;
    }
    start(async () => {
      const r = await addDatasheetLinkAction({ productId, title, url });
      if (r.ok) { setMsg({ ok: true, text: r.message ?? "Linked." }); setTitle(""); setUrl(""); router.refresh(); }
      else setMsg({ ok: false, text: r.error });
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader title={<>Documents <InfoTip term="datasheet" /></>} subtitle={`${rows.length} on record. Upload date is when Solink received the link; the document's own revision date is inside it.`} />
        {rows.length === 0 ? (
          <CardBody><EmptyState title="No datasheets yet">Link the datasheet for each product so verification can start. A product without a datasheet cannot be verified.</EmptyState></CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dense">
              <thead><tr><th scope="col">Product</th><th scope="col">Document</th><th scope="col">Added</th><th scope="col">Where</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <th scope="row" className="font-medium text-fg">{r.product}</th>
                    <td className="text-fg-secondary"><span className="inline-flex items-center gap-1.5"><FileText className="size-3.5 text-fg-muted" aria-hidden />{r.title}</span></td>
                    <td className="text-fg-muted">{formatDate(r.created_at)}</td>
                    <td className="text-fg-muted">{r.origin}</td>
                    <td>{r.url && /^https?:\/\//.test(r.url) ? <a href={r.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-fg-secondary hover:text-fg">Open <ExternalLink className="size-3" aria-hidden /></a> : <span className="text-fg-muted">stored file</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Link a datasheet" subtitle="The address of the PDF on your own website or document server." />
          <CardBody className="space-y-3">
            <Field label="Product">
              <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
                {products.length === 0 && <option value="">No products yet</option>}
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.model}</option>)}
              </Select>
            </Field>
            <Field label="Title" help="e.g. Datasheet rev. 2026-03"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
            <Field label="URL"><Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" dir="ltr" /></Field>
            {msg && <p role="status" className={msg.ok ? "text-[13px] text-good-fg" : "text-[13px] text-critical-fg"}>{msg.text}</p>}
            <Button onClick={submit} disabled={pending || products.length === 0} className="w-full"><Link2 className="size-4" aria-hidden /> {pending ? "Linking…" : "Link datasheet"}</Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Upload a file" subtitle="PDF or image, up to 15 MB, stored privately under the selected product. Only your own products are accepted." />
          <CardBody>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); upload(e.currentTarget); }}>
              <Field label="Kind">
                <Select value={upKind} onChange={(e) => setUpKind(e.target.value)}>
                  <option value="datasheet">Datasheet</option><option value="manual">Manual</option><option value="warranty">Warranty</option><option value="certificate">Certificate</option><option value="image">Product image</option><option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Title" help="e.g. Datasheet rev. 2026-03"><Input value={upTitle} onChange={(e) => setUpTitle(e.target.value)} maxLength={120} /></Field>
              <Field label="File"><Input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="h-auto py-1.5" /></Field>
              {upMsg && <p role="status" className={upMsg.ok ? "text-[13px] text-good-fg" : "text-[13px] text-critical-fg"}>{upMsg.text}</p>}
              <Button type="submit" variant="outline" disabled={pending || products.length === 0} className="w-full"><Upload className="size-4" aria-hidden /> {pending ? "Uploading…" : "Upload file"}</Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
