"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareReply } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Select, Textarea } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import type { DataMode } from "@/lib/data/mode";
import type { ManufacturerRequest, ManufacturerRequestStatus, Product } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { REQUEST_KIND_LABEL, REQUEST_STATUSES, REQUEST_STATUS_LABEL, REQUEST_STATUS_TONE } from "@/lib/manufacturers/requests";
import { respondToRequestAction } from "../actions";

/**
 * The manufacturer's inbox. Each request shows what the requester wrote, a
 * display name and a governorate, and nothing else about them. The company
 * answers in place; the answer reaches the requester inside Solink.
 */
export function RequestsPanel({ requests, products, mode }: { requests: ManufacturerRequest[]; products: Product[]; mode: DataMode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ManufacturerRequestStatus>("responded");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const productName = (id: string | null) => (id ? products.find((p) => p.id === id)?.model ?? "a product no longer listed" : null);

  if (requests.length === 0) {
    return <EmptyState title="No requests yet">{mode === "demo" ? "Demo mode records no requests." : "When homeowners or businesses write to your company from its Solink page, their requests appear here."}</EmptyState>;
  }
  const save = (r: ManufacturerRequest) => {
    setMsg(null);
    start(async () => {
      const res = await respondToRequestAction({ requestId: r.id, status, response: draft || null });
      setMsg({ ok: res.ok, text: res.ok ? (res.message ?? "Saved.") : res.error });
      if (res.ok) { setOpen(null); setDraft(""); router.refresh(); }
    });
  };
  return (
    <div className="space-y-3">
      {msg && <p role="status" className={msg.ok ? "text-[13px] text-good-fg" : "text-[13px] text-critical-fg"}>{msg.text}</p>}
      {requests.map((r) => (
        <Card key={r.id}>
          <CardHeader
            title={<span className="flex flex-wrap items-center gap-2">{REQUEST_KIND_LABEL[r.kind]}<Badge tone={REQUEST_STATUS_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Badge></span>}
            subtitle={<>{r.requester_display_name ?? "Solink user"}{r.requester_governorate ? `, ${r.requester_governorate}` : ""} · {formatDate(r.created_at)}{productName(r.product_id) ? ` · about ${productName(r.product_id)}` : ""}</>}
            action={<Button size="sm" variant="outline" onClick={() => { setOpen(open === r.id ? null : r.id); setDraft(r.response ?? ""); setStatus(r.response ? r.status : "responded"); }}><MessageSquareReply className="size-3.5" aria-hidden /> {r.response ? "Edit answer" : "Answer"}</Button>}
          />
          <CardBody className="space-y-3 text-[13.5px]">
            <p className="whitespace-pre-wrap text-fg">{r.message}</p>
            {r.response && open !== r.id && (
              <div className="rounded-[var(--radius)] bg-inset p-3">
                <div className="text-[12px] text-fg-muted">Your answer{r.responded_at ? ` · ${formatDate(r.responded_at)}` : ""}</div>
                <p className="mt-1 whitespace-pre-wrap text-fg-secondary">{r.response}</p>
              </div>
            )}
            {open === r.id && (
              <form className="space-y-3 rounded-[var(--radius)] border border-border p-3" onSubmit={(e) => { e.preventDefault(); save(r); }}>
                <Field label="Answer"><Textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} /></Field>
                <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value as ManufacturerRequestStatus)}>{REQUEST_STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}</Select></Field>
                <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(null)}>Cancel</Button></div>
              </form>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
