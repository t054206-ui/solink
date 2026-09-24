"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { DataBadge } from "@/components/ui/DataBadge";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { formatDate } from "@/lib/utils";
import type { Product } from "@/lib/types";
import type { DataMode } from "@/lib/data/mode";
import { Table, Th, Td, VerificationPill, FlagList } from "./AdminBits";
import { setVerificationAction } from "../actions";
import { ADMIN_PRODUCTS_STORE, CATEGORY_LABEL, mergeLocalProducts, validateProductSpecs, type AdminProductStore } from "./admin-helpers";

export function VerificationQueue({ products, mode }: { products: Product[]; mode: DataMode }) {
  const router = useRouter();
  const [store, setStore] = useLocalStore<AdminProductStore>(ADMIN_PRODUCTS_STORE, {});
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<Product | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const queue = useMemo(() => mergeLocalProducts(products, mode === "demo" ? store : undefined)
    .filter((p) => !p.is_archived && p.source.verification_status !== "verified")
    .map((p) => ({ p, flags: validateProductSpecs(p.specs, p.category) }))
    .sort((a, b) => (a.p.source.verification_status === "pending_verification" ? -1 : 1) - (b.p.source.verification_status === "pending_verification" ? -1 : 1)), [products, store, mode]);

  const applyLocal = (p: Product, status: "verified" | "pending_verification", n: string) => {
    const now = new Date().toISOString();
    const source = { ...p.source, verification_status: status, date_last_updated: now, verified_at: status === "verified" ? now : null, verified_by: null } as Product["source"] & { verification_note?: string };
    if (status === "verified") source.verification_note = n;
    setStore((prev) => ({ ...prev, [p.id]: { ...p, source } }));
  };

  const markPending = (p: Product) => {
    setMsg(null);
    if (mode === "demo") { applyLocal(p, "pending_verification", ""); setMsg({ ok: true, text: `${p.model} marked Pending verification (local browser only).` }); return; }
    start(async () => { const r = await setVerificationAction({ productId: p.id, status: "pending_verification", note: null }); setMsg({ ok: r.ok, text: r.ok ? "Marked pending." : r.error }); if (r.ok) router.refresh(); });
  };

  const confirmVerify = () => {
    if (!target || note.trim().length < 10) return;
    const p = target; const n = note.trim();
    setTarget(null); setNote(""); setMsg(null);
    if (mode === "demo") { applyLocal(p, "verified", n); setMsg({ ok: true, text: `${p.model} marked Verified with note (local browser only).` }); return; }
    start(async () => { const r = await setVerificationAction({ productId: p.id, status: "verified", note: n }); setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Verified.") : r.error }); if (r.ok) router.refresh(); });
  };

  return (
    <div className="space-y-3">
      {msg && <p role="status" className={`text-[13px] ${msg.ok ? "text-good-fg" : "text-critical-fg"}`}>{msg.text}</p>}
      {queue.length === 0 ? <EmptyState title="Nothing awaiting verification">Every active product is already marked Verified, or there are no products.</EmptyState> : (
        <Table caption="Verification queue">
          <thead><tr><Th>Product</Th><Th>Category</Th><Th>Status</Th><Th>Data source</Th><Th>Flags</Th><Th>Updated</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
          <tbody>
            {queue.map(({ p, flags }) => (
              <tr key={p.id}>
                <Td><div className="font-medium text-fg">{p.manufacturer_name}</div><div className="font-mono text-[12px]">{p.model}</div>{p.is_demo && <DataBadge cls="demo" compact className="mt-1" />}</Td>
                <Td>{CATEGORY_LABEL[p.category]}</Td>
                <Td><VerificationPill status={p.source.verification_status} /></Td>
                <Td><div>{p.source.data_source}</div>{p.source.datasheet_url && <a href={p.source.datasheet_url} target="_blank" rel="noreferrer" className="text-[12px] underline underline-offset-2">Datasheet</a>}</Td>
                <Td><FlagList flags={flags} /></Td>
                <Td className="whitespace-nowrap">{formatDate(p.source.date_last_updated)}</Td>
                <Td>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" onClick={() => { setTarget(p); setNote(""); }} disabled={pending || flags.length > 0} title={flags.length ? "Resolve validation flags against the source before verifying" : undefined}><ShieldCheck className="size-3.5" aria-hidden /> Verify…</Button>
                    {p.source.verification_status !== "pending_verification" && <Button size="sm" variant="outline" onClick={() => markPending(p)} disabled={pending}><Clock className="size-3.5" aria-hidden /> Mark pending</Button>}
                    <Link href={`/admin/products/${p.id}`} className="text-[12.5px] underline underline-offset-2">Edit record</Link>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal open={target !== null} onClose={() => setTarget(null)} title="Verify against source">
        {target && (
          <div className="space-y-3">
            <p className="text-[13.5px] text-fg-secondary">You are about to mark <strong className="text-fg">{target.manufacturer_name} {target.model}</strong> as <strong>Verified</strong>. This is a human statement that every stored value was checked against the source below. Describe what you checked (document, revision, date).</p>
            <p className="text-[12.5px] text-fg-info">Source: {target.source.data_source}{target.source.datasheet_url ? ` · ${target.source.datasheet_url}` : ""}</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Compared all 19 spec fields with manufacturer datasheet rev. 2026-03 (PDF page 2). Price confirmed by participating company quote dated …" aria-label="Verified against source note" />
            {note.trim().length > 0 && note.trim().length < 10 && <p className="text-[12px] text-critical-fg">Please write a meaningful note (at least 10 characters).</p>}
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button><Button onClick={confirmVerify} disabled={note.trim().length < 10}>Mark Verified</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
