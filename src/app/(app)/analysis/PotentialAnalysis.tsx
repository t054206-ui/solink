"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Home, Satellite, SlidersHorizontal } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Form";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { UnavailableState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { InfoTip } from "@/components/help/InfoTip";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { DataMode } from "@/lib/data/mode";
import type { PlatformSettings } from "@/lib/data/settings";
import type { Product, SolarProfile } from "@/lib/types";
import { type Classified, unavailable } from "@/lib/classification";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import { annualProductionKwh, annualSavings, capacityForConsumption, co2AvoidedKg, energyOffset, formatNumber, panelsThatFit, paybackYears, systemCapacityKwp, type SolarAssumptions } from "@/lib/solar/calculations";
import { formatMoney, pct, specNum, specText, cn } from "@/lib/utils";
import { AssumptionField, resolveAssumption } from "../_plan/AssumptionField";
import { MetricWithNotes } from "../_plan/MetricWithNotes";
import { DataLegend } from "../_plan/DataLegend";
import { PROFILE_STORE_KEY, mergeProfile, profileCompleteness, resolveRoofArea, type ProfileDraft } from "../_plan/profileStore";
import { WeatherCard } from "./WeatherCard";

interface UserAssumptions { psh: number | null; pr: number | null; tariff: number | null; co2: number | null }
const NO_USER: UserAssumptions = { psh: null, pr: null, tariff: null, co2: null };

export function PotentialAnalysis({ profile: serverProfile, mode, settings, panels }: { profile: SolarProfile | null; mode: DataMode; settings: PlatformSettings; panels: Product[] }) {
  const [local] = useLocalStore<ProfileDraft | null>(PROFILE_STORE_KEY, null);
  const [user, setUser] = useLocalStore<UserAssumptions>("analysis:assumptions", NO_USER);
  const [panelId, setPanelId] = useLocalStore<string | null>("analysis:panel", null);
  const [open, setOpen] = useState(true);

  const profile = useMemo(() => mergeProfile(serverProfile, mode === "demo" ? local : null), [serverProfile, local, mode]);
  const completeness = profileCompleteness(profile);
  const panel = panels.find((p) => p.id === panelId) ?? panels[0] ?? null;

  // Assumptions: platform setting (source) → user value → unavailable. Never a built-in default.
  const psh = resolveAssumption(user.psh, settings.peak_sun_hours_per_day);
  const pr = resolveAssumption(user.pr, settings.performance_ratio);
  const tariff = resolveAssumption(user.tariff, settings.electricity_tariff_per_kwh);
  const co2 = resolveAssumption(user.co2, settings.grid_co2_kg_per_kwh);
  const a: SolarAssumptions = { peakSunHoursPerDay: psh.value, performanceRatio: pr.value, tariffPerKwh: tariff.value, gridCo2KgPerKwh: co2.value, currency: profile?.currency ?? "KWD" };
  const missingAssumptions = [psh, pr, tariff, co2].filter((x) => x.cls === "unavailable").length;

  // Consumption: kWh directly, or bill ÷ tariff (only when a tariff exists).
  const consumption: Classified = (() => {
    if (typeof profile?.monthly_consumption_kwh === "number") return { value: profile.monthly_consumption_kwh, cls: "user", source: "Solar Profile" };
    if (typeof profile?.monthly_bill === "number") {
      if (tariff.value === null) return unavailable(`Your profile has a monthly bill but no kWh figure. Converting it needs ${PLACEHOLDERS.ELECTRICITY_TARIFF}.`);
      return { value: profile.monthly_bill / tariff.value, cls: "estimated", source: "Solink calculator", notes: [`${profile.monthly_bill} ${a.currency}/month ÷ ${tariff.value} ${a.currency}/kWh`] };
    }
    return unavailable("Add your monthly electricity use or bill in the Solar Profile.");
  })();

  // Roof area available for panels: explicit value, else whole roof (clearly noted).
  const roof = resolveRoofArea(profile);
  const area: Classified = typeof profile?.available_roof_area_m2 === "number"
    ? { value: profile.available_roof_area_m2, cls: "user", source: "Solar Profile" }
    : roof.value !== null
      ? { value: roof.value, cls: roof.derived ? "calculated" : "user", source: "Solar Profile", notes: ["No available-area figure given; using the whole roof area. Add the usable area in your profile for a tighter estimate."] }
      : unavailable("Add your roof area in the Solar Profile.");

  const ratedW = panel ? specNum(panel.specs.rated_power_w) : null;
  const lenMm = panel ? specNum(panel.specs.length_mm) : null;
  const widMm = panel ? specNum(panel.specs.width_mm) : null;

  const recommended = capacityForConsumption(consumption.value, a);
  const fit = panelsThatFit(area.value, lenMm, widMm);
  const proposedCount: Classified = (() => {
    if (recommended.value === null) return unavailable(recommended.reason ?? "Recommended capacity is unavailable.");
    if (ratedW === null) return unavailable("Selected panel has no rated power.");
    if (fit.value === null) return unavailable(fit.reason ?? "Panels that fit is unavailable.");
    const needed = Math.ceil((recommended.value * 1000) / ratedW);
    const n = Math.min(needed, fit.value);
    return { value: n, cls: "estimated", source: "Solink calculator", notes: [`min(${needed} panels needed for ${recommended.value.toFixed(2)} kWp, ${fit.value} that fit)`, n < needed ? "Roof space limits the system below the recommended size." : "The recommended size fits on the roof."] };
  })();
  const capacity = systemCapacityKwp(proposedCount.value, ratedW);
  const production = annualProductionKwh(capacity.value, a);
  const offset = energyOffset(production.value, consumption.value);
  const savings = annualSavings(production.value, a);
  const co2Kg = co2AvoidedKg(production.value, a);

  // Total cost = panel price × count + installation. Demo products carry no real price; installation prices are a placeholder.
  const totalCost: Classified = (() => {
    if (!panel) return unavailable("Select a panel.");
    const price = panel.is_demo ? null : specNum(panel.price);
    const install = specNum(panel.installation_cost);
    const missing: string[] = [];
    if (price === null) missing.push(panel.is_demo ? "panel price (demo product — no real price)" : "panel price");
    if (install === null) missing.push(`installation (${PLACEHOLDERS.INSTALLATION_PRICE})`);
    if (proposedCount.value === null) missing.push("panel count");
    if (missing.length) return unavailable(`Missing: ${missing.join(", ")}. Enter your own costs in the Savings Calculator.`);
    return { value: price! * proposedCount.value! + install!, cls: "estimated", source: "Marketplace price + installation", notes: [`${proposedCount.value} × ${price} + ${install}`] };
  })();
  const payback = paybackYears(totalCost.value, savings.value);
  const paybackShown: Classified = totalCost.value === null ? unavailable(totalCost.reason ?? "Total cost unavailable.") : payback;

  return (
    <div className="grid gap-5">
      {mode === "demo" && <DemoBanner detail="The profile and panel catalogue are demo records. Anything you enter is labeled user-provided." />}

      {!completeness.readyForAnalysis && (
        <Card className="border-warn/40">
          <CardHeader title={<><Home className="size-4 text-warn-fg" aria-hidden /> Your profile needs a little more</>} subtitle="These fields are required before Solink can estimate your solar potential." action={<Button href="/profile" size="sm" variant="outline">Open profile</Button>} />
          <CardBody>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-fg-secondary">{completeness.missingRequired.map((m) => <li key={m.key}>{m.label}</li>)}</ul>
          </CardBody>
        </Card>
      )}

      {/* Assumptions */}
      <Card>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start justify-between gap-3 px-5 pt-5 pb-3 text-left">
          <div>
            <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-fg"><SlidersHorizontal className="size-4 text-fg-muted" aria-hidden /> Assumptions</h3>
            <p className="mt-1 text-[13px] text-fg-muted">{missingAssumptions === 0 ? "All four assumptions are set." : `${missingAssumptions} of 4 assumptions are not set by the platform — supply your own to unlock estimates.`}</p>
          </div>
          <ChevronDown className={cn("mt-1 size-4 shrink-0 text-fg-muted transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {open && (
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <AssumptionField label="Peak sun hours per day" term="peak_sun_hours" placeholderKey="SOLAR_RESOURCE_DATA_SOURCE" unit="h/day" platform={settings.peak_sun_hours_per_day} value={user.psh} onChange={(v) => setUser((u) => ({ ...u, psh: v }))} help="Equivalent hours of full-strength sun per day at your site. Drives how much a kWp produces." step="0.1" min={0} />
            <AssumptionField label="Performance ratio" term="performance_ratio" placeholderKey="SYSTEM_LOSS_FACTOR" unit="0–1" platform={settings.performance_ratio} value={user.pr} onChange={(v) => setUser((u) => ({ ...u, pr: v }))} help="Share of theoretical output left after heat, dust, wiring and inverter losses." step="0.01" min={0} />
            <AssumptionField label="Electricity tariff" placeholderKey="ELECTRICITY_TARIFF" unit={`${a.currency}/kWh`} platform={settings.electricity_tariff_per_kwh} value={user.tariff} onChange={(v) => setUser((u) => ({ ...u, tariff: v }))} help="What you pay per kWh. Needed to turn production into savings." step="0.001" min={0} />
            <AssumptionField label="Grid CO₂ factor" term="co2_reduction" placeholderKey="GRID_CO2_EMISSION_FACTOR" unit="kg/kWh" platform={settings.grid_co2_kg_per_kwh} value={user.co2} onChange={(v) => setUser((u) => ({ ...u, co2: v }))} help="Kilograms of CO₂ the grid emits per kWh. Needed for the CO₂ reduction estimate." step="0.01" min={0} />
          </CardBody>
        )}
      </Card>

      {/* Inputs summary + panel picker */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="From your profile" action={<Button href="/profile" size="sm" variant="ghost">Edit</Button>} />
          <CardBody className="grid gap-3">
            <MetricWithNotes label={<>Monthly consumption <InfoTip term="kwh" /></>} data={consumption} unit="kWh" format={(v) => formatNumber(v, 0)} />
            <MetricWithNotes label="Roof area for panels" data={area} unit="m²" format={(v) => formatNumber(v, 1)} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-secondary">
              <span>Orientation <InfoTip term="orientation" />: <strong className="text-fg">{profile?.roof_orientation ?? "—"}</strong></span>
              <span>Tilt <InfoTip term="tilt" />: <strong className="text-fg">{typeof profile?.roof_tilt_deg === "number" ? `${profile.roof_tilt_deg}°` : "—"}</strong></span>
              <span>Shading <InfoTip term="shading" />: <strong className="text-fg">{profile?.shading_notes ? "noted" : "—"}</strong></span>
            </div>
            <p className="text-[11.5px] text-fg-muted">Orientation, tilt and shading are recorded but not yet modelled — the estimates below treat every roof the same until a site data source is connected.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Panel to size with" subtitle="Rated power and dimensions come from the selected product record." />
          <CardBody className="grid gap-3">
            {panels.length === 0 ? (
              <UnavailableState title="No panels in the catalogue"><Placeholder k="REAL_SOLAR_PANEL_DATA_SOURCE" /></UnavailableState>
            ) : (
              <>
                <Field label="Solar panel">
                  <Select id="panel" value={panel?.id ?? ""} onChange={(e) => setPanelId(e.target.value || null)}>
                    {panels.map((p) => <option key={p.id} value={p.id}>{p.manufacturer_name} — {p.model}{p.is_demo ? " (DEMO)" : ""}</option>)}
                  </Select>
                </Field>
                {panel && (
                  <div className="rounded-[10px] border border-border bg-inset p-3 text-[13px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-fg">{panel.name}</span>
                      <DataBadge cls={panel.is_demo ? "demo" : "source"} compact source={panel.is_demo ? undefined : panel.source.data_source} />
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-fg-secondary sm:grid-cols-3">
                      <div><dt className="text-[11.5px] text-fg-muted">Rated power <InfoTip term="peak_power" /></dt><dd className="tabular text-fg">{specText(panel.specs.rated_power_w)}</dd></div>
                      <div><dt className="text-[11.5px] text-fg-muted">Size</dt><dd className="tabular text-fg">{lenMm !== null && widMm !== null ? `${lenMm} × ${widMm} mm` : "Unavailable"}</dd></div>
                      <div><dt className="text-[11.5px] text-fg-muted">Efficiency <InfoTip term="efficiency" /></dt><dd className="tabular text-fg">{specText(panel.specs.module_efficiency_pct)}</dd></div>
                    </dl>
                    {panel.is_demo && <p className="mt-2 text-[11.5px] text-critical-fg">Demo product — specifications are illustrative and the price is not real.</p>}
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Results */}
      <section aria-labelledby="results-heading">
        <h2 id="results-heading" className="mb-3 text-[17px] font-semibold text-fg">What your roof could do</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricWithNotes label={<>Recommended capacity <InfoTip term="system_capacity" /></>} data={recommended} unit="kWp" format={(v) => formatNumber(v, 2)} />
          <MetricWithNotes label="Panels that fit your roof" data={fit} unit="panels" format={(v) => formatNumber(v, 0)} />
          <MetricWithNotes label="Proposed panel count" data={proposedCount} unit="panels" format={(v) => formatNumber(v, 0)} />
          <MetricWithNotes label={<>Resulting capacity <InfoTip term="kwp" /></>} data={capacity} unit="kWp" format={(v) => formatNumber(v, 2)} />
          <MetricWithNotes label={<>Expected annual production <InfoTip term="energy_production" /></>} data={production} unit="kWh/yr" format={(v) => formatNumber(v, 0)} />
          <MetricWithNotes label={<>Energy offset <InfoTip term="energy_offset" /></>} data={offset} format={(v) => pct(v, 0)} />
          <MetricWithNotes label="Estimated annual savings" data={savings} format={(v) => formatMoney(v, a.currency, 0)} />
          <MetricWithNotes label={<>Payback period <InfoTip term="payback_period" /></>} data={paybackShown} unit="years" format={(v) => formatNumber(v, 1)}
            extra={totalCost.value === null ? <div className="mt-1 flex flex-wrap gap-1"><Placeholder k="INSTALLATION_PRICE" /><Link href="/calculator" className="text-[var(--brand-strong)] hover:underline">Enter costs in the calculator →</Link></div> : undefined} />
          <MetricWithNotes label={<>CO₂ reduction <InfoTip term="co2_reduction" /></>} data={co2Kg} unit="kg/yr" format={(v) => formatNumber(v, 0)} />
        </div>
      </section>

      {/* Site data */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={<><Satellite className="size-4 text-fg-muted" aria-hidden /> Site solar data</>} subtitle="Roof geometry, sun exposure and local irradiance from a real site data source." />
          <CardBody className="grid gap-3">
            <PlaceholderNote k="GOOGLE_SOLAR_SITE_DATA_SOURCE" />
            <PlaceholderNote k="SOLAR_RESOURCE_DATA_SOURCE" />
            <p className="text-[12px] text-fg-muted">Until one of these is connected, the peak-sun-hours figure above must come from the platform or from you. <InfoTip term="irradiance" /></p>
          </CardBody>
        </Card>
        <WeatherCard lat={profile?.lat} lng={profile?.lng} />
      </div>

      <DataLegend classes={["source", "calculated", "estimated", "user", "unavailable", "demo"]} />

      <div className="flex flex-wrap gap-2">
        <Button href="/calculator" variant="primary">Refine in the Savings Calculator</Button>
        <Button href="/marketplace" variant="outline">Browse panels</Button>
      </div>
    </div>
  );
}
