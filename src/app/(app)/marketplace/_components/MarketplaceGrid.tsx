"use client";
import { useId, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import type { Product, VerificationStatus } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { getSpecNum, isBifacial, TECHNOLOGY_FAMILIES, technologyFamily, VERIFICATION_LABEL, type TechnologyFamily } from "./product-helpers";

type SortKey = "name" | "power_desc" | "efficiency_desc";
type Facial = "" | "bifacial" | "mono";

interface Filters { minW: string; maxW: string; minEff: string; tech: "" | TechnologyFamily; facial: Facial; ver: "" | VerificationStatus }
const NO_FILTERS: Filters = { minW: "", maxW: "", minEff: "", tech: "", facial: "", ver: "" };
const num = (s: string) => { const n = Number(s); return s.trim() !== "" && Number.isFinite(n) ? n : null; };

/**
 * Client-side search, filters and sort over the products the server page
 * already narrowed by category and manufacturer.
 *
 * Every filter reads a value the record carries. A record without that value
 * is left out while the filter is active and the count line says so: it is
 * never treated as zero, and no value is guessed to keep it in. Sorting by
 * power/efficiency only orders records that have the value; records without
 * it stay at the end.
 */
export function MarketplaceGrid({ products, emptyTitle }: { products: Product[]; emptyTitle: string }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const uid = useId();
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((prev) => ({ ...prev, [k]: v }));

  // Only families and statuses present in this list are offered: an option that matches nothing is a dead end.
  const techOptions = useMemo(() => TECHNOLOGY_FAMILIES.filter((t) => products.some((p) => technologyFamily(p.specs) === t)), [products]);
  const verOptions = useMemo(() => (Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).filter((s) => products.some((p) => p.source.verification_status === s)), [products]);
  const anyPanel = products.some((p) => p.category === "solar_panel");
  const filtersActive = f !== NO_FILTERS && Object.values(f).some((v) => v !== "");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const minW = num(f.minW), maxW = num(f.maxW), minEff = num(f.minEff);
    const filtered = products.filter((p) => {
      if (needle && ![p.name, p.model, p.manufacturer_name, p.series ?? ""].some((s) => s.toLowerCase().includes(needle))) return false;
      if (minW !== null || maxW !== null) {
        const w = getSpecNum(p.specs, "rated_power_w");
        if (w === null) return false;
        if (minW !== null && w < minW) return false;
        if (maxW !== null && w > maxW) return false;
      }
      if (minEff !== null) {
        const e = getSpecNum(p.specs, "module_efficiency_pct");
        if (e === null || e < minEff) return false;
      }
      if (f.tech && technologyFamily(p.specs) !== f.tech) return false;
      if (f.facial) {
        const b = isBifacial(p.specs);
        if (f.facial === "bifacial" ? b !== true : b !== false) return false;
      }
      if (f.ver && p.source.verification_status !== f.ver) return false;
      return true;
    });
    const byNum = (key: string) => (a: Product, b: Product) => {
      const av = getSpecNum(a.specs, key), bv = getSpecNum(b.specs, key);
      if (av === null && bv === null) return a.name.localeCompare(b.name);
      if (av === null) return 1;
      if (bv === null) return -1;
      return bv - av;
    };
    const sorted = [...filtered];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "power_desc") sorted.sort(byNum("rated_power_w"));
    else sorted.sort(byNum("module_efficiency_pct"));
    return sorted;
  }, [products, q, sort, f]);

  const leftOut = products.length - list.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, model, series or manufacturer" aria-label="Search products" className="pl-9" />
        </div>
        <div className="flex items-center gap-2 sm:w-64">
          <label htmlFor="marketplace-sort" className="shrink-0 text-[13px] text-fg-muted">Sort</label>
          <Select id="marketplace-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="name">Name (A–Z)</option>
            <option value="power_desc">Rated power (high → low)</option>
            <option value="efficiency_desc">Efficiency (high → low)</option>
          </Select>
        </div>
      </div>

      {anyPanel && (
        <fieldset className="rounded-[var(--radius-lg)] border border-border bg-inset/40 p-3">
          <legend className="flex items-center gap-1.5 px-1 text-[12px] font-semibold uppercase tracking-wider text-fg-muted"><SlidersHorizontal className="size-3.5" aria-hidden /> Filter panels</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="grid gap-1">
              <label htmlFor={`${uid}-minw`} className="text-[12.5px] text-fg-secondary">Min power (W)</label>
              <Input id={`${uid}-minw`} type="number" inputMode="numeric" min={0} step="5" value={f.minW} onChange={(e) => set("minW", e.target.value)} placeholder="e.g. 450" />
            </div>
            <div className="grid gap-1">
              <label htmlFor={`${uid}-maxw`} className="text-[12.5px] text-fg-secondary">Max power (W)</label>
              <Input id={`${uid}-maxw`} type="number" inputMode="numeric" min={0} step="5" value={f.maxW} onChange={(e) => set("maxW", e.target.value)} placeholder="e.g. 650" />
            </div>
            <div className="grid gap-1">
              <label htmlFor={`${uid}-eff`} className="text-[12.5px] text-fg-secondary">Min efficiency (%)</label>
              <Input id={`${uid}-eff`} type="number" inputMode="decimal" min={0} max={35} step="0.1" value={f.minEff} onChange={(e) => set("minEff", e.target.value)} placeholder="e.g. 22" />
            </div>
            <div className="grid gap-1">
              <label htmlFor={`${uid}-tech`} className="text-[12.5px] text-fg-secondary">Cell technology</label>
              <Select id={`${uid}-tech`} value={f.tech} onChange={(e) => set("tech", e.target.value as Filters["tech"])}>
                <option value="">Any</option>
                {techOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="grid gap-1">
              <label htmlFor={`${uid}-facial`} className="text-[12.5px] text-fg-secondary">Bifacial</label>
              <Select id={`${uid}-facial`} value={f.facial} onChange={(e) => set("facial", e.target.value as Facial)}>
                <option value="">Any</option>
                <option value="bifacial">Bifacial only</option>
                <option value="mono">Mono-facial only</option>
              </Select>
            </div>
            <div className="grid gap-1">
              <label htmlFor={`${uid}-ver`} className="text-[12.5px] text-fg-secondary">Verification</label>
              <Select id={`${uid}-ver`} value={f.ver} onChange={(e) => set("ver", e.target.value as Filters["ver"])}>
                <option value="">Any status</option>
                {verOptions.map((s) => <option key={s} value={s}>{VERIFICATION_LABEL[s]}</option>)}
              </Select>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-fg-muted">
            Filters read each record&apos;s own datasheet values. A record that does not state the filtered value is left out, not treated as zero.
            {filtersActive && <> <Button type="button" variant="ghost" size="sm" onClick={() => setF(NO_FILTERS)} className="ml-1">Clear filters</Button></>}
          </p>
        </fieldset>
      )}

      <p className="text-[12.5px] text-fg-muted" aria-live="polite">
        {list.length} {list.length === 1 ? "product" : "products"}{q.trim() ? ` matching “${q.trim()}”` : ""}
        {filtersActive && leftOut > 0 ? ` · ${leftOut} left out by the filters` : ""}
      </p>
      {list.length === 0 ? (
        <EmptyState title={q.trim() || filtersActive ? "No products match" : emptyTitle}>
          {q.trim() || filtersActive ? "Try a different search, widen the filters, or clear them." : "Products appear here once they are imported from a real data source or entered by a participating provider."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
        </ul>
      )}
    </div>
  );
}
