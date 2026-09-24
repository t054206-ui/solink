"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Store, FileText, CalendarDays, Wrench, Building2, PencilRuler, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Metric } from "@/components/ui/Metric";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { InfoTip } from "@/components/help/InfoTip";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { systemCapacityKwp, formatNumber } from "@/lib/solar/calculations";
import { classified, unavailable, type Classified } from "@/lib/classification";
import type { DataMode } from "@/lib/data/mode";
import type { ProviderCompany } from "@/lib/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { EMPTY_DESIGNER_STORE, newId, type DesignerStore, type SavedDesign } from "../designer/designTypes";
import { EMPTY_PURCHASE_STORE, STEP_LABELS, TIME_WINDOWS, type CatalogItem, type LocalAppointment, type LocalOrder, type LocalSystem, type OrderItem, type PurchaseStep, type PurchaseStore, type SystemChoice } from "./purchaseTypes";
import { createOrderAction, scheduleInstallationAction } from "./actions";

type Provider = Pick<ProviderCompany, "id" | "name" | "kind" | "is_demo" | "service_area" | "verification_status">;

export function PurchaseFlow({ mode, catalog, providers, serverDesigns, preselectDesignId }: { mode: DataMode; catalog: CatalogItem[]; providers: Provider[]; serverDesigns: SavedDesign[]; preselectDesignId: string | null }) {
  const [store, setStore, loaded] = useLocalStore<PurchaseStore>("purchase", EMPTY_PURCHASE_STORE);
  const [designerStore, , designsLoaded] = useLocalStore<DesignerStore>("designer", EMPTY_DESIGNER_STORE);
  const designs: SavedDesign[] = mode === "supabase" ? serverDesigns : designerStore?.designs ?? [];

  const panels = catalog.filter((c) => c.category === "solar_panel");
  const inverters = catalog.filter((c) => c.category === "inverter");
  const batteries = catalog.filter((c) => c.category === "battery");
  const packages = catalog.filter((c) => c.category === "installation_package");
  const installers = providers.filter((p) => p.kind.includes("installer"));
  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);

  const s: PurchaseStore = { ...EMPTY_PURCHASE_STORE, ...(store ?? {}) };
  const patch = (p: Partial<PurchaseStore>) => setStore((prev) => ({ ...EMPTY_PURCHASE_STORE, ...(prev ?? {}), ...p }));
  const goto = (step: PurchaseStep) => patch({ step });

  /* ?design=<id> preselect — once, after stores load */
  const preselected = useRef(false);
  useEffect(() => {
    if (preselected.current || !loaded || !designsLoaded || !preselectDesignId) return;
    const d = designs.find((x) => x.id === preselectDesignId);
    if (d) {
      preselected.current = true;
      patch({ step: 0, system: { source: "design", design_id: d.id, panel_id: d.panel_product_id, panel_count: d.summary.panel_count, inverter_id: null, battery_id: null, install_package_id: packages[0]?.id ?? null }, request_kind: null, order_id: null, installer_id: null, system_id: null, appointment_id: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, designsLoaded, preselectDesignId, designs.length]);

  /* ---------------- derived: items, capacity, totals ---------------- */
  const choice = s.system;
  const panel = choice ? byId.get(choice.panel_id) ?? null : null;
  const items: OrderItem[] = useMemo(() => {
    if (!choice) return [];
    const out: OrderItem[] = [];
    const push = (id: string | null, qty: number) => { const c = id ? byId.get(id) : null; if (c) out.push({ product_id: c.id, name: c.name, category: c.category, qty, unit_price: c.price, currency: c.currency, is_demo: c.is_demo }); };
    push(choice.panel_id, choice.panel_count);
    push(choice.inverter_id, 1);
    push(choice.battery_id, 1);
    push(choice.install_package_id, 1);
    return out;
  }, [choice, byId]);
  const capacity = systemCapacityKwp(choice?.panel_count ?? null, panel?.rated_power_w ?? null);
  const totals: Classified = (() => {
    if (!items.length) return unavailable("No items.");
    const missing = items.filter((i) => i.unit_price === null);
    if (missing.length) return unavailable(`Prices not provided for: ${missing.map((m) => m.name).join(", ")}.`);
    const cur = items[0].currency;
    return classified(items.reduce((sum, i) => sum + (i.unit_price as number) * i.qty, 0), items.some((i) => i.is_demo) ? "demo" : "calculated", "Catalog prices", [`Currency ${cur}`]);
  })();
  const anyDemo = items.some((i) => i.is_demo);
  const currency = items[0]?.currency ?? "KWD";
  const selectedDesign = choice?.design_id ? designs.find((d) => d.id === choice.design_id) ?? null : null;
  const installer = s.installer_id ? installers.find((p) => p.id === s.installer_id) ?? null : null;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- actions ---------------- */
  const requestQuote = async () => {
    if (!items.length) return;
    setBusy(true); setError(null);
    try {
      const totalsPayload = { value: totals.value, currency, reason: totals.reason };
      if (mode === "supabase") {
        const r = await createOrderAction({ items, totals: totalsPayload, design_id: choice?.design_id ?? null });
        if (r.ok) { patch({ request_kind: "quote", order_id: r.id }); return; }
        if (r.reason !== "demo") { setError(r.message ?? "Could not create the request."); return; }
      }
      const order: LocalOrder = { id: newId("ord"), status: "requested", items, totals: { value: totals.value, currency }, installer_id: null, system_id: null, created_at: new Date().toISOString() };
      patch({ request_kind: "quote", order_id: order.id, orders: [order, ...s.orders].slice(0, 20) });
    } finally { setBusy(false); }
  };

  const scheduledAtIso = (): string | null => {
    if (!s.schedule.date) return null;
    const d = new Date(`${s.schedule.date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(TIME_WINDOWS[s.schedule.window].startHour, 0, 0, 0);
    return d.toISOString();
  };

  const submitSchedule = async () => {
    const when = scheduledAtIso();
    if (!when || !s.installer_id || !choice) { setError("Choose a date and an installer first."); return; }
    setBusy(true); setError(null);
    const systemName = selectedDesign ? `${selectedDesign.name}. System` : `${panel?.name ?? "Solar"} × ${choice.panel_count}`;
    const sys = { name: systemName, design_id: choice.design_id, capacity_kwp: capacity.value, panel_count: choice.panel_count, panel_product_id: choice.panel_id, inverter_product_id: choice.inverter_id, battery_product_id: choice.battery_id };
    try {
      if (mode === "supabase") {
        const r = await scheduleInstallationAction({ order_id: s.order_id, installer_id: s.installer_id, scheduled_at: when, notes: s.schedule.notes || undefined, system: sys });
        if (r.ok) { patch({ step: 5, system_id: r.system_id, appointment_id: r.appointment_id }); return; }
        if (r.reason !== "demo") { setError(r.message ?? "Could not schedule the installation."); return; }
      }
      const system: LocalSystem = { id: newId("sys"), status: "installation_scheduled", installer_id: s.installer_id, created_at: new Date().toISOString(), ...sys };
      const appointment: LocalAppointment = { id: newId("apt"), kind: "installation", system_id: system.id, provider_id: s.installer_id, scheduled_at: when, status: "requested", notes: s.schedule.notes || null };
      patch({
        step: 5, system_id: system.id, appointment_id: appointment.id,
        systems: [system, ...s.systems].slice(0, 20),
        appointments: [appointment, ...s.appointments].slice(0, 20),
        orders: s.orders.map((o): LocalOrder => (o.id === s.order_id ? { ...o, status: "installation_scheduled", installer_id: s.installer_id, system_id: system.id } : o)),
      });
    } finally { setBusy(false); }
  };

  const reset = () => patch({ step: 0, system: null, request_kind: null, order_id: null, installer_id: null, schedule: { date: "", window: "morning", notes: "" }, system_id: null, appointment_id: null });

  const canNext: Record<number, boolean> = {
    0: Boolean(choice && panel && choice.panel_count > 0),
    1: items.length > 0,
    2: s.request_kind === "quote",
    3: Boolean(s.installer_id),
    4: false,
  };

  if (!loaded) return <div className="skeleton h-64 rounded-[var(--radius-lg)]" aria-busy />;

  return (
    <div className="space-y-4">
      <Stepper step={s.step} onJump={(i) => { if (i < s.step && s.step < 5) goto(i as PurchaseStep); }} />
      {mode === "demo" && <DemoBanner text="DEMO MODE — NOT REAL" detail="Requests are stored in this browser only. No installer, payment provider or email service is connected." />}

      {s.step === 0 && (
        <ChooseSystem designs={designs} choice={choice} panels={panels} inverters={inverters} batteries={batteries} packages={packages} onChange={(system) => patch({ system, request_kind: null, order_id: null })} />
      )}

      {s.step === 1 && (
        <Card>
          <CardHeader title="Review your system" subtitle="Quantities and prices exactly as they appear in the catalog. Missing prices are shown as missing, not as zero." />
          <CardBody className="space-y-4">
            {anyDemo && <DemoBanner text="DEMO PRODUCT — NOT REAL" detail="One or more items are illustrative demo records." />}
            <ul className="divide-y divide-border rounded-[var(--radius)] border border-border">
              {items.map((i) => (
                <li key={i.product_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-[13.5px]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="truncate font-medium text-fg">{i.name}</span>{i.is_demo && <DataBadge cls="demo" compact />}</div>
                    <div className="text-[12px] text-fg-muted">{categoryLabel(i.category)} · qty {i.qty}</div>
                  </div>
                  <div className="tabular text-right text-fg-secondary">
                    {i.unit_price !== null ? <>{formatMoney(i.unit_price, i.currency)} <span className="text-fg-muted">× {i.qty} =</span> <span className="font-medium text-fg">{formatMoney(i.unit_price * i.qty, i.currency)}</span></> : i.category === "installation_package" ? <span className="text-fg-muted">Quoted by your installer</span> : <span className="text-fg-muted">Price on request from supplier</span>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="System capacity" term="kwp" data={capacity} unit="kWp" format={(v) => formatNumber(v, 2)} />
              <Metric label="Total" term="estimated_cost" data={totals} format={(v) => formatMoney(v, currency)} footnote={totals.value === null ? <span>The total completes with your installer&apos;s quote.</span> : undefined} />
            </div>
            {selectedDesign && <p className="text-[12.5px] text-fg-muted flex items-center gap-1.5"><PencilRuler className="size-3.5"  aria-hidden /> From design “{selectedDesign.name}”: {selectedDesign.roof.length_m}×{selectedDesign.roof.width_m} m roof, {selectedDesign.summary.used_area_m2} m² of panels{selectedDesign.is_ai_suggested && <DataBadge cls="ai" compact />}</p>}
          </CardBody>
        </Card>
      )}

      {s.step === 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className={cn(s.request_kind === "quote" && "ring-2 ring-[var(--brand)]")}>
            <CardHeader title={<><FileText className="size-4" aria-hidden /> Request a quote <InfoTip term="quote_request" /></>} subtitle="Send your equipment list to installers. They reply with real prices for the work. Nothing is charged, and Solink is not a party to what you agree with them." />
            <CardBody className="space-y-3">
              <ul className="list-disc space-y-1 pl-5 text-[13px] text-fg-secondary">
                <li>Records a quote request with status <Badge>requested</Badge>.</li>
                <li>Installers see the equipment list and your roof design.</li>
                <li>Prices arrive as a quote; you decide afterwards.</li>
              </ul>
              {s.request_kind === "quote" ? (
                <div className="flex items-center gap-2 rounded-md bg-good-soft px-3 py-2 text-[13px] text-good-fg"><Check className="size-4"  aria-hidden /> Quote requested (reference {s.order_id}). Continue to select an installer.</div>
              ) : (
                <Button onClick={requestQuote} disabled={busy || !items.length} className="w-full">{busy ? "Creating request…" : "Request a quote"}</Button>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={<><Store className="size-4" aria-hidden /> Buying the equipment</>} subtitle="Solink does not sell it." />
            <CardBody className="space-y-3 text-[13px] leading-relaxed text-fg-secondary">
              <p>
                Solink is a solar planning and product discovery platform. It does not sell panels, take payments or
                place orders, and there is no checkout anywhere in it. When you are ready to buy, you buy from the
                supplier.
              </p>
              <p>
                Each product page lists the supplier listings on record, with the price observed and a link straight to
                that supplier. Where no listing has been recorded, the page says so rather than sending you somewhere
                invented.
              </p>
              <Button href="/marketplace" variant="outline" className="w-full">
                Find a supplier in the Marketplace <ArrowRight className="size-4" aria-hidden />
              </Button>
            </CardBody>
          </Card>
        </div>
      )}

      {s.step === 3 && (
        <Card>
          <CardHeader title={<><Wrench className="size-4" aria-hidden /> Select an installer</>} subtitle="Companies registered as installers. Verification status comes from the platform, not from the company." />
          <CardBody>
            {installers.length === 0 ? <EmptyState title="No installers registered">Installers appear here once provider companies register on Solink.</EmptyState> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {installers.map((p) => {
                  const sel = p.id === s.installer_id;
                  return (
                    <li key={p.id}>
                      <button type="button" onClick={() => patch({ installer_id: p.id })} aria-pressed={sel} className={cn("w-full rounded-[var(--radius)] border p-4 text-left transition-colors hover:bg-inset", sel ? "border-[var(--brand)] ring-2 ring-[var(--ring)]" : "border-border")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0"><Building2 className="size-4 shrink-0 text-fg-muted"  aria-hidden /><span className="truncate font-medium text-fg">{p.name}</span></div>
                          {sel && <Check className="size-4 shrink-0 text-[var(--brand-strong)]"  aria-hidden />}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-fg-muted">
                          <Badge tone={p.verification_status === "verified" ? "good" : "neutral"}>{p.verification_status.replace("_", " ")}</Badge>
                          {p.service_area && <span>{p.service_area}</span>}
                        </div>
                        {p.is_demo && <DemoBanner className="mt-2 py-1 text-[12px]" text="DEMO COMPANY — NOT REAL" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {s.step === 4 && (
        <Card>
          <CardHeader title={<><CalendarDays className="size-4" aria-hidden /> Propose an installation slot</>} subtitle={`The installer${installer ? ` (${installer.name})` : ""} confirms or proposes another time. Status starts as "requested".`} />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Preferred date"><Input type="date" min={new Date().toISOString().slice(0, 10)} value={s.schedule.date} onChange={(e) => patch({ schedule: { ...s.schedule, date: e.target.value } })} /></Field>
              <Field label="Time window">
                <Select value={s.schedule.window} onChange={(e) => patch({ schedule: { ...s.schedule, window: e.target.value as PurchaseStore["schedule"]["window"] } })}>
                  {Object.entries(TIME_WINDOWS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </Field>
              <Field label="Notes for the installer" className="sm:col-span-2" help="Access, parking, roof access, anything the crew should know."><Textarea value={s.schedule.notes} maxLength={800} onChange={(e) => patch({ schedule: { ...s.schedule, notes: e.target.value } })} /></Field>
            </div>
            <div className="rounded-md bg-inset p-3 text-[12.5px] text-fg-secondary">
              Submitting creates a system record with status <Badge>installation_scheduled</Badge> and an installation appointment with status <Badge>requested</Badge>.
            </div>
            <Button onClick={submitSchedule} disabled={busy || !s.schedule.date || !s.installer_id} className="w-full sm:w-auto">{busy ? "Submitting…" : "Submit installation request"}</Button>
          </CardBody>
        </Card>
      )}

      {s.step === 5 && (
        <Card>
          <CardHeader title={<><Check className="size-4 text-good" aria-hidden /> Installation request submitted</>} subtitle="Here is what was recorded and what happens next." />
          <CardBody className="space-y-4 text-[13.5px]">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Row k="Order" v={s.order_id ?? "—"} /><Row k="System" v={s.system_id ?? "—"} />
              <Row k="Installer" v={installer?.name ?? "—"} /><Row k="Appointment" v={`${formatDate(scheduledAtIso())} · ${TIME_WINDOWS[s.schedule.window].label} · requested`} />
              <Row k="Equipment" v={items.map((i) => `${i.qty} × ${i.name}`).join("; ")} />
              <Row k="Capacity" v={capacity.value !== null ? `${formatNumber(capacity.value, 2)} kWp` : "From your design"} />
            </dl>
            <div>
              <div className="font-semibold text-fg">Next steps</div>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-fg-secondary">
                <li>The installer reviews your request and confirms the date or proposes another.</li>
                <li>You receive a quote with real prices (none are shown here because none were provided).</li>
                <li>After installation, your <Link href="/passport" className="underline underline-offset-2">Solar System Digital Passport</Link> <InfoTip term="passport" /> is created with the installed equipment, installer and warranties.</li>
              </ol>
            </div>
            <div className="rounded-md bg-inset p-3 text-[12.5px] text-fg-secondary">
              Updates about your request appear in Solink, under Notifications.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button href="/passport" variant="outline">Go to Passport <ArrowRight className="size-4"  aria-hidden /></Button>
              <Button variant="ghost" onClick={reset}><RotateCcw className="size-4"  aria-hidden /> Start another request</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {error && <p role="alert" className="text-[13px] text-critical-fg">{error}</p>}

      {s.step < 5 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" onClick={() => goto(Math.max(0, s.step - 1) as PurchaseStep)} disabled={s.step === 0}><ArrowLeft className="size-4"  aria-hidden /> Back</Button>
          {s.step < 4 && <Button onClick={() => goto((s.step + 1) as PurchaseStep)} disabled={!canNext[s.step]}>Next: {STEP_LABELS[s.step + 1]} <ArrowRight className="size-4"  aria-hidden /></Button>}
        </div>
      )}
    </div>
  );
}

/* ---------------- step 1: choose system ---------------- */
function ChooseSystem({ designs, choice, panels, inverters, batteries, packages, onChange }: {
  designs: SavedDesign[]; choice: SystemChoice | null; panels: CatalogItem[]; inverters: CatalogItem[]; batteries: CatalogItem[]; packages: CatalogItem[];
  onChange: (c: SystemChoice) => void;
}) {
  const [tab, setTab] = useState<"design" | "quick">(choice?.source ?? (designs.length ? "design" : "quick"));
  const base: SystemChoice = choice ?? { source: "quick", design_id: null, panel_id: panels[0]?.id ?? "", panel_count: 10, inverter_id: null, battery_id: null, install_package_id: packages[0]?.id ?? null };
  const set = (p: Partial<SystemChoice>) => onChange({ ...base, ...p });
  const panel = panels.find((p) => p.id === base.panel_id) ?? null;
  const cap = systemCapacityKwp(base.panel_count, panel?.rated_power_w ?? null);

  return (
    <Card>
      <CardHeader title="Choose your system" subtitle="Start from a saved roof design or put together a quick system from the catalog." />
      <CardBody className="space-y-4">
        <div role="tablist" className="inline-flex rounded-[10px] border border-border bg-inset p-0.5 text-[13px]">
          {(["design", "quick"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-[8px] px-3 py-1.5 font-medium transition-colors", tab === t ? "bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg-secondary")}>{t === "design" ? "Saved design" : "Quick system"}</button>
          ))}
        </div>

        {tab === "design" && (designs.length === 0 ? (
          <EmptyState title="No saved designs yet"><p>Design your roof layout first, then come back here.</p><Button href="/designer" variant="outline" size="sm" className="mt-3"><PencilRuler className="size-4"  aria-hidden /> Open the Solar Designer</Button></EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {designs.map((d) => {
              const sel = base.source === "design" && base.design_id === d.id;
              return (
                <li key={d.id}>
                  <button type="button" aria-pressed={sel} onClick={() => set({ source: "design", design_id: d.id, panel_id: d.panel_product_id, panel_count: d.summary.panel_count })} className={cn("w-full rounded-[var(--radius)] border p-4 text-left hover:bg-inset", sel ? "border-[var(--brand)] ring-2 ring-[var(--ring)]" : "border-border")}>
                    <div className="flex items-center justify-between gap-2"><span className="truncate font-medium text-fg">{d.name}</span>{sel && <Check className="size-4 text-[var(--brand-strong)]"  aria-hidden />}</div>
                    <div className="mt-1 text-[12.5px] text-fg-muted tabular">{d.summary.panel_count} × {d.panel_name} · {d.summary.capacity_kwp !== null ? `${formatNumber(d.summary.capacity_kwp, 2)} kWp` : "capacity n/a"} · {formatDate(d.created_at)}</div>
                    <div className="mt-1.5 flex gap-1"><DataBadge cls="calculated" compact />{d.is_ai_suggested && <DataBadge cls="ai" compact />}{d.is_demo_product && <DataBadge cls="demo" compact />}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        ))}

        {tab === "quick" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Panel"><Select value={base.source === "quick" ? base.panel_id : ""} onChange={(e) => set({ source: "quick", design_id: null, panel_id: e.target.value })}>
              {base.source !== "quick" && <option value="">Choose a panel…</option>}
              {panels.map((p) => <option key={p.id} value={p.id}>{p.name}{p.rated_power_w !== null ? `: ${p.rated_power_w} W` : ": power unavailable"}</option>)}
            </Select></Field>
            <Field label="Number of panels"><Input type="number" min={1} max={500} value={base.panel_count} onChange={(e) => set({ source: "quick", design_id: null, panel_count: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })} /></Field>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={<>Inverter <InfoTip term="inverter" /></>}><Select value={base.inverter_id ?? ""} onChange={(e) => set({ inverter_id: e.target.value || null })}><option value="">None / decide later</option>{inverters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label={<>Battery <InfoTip term="battery" /></>}><Select value={base.battery_id ?? ""} onChange={(e) => set({ battery_id: e.target.value || null })}><option value="">None</option>{batteries.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Installation package"><Select value={base.install_package_id ?? ""} onChange={(e) => set({ install_package_id: e.target.value || null })}><option value="">None</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        </div>

        {(panel?.is_demo || [base.inverter_id, base.battery_id, base.install_package_id].some((id) => id && [...inverters, ...batteries, ...packages].find((c) => c.id === id)?.is_demo)) && <DemoBanner text="DEMO PRODUCT — NOT REAL" />}
        <Metric label="System capacity" term="kwp" data={cap} unit="kWp" format={(v) => formatNumber(v, 2)} className="sm:max-w-xs" />
      </CardBody>
    </Card>
  );
}

/* ---------------- bits ---------------- */
function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Progress">
      {STEP_LABELS.map((label, i) => {
        const done = step > i, active = step === i;
        return (
          <li key={label} className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => onJump(i)} disabled={!done} aria-current={active ? "step" : undefined}
              className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors", active ? "border-[var(--brand)] bg-brand-soft text-fg" : done ? "border-border bg-elevated text-fg-secondary hover:bg-inset" : "border-border bg-inset text-fg-muted")}>
              <span className={cn("grid size-5 place-items-center rounded-full text-[11px]", active ? "bg-brand text-brand-fg" : done ? "bg-good text-white" : "bg-elevated border border-border")}>{done ? <Check className="size-3"  aria-hidden /> : i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEP_LABELS.length - 1 && <span className="h-px w-4 bg-border-strong" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="min-w-0"><dt className="text-[12px] text-fg-muted">{k}</dt><dd className="tabular break-words text-fg">{v}</dd></div>;
}

function categoryLabel(c: CatalogItem["category"]) {
  return {
    solar_panel: "Solar panel", inverter: "Inverter", battery: "Battery", installation_package: "Installation package",
    maintenance_package: "Maintenance package", cleaning_service: "Cleaning service", other_service: "Other service",
  }[c];
}
