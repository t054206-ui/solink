"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { InfoTip } from "@/components/help/InfoTip";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Field, Input, Select } from "@/components/ui/Form";
import { Placeholder } from "@/components/ui/Placeholder";
import { EmptyState } from "@/components/ui/States";
import type { Classified, DataClass } from "@/lib/classification";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { annualProductionKwh, totalCostOfOwnership, type SolarAssumptions } from "@/lib/solar/calculations";
import type { Product } from "@/lib/types";
import { cn, specNum, specText } from "@/lib/utils";
import { PageHero } from "@/components/layout/PageHero";
import { BenchVisual } from "@/components/three/PageVisuals";
import { PriceCell } from "../../marketplace/_components/PriceCell";
import { VerificationBadge } from "../../marketplace/_components/VerificationBadge";
import { ManufacturerLink } from "../../marketplace/_components/ManufacturerLink";
import { RecordProductEvent } from "../../marketplace/_components/RecordProductEvent";
import { warrantyDegradation } from "@/lib/solar/degradation";
import { COMPARE_MAX, COMPARE_STORE_KEY, dimsSpec, getAdditional, getSpec, getSpecNum, isBifacial, realPrice } from "../../marketplace/_components/product-helpers";

interface UserAssumptions { peakSunHours: string; performanceRatio: string; horizonYears: string }
const EMPTY_ASSUMPTIONS: UserAssumptions = { peakSunHours: "", performanceRatio: "", horizonYears: "" };

interface Cell { node: React.ReactNode; num?: number | null; cls?: DataClass; source?: string; reason?: string }
interface RowDef { id: string; label: string; term?: string; best?: "high" | "low"; cell: (p: Product) => Cell }

const num = (s: string) => { const n = Number(s); return s.trim() !== "" && Number.isFinite(n) ? n : null; };

function specCell(p: Product, key: string): Cell {
  const s = getSpec(p.specs, key);
  const has = !!s && s.value !== null;
  return { node: specText(s), num: getSpecNum(p.specs, key), cls: has ? (p.is_demo ? "demo" : "source") : "unavailable", source: p.source.data_source };
}

/** A value under specs.additional (datasheet extras such as degradation limits). */
function additionalCell(p: Product, key: string): Cell {
  const s = getAdditional(p.specs, key);
  const has = !!s && s.value !== null;
  return { node: has ? specText(s) : <span className="text-fg-na">Not stated</span>, num: specNum(s), cls: has ? (p.is_demo ? "demo" : "source") : "unavailable", source: p.source.data_source };
}

/** Bifaciality: the stated ratio when the datasheet prints one, else what the record says about the module type. */
function bifacialCell(p: Product): Cell {
  const ratio = getAdditional(p.specs, "bifaciality_pct");
  if (ratio && ratio.value !== null) return { node: specText(ratio), num: specNum(ratio), cls: p.is_demo ? "demo" : "source", source: p.source.data_source };
  const b = isBifacial(p.specs);
  if (b === false) return { node: "Mono-facial", num: 0, cls: p.is_demo ? "demo" : "source", source: p.source.data_source };
  if (b === true) return { node: "Bifacial (ratio not stated)", num: null, cls: p.is_demo ? "demo" : "source", source: p.source.data_source };
  return { node: <span className="text-fg-na">Not stated</span>, num: null, cls: "unavailable" };
}

/** Annual degradation after year one, from the panel's own performance-warranty curve (never a platform default). */
function annualDegradationCell(p: Product): Cell {
  const d = warrantyDegradation(p.specs, p.manufacturer_name);
  if (!d) return { node: <span className="text-fg-na">Not stated</span>, num: null, cls: "unavailable" };
  const pctPerYear = d.annualFraction * 100;
  return { node: <span title={d.source}>{Number(pctPerYear.toFixed(3))} %/year</span>, num: pctPerYear, cls: p.is_demo ? "demo" : "source", source: p.source.data_source };
}

function classifiedCell(c: Classified, format: (v: number) => string): Cell {
  if (c.value === null) return { node: <span className="text-fg-na">{c.reason ?? "Unavailable"}</span>, num: null, cls: "unavailable", reason: c.reason };
  return { node: <span title={c.notes?.join(" · ")}>{format(c.value)}</span>, num: c.value, cls: c.cls, source: c.source };
}

/**
 * Side-by-side comparison of up to COMPARE_MAX solar panels selected in the
 * marketplace. Estimate rows are only computed when the user (or an admin
 * platform setting) supplies the assumptions; otherwise the reason is shown.
 */
/** Column letters, in selection order: the bench, the vs line and the table all use them. */
const LETTERS = ["A", "B", "C", "D"];
/** One tone per column, from the Solink palette: navy, amber ink, lighter navy, grey. Identity only; never a ranking. */
const LETTER_BG = ["var(--brand)", "var(--sun-ink)", "var(--brand-hover)", "var(--fg-secondary)"];

export function CompareTable({ panels, platformAssumptions, heading }: { panels: Product[]; platformAssumptions: SolarAssumptions; heading: { eyebrow: string; title: string; description: string; actions: React.ReactNode } }) {
  const [ids, setIds, loaded] = useLocalStore<string[]>(COMPARE_STORE_KEY, []);
  const [ua, setUa] = useLocalStore<UserAssumptions>("compare:assumptions", EMPTY_ASSUMPTIONS);

  const byId = useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels]);
  const selected = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p).slice(0, COMPARE_MAX);
  const nonPanelCount = ids.filter((id) => !byId.has(id)).length;
  const addable = panels.filter((p) => !ids.includes(p.id));
  const full = selected.length >= COMPARE_MAX;

  // Effective assumptions: user input wins, then admin platform setting, else null.
  const uPsh = num(ua.peakSunHours), uPr = num(ua.performanceRatio), uHz = num(ua.horizonYears);
  const eff: SolarAssumptions = {
    peakSunHoursPerDay: uPsh ?? platformAssumptions.peakSunHoursPerDay ?? null,
    performanceRatio: uPr ?? platformAssumptions.performanceRatio ?? null,
    horizonYears: uHz ?? platformAssumptions.horizonYears ?? null,
    currency: "KWD",
  };
  const assumptionCls = (user: number | null, platform: number | null | undefined): DataClass | null => user !== null ? "user" : platform != null ? "source" : null;
  const usesUserInput = uPsh !== null || uPr !== null || uHz !== null;

  const rows: RowDef[] = [
    // From the product's manufacturer relationship (manufacturer_id → manufacturers), never typed here.
    { id: "manufacturer", label: "Manufacturer", term: "manufacturer_record", cell: (p) => ({ node: <ManufacturerLink product={p} className="text-fg" />, cls: p.is_demo ? "demo" : "source" }) },
    { id: "model", label: "Model", cell: (p) => ({ node: <span className="font-mono">{p.model}</span>, cls: p.is_demo ? "demo" : "source" }) },
    { id: "verification", label: "Verification", cell: (p) => ({ node: <VerificationBadge status={p.source.verification_status} /> }) },
    { id: "price", label: "Price", best: "low", cell: (p) => ({ node: <PriceCell product={p} compact />, num: realPrice(p, "price") }) },
    { id: "power", label: "Rated power", term: "peak_power", best: "high", cell: (p) => specCell(p, "rated_power_w") },
    { id: "eff", label: "Efficiency", term: "efficiency", best: "high", cell: (p) => specCell(p, "module_efficiency_pct") },
    { id: "dims", label: "Dimensions (L × W × T)", cell: (p) => { const d = dimsSpec(p.specs); return { node: specText(d), cls: d.value === null ? "unavailable" : p.is_demo ? "demo" : "source", source: p.source.data_source }; } },
    { id: "weight", label: "Weight", cell: (p) => specCell(p, "weight_kg") },
    { id: "cells", label: "Number of cells", cell: (p) => specCell(p, "number_of_cells") },
    { id: "bifacial", label: "Bifaciality", best: "high", cell: bifacialCell },
    { id: "voc", label: "Open-circuit voltage (Voc)", term: "voc", cell: (p) => specCell(p, "voc_v") },
    { id: "vmp", label: "Voltage at max power (Vmp)", term: "vmp", cell: (p) => specCell(p, "vmp_v") },
    { id: "isc", label: "Short-circuit current (Isc)", term: "isc", cell: (p) => specCell(p, "isc_a") },
    { id: "imp", label: "Current at max power (Imp)", term: "imp", cell: (p) => specCell(p, "imp_a") },
    { id: "tc", label: "Temperature coefficient", term: "temperature_coefficient", best: "high", cell: (p) => specCell(p, "temperature_coefficient_pmax_pct_per_c") },
    { id: "pw", label: "Product warranty", term: "product_warranty", best: "high", cell: (p) => specCell(p, "product_warranty_years") },
    { id: "perfw", label: "Performance warranty", term: "performance_warranty", best: "high", cell: (p) => specCell(p, "performance_warranty_years") },
    { id: "perfend", label: "Guaranteed output at end of warranty", term: "degradation", best: "high", cell: (p) => specCell(p, "performance_warranty_end_pct") },
    { id: "deg1", label: "First-year degradation (max)", best: "low", cell: (p) => additionalCell(p, "first_year_degradation_pct") },
    { id: "degy", label: "Annual degradation after year one", term: "degradation", best: "low", cell: annualDegradationCell },
    { id: "prod", label: "Expected annual production (per panel)", term: "energy_production", best: "high", cell: (p) => {
      const src = p.expected_annual_production_kwh;
      if (src.value !== null) return { node: specText(src), num: src.value, cls: p.is_demo ? "demo" : "source", source: p.source.data_source };
      const kwp = getSpecNum(p.specs, "rated_power_w");
      const est = annualProductionKwh(kwp === null ? null : kwp / 1000, eff);
      return classifiedCell(est, (v) => `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} kWh/yr`);
    } },
    { id: "install", label: "Installation cost", best: "low", cell: (p) => ({ node: <PriceCell product={p} field="installation_cost" compact />, num: realPrice(p, "installation_cost") }) },
    { id: "maint", label: "Annual maintenance", best: "low", cell: (p) => ({ node: <PriceCell product={p} field="annual_maintenance_cost" compact />, num: realPrice(p, "annual_maintenance_cost") }) },
    { id: "clean", label: "Cleaning", best: "low", cell: (p) => ({ node: <PriceCell product={p} field="cleaning_cost" compact />, num: realPrice(p, "cleaning_cost") }) },
    { id: "life", label: "Expected lifetime", best: "high", cell: (p) => specCell(p, "expected_lifetime_years") },
    { id: "tco", label: "Total cost of ownership", term: "tco", best: "low", cell: (p) => {
      const tco = totalCostOfOwnership({
        systemCost: realPrice(p, "price"), installation: realPrice(p, "installation_cost"),
        annualMaintenance: realPrice(p, "annual_maintenance_cost"), annualCleaning: realPrice(p, "cleaning_cost"),
        repairsAndReplacements: null, horizonYears: eff.horizonYears ?? null,
      });
      return classifiedCell(tco, (v) => `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${p.currency}`);
    } },
  ];

  const bestIndex = (row: RowDef, cells: Cell[]): number | null => {
    if (!row.best) return null;
    const vals = cells.map((c) => (typeof c.num === "number" ? c.num : null));
    const present = vals.filter((v): v is number => v !== null);
    if (present.length < 2) return null;
    const target = row.best === "high" ? Math.max(...present) : Math.min(...present);
    if (present.every((v) => v === target)) return null;
    return vals.indexOf(target);
  };

  const hero = (visual?: React.ReactNode) => (
    <PageHero label="Compare panels" eyebrow={heading.eyebrow} title={heading.title} description={heading.description} actions={heading.actions} layout="stacked" focus="50% 70%" visual={visual} />
  );

  if (!loaded) return <>{hero()}<div className="skeleton h-64 rounded-[var(--radius-lg)]" aria-hidden /></>;

  const anyDemo = selected.some((p) => p.is_demo);
  const realSelected = selected.filter((p) => !p.is_demo).map((p) => p.id);

  // The bench draws each selected panel at the length and width its record states (mm → m).
  const bench = selected.map((p) => {
    const l = getSpecNum(p.specs, "length_mm"), w = getSpecNum(p.specs, "width_mm");
    return { w: w !== null ? w / 1000 : null, h: l !== null ? l / 1000 : null };
  });
  const unsized = bench.filter((b) => b.w === null || b.h === null).length;

  return (
    <div className="space-y-5">
      {hero(selected.length > 0 ? (
        <div>
          <BenchVisual
            panels={bench}
            caption={<>Each panel is drawn at the length and width its record states, so their sizes compare truly.{unsized > 0 ? ` ${unsized} ${unsized === 1 ? "record does" : "records do"} not state a size and ${unsized === 1 ? "is" : "are"} drawn as an outline.` : ""}</>}
          />
          <ol className="mt-3 flex flex-wrap items-stretch justify-center gap-2" aria-label="Panels being compared">
            {selected.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2">
                {i > 0 && <span className="micro" aria-hidden="true">vs</span>}
                <span className="flex min-w-0 max-w-[16rem] items-center gap-2 rounded-[var(--radius)] border border-border bg-elevated px-2.5 py-1.5 shadow-[var(--shadow-sm)]">
                  <span className="figure grid size-6 shrink-0 place-items-center rounded-full text-[12px] text-white" style={{ background: LETTER_BG[i] }}>{LETTERS[i]}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-fg">{p.name}</span>
                    <span className="block truncate text-[11.5px] text-fg-muted">{p.manufacturer_name}</span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : undefined)}
      {realSelected.length > 1 && <RecordProductEvent productIds={realSelected} kind="compare" />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 sm:max-w-md">
          <Field label={`Add a panel (${selected.length}/${COMPARE_MAX})`} help={full ? `Remove one to add another: up to ${COMPARE_MAX} at a time.` : addable.length === 0 ? "Every panel in the catalog is already selected." : undefined}>
            <div className="flex gap-2">
              <Select aria-label="Choose a panel to add" disabled={full || addable.length === 0} defaultValue="" onChange={(e) => { const v = e.target.value; if (v) { setIds((prev) => (prev.includes(v) || prev.length >= COMPARE_MAX ? prev : [...prev, v])); e.target.value = ""; } }}>
                <option value="" disabled>Select a panel…</option>
                {addable.map((p) => <option key={p.id} value={p.id}>{p.manufacturer_name}. {p.model}{p.is_demo ? " (DEMO)" : ""}</option>)}
              </Select>
              <Button href="/marketplace?category=solar_panel" variant="outline" className="shrink-0"><Plus className="size-4" aria-hidden /> Browse</Button>
            </div>
          </Field>
        </div>
        {selected.length > 0 && <Button variant="ghost" size="sm" onClick={() => setIds([])}>Clear all</Button>}
      </div>

      {nonPanelCount > 0 && (
        <p className="text-[12.5px] text-fg-muted">{nonPanelCount} selected {nonPanelCount === 1 ? "item is" : "items are"} not a solar panel (or no longer in the catalog) and {nonPanelCount === 1 ? "is" : "are"} not shown here.</p>
      )}

      {anyDemo && <DemoBanner text="DEMO PRODUCTS — NOT REAL" detail="One or more panels below are demo records. Differences between them do not describe any real product." />}

      {selected.length === 0 ? (
        <EmptyState title="No panels selected">
          Pick up to {COMPARE_MAX} panels from the dropdown above or the <Link href="/marketplace?category=solar_panel" className="underline underline-offset-2">marketplace</Link>.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-inset/60">
                  <th scope="col" className="sticky left-0 z-10 w-44 min-w-44 bg-elevated px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-fg-muted shadow-[1px_0_0_var(--border)]">Specification</th>
                  {selected.map((p, i) => (
                    <th key={p.id} scope="col" className="min-w-44 px-4 py-3 text-left align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="figure mb-1 grid size-6 place-items-center rounded-full text-[12px] text-white" style={{ background: LETTER_BG[i] }} aria-label={`Panel ${LETTERS[i]}`}>{LETTERS[i]}</span>
                          <Link href={`/marketplace/${p.id}`} className="block truncate font-semibold text-fg hover:underline underline-offset-2">{p.name}</Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] font-normal text-fg-muted"><ManufacturerLink product={p} />{p.is_demo && <DataBadge cls="demo" compact />}</div>
                        </div>
                        <button type="button" onClick={() => setIds((prev) => prev.filter((x) => x !== p.id))} aria-label={`Remove ${p.name} from comparison`} className="grid size-7 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-inset hover:text-fg"><X className="size-4" aria-hidden /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cells = selected.map((p) => row.cell(p));
                  const best = bestIndex(row, cells);
                  return (
                    <tr key={row.id} className="border-b border-border/70 transition-colors last:border-0 hover:bg-inset/50">
                      <th scope="row" className="sticky left-0 z-10 bg-elevated px-4 py-2.5 text-left align-top font-medium text-fg-secondary shadow-[1px_0_0_var(--border)]">
                        <span className="inline-flex items-center gap-1">{row.label}{row.term && <InfoTip term={row.term} />}</span>
                      </th>
                      {cells.map((c, i) => (
                        <td key={selected[i].id} className={cn("px-4 py-2.5 align-top", best === i && "bg-brand-soft/60")} title={best === i ? `Highest/lowest in this row for ${row.label}. Whether that is “best” depends on your needs` : undefined}>
                          <div className="flex flex-col gap-1">
                            <div className="tabular text-fg">{c.node}{best === i && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-[var(--brand)]/30 bg-elevated px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-strong)]">{row.best === "high" ? "▲ highest" : "▼ lowest"}</span>}</div>
                            {c.cls && <DataBadge cls={c.cls} compact source={c.source} />}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border bg-inset/60 px-4 py-3 text-[12.5px] leading-relaxed text-fg-muted">
            <strong className="text-fg-secondary">There is no objective winner.</strong> The highlighted cell is only the highest or lowest number in that row. A heavier, more powerful panel may suit a large flat roof; a smaller panel with a better temperature coefficient may suit a hot, tight roof. Rows marked <DataBadge cls="unavailable" compact /> are missing data, not zero.
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={<>Assumptions for estimate rows <InfoTip term="assumptions" /></>} subtitle="Expected production and total cost of ownership need these. Nothing is assumed for you: enter values or wait for an admin to set platform defaults." action={usesUserInput ? <DataBadge cls="user" compact /> : undefined} />
          <CardBody className="grid gap-3 sm:grid-cols-3">
            <Field label={<span className="inline-flex items-center gap-1">Peak sun hours / day<InfoTip term="peak_sun_hours" /></span>} help={assumptionCls(uPsh, platformAssumptions.peakSunHoursPerDay) === "source" ? `Platform setting: ${platformAssumptions.peakSunHoursPerDay}` : undefined}>
              <Input type="number" inputMode="decimal" min={0} step="0.1" value={ua.peakSunHours} placeholder={platformAssumptions.peakSunHoursPerDay?.toString() ?? "e.g. from a real source"} onChange={(e) => setUa((prev) => ({ ...prev, peakSunHours: e.target.value }))} aria-describedby="a-psh" />
              <div id="a-psh" className="mt-1.5">{assumptionCls(uPsh, platformAssumptions.peakSunHoursPerDay) ? <DataBadge cls={assumptionCls(uPsh, platformAssumptions.peakSunHoursPerDay)!} compact /> : <Placeholder k="SOLAR_RESOURCE_DATA_SOURCE" />}</div>
            </Field>
            <Field label={<span className="inline-flex items-center gap-1">Performance ratio (0–1)<InfoTip term="performance_ratio" /></span>} help={assumptionCls(uPr, platformAssumptions.performanceRatio) === "source" ? `Platform setting: ${platformAssumptions.performanceRatio}` : undefined}>
              <Input type="number" inputMode="decimal" min={0} max={1} step="0.01" value={ua.performanceRatio} placeholder={platformAssumptions.performanceRatio?.toString() ?? "e.g. 0.75"} onChange={(e) => setUa((prev) => ({ ...prev, performanceRatio: e.target.value }))} aria-describedby="a-pr" />
              <div id="a-pr" className="mt-1.5">{assumptionCls(uPr, platformAssumptions.performanceRatio) ? <DataBadge cls={assumptionCls(uPr, platformAssumptions.performanceRatio)!} compact /> : <Placeholder k="SYSTEM_LOSS_FACTOR" />}</div>
            </Field>
            <Field label={<span className="inline-flex items-center gap-1">Cost horizon (years)<InfoTip term="tco" /></span>} help={assumptionCls(uHz, platformAssumptions.horizonYears) === "source" ? `Platform setting: ${platformAssumptions.horizonYears}` : undefined}>
              <Input type="number" inputMode="numeric" min={1} step="1" value={ua.horizonYears} placeholder={platformAssumptions.horizonYears?.toString() ?? "e.g. 25"} onChange={(e) => setUa((prev) => ({ ...prev, horizonYears: e.target.value }))} aria-describedby="a-hz" />
              <div id="a-hz" className="mt-1.5">{assumptionCls(uHz, platformAssumptions.horizonYears) ? <DataBadge cls={assumptionCls(uHz, platformAssumptions.horizonYears)!} compact /> : <Placeholder k="TCO_PERIOD" />}</div>
            </Field>
            <p className="text-[12px] leading-relaxed text-fg-muted sm:col-span-3">Estimates are labeled <DataBadge cls="estimated" compact /> and are only as good as these inputs. Total cost of ownership also needs real prices for the panel, installation, maintenance, cleaning and repairs: Solink never fills those in.</p>
            {usesUserInput && <div className="sm:col-span-3"><Button variant="ghost" size="sm" onClick={() => setUa(EMPTY_ASSUMPTIONS)}>Clear my assumptions</Button></div>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={<><Sparkles className="size-4 text-[var(--cls-ai)]" aria-hidden /> Not sure how to weigh these?</>} subtitle="The AI Solar Agent can explain the trade-offs between the panels you selected: using only the catalog data shown here." />
          <CardBody className="flex flex-col gap-3">
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-fg-secondary">
              <li>Power vs. roof area, and what that means for your available space.</li>
              <li>Temperature coefficient in a hot climate.</li>
              <li>Warranty length vs. missing or unverified data.</li>
            </ul>
            <Button href="/recommend" variant="outline" className="self-start">Ask the AI to explain the trade-offs</Button>
            <p className="text-[12px] text-fg-muted">AI answers are labeled <DataBadge cls="ai" compact /> and never declare an objective best panel or invent prices.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
