"use client";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Metric } from "@/components/ui/Metric";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { EmptyState } from "@/components/ui/States";
import { InfoTip } from "@/components/help/InfoTip";
import { type Classified, type DataClass, unavailable } from "@/lib/classification";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import type { PlatformSettings } from "@/lib/data/settings";
import { DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { annualSavings, formatNumber, lifetimeProductionKwh, totalCostOfOwnership, type SolarAssumptions } from "@/lib/solar/calculations";
import { formatMoney } from "@/lib/utils";
import { AssumptionField, resolveAssumption } from "../../_plan/AssumptionField";
import { MetricWithNotes } from "../../_plan/MetricWithNotes";
import { AiExplainButton } from "../../_ops/AiExplainButton";
import { fmtKwh, fmtPct } from "../../_ops/production";
import { CostField, resolveCost } from "./CostField";
import { YearlyTable } from "./YearlyTable";
import { baselineYear, yearOneProduction, type PrefilledCost, type YearRow } from "./rows";

export interface PerfInputs {
  degradationPct: number | null;
  tariff: number | null;
  horizon: number | null;
  systemCost: number | null;
  installCost: number | null;
  maintenance: number | null;
  cleaning: number | null;
  repairs: number | null;
}
const EMPTY: PerfInputs = { degradationPct: null, tariff: null, horizon: null, systemCost: null, installCost: null, maintenance: null, cleaning: null, repairs: null };

export interface CostPrefills { maintenance: PrefilledCost; cleaning: PrefilledCost; repairs: PrefilledCost }

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function PerformanceView({ rows, cls, settings, panelDegradation = null, capacityKwp, systemName, currency = "KWD", prefills, trailingYield, totalRecorded, installationDate }: {
  rows: YearRow[];
  cls: DataClass;
  settings: PlatformSettings;
  /** The installed panel's warranty degradation in %/year, from its datasheet snapshot, when the passport carries one. Beats the platform-wide setting. */
  panelDegradation?: { value: number; source: string } | null;
  capacityKwp: number | null;
  systemName: string;
  currency?: string;
  prefills: CostPrefills;
  trailingYield: Classified;
  totalRecorded: Classified;
  installationDate: string | null;
}) {
  const [inp, setInp] = useLocalStore<PerfInputs>("performance", EMPTY);
  const set = <K extends keyof PerfInputs>(k: K, v: PerfInputs[K]) => setInp((p) => ({ ...p, [k]: v }));

  /* ---------- assumptions: platform setting → your own value → nothing ---------- */
  // The panel actually on the roof, as its manufacturer warrants it, is the
  // right rate for this system; the platform-wide setting is the fallback.
  const degPlatform = panelDegradation
    ?? (settings.expected_panel_degradation_rate
      ? { value: Math.round(settings.expected_panel_degradation_rate.value * 1000) / 10, source: settings.expected_panel_degradation_rate.source }
      : null);
  const degPct = resolveAssumption(inp.degradationPct, degPlatform);
  const horizon = resolveAssumption(inp.horizon, settings.tco_period_years);
  const tariff = resolveAssumption(inp.tariff, settings.electricity_tariff_per_kwh);
  const a: SolarAssumptions = {
    tariffPerKwh: tariff.value,
    annualDegradation: degPct.value === null ? null : degPct.value / 100,
    horizonYears: horizon.value,
    currency,
  };

  /* ---------- yearly series ---------- */
  const completeRows = rows.filter((r) => r.complete);
  const base = baselineYear(rows);
  const year1 = yearOneProduction(rows, cls);
  const bars = rows.map((r) => ({ label: r.complete ? String(r.year) : `${r.year} (partial)`, value: r.kwh }));

  const expected = base && isNum(a.annualDegradation)
    ? completeRows.map((r) => base.kwh * Math.pow(1 - (a.annualDegradation as number), r.year - base.year))
    : null;

  /** The most recent pair of complete consecutive years, the only fair comparison. */
  const lastComparable = [...rows].reverse().find((r) => r.comparable && r.changePct !== null) ?? null;

  /* ---------- total cost of ownership ---------- */
  const systemCost = resolveCost(inp.systemCost, null);
  const installCost = resolveCost(inp.installCost, null);
  const maintCost = resolveCost(inp.maintenance, prefills.maintenance);
  const cleanCost = resolveCost(inp.cleaning, prefills.cleaning);
  const repairCost = resolveCost(inp.repairs, prefills.repairs);
  const tco = totalCostOfOwnership({
    systemCost: systemCost.value, installation: installCost.value, annualMaintenance: maintCost.value,
    annualCleaning: cleanCost.value, repairsAndReplacements: repairCost.value, horizonYears: a.horizonYears ?? null,
  });
  const tcoBars = tco.breakdown ? Object.entries(tco.breakdown).map(([label, value]) => ({ label: shortLabel(label), value })) : [];

  /* ---------- lifetime ---------- */
  const lifetime = lifetimeProductionKwh(year1.value, a);
  const yearOneSavings = annualSavings(year1.value, a);
  const lifetimeSavingsRaw = annualSavings(lifetime.value, a);
  const lifetimeSavings: Classified = lifetimeSavingsRaw.value === null ? lifetimeSavingsRaw : {
    ...lifetimeSavingsRaw,
    notes: [`Lifetime production over ${a.horizonYears} years × ${a.tariffPerKwh} ${currency}/kWh`, "Undiscounted; assumes today's tariff applies for the whole period."],
  };
  const netPosition: Classified = isNum(lifetimeSavings.value) && isNum(tco.value)
    ? { value: lifetimeSavings.value - tco.value, cls: "estimated", source: "Solink calculator", notes: [`${Math.round(lifetimeSavings.value)} savings − ${Math.round(tco.value)} total cost of ownership`, "Every input above is an assumption or your own figure, not a measured price."] }
    : unavailable("Both the savings over the period and the total cost of ownership are required.");

  const aiPayload = {
    system: systemName,
    capacity_kwp: capacityKwp,
    installation_date: installationDate,
    production_class: cls,
    years: rows.map((r) => ({ year: r.year, kwh: r.kwh, days_recorded: r.days, complete: r.complete, change_vs_previous_pct: r.comparable ? r.changePct : null, specific_yield_kwh_per_kwp: r.yieldPerKwp.value })),
    expected_degradation_rate_pct_per_year: degPct.value,
    total_cost_of_ownership: tco.value,
    tco_period_years: a.horizonYears,
    missing_inputs: [
      degPct.value === null ? PLACEHOLDERS.EXPECTED_PANEL_DEGRADATION_RATE : null,
      a.horizonYears === null ? PLACEHOLDERS.TCO_PERIOD : null,
      a.tariffPerKwh === null ? PLACEHOLDERS.ELECTRICITY_TARIFF : null,
    ].filter(Boolean),
  };

  return (
    <div className="space-y-6">
      {cls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} detail="Every figure below is computed from a simulated production series. None of it describes a real system." />}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Overall">
        <Metric label="Total production recorded" term="energy_production" data={totalRecorded} format={(v) => fmtKwh(v)} energy />
        <Metric label={<span className="inline-flex items-center gap-1">Specific yield, last 365 days <InfoTip term="specific_yield" /></span>} data={trailingYield} format={(v) => `${formatNumber(v)} kWh/kWp`} energy />
        <Metric label="Years with records" term="years_with_records" data={{ value: rows.length, cls: "calculated", source: `${completeRows.length} complete, ${rows.length - completeRows.length} partial` }} />
      </section>

      <Card>
        <CardHeader title={<>Production by year <InfoTip term="production_by_year" /></>} subtitle="Calendar-year totals from the daily records Solink holds. A year counts as complete only with at least 360 daily records." action={<DataBadge cls={cls} compact />} />
        <CardBody className="space-y-4">
          {rows.length === 0 ? (
            <EmptyState title="No production records yet">Yearly performance appears once daily production records exist for this system.</EmptyState>
          ) : (
            <>
              <BarChart data={bars} ariaLabel="Production by calendar year in kWh" formatY={(v) => formatNumber(v)} />
              <YearlyTable rows={rows} cls={cls} />
              <p className="text-[12px] leading-relaxed text-fg-muted">
                Partial years are labelled and left out of every comparison. Specific yield needs 365 daily records from the same year and the system capacity{capacityKwp === null ? ". Capacity is not recorded for this system" : ` (${capacityKwp} kWp)`}.
              </p>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={<>Expected with degradation <InfoTip term="degradation" /></>}
          subtitle="Panels produce slightly less each year. Comparing measured output with an expected curve is only possible once an annual degradation rate is provided."
        />
        <CardBody className="space-y-4">
          <AssumptionField
            label="Expected annual degradation" term="degradation" placeholderKey="EXPECTED_PANEL_DEGRADATION_RATE" unit="% per year"
            platform={degPlatform} value={inp.degradationPct} onChange={(v) => set("degradationPct", v)} step="0.01" min={0}
            help="Comes from the manufacturer's performance warranty or another real source. Solink never assumes one."
          />

          {degPct.value === null ? (
            <>
              <p className="text-[13.5px] leading-relaxed text-fg-secondary">
                Whether this system&apos;s output is declining faster than it should <strong className="text-fg">cannot be assessed</strong>: the expected degradation rate is not provided, so there is nothing to compare the measured change against.
              </p>
              <PlaceholderNote k="EXPECTED_PANEL_DEGRADATION_RATE" />
            </>
          ) : !base || !expected || completeRows.length === 0 ? (
            <p className="text-[13.5px] leading-relaxed text-fg-secondary">
              A degradation rate of {degPct.value}% per year is available, but no complete calendar year of records exists yet to anchor the expected curve. The comparison appears once a full year has been recorded.
            </p>
          ) : (
            <>
              <LineChart
                height={220} area={false}
                series={[
                  { name: "Measured production", points: completeRows.map((r) => ({ x: r.year, y: r.kwh })) },
                  { name: `Expected at ${degPct.value}% per year`, points: completeRows.map((r, i) => ({ x: r.year, y: Math.round(expected[i]) })) },
                ]}
                yLabel="kWh" formatY={(v) => formatNumber(v)} formatX={(x) => String(x)} ariaLabel="Measured versus expected annual production"
              />
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
                <span>Expected curve anchored on {base.year} ({fmtKwh(base.kwh)}).</span>
                <DataBadge cls={degPct.cls === "user" ? "user" : "estimated"} compact />
              </div>
              <Assessment lastComparable={lastComparable} degPctValue={degPct.value} />
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={<>Total cost of ownership <InfoTip term="tco" /></>}
          subtitle="Everything the system costs over a chosen period. Costs recorded against your system are filled in for you; the rest must come from you, because Solink has no price data."
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <AssumptionField
              label="Analysis period" placeholderKey="TCO_PERIOD" unit="years" platform={settings.tco_period_years}
              value={inp.horizon} onChange={(v) => set("horizon", v)} step="1" min={1}
              help="How many years the cost model covers. The platform has not chosen one."
            />
            <CostField label="Initial system cost" value={inp.systemCost} onChange={(v) => set("systemCost", v)} unit={currency}
              help="What the equipment cost you. Solink holds no purchase price for this system." />
            <CostField label="Installation" placeholderKey="INSTALLATION_PRICE" value={inp.installCost} onChange={(v) => set("installCost", v)} unit={currency}
              help="What the installation cost. Installation providers have not published prices." />
            <CostField label="Annual maintenance" placeholderKey="MAINTENANCE_PRICE" recorded={prefills.maintenance} value={inp.maintenance} onChange={(v) => set("maintenance", v)} unit={`${currency}/year`}
              help="Inspections and routine upkeep, per year." />
            <CostField label="Annual cleaning" placeholderKey="MAINTENANCE_PRICE" recorded={prefills.cleaning} value={inp.cleaning} onChange={(v) => set("cleaning", v)} unit={`${currency}/year`}
              help="Panel cleaning, per year." />
            <CostField label="Repairs and replacements" placeholderKey="MAINTENANCE_PRICE" recorded={prefills.repairs} value={inp.repairs} onChange={(v) => set("repairs", v)} unit={currency}
              help="One-off repair and replacement costs over the whole period." />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MetricWithNotes label={`Total cost of ownership${a.horizonYears ? ` over ${a.horizonYears} years` : ""}`} term="tco" data={tco} format={(v) => formatMoney(v, currency)} />
            <div className="min-w-0">
              {tco.breakdown ? (
                <>
                  <BarChart data={tcoBars} height={180} ariaLabel="Total cost of ownership breakdown" formatY={(v) => formatNumber(v)} />
                  <p className="mt-1 text-[11.5px] text-fg-muted">Breakdown in {currency}, undiscounted.</p>
                </>
              ) : (
                <div className="rounded-[10px] border border-dashed border-border-strong bg-inset p-4 text-[13px] leading-relaxed text-fg-secondary">
                  The breakdown chart appears once every cost above has a value. Solink does not fill an unknown cost with zero, because that would quietly make the system look cheaper than it is. Missing prices: <Placeholder k="INSTALLATION_PRICE" /> <Placeholder k="MAINTENANCE_PRICE" />
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Over the whole period" subtitle="Lifetime production and savings. Each needs its own assumption; without it the figure stays unavailable." />
        <CardBody className="space-y-4">
          <AssumptionField
            label="Electricity tariff" placeholderKey="ELECTRICITY_TARIFF" unit={`${currency}/kWh`} platform={settings.electricity_tariff_per_kwh}
            value={inp.tariff} onChange={(v) => set("tariff", v)} step="0.001" min={0}
            help="The price you pay per kWh. Savings cannot be calculated without it."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricWithNotes label="Year-1 production (baseline)" data={year1} format={(v) => fmtKwh(v)} energy />
            <MetricWithNotes label={`Production over ${a.horizonYears ?? "the"} ${a.horizonYears ? "years" : "period"}`} data={lifetime} format={(v) => fmtKwh(v)} energy />
            <MetricWithNotes label="Savings in year 1" data={yearOneSavings} format={(v) => formatMoney(v, currency)} />
            <MetricWithNotes label="Savings over the period" data={lifetimeSavings} format={(v) => formatMoney(v, currency)} />
          </div>
          <MetricWithNotes label="Savings over the period minus total cost of ownership" data={netPosition} format={(v) => formatMoney(v, currency)} className="max-w-md" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Ask the AI to interpret this" subtitle="The AI reads the figures above, including which inputs are missing, and says so rather than filling the gaps." />
        <CardBody><AiExplainButton subject="performance" payload={aiPayload} /></CardBody>
      </Card>
    </div>
  );
}

/**
 * The one sentence that is allowed to judge a decline — and only when both the
 * measured change and an expected rate exist.
 */
function Assessment({ lastComparable, degPctValue }: { lastComparable: YearRow | null; degPctValue: number }) {
  if (!lastComparable || lastComparable.changePct === null) {
    return (
      <p className="text-[13.5px] leading-relaxed text-fg-secondary">
        Two consecutive complete calendar years are needed before a year-over-year change can be compared with the {degPctValue}% expected rate. Until then no assessment is made.
      </p>
    );
  }
  const change = lastComparable.changePct;
  const worse = change < -degPctValue;
  return (
    <div className="rounded-[10px] border border-border bg-inset p-3 text-[13.5px] leading-relaxed text-fg-secondary">
      <p>
        Between {lastComparable.year - 1} and {lastComparable.year} measured production changed by{" "}
        <strong className="tabular text-fg">{fmtPct(change)}</strong>. Degradation alone would predict about{" "}
        <strong className="tabular text-fg">{fmtPct(-degPctValue)}</strong>.
      </p>
      <p className="mt-1.5">
        {worse
          ? "The measured decline is larger than the degradation assumption alone would explain. Weather, soiling, shading and outages also differ from year to year, so this is not by itself evidence of a fault. An inspection may be worth considering."
          : "The measured change is in line with, or better than, what the degradation assumption alone would predict."}
      </p>
      <p className="mt-1.5 text-[12px] text-fg-muted">Both figures are annual totals; no weather normalisation is applied.</p>
    </div>
  );
}

function shortLabel(k: string): string {
  return k.replace("Initial system cost", "System").replace("Maintenance over period", "Maintenance").replace("Cleaning over period", "Cleaning").replace("Repairs / replacements", "Repairs");
}
