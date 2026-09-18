"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { getSpecNum } from "./product-helpers";

type SortKey = "name" | "power_desc" | "efficiency_desc";

/**
 * Client-side search + sort over the products the server page already
 * filtered by category. Sorting by power/efficiency only orders records that
 * have the value; records without it stay at the end (never zero-filled).
 */
export function MarketplaceGrid({ products, emptyTitle }: { products: Product[]; emptyTitle: string }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? products.filter((p) => [p.name, p.model, p.manufacturer_name].some((s) => s.toLowerCase().includes(needle)))
      : products;
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
  }, [products, q, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, model or manufacturer" aria-label="Search products" className="pl-9" />
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
      <p className="text-[12.5px] text-fg-muted" aria-live="polite">{list.length} {list.length === 1 ? "product" : "products"}{q.trim() ? ` matching “${q.trim()}”` : ""}</p>
      {list.length === 0 ? (
        <EmptyState title={q.trim() ? "No products match your search" : emptyTitle}>
          {q.trim() ? "Try a different name, model or manufacturer." : "Products appear here once they are imported from a real data source or entered by a participating provider."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
        </ul>
      )}
    </div>
  );
}
