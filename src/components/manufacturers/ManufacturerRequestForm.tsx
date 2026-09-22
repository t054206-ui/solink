"use client";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Select, Textarea } from "@/components/ui/Form";
import type { DataMode } from "@/lib/data/mode";
import type { ManufacturerRequestKind, Product } from "@/lib/types";
import { REQUEST_KIND_LABEL } from "@/lib/manufacturers/requests";
import { createManufacturerRequestAction } from "@/app/(app)/marketplace/actions";

/** "Contact this manufacturer": a request the company answers inside Solink. */
export function ManufacturerRequestForm({ manufacturerId, manufacturerName, products, mode, archived }: { manufacturerId: string; manufacturerName: string; products: Product[]; mode: DataMode; archived: boolean }) {
  const [kind, setKind] = useState<ManufacturerRequestKind>("product_inquiry");
  const [productId, setProductId] = useState("");
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const submit = () => {
    setMsg(null);
    if (mode === "demo") { setMsg({ ok: false, text: "Demo mode: requests need a Supabase connection and a signed-in account." }); return; }
    start(async () => {
      const r = await createManufacturerRequestAction({ manufacturerId, productId: productId || null, kind, message });
      if (r.ok) { setMsg({ ok: true, text: r.message ?? "Sent." }); setMessage(""); } else setMsg({ ok: false, text: r.error });
    });
  };
  return (
    <Card>
      <CardHeader title={`Contact ${manufacturerName}`} subtitle={archived ? "This company is archived and no longer receives requests through Solink." : "A product, availability, business or partnership question. The company sees your name and governorate, never your address, email or phone."} />
      {!archived && (
        <CardBody className="space-y-3">
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
            <Field label="About">
              <Select value={kind} onChange={(e) => setKind(e.target.value as ManufacturerRequestKind)}>{(Object.keys(REQUEST_KIND_LABEL) as ManufacturerRequestKind[]).map((k) => <option key={k} value={k}>{REQUEST_KIND_LABEL[k]}</option>)}</Select>
            </Field>
            {products.length > 0 && (
              <Field label="Product (optional)">
                <Select value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Not about one product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.model}</option>)}</Select>
              </Field>
            )}
            <Field label="Your message"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="What would you like to know?" /></Field>
            {msg && <p role="status" className={msg.ok ? "text-[13px] text-good-fg" : "text-[13px] text-critical-fg"}>{msg.text}</p>}
            <Button type="submit" disabled={pending || message.trim().length < 10} className="w-full"><Send className="size-4" aria-hidden /> {pending ? "Sending…" : "Send request"}</Button>
          </form>
        </CardBody>
      )}
    </Card>
  );
}
