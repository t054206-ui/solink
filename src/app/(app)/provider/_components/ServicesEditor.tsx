"use client";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Label } from "@/components/ui/Form";
import type { DataMode } from "@/lib/data/mode";
import type { MaintenanceKind, SpecValue } from "@/lib/types";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { formatDate } from "@/lib/utils";
import { MAINT_KIND, MAINT_KIND_ORDER } from "../../_ops/meta";
import { CostCell } from "../../_ops/Pills";
import {
  EMPTY_AVAILABILITY, PROVIDER_SERVICES_KEY, UNAVAILABLE_PRICE, WEEKDAYS,
  availabilityText, type Availability, type ServiceEntry, type ServiceMap,
} from "../_lib/services";
import { saveProviderService } from "../actions";

/**
 * The six maintenance kinds × price × availability.
 *
 * Prices start unavailable and are shown as [PLACEHOLDER: MAINTENANCE PRICE]
 * (via CostCell) until a provider types a real figure. Demo mode keeps the list
 * in this browser; Supabase mode writes provider_prices through the server action.
 */
export function ServicesEditor({ mode, serverServices }: { mode: DataMode; serverServices: ServiceMap }) {
  const [localServices, setLocalServices] = useLocalStore<ServiceMap>(PROVIDER_SERVICES_KEY, {});
  const services: ServiceMap = mode === "demo" ? { ...serverServices, ...localServices } : serverServices;

  return (
    <div className="space-y-4">
      <p className="rounded-[10px] border border-border bg-inset px-3 py-2 text-[13px] leading-relaxed text-fg-secondary">
        Homeowner-facing maintenance cost estimates stay <span className="font-medium">unavailable</span> everywhere in Solink until a real price exists on this page. Solink will not average, guess or carry over a price from another company.
        {mode === "demo" && " Supabase is not connected, so this list is stored in this browser only."}
      </p>

      <ul className="space-y-3">
        {MAINT_KIND_ORDER.map((kind) => {
          const entry = services[kind];
          return (
            <li key={kind}>
              <ServiceRow
                key={`${kind}:${entry ? JSON.stringify(entry) : "none"}`}
                kind={kind}
                entry={entry}
                mode={mode}
                onLocalSave={(next) => setLocalServices((prev) => ({ ...prev, [kind]: next }))}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ServiceRow({ kind, entry, mode, onLocalSave }: {
  kind: MaintenanceKind;
  entry: ServiceEntry | undefined;
  mode: DataMode;
  onLocalSave: (entry: ServiceEntry) => void;
}) {
  const price = entry?.price ?? UNAVAILABLE_PRICE;
  const availability: Availability = entry?.availability ?? EMPTY_AVAILABILITY;

  const [priceKnown, setPriceKnown] = useState(price.value !== null && price.value !== undefined);
  const [priceValue, setPriceValue] = useState(price.value === null || price.value === undefined ? "" : String(price.value));
  const [days, setDays] = useState<number[]>(availability.days);
  const [from, setFrom] = useState(availability.from);
  const [to, setTo] = useState(availability.to);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const priceNumber = priceValue.trim() === "" ? null : Number(priceValue);
  const priceError = priceKnown && (priceNumber === null || !Number.isFinite(priceNumber) || priceNumber <= 0)
    ? "Enter an amount above 0, or leave the price as not provided."
    : undefined;
  const windowError = (from && !to) || (to && !from) ? "A time window needs both a start and an end time." : undefined;
  const valid = !priceError && !windowError;

  function toggleDay(index: number) {
    setDays((prev) => (prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index].sort((a, b) => a - b)));
  }

  async function save() {
    if (!valid || busy) return;
    setBusy(true); setError(null); setMessage(null);
    const nextPrice: SpecValue = priceKnown && priceNumber !== null ? { value: priceNumber, unit: "KWD" } : { value: null, status: "unavailable" };
    const res = await saveProviderService({
      service: kind, price_unavailable: !priceKnown, price_value: priceKnown ? priceNumber : null, days, from, to,
    });
    if (res.ok) { setMessage(res.message); setBusy(false); return; }
    if (res.reason !== "demo") { setError(res.error); setBusy(false); return; }
    onLocalSave({ price: nextPrice, availability: { days, from, to }, updated_at: new Date().toISOString() });
    setBusy(false);
    setMessage("Saved on this device.");
  }

  const fieldId = `service-${kind}`;

  return (
    <Card>
      <CardHeader
        title={MAINT_KIND[kind].label}
        subtitle={MAINT_KIND[kind].description}
        action={<div className="text-right text-[13px]"><CostCell cost={price} /><div className="mt-1 text-[11.5px] text-fg-muted">{availabilityText(availability)}</div></div>}
      />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-[13px] font-medium text-fg-secondary">
              <input type="checkbox" checked={!priceKnown} onChange={(e) => setPriceKnown(!e.target.checked)} className="size-4 accent-[var(--brand)]" />
              Price not provided yet
            </label>
            <Field label="Price (KWD)" error={priceError} help={priceKnown ? "Your price for this service." : "While this is unchecked the placeholder is shown to homeowners."}>
              <Input
                id={`${fieldId}-price`} type="number" inputMode="decimal" min="0" step="0.001"
                value={priceValue} onChange={(e) => setPriceValue(e.target.value)} disabled={!priceKnown} placeholder="e.g. 25"
              />
            </Field>
          </div>

          <fieldset className="rounded-[10px] border border-border p-3">
            <legend className="px-1 text-[13px] font-medium text-fg-secondary">Availability</legend>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {WEEKDAYS.map((w) => (
                <label key={w.index} className="flex items-center gap-1.5 text-[13px] text-fg">
                  <input
                    type="checkbox" checked={days.includes(w.index)} onChange={() => toggleDay(w.index)}
                    aria-label={w.label} className="size-4 accent-[var(--brand)]"
                  />
                  {w.short}
                </label>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${fieldId}-from`}>From</Label>
                <Input id={`${fieldId}-from`} type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor={`${fieldId}-to`}>To</Label>
                <Input id={`${fieldId}-to`} type="time" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            {windowError && <p role="alert" className="mt-1 text-[12px] text-critical-fg">{windowError}</p>}
            {mode === "supabase" && <p className="mt-2 text-[11.5px] text-fg-muted">Stored with the price row; there is no separate schedule table yet.</p>}
          </fieldset>
        </div>

        {error && <p role="alert" className="text-[13px] text-critical-fg">{error}</p>}
        {message && <p role="status" className="text-[13px] text-good-fg">{message}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" onClick={save} disabled={busy || !valid}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />} Save {MAINT_KIND[kind].label.toLowerCase()}
          </Button>
          {entry?.updated_at && <span className="text-[12px] text-fg-muted">Last updated {formatDate(entry.updated_at)}</span>}
        </div>
      </CardBody>
    </Card>
  );
}
