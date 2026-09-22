"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import { DataBadge } from "@/components/ui/DataBadge";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { formatDate } from "@/lib/utils";
import type { Product, ProductCategory, VerificationStatus } from "@/lib/types";
import type { DataMode } from "@/lib/data/mode";
import { Table, Th, Td, VerificationPill } from "./AdminBits";
import { ADMIN_PRODUCTS_STORE, CATEGORIES, CATEGORY_LABEL, VERIFICATION_LABEL, VERIFICATION_STATUSES, isLocalId, mergeLocalProducts, validateProductSpecs, type AdminProductStore } from "./admin-helpers";

export function ProductsTable({ products, mode }: { products: Product[]; mode: DataMode }) {
  const [store] = useLocalStore<AdminProductStore>(ADMIN_PRODUCTS_STORE, {});
  const all = useMemo(() => mergeLocalProducts(products, mode === "demo" ? store : undefined), [products, store, mode]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"" | ProductCategory>("");
  const [mfr, setMfr] = useState("");
  // The manufacturer options are the names on the rows themselves, so the list is always exactly what the table can show.
  const manufacturers = useMemo(() => Array.from(new Set(all.map((p) => p.manufacturer_name))).sort((a, b) => a.localeCompare(b)), [all]);
  const [ver, setVer] = useState<"" | VerificationStatus>("");
  const [demoFilter, setDemoFilter] = useState<"" | "demo" | "real">("");
  const [showArchived, setShowArchived] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const rows = useMemo(() => all.map((p) => ({ p, flags: validateProductSpecs(p.specs, p.category) })).filter(({ p, flags }) => {
    if (!showArchived && p.is_archived) return false;
    if (cat && p.category !== cat) return false;
    if (mfr && p.manufacturer_name !== mfr) return false;
    if (ver && p.source.verification_status !== ver) return false;
    if (demoFilter === "demo" && !p.is_demo) return false;
    if (demoFilter === "real" && p.is_demo) return false;
    if (flaggedOnly && flags.length === 0) return false;
    if (q) { const s = `${p.manufacturer_name} ${p.model} ${p.name}`.toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  }), [all, q, cat, mfr, ver, demoFilter, showArchived, flaggedOnly]);

  const localCount = mode === "demo" ? Object.keys(store).length : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1"><Input aria-label="Search products" placeholder="Search manufacturer, model, name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value as "" | ProductCategory)} className="w-auto"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select>
        <Select aria-label="Manufacturer" value={mfr} onChange={(e) => setMfr(e.target.value)} className="w-auto"><option value="">All manufacturers</option>{manufacturers.map((name) => <option key={name} value={name}>{name}</option>)}</Select>
        <Select aria-label="Verification" value={ver} onChange={(e) => setVer(e.target.value as "" | VerificationStatus)} className="w-auto"><option value="">Any verification</option>{VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{VERIFICATION_LABEL[s]}</option>)}</Select>
        <Select aria-label="Demo or real" value={demoFilter} onChange={(e) => setDemoFilter(e.target.value as "" | "demo" | "real")} className="w-auto"><option value="">Demo + real</option><option value="demo">Demo only</option><option value="real">Real only</option></Select>
        <label className="flex h-10 items-center gap-1.5 text-[13px] text-fg-secondary"><input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="size-4 accent-[var(--brand)]" /> Flagged only</label>
        <label className="flex h-10 items-center gap-1.5 text-[13px] text-fg-secondary"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-4 accent-[var(--brand)]" /> Show archived</label>
        <div className="ml-auto flex gap-2">
          <Button href="/admin/products/import" variant="outline" size="sm"><Upload className="size-4" aria-hidden /> Import</Button>
          <Button href="/admin/products/new" size="sm"><Plus className="size-4" aria-hidden /> New product</Button>
        </div>
      </div>
      {localCount > 0 && <p className="text-[12px] text-fg-muted">{localCount} record{localCount === 1 ? "" : "s"} edited or created in this browser only (demo mode) are merged into this list and marked “Local”.</p>}
      {rows.length === 0 ? (
        <EmptyState title="No products match">{all.length === 0 ? "No products exist yet. Add one manually or import a CSV." : "Adjust the filters to see more."}</EmptyState>
      ) : (
        <Table caption="Solar products">
          <thead><tr><Th>Manufacturer</Th><Th>Model</Th><Th>Category</Th><Th>Verification</Th><Th>Data</Th><Th>Lifecycle</Th><Th>Flags</Th><Th>Last updated</Th><Th>Version</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
          <tbody>
            {rows.map(({ p, flags }) => (
              <tr key={p.id} className="hover:bg-inset/60">
                <Td className="font-medium text-fg">{p.manufacturer_name}</Td>
                <Td><div className="font-mono text-[12px]">{p.model}</div><div className="text-[12px] text-fg-muted">{p.series ? <>{p.series} · </> : null}{p.name}</div></Td>
                <Td>{CATEGORY_LABEL[p.category]}</Td>
                <Td><VerificationPill status={p.source.verification_status} /></Td>
                <Td><div className="flex flex-wrap gap-1">{p.is_demo ? <DataBadge cls="demo" compact /> : <Badge tone="data">Real</Badge>}{isLocalId(p.id) || (mode === "demo" && store[p.id]) ? <Badge tone="brand">Local</Badge> : null}</div></Td>
                <Td><div className="flex flex-wrap gap-1">{p.is_outdated && <Badge tone="warn">Outdated</Badge>}{p.is_archived && <Badge tone="neutral">Archived</Badge>}{!p.is_outdated && !p.is_archived && <span className="text-fg-muted">Current</span>}</div></Td>
                <Td>{flags.length ? <Badge tone="warn" title={flags.join("\n")}>{flags.length}</Badge> : <span className="text-fg-muted">0</span>}</Td>
                <Td className="whitespace-nowrap">{formatDate(p.source.date_last_updated)}</Td>
                <Td className="font-mono text-[11.5px]">{p.current_version_id ?? "—"}</Td>
                <Td><Link href={`/admin/products/${p.id}`} className="font-medium text-fg underline-offset-2 hover:underline">Edit</Link></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
