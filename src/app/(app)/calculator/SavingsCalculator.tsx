"use client";
import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Form";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { InfoTip } from "@/components/help/InfoTip";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { DataMode } from "@/lib/data/mode";
import type { PlatformSettings } from "@/lib/data/settings";
import { type Classified, unavailable } from "@/lib/classification";
import { annualProductionKwh, annualSavings, co2AvoidedKg, energyOffset, formatNumber, paybackYears, systemCapacityKwp, totalCostOfOwnership, type SolarAssumptions } from "@/lib/solar/calculations";
import { cn, formatMoney, pct } from "@/lib/utils";
import { AssumptionField, resolveAssumption } from "../_plan/AssumptionField";
import { MetricWithNotes } from "../_plan/MetricWithNotes";
import { DataLegend } from "../_plan/DataLegend";

/** A catalogue panel the calculator can take its rating from. Built by the page from real product rows. */
export interface CalcPanelOption { id: string; label: string; ratedW: number | null; isDemo: boolean; source: string }

export interface CalcInputs {
  monthlyKwh: number | null; monthlyBill: number | null;
  sizeMode: "kwp" | "panels"; kwp: number | null; panelCount: number | null; panelW: number | null;
  /** Catalogue product the rating was taken from; null when the person typed it. */
  panelId?: string | null;
  productionOverride: number | null;
  tariff: number | null; systemCost: number | null; installCost: number | null; maintenance: number | null; cleaning: number | null; repairs: number | null;
  horizon: number | null; degradationPct: number | null; co2: number | null; psh: number | null; pr: number | null;
}
const EMPTY: CalcInputs = {
  monthlyKwh: null, monthlyBill: null, sizeMode: "kwp", kwp: null, panelCount: null, panelW: null, panelId: null, productionOverride: null,
  tariff: null, systemCost: null, installCost: null, maintenance: null, cleaning: null, repairs: null,
  horizon: null, degradationPct: null, co2: null, psh: null, pr: null,
};
const CURRENCY = "KWD";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const toNum = (raw: string): number | null => { if (raw.trim() === "") return null; const n = Number(raw); return Number.isFinite(n) ? n : null; };
const show = (v: number | null) => (v === null ? "" : String(v));

export function SavingsCalculator({ settings, mode, panels = [] }: { settings: PlatformSettings; mode: DataMode; panels?: CalcPanelOption[] }) {
  const [inp, setInp] = useLocalStore<CalcInputs>("calculator", EMPTY);
  const set = <K extends keyof CalcInputs>(k: K, v: CalcInputs[K]) => setInp((p) => ({ ...p, [k]: v }));

  // The chosen catalogue panel, only while the rating field still holds its value; a typed change makes the figure the person's own.
  const chosenPanel = panels.find((o) => o.id === (inp.panelId ?? null)) ?? null;
  const ratingFromCatalogue = chosenPanel !== null && chosenPanel.ratedW === inp.panelW;
  const choosePanel = (id: string) => {
    const o = panels.find((x) => x.id === id) ?? null;
    setInp((p) => ({ ...p, panelId: o ? o.id : null, panelW: o ? o.ratedW : p.panelW }));
  };

  /* ---------- assumptions: platform (source) → user → unavailable ---------- */
  const tariff = resolveAssumption(inp.tariff, settings.electricity_tariff_per_kwh);
  const psh = resolveAssumption(inp.psh, settings.peak_sun_hours_per_day);
  const pr = resolveAssumption(inp.pr, settings.performance_ratio);
  const co2 = resolveAssumption(inp.co2, settings.grid_co2_kg_per_kwh);
  const horizon = resolveAssumption(inp.horizon, settings.tco_period_years);
  const degPlatform = settings.expected_panel_degradation_rate ? { value: settings.expected_panel_degradation_rate.value * 100, source: settings.expected_panel_degradation_rate.source } : null;
  const degPct = resolveAssumption(inp.degradationPct, degPlatform);
  const a: SolarAssumptions = {
    tariffPerKwh: tariff.value, peakSunHoursPerDay: psh.value, performanceRatio: pr.value, gridCo2KgPerKwh: co2.value,
    horizonYears: horizon.value, annualDegradation: degPct.value === null ? null : degPct.value / 100, currency: CURRENCY,
  };

  /* ---------- derived inputs ---------- */
  const consumption: Classified = (() => {
    if (isNum(inp.monthlyKwh)) return { value: inp.monthlyKwh, cls: "user" };
    if (isNum(inp.monthlyBill)) {
      if (tariff.value === null) return unavailable("A bill can only be converted to kWh with an electricity rate.");
      return { value: inp.monthlyBill / tariff.value, cls: "estimated", source: "Solink calculator", notes: [`${inp.monthlyBill} ${CURRENCY} ÷ ${tariff.value} ${CURRENCY}/kWh`] };
    }
    return unavailable("Enter your monthly consumption (kWh) or monthly bill.");
  })();

  const capacity: Classified = inp.sizeMode === "kwp"
    ? (isNum(inp.kwp) ? { value: inp.kwp, cls: "user" } : unavailable("Enter the system size in kWp."))
    : systemCapacityKwp(inp.panelCount, inp.panelW);

  const productionEst = annualProductionKwh(capacity.value, a);
  const production: Classified = isNum(inp.productionOverride)
    ? { value: inp.productionOverride, cls: "user", source: "Your figure", notes: ["You supplied the expected production; it replaces Solink's estimate."] }
    : productionEst;

  const offset = energyOffset(production.value, consumption.value);
  const savings = annualSavings(production.value, a);
  const co2Kg = co2AvoidedKg(production.value, a);

  const upfront: Classified = (() => {
    const missing: string[] = [];
    if (!isNum(inp.systemCost)) missing.push("system cost");
    if (!isNum(inp.installCost)) missing.push("installation cost (your installer's quote)");
    if (missing.length) return unavailable(`Missing: ${missing.join(", ")}.`);
    return { value: inp.systemCost! + inp.installCost!, cls: "user", notes: [`${inp.systemCost} + ${inp.installCost}`] };
  })();
  const opexKnown = isNum(inp.maintenance) && isNum(inp.cleaning);
  const opex = opexKnown ? inp.maintenance! + inp.cleaning! : 0;
  const paybackRaw = paybackYears(upfront.value, savings.value, opex);
  const payback: Classified = paybackRaw.value === null ? paybackRaw : { ...paybackRaw, notes: [...(paybackRaw.notes ?? []), opexKnown ? "Annual costs = maintenance + cleaning." : "Maintenance and cleaning were not entered, so no annual costs are subtracted."] };

  /* ---------- lifetime series ---------- */
  const series = (() => {
    if (!isNum(production.value)) return null;
    if (!isNum(a.horizonYears) || a.horizonYears < 1) return null;
    if (!isNum(a.annualDegradation)) return null;
    if (!isNum(a.tariffPerKwh)) return null;
    const rows: { year: number; production: number; savings: number; cumSavings: number }[] = [];
    let cum = 0;
    for (let y = 1; y <= Math.min(Math.floor(a.horizonYears), 60); y++) {
      const p = production.value * Math.pow(1 - a.annualDegradation, y - 1);
      const s = p * a.tariffPerKwh;
      cum += s;
      rows.push({ year: y, production: p, savings: s, cumSavings: cum });
    }
    return rows;
  })();
  const lifetimeSavings: Classified = (() => {
    if (!isNum(production.value)) return unavailable("Annual production is required.");
    if (!isNum(a.horizonYears)) return unavailable("Set the analysis period.");
    if (!isNum(a.annualDegradation)) return unavailable("Set the annual degradation.");
    if (!isNum(a.tariffPerKwh)) return unavailable("Set the electricity rate.");
    const total = series ? series[series.length - 1]?.cumSavings ?? 0 : 0;
    return { value: total, cls: "estimated", source: "Solink calculator", notes: [`Σ year-1 production × (1 − ${a.annualDegradation})^(y−1) × ${a.tariffPerKwh} ${CURRENCY}/kWh over ${a.horizonYears} years`, "Undiscounted; assumes a constant tariff."] };
  })();

  const tco = totalCostOfOwnership({ systemCost: inp.systemCost, installation: inp.installCost, annualMaintenance: inp.maintenance, annualCleaning: inp.cleaning, repairsAndReplacements: inp.repairs, horizonYears: a.horizonYears ?? null });
  const netBenefit: Classified = isNum(lifetimeSavings.value) && isNum(tco.value)
    ? { value: lifetimeSavings.value - tco.value, cls: "estimated", source: "Solink calculator", notes: ["Lifetime savings − total cost of ownership"] }
    : unavailable("Needs both lifetime savings and total cost of ownership.");

  const chartReady = series !== null && isNum(upfront.value);
  const cumulative = chartReady
    ? [
        { name: "Cumulative savings", points: [{ x: 0, y: 0 }, ...series.map((r) => ({ x: r.year, y: r.cumSavings }))], color: "var(--series-3)" },
        { name: opexKnown ? "Cumulative cost" : "Cumulative cost (upfront only: maintenance/cleaning not provided)", points: [{ x: 0, y: upfront.value! }, ...series.map((r) => ({ x: r.year, y: upfront.value! + opex * r.year }))], color: "var(--series-2)" },
      ]
    : null;

  const sizeId = useId();

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* -------- inputs -------- */}
      <div className="grid gap-5 lg:col-span-5">
        {mode === "demo" && <DemoBanner text="LOCAL DEMO MODE" detail="Inputs are saved in this browser only." />}

        <Card>
          <CardHeader title="Your electricity" subtitle="Enter consumption in kWh, or your bill. Converting a bill needs the tariff below." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label={<>Monthly consumption <InfoTip term="kwh" /></>} hint={<DataBadge cls="user" compact />}>
              <div className="flex items-center gap-2"><Input type="number" inputMode="decimal" min={0} step="1" value={show(inp.monthlyKwh)} onChange={(e) => set("monthlyKwh", toNum(e.target.value))} aria-label="Monthly consumption in kWh" /><span className="text-[12.5px] text-fg-muted">kWh</span></div>
            </Field>
            <Field label="Monthly bill" hint={<DataBadge cls="user" compact />} help={tariff.value === null ? "Or enter your monthly use in kWh." : "Used only when kWh is empty."}>
              <div className="flex items-center gap-2"><Input type="number" inputMode="decimal" min={0} step="0.001" value={show(inp.monthlyBill)} onChange={(e) => set("monthlyBill", toNum(e.target.value))} aria-label="Monthly bill" /><span className="text-[12.5px] text-fg-muted">{CURRENCY}</span></div>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={<>System size <InfoTip term="system_capacity" /></>} subtitle="Directly in kWp, or as panel count × panel rating." />
          <CardBody className="grid gap-4">
            <div role="radiogroup" aria-label="How to enter system size" className="inline-flex w-fit rounded-[10px] border border-border bg-inset p-0.5 text-[13px]">
              {(["kwp", "panels"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={inp.sizeMode === m} onClick={() => set("sizeMode", m)} className={cn("rounded-[8px] px-3 py-1.5 font-medium", inp.sizeMode === m ? "bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg-secondary")}>
                  {m === "kwp" ? "kWp" : "Panels × watts"}
                </button>
              ))}
            </div>
            {inp.sizeMode === "kwp" ? (
              <Field label={<>System size <InfoTip term="kwp" /></>} hint={<DataBadge cls="user" compact />} className="sm:max-w-xs">
                <div className="flex items-center gap-2"><Input id={sizeId} aria-label="System size in kWp" type="number" inputMode="decimal" min={0} step="0.1" value={show(inp.kwp)} onChange={(e) => set("kwp", toNum(e.target.value))} /><span className="text-[12.5px] text-fg-muted">kWp</span></div>
              </Field>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Panel from the catalogue" className="sm:col-span-2" hint={chosenPanel ? <DataBadge cls={chosenPanel.isDemo ? "demo" : "source"} compact source={chosenPanel.source} /> : undefined} help={panels.length === 0 ? "No panels are in the catalogue yet; type the rating below." : "Choosing a panel fills its rated power from the record. You can still type a rating of your own."}>
                  <Select value={chosenPanel?.id ?? ""} onChange={(e) => choosePanel(e.target.value)} disabled={panels.length === 0} aria-label="Panel from the catalogue">
                    <option value="">Type the rating myself</option>
                    {panels.map((o) => <option key={o.id} value={o.id}>{o.label} ({o.ratedW} W){o.isDemo ? " (DEMO)" : ""}</option>)}
                  </Select>
                </Field>
                <Field label="Number of panels" hint={<DataBadge cls="user" compact />}>
                  <Input type="number" inputMode="numeric" min={0} step="1" value={show(inp.panelCount)} onChange={(e) => set("panelCount", toNum(e.target.value))} aria-label="Number of panels" />
                </Field>
                <Field label={<>Panel rating <InfoTip term="peak_power" /></>} hint={ratingFromCatalogue && chosenPanel ? <DataBadge cls={chosenPanel.isDemo ? "demo" : "source"} compact source={chosenPanel.source} /> : <DataBadge cls="user" compact />} help={ratingFromCatalogue && chosenPanel ? `From the ${chosenPanel.label} record.` : "From the panel datasheet or the Marketplace."}>
                  <div className="flex items-center gap-2"><Input type="number" inputMode="decimal" min={0} step="1" value={show(inp.panelW)} onChange={(e) => { const v = toNum(e.target.value); setInp((p) => ({ ...p, panelW: v, panelId: chosenPanel && v === chosenPanel.ratedW ? p.panelId : null })); }} aria-label="Panel rated power in watts" /><span className="text-[12.5px] text-fg-muted">W</span></div>
                </Field>
              </div>
            )}
            <Field label="Expected annual production (optional override)" hint={<DataBadge cls="user" compact />} help="If an installer or datasheet gave you a figure, enter it to replace Solink's estimate." className="sm:max-w-xs">
              <div className="flex items-center gap-2"><Input type="number" inputMode="decimal" min={0} step="1" value={show(inp.productionOverride)} onChange={(e) => set("productionOverride", toNum(e.target.value))} aria-label="Expected annual production override in kWh" /><span className="text-[12.5px] text-fg-muted">kWh/yr</span></div>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={<>Costs <InfoTip term="tco" /></>} subtitle="Enter the amounts from your quotes. Solink never assumes a cost." />
          <CardBody className="grid gap-3">
            <Field label="System (equipment) cost" hint={<DataBadge cls="user" compact />} help="Panels, inverter and mounting: from a quote or the Marketplace.">
              <div className="flex items-center gap-2"><Input type="number" inputMode="decimal" min={0} step="1" value={show(inp.systemCost)} onChange={(e) => set("systemCost", toNum(e.target.value))} aria-label="System cost" /><span className="text-[12.5px] text-fg-muted">{CURRENCY}</span></div>
            </Field>
            <AssumptionField label="Installation cost" placeholderKey="INSTALLATION_PRICE" unit={CURRENCY} platform={null} value={inp.installCost} onChange={(v) => set("installCost", v)} help="One-off labour, permits and commissioning." step="1" min={0} />
            <AssumptionField label="Annual maintenance cost" placeholderKey="MAINTENANCE_PRICE" unit={`${CURRENCY}/yr`} platform={null} value={inp.maintenance} onChange={(v) => set("maintenance", v)} help="Yearly inspection and servicing." step="1" min={0} />
            <AssumptionField label="Annual cleaning cost" placeholderKey="MAINTENANCE_PRICE" unit={`${CURRENCY}/yr`} platform={null} value={inp.cleaning} onChange={(v) => set("cleaning", v)} help="Dust and sand removal: important in Kuwait." step="1" min={0} />
            <Field label="Repairs / replacements reserve over the period" hint={<DataBadge cls="user" compact />} help="A lump sum you set aside for inverter replacement or repairs. Required for total cost of ownership.">
              <div className="flex items-center gap-2"><Input type="number" inputMode="decimal" min={0} step="1" value={show(inp.repairs)} onChange={(e) => set("repairs", toNum(e.target.value))} aria-label="Repairs and replacements reserve" /><span className="text-[12.5px] text-fg-muted">{CURRENCY}</span></div>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Assumptions" subtitle="Pre-filled from platform settings where an admin has supplied them; otherwise you must enter them." />
          <CardBody className="grid gap-3">
            <AssumptionField label="Electricity tariff" placeholderKey="ELECTRICITY_TARIFF" unit={`${CURRENCY}/kWh`} platform={settings.electricity_tariff_per_kwh} value={inp.tariff} onChange={(v) => set("tariff", v)} help="What you pay per kWh. Turns production into savings." step="0.001" min={0} />
            <AssumptionField label="Peak sun hours per day" term="peak_sun_hours" placeholderKey="SOLAR_RESOURCE_DATA_SOURCE" unit="h/day" platform={settings.peak_sun_hours_per_day} value={inp.psh} onChange={(v) => set("psh", v)} help="Equivalent hours of full-strength sun per day at your site." step="0.1" min={0} />
            <AssumptionField label="Performance ratio" term="performance_ratio" placeholderKey="SYSTEM_LOSS_FACTOR" unit="0–1" platform={settings.performance_ratio} value={inp.pr} onChange={(v) => set("pr", v)} help="Share of theoretical output left after heat, dust, wiring and inverter losses." step="0.01" min={0} />
            <AssumptionField label="Analysis horizon" placeholderKey="TCO_PERIOD" unit="years" platform={settings.tco_period_years} value={inp.horizon} onChange={(v) => set("horizon", v)} help="How many years the lifetime savings and cost of ownership cover." step="1" min={1} />
            <AssumptionField label="Annual degradation" term="degradation" placeholderKey="EXPECTED_PANEL_DEGRADATION_RATE" unit="%/yr" platform={degPlatform} value={inp.degradationPct} onChange={(v) => set("degradationPct", v)} help="Yearly output loss from the panel's performance warranty." step="0.01" min={0} />
            <AssumptionField label="Grid CO₂ factor" term="co2_reduction" placeholderKey="GRID_CO2_EMISSION_FACTOR" unit="kg/kWh" platform={settings.grid_co2_kg_per_kwh} value={inp.co2} onChange={(v) => set("co2", v)} help="Kilograms of CO₂ the grid emits per kWh." step="0.01" min={0} />
          </CardBody>
        </Card>

        <Button type="button" variant="ghost" onClick={() => setInp(EMPTY)} className="w-fit"><RotateCcw className="size-4" aria-hidden /> Reset all inputs</Button>
      </div>

      {/* -------- outputs -------- */}
      <div className="grid gap-5 lg:col-span-7">
        <section aria-labelledby="yearly-heading">
          <h2 id="yearly-heading" className="mb-3 text-[17px] font-semibold text-fg-heading">Each year</h2>
          {(() => {
            const items = [
              [consumption, <MetricWithNotes key="c" label={<>Monthly consumption <InfoTip term="kwh" /></>} data={consumption} unit="kWh" format={(v) => formatNumber(v, 0)} />],
              [capacity, <MetricWithNotes key="k" label={<>System capacity <InfoTip term="kwp" /></>} data={capacity} unit="kWp" format={(v) => formatNumber(v, 2)} />],
              [production, <MetricWithNotes key="p" label={<>Estimated production <InfoTip term="energy_production" /></>} data={production} unit="kWh/yr" format={(v) => formatNumber(v, 0)} energy />],
              [offset, <MetricWithNotes key="o" label={<>Energy offset <InfoTip term="energy_offset" /></>} data={offset} format={(v) => pct(v, 0)} />],
              [savings, <MetricWithNotes key="s" label="Annual savings" data={savings} format={(v) => formatMoney(v, CURRENCY, 0)} />],
              [co2Kg, <MetricWithNotes key="co2" label={<>CO₂ avoided <InfoTip term="co2_reduction" /></>} data={co2Kg} unit="kg/yr" format={(v) => formatNumber(v, 0)} />],
            ] as const;
            const shown = items.filter(([d]) => d.value !== null).map(([, n]) => n);
            return shown.length ? <div className="grid gap-4 sm:grid-cols-2">{shown}</div> : <ResultsHint>Enter your monthly use (or bill) and a system size on the left, and the yearly figures appear here.</ResultsHint>;
          })()}
        </section>

        <section aria-labelledby="lifetime-heading">
          <h2 id="lifetime-heading" className="mb-3 text-[17px] font-semibold text-fg-heading">Over the analysis period</h2>
          {(() => {
            const items = [
              [payback, <MetricWithNotes key="pb" label={<>Payback period <InfoTip term="payback_period" /></>} data={payback} unit="years" format={(v) => formatNumber(v, 1)} />],
              [upfront, <MetricWithNotes key="u" label="Upfront cost" data={upfront} format={(v) => formatMoney(v, CURRENCY, 0)} />],
              [lifetimeSavings, <MetricWithNotes key="ls" label={<>Lifetime savings <InfoTip term="degradation" /></>} data={lifetimeSavings} format={(v) => formatMoney(v, CURRENCY, 0)} />],
              [tco, <MetricWithNotes key="t" label={<>Total cost of ownership <InfoTip term="tco" /></>} data={tco} format={(v) => formatMoney(v, CURRENCY, 0)} />],
              [netBenefit, <MetricWithNotes key="n" label="Net benefit over the period" data={netBenefit} format={(v) => formatMoney(v, CURRENCY, 0)} className="sm:col-span-2" />],
            ] as const;
            const shown = items.filter(([d]) => d.value !== null).map(([, n]) => n);
            return shown.length ? <div className="grid gap-4 sm:grid-cols-2">{shown}</div> : <ResultsHint>Add the system and installation costs from your quotes, and payback, lifetime savings and cost of ownership appear here.</ResultsHint>;
          })()}
        </section>

        <Card>
          <CardHeader title="Cost of ownership breakdown" subtitle={isNum(tco.value) ? `Over ${a.horizonYears} years, undiscounted.` : "Fill in every cost and the horizon to see the breakdown."} action={isNum(tco.value) ? <DataBadge cls="estimated" compact /> : undefined} />
          <CardBody>
            {tco.breakdown ? (
              <BarChart ariaLabel="Total cost of ownership breakdown" data={Object.entries(tco.breakdown).map(([label, value]) => ({ label, value }))} formatY={(v) => formatNumber(v, 0)} color="var(--series-2)" height={220} />
            ) : (
              <p className="text-[13px] leading-relaxed text-fg-secondary">The breakdown draws here once each cost and the analysis period have amounts.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Cumulative savings vs cost" subtitle="Where the lines cross is the payback point. Savings fall slightly each year with degradation." action={cumulative ? <DataBadge cls="estimated" compact /> : undefined} />
          <CardBody>
            {cumulative ? (
              <LineChart series={cumulative} area={false} height={240} formatX={(x) => `Y${x}`} formatY={(v) => formatNumber(v, 0)} yLabel={CURRENCY} ariaLabel="Cumulative savings versus cumulative cost by year" />
            ) : (
              <p className="text-[13px] leading-relaxed text-fg-secondary">The payback chart draws here once production, the costs and the analysis period are all set.</p>
            )}
          </CardBody>
        </Card>

        <DataLegend classes={["source", "calculated", "estimated", "user"]} />
      </div>
    </div>
  );
}

/** Where results will appear, and which inputs bring them. */
function ResultsHint({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[var(--radius-lg)] border border-border bg-inset p-4 text-[13px] leading-relaxed text-fg-secondary">{children}</div>;
}
