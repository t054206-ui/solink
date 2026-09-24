import type { Metadata } from "next";
import Link from "next/link";
import { Database, Upload } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { ShowroomVisual } from "@/components/three/PageVisuals";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { getManufacturer, listManufacturers, listProducts } from "@/lib/data/repositories";
import { ManufacturerFilter } from "@/components/manufacturers/ManufacturerFilter";
import { manufacturerHref } from "@/lib/manufacturers/helpers";
import type { ProductCategory } from "@/lib/types";
import { CategoryPills } from "./_components/CategoryPills";
import { CompareTray } from "./_components/CompareTray";
import { MarketplaceGrid } from "./_components/MarketplaceGrid";
import { CATEGORY_LABEL, getSpecNum, isCategory } from "./_components/product-helpers";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Solar panels, inverters, batteries and services with source tracking and verification status on every field.",
};

export default async function MarketplacePage({ searchParams }: PageProps<"/marketplace">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const category: ProductCategory | null = isCategory(raw) ? raw : null;

  // Manufacturer filter: the slug in the URL is resolved to a company row and
  // the product query runs by manufacturer_id in the database. The option list
  // is the active manufacturer table, never a list written into this file.
  const rawM = Array.isArray(sp.manufacturer) ? sp.manufacturer[0] : sp.manufacturer;
  const activeManufacturer = rawM ? (await getManufacturer(rawM)).data : null;
  const [{ data: all, mode }, { data: manufacturerRows }] = await Promise.all([
    listProducts(activeManufacturer ? { manufacturerId: activeManufacturer.id } : {}),
    listManufacturers(),
  ]);
  const counts: Partial<Record<ProductCategory | "all", number>> = { all: all.length };
  for (const p of all) counts[p.category] = (counts[p.category] ?? 0) + 1;
  const products = category ? all.filter((p) => p.category === category) : all;
  const manufacturerOptions = manufacturerRows.filter((m) => (m.product_count ?? 0) > 0 || m.id === activeManufacturer?.id).map((m) => ({ slug: m.slug, name: m.name, count: m.product_count ?? 0 }));
  // Real records, and where they came from, for the explainer card. In demo
  // mode there are none and the placeholder says so; once real products are
  // in the catalogue the placeholder would be a lie.
  const real = all.filter((p) => !p.is_demo);
  const manufacturers = Array.from(new Set(real.map((p) => p.manufacturer_name))).sort();
  const suppliers = Array.from(new Set(real.map((p) => p.source.kuwait_supplier).filter((s): s is string => Boolean(s)))).sort();
  // The showroom's callouts: this catalogue's own panels, counted and ranged from their records.
  const panelRows = all.filter((p) => p.category === "solar_panel");
  const watts = panelRows.map((p) => getSpecNum(p.specs, "rated_power_w")).filter((w): w is number => w !== null);
  const panelMakers = new Set(panelRows.map((p) => p.manufacturer_name)).size;
  const calloutCls = real.length > 0 ? "calculated" : "demo";

  return (
    <div className="pb-28">
      <PageHero
        label="Marketplace"
        eyebrow="Choose"
        title="Marketplace"
        description="Every product carries its data source, verification status and the date it was last updated. Missing fields are shown as missing: never estimated."
        actions={<><Button href="/marketplace/manufacturers" variant="outline">Manufacturers</Button><Button href="/compare" variant="outline">Compare panels</Button></>}
        visual={
          <ShowroomVisual
            caption="An illustrative module. The figures beside it are this catalogue's own, counted from its records."
            overlay={panelRows.length > 0 ? (
              <>
                <Callout className="start-2 top-3 sm:start-4" label="Panels" value={String(panelRows.length)} cls={calloutCls} color="var(--brand-strong)" />
                {watts.length > 0 && <Callout className="end-2 top-3 text-end sm:end-4" label="Rated power" value={Math.min(...watts) === Math.max(...watts) ? `${Math.min(...watts)} W` : `${Math.min(...watts)}–${Math.max(...watts)} W`} cls={calloutCls} color="var(--sun-ink)" />}
                <Callout className="bottom-10 start-2 sm:start-4" label="Manufacturers" value={String(panelMakers)} cls={calloutCls} color="var(--data)" />
              </>
            ) : undefined}
          />
        }
      />

      {mode === "demo" && <DemoBanner className="mb-4" text="DEMO CATALOG — NOT REAL" detail="No real product dataset is connected. All products below are labeled demo records." />}

      <Card className="mb-6">
        <CardHeader
          title={<><Database className="size-4 text-[var(--brand-strong)]" aria-hidden /> How real product data reaches Solink</>}
          subtitle="Solink does not scrape or guess specifications. Records are imported from a chosen source, versioned, and marked Verified only after review."
          action={<Button href="/admin/products/import" variant="outline" size="sm"><Upload className="size-3.5" aria-hidden /> Import products</Button>}
        />
        <CardBody className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
          {real.length === 0 ? (
            <PlaceholderNote k="REAL_SOLAR_PANEL_DATA_SOURCE" />
          ) : (
            <p className="text-[13px] leading-relaxed text-fg-secondary">
              <span className="font-medium text-fg">{real.length} real {real.length === 1 ? "product" : "products"}</span> from {manufacturers.join(", ")}
              {suppliers.length > 0 ? <>, with Kuwait prices and availability from {suppliers.join(", ")}</> : null}. Specifications come from the
              manufacturer&apos;s datasheet where one was found; every record lists its own sources, and a record is marked Verified only after a Solink admin reviews it.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 text-[12.5px] text-fg-muted md:max-w-xs md:flex-col">
            <span>Labels you will see:</span>
            <span className="flex flex-wrap gap-1.5"><DataBadge cls="source" compact /><DataBadge cls="calculated" compact /><DataBadge cls="demo" compact /><DataBadge cls="unavailable" compact /></span>
            <Link href="/admin/products/import" className="underline underline-offset-2 hover:text-fg">Open the import tool</Link>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CategoryPills active={category} counts={counts} manufacturer={activeManufacturer?.slug ?? null} />
          <ManufacturerFilter options={manufacturerOptions} active={activeManufacturer?.slug ?? null} />
        </div>
        {rawM && !activeManufacturer && <p className="text-[13px] text-fg-muted">No manufacturer with the address “{rawM}”. Showing all products.</p>}
        {activeManufacturer && (
          <p className="text-[13px] text-fg-secondary">
            Showing products by <Link href={manufacturerHref(activeManufacturer)} className="font-medium text-fg underline underline-offset-2">{activeManufacturer.name}</Link>
            {activeManufacturer.is_archived ? " (archived manufacturer)" : ""}.{" "}
            <Link href={category ? `/marketplace?category=${category}` : "/marketplace"} className="underline underline-offset-2 hover:text-fg">Clear</Link>
          </p>
        )}
        <MarketplaceGrid
          key={`${category ?? "all"}-${activeManufacturer?.slug ?? "all"}`}
          products={products}
          emptyTitle={activeManufacturer ? `No products have been added for ${activeManufacturer.name} yet.` : category ? `No ${CATEGORY_LABEL[category].toLowerCase()} yet` : "No products yet"}
        />
      </div>

      <CompareTray />
    </div>
  );
}

/** A catalogue figure parked beside the showroom object, with its data class. */
function Callout({ label, value, cls, className, color }: { label: string; value: string; cls: "calculated" | "demo"; className: string; color: string }) {
  return (
    <div className={`pointer-events-none absolute rounded-[var(--radius)] border border-border bg-elevated/90 px-2.5 py-1.5 shadow-[var(--shadow-sm)] ${className}`}>
      <span className="micro block">{label}</span>
      <span className="figure block text-[15px] font-medium" style={{ color }}>{value}</span>
      <DataBadge cls={cls} compact className="mt-1" />
    </div>
  );
}
