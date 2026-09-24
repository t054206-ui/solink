"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Circle, SlidersHorizontal, Sun } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Form";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { UnavailableState } from "@/components/ui/States";
import { RoofSun } from "@/components/illustrations/Illustrations";
import { Button } from "@/components/ui/Button";
import { InfoTip } from "@/components/help/InfoTip";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { DataMode } from "@/lib/data/mode";
import type { PlatformSettings } from "@/lib/data/settings";
import { tariffFor } from "@/lib/solar/tariff";
import type { Product, SolarProfile } from "@/lib/types";
import { type Classified, unavailable } from "@/lib/classification";
import { annualProductionKwh, annualSavings, capacityForConsumption, co2AvoidedKg, energyOffset, formatNumber, panelsThatFit, paybackYears, systemCapacityKwp, type SolarAssumptions } from "@/lib/solar/calculations";
import { formatMoney, pct, specNum, specText, cn } from "@/lib/utils";
import { AssumptionField, resolveAssumption } from "../_plan/AssumptionField";
import { MetricWithNotes } from "../_plan/MetricWithNotes";
import { DataLegend } from "../_plan/DataLegend";
import { PROFILE_STORE_KEY, mergeProfile, resolveRoofArea, type ProfileDraft } from "../_plan/profileStore";
import { WeatherCard } from "./WeatherCard";

interface UserAssumptions { psh: number | null; pr: number | null; tariff: number | null; co2: number | null }
const NO_USER: UserAssumptions = { psh: null, pr: null, tariff: null, co2: null };

export function PotentialAnalysis({ profile: serverProfile, mode, settings, panels }: { profile: SolarProfile | null; mode: DataMode; settings: PlatformSettings; panels: Product[] }) {
  const [local] = useLocalStore<ProfileDraft | null>(PROFILE_STORE_KEY, null);
  const [user, setUser] = useLocalStore<UserAssumptions>("analysis:assumptions", NO_USER);
  const [panelId, setPanelId] = useLocalStore<string | null>("analysis:panel", null);
  const [open, setOpen] = useState(true);

  const profile = useMemo(() => mergeProfile(serverProfile, mode === "demo" ? local : null), [serverProfile, local, mode]);
  const panel = panels.find((p) => p.id === panelId) ?? panels[0] ?? null;

  // Assumptions: platform setting (source) → user value → unavailable. Never a built-in default.
  const psh = resolveAssumption(user.psh, settings.peak_sun_hours_per_day);
  const pr = resolveAssumption(user.pr, settings.performance_ratio);
  // The tariff follows the sector the property is billed under (Solar Profile).
  const tariffPlatform = tariffFor(settings.electricity_tariff_per_kwh, profile?.tariff_category);
  const tariff = resolveAssumption(user.tariff, tariffPlatform.platform);
  const co2 = resolveAssumption(user.co2, settings.grid_co2_kg_per_kwh);
  const a: SolarAssumptions = { peakSunHoursPerDay: psh.value, performanceRatio: pr.value, tariffPerKwh: tariff.value, gridCo2KgPerKwh: co2.value, currency: profile?.currency ?? "KWD" };
  const missingAssumptions = [psh, pr, tariff, co2].filter((x) => x.cls === "unavailable").length;

  // Consumption: kWh directly, or bill ÷ tariff (only when a tariff exists).
  const consumption: Classified = (() => {
    if (typeof profile?.monthly_consumption_kwh === "number") return { value: profile.monthly_consumption_kwh, cls: "user", source: "Solar Profile" };
    if (typeof profile?.monthly_bill === "number") {
      if (tariff.value === null) return unavailable("Your profile has a monthly bill but no kWh figure. Converting it needs an electricity rate.");
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
    if (price === null) missing.push(panel.is_demo ? "panel price (demo product: no real price)" : "panel price");
    if (install === null) missing.push("installation (your installer's quote)");
    if (proposedCount.value === null) missing.push("panel count");
    if (missing.length) return unavailable(`Missing: ${missing.join(", ")}. Enter your own costs in the Savings Calculator.`);
    return { value: price! * proposedCount.value! + install!, cls: "estimated", source: "Marketplace price + installation", notes: [`${proposedCount.value} × ${price} + ${install}`] };
  })();
  const payback = paybackYears(totalCost.value, savings.value);
  const paybackShown: Classified = totalCost.value === null ? unavailable(totalCost.reason ?? "Total cost unavailable.") : payback;

  return (
    <div className="grid gap-5">
      {mode === "demo" && <DemoBanner detail="The profile and panel catalogue are demo records. Anything you enter is labeled user-provided." />}

      <PotentialBuilder
        steps={[
          { label: "Roof area", done: area.value !== null, value: area.value !== null ? `${formatNumber(area.value, 1)} m² for panels` : null, href: "/profile#roof" },
          { label: "Monthly electricity use", done: consumption.value !== null, value: consumption.value !== null ? `${formatNumber(consumption.value, 0)} kWh / month` : null, href: "/profile#energy" },
          { label: "Panel to size with", done: Boolean(panel), value: panel ? `${panel.manufacturer_name} ${panel.model}` : null, href: "/marketplace" },
          { label: "Sun at your site", done: psh.value !== null, value: psh.value !== null ? `${formatNumber(psh.value, 2)} peak sun hours / day` : null, href: "#assumptions" },
          { label: "Electricity rate", done: tariff.value !== null, value: tariff.value !== null ? `${tariff.value} ${a.currency}/kWh` : null, href: "#assumptions" },
        ]}
      />

      {/* Assumptions */}
      <Card id="assumptions" className="scroll-mt-20">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start justify-between gap-3 px-5 pt-5 pb-3 text-left">
          <div>
            <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-fg-heading"><SlidersHorizontal className="size-4 text-fg-muted" aria-hidden /> Assumptions</h3>
            <p className="mt-1 text-[13px] text-fg-muted">{missingAssumptions === 0 ? "All four are set from sourced platform values. Type your own to override any of them." : `Add ${missingAssumptions === 1 ? "one value" : `${missingAssumptions} values`} below to complete the estimate.`}</p>
          </div>
          <ChevronDown className={cn("mt-1 size-4 shrink-0 text-fg-muted transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {open && (
          <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AssumptionField dense label="Peak sun hours per day" term="peak_sun_hours" placeholderKey="SOLAR_RESOURCE_DATA_SOURCE" unit="h/day" platform={settings.peak_sun_hours_per_day} value={user.psh} onChange={(v) => setUser((u) => ({ ...u, psh: v }))} help="Equivalent hours of full-strength sun per day at your site. Drives how much a kWp produces." step="0.1" min={0} />
            <AssumptionField dense label="Performance ratio" term="performance_ratio" placeholderKey="SYSTEM_LOSS_FACTOR" unit="0–1" platform={settings.performance_ratio} value={user.pr} onChange={(v) => setUser((u) => ({ ...u, pr: v }))} help="Share of theoretical output left after heat, dust, wiring and inverter losses." step="0.01" min={0} />
            <AssumptionField dense label="Electricity tariff" placeholderKey="ELECTRICITY_TARIFF" unit={`${a.currency}/kWh`} platform={tariffPlatform.platform} note={tariffPlatform.note} value={user.tariff} onChange={(v) => setUser((u) => ({ ...u, tariff: v }))} help="What you pay per kWh. Needed to turn production into savings." step="0.001" min={0} />
            <AssumptionField dense label="Grid CO₂ factor" term="co2_reduction" placeholderKey="GRID_CO2_EMISSION_FACTOR" unit="kg/kWh" platform={settings.grid_co2_kg_per_kwh} value={user.co2} onChange={(v) => setUser((u) => ({ ...u, co2: v }))} help="Kilograms of CO₂ the grid emits per kWh. Needed for the CO₂ reduction estimate." step="0.01" min={0} />
          </CardBody>
        )}
      </Card>

      {/* Inputs summary + panel picker */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="From your profile" action={<Button href="/profile" size="sm" variant="ghost">Edit</Button>} />
          <CardBody className="grid gap-3">
            {consumption.value !== null && <MetricWithNotes label={<>Monthly consumption <InfoTip term="kwh" /></>} data={consumption} unit="kWh" format={(v) => formatNumber(v, 0)} />}
            {area.value !== null && <MetricWithNotes label="Roof area for panels" data={area} unit="m²" format={(v) => formatNumber(v, 1)} />}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-secondary">
              <span>Orientation <InfoTip term="orientation" />: <strong className="text-fg">{profile?.roof_orientation ?? "Not set"}</strong></span>
              <span>Tilt <InfoTip term="tilt" />: <strong className="text-fg">{typeof profile?.roof_tilt_deg === "number" ? `${profile.roof_tilt_deg}°` : "Not set"}</strong></span>
              <span>Shading <InfoTip term="shading" />: <strong className="text-fg">{profile?.shading_notes ? "noted" : "none noted"}</strong></span>
            </div>
            <p className="text-[11.5px] text-fg-muted">Orientation, tilt and shading are kept with your profile for your installer. The estimates use the regional sun-hours figure for every roof.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Panel to size with" subtitle="Rated power and dimensions come from the selected product record." />
          <CardBody className="grid gap-3">
            {panels.length === 0 ? (
              <UnavailableState title="Panels appear here from the catalogue">Browse the marketplace to pick one.</UnavailableState>
            ) : (
              <>
                <Field label="Solar panel">
                  <Select id="panel" value={panel?.id ?? ""} onChange={(e) => setPanelId(e.target.value || null)}>
                    {panels.map((p) => <option key={p.id} value={p.id}>{p.manufacturer_name}. {p.model}{p.is_demo ? " (DEMO)" : ""}</option>)}
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
                      <div><dt className="text-[11.5px] text-fg-muted">Size</dt><dd className="tabular text-fg">{lenMm !== null && widMm !== null ? `${lenMm} × ${widMm} mm` : "Not stated"}</dd></div>
                      <div><dt className="text-[11.5px] text-fg-muted">Efficiency <InfoTip term="efficiency" /></dt><dd className="tabular text-fg">{specText(panel.specs.module_efficiency_pct)}</dd></div>
                    </dl>
                    {panel.is_demo && <p className="mt-2 text-[11.5px] text-critical-fg">Demo product. Specifications are illustrative and the price is not real.</p>}
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Results: only figures that can be worked out from real inputs (owner, 2026-09-24). */}
      {(() => {
        const results = [
          { key: "rec", node: <MetricWithNotes label={<>Recommended capacity <InfoTip term="system_capacity" /></>} data={recommended} unit="kWp" format={(v) => formatNumber(v, 2)} />, data: recommended },
          { key: "fit", node: <MetricWithNotes label="Panels that fit your roof" data={fit} unit="panels" format={(v) => formatNumber(v, 0)} />, data: fit },
          { key: "count", node: <MetricWithNotes label="Proposed panel count" data={proposedCount} unit="panels" format={(v) => formatNumber(v, 0)} />, data: proposedCount },
          { key: "cap", node: <MetricWithNotes label={<>Resulting capacity <InfoTip term="kwp" /></>} data={capacity} unit="kWp" format={(v) => formatNumber(v, 2)} />, data: capacity },
          { key: "prod", node: <MetricWithNotes label={<>Expected annual production <InfoTip term="energy_production" /></>} data={production} unit="kWh/yr" format={(v) => formatNumber(v, 0)} energy />, data: production },
          { key: "offset", node: <MetricWithNotes label={<>Energy offset <InfoTip term="energy_offset" /></>} data={offset} format={(v) => pct(v, 0)} />, data: offset },
          { key: "sav", node: <MetricWithNotes label="Estimated annual savings" data={savings} format={(v) => formatMoney(v, a.currency, 0)} />, data: savings },
          { key: "pay", node: <MetricWithNotes label={<>Payback period <InfoTip term="payback_period" /></>} data={paybackShown} unit="years" format={(v) => formatNumber(v, 1)} />, data: paybackShown },
          { key: "co2", node: <MetricWithNotes label={<>CO₂ reduction <InfoTip term="co2_reduction" /></>} data={co2Kg} unit="kg/yr" format={(v) => formatNumber(v, 0)} />, data: co2Kg },
        ].filter((r) => r.data.value !== null);
        if (!results.length) return null;
        return (
          <section aria-labelledby="results-heading">
            <h2 id="results-heading" className="mb-3 text-[17px] font-semibold text-fg-heading">What your roof could do</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => <div key={r.key}>{r.node}</div>)}
              {savings.value !== null && paybackShown.value === null && (
                <Link href="/calculator" className="lift flex flex-col justify-between gap-2 rounded-[var(--radius-lg)] border border-border bg-elevated p-3 shadow-sm hover:bg-inset">
                  <span className="text-[12px] font-medium text-fg-secondary">Payback period <InfoTip term="payback_period" /></span>
                  <span className="text-[13px] leading-snug text-fg-secondary">Add your installer&apos;s quote in the Savings Calculator to see when the system pays for itself.</span>
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--brand-strong)]">Open the calculator <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden /></span>
                </Link>
              )}
            </div>
          </section>
        );
      })()}

      {/* Site data */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={<><Sun className="size-4 text-[var(--sun-ink)]" aria-hidden /> Sun at your site <InfoTip term="irradiance" /></>} subtitle="How much sunlight the estimate works from." />
          <CardBody className="grid gap-3">
            <dl className="grid grid-cols-2 gap-3">
              {settings.peak_sun_hours_per_day && (
                <div className="rounded-[var(--radius)] border border-border bg-inset p-3">
                  <dt className="micro">Peak sun hours</dt>
                  <dd className="figure mt-1 text-[20px] font-medium text-[color:var(--sun-ink)]">{formatNumber(settings.peak_sun_hours_per_day.value, 2)}<span className="ms-1 text-[12px] text-fg-muted">h/day</span></dd>
                </div>
              )}
              {settings.performance_ratio && (
                <div className="rounded-[var(--radius)] border border-border bg-inset p-3">
                  <dt className="micro">Performance ratio</dt>
                  <dd className="figure mt-1 text-[20px] font-medium text-[color:var(--brand-strong)]">{formatNumber(settings.performance_ratio.value, 2)}</dd>
                </div>
              )}
            </dl>
            {settings.peak_sun_hours_per_day && <p className="text-[11.5px] text-fg-info">{settings.peak_sun_hours_per_day.source}</p>}
            <p className="text-[12px] text-fg-muted">A regional figure for Kuwait, the same for every roof. Your own value in the assumptions above replaces it.</p>
          </CardBody>
        </Card>
        <WeatherCard lat={profile?.lat} lng={profile?.lng} />
      </div>

      <DataLegend classes={["source", "calculated", "estimated", "user", "demo"]} />

      <div className="flex flex-wrap gap-2">
        <Button href="/calculator" variant="primary">Refine in the Savings Calculator</Button>
        <Button href="/marketplace" variant="outline">Browse panels</Button>
      </div>
    </div>
  );
}

/**
 * "Your roof's potential": the inputs the estimate is built from, each either
 * filled from real data (with its value) or linked to where it is added. It
 * replaces the old wall of empty result cards; results appear below as the
 * inputs arrive. Nothing here is estimated.
 */
function PotentialBuilder({ steps }: { steps: { label: string; done: boolean; value: string | null; href: string }[] }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border-b border-border bg-inset p-5 md:border-b-0 md:border-e">
          <p className="micro" style={{ color: "var(--fg-mustard)" }}>Your roof&apos;s potential</p>
          <RoofSun className="mx-auto mt-3 max-w-xs" />
          <div className="mt-3">
            <div className="flex items-center justify-between text-[12.5px]"><span className="font-medium text-fg-heading">{done} of {steps.length} inputs ready</span>{next && <span className="text-fg-muted">Next: {next.label.toLowerCase()}</span>}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--grid)]"><div className="h-full rounded-full bg-[var(--sun)]" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
          </div>
        </div>
        <ol className="divide-y divide-border">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 px-5 py-3">
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", s.done ? "bg-good-soft text-good-fg" : "border border-dashed border-border-strong text-fg-muted")}>
                {s.done ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-2.5" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-fg-heading">{s.label}</span>
                {s.value && <span className="block truncate text-[12.5px] text-[color:var(--brand-strong)]">{s.value}</span>}
              </span>
              {!s.done && <Button href={s.href} size="sm" variant="outline">Add</Button>}
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
