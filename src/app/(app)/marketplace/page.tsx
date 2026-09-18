import type { Metadata } from "next";
import Link from "next/link";
import { Database, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { listProducts } from "@/lib/data/repositories";
import type { ProductCategory } from "@/lib/types";
import { CategoryPills } from "./_components/CategoryPills";
import { CompareTray } from "./_components/CompareTray";
import { MarketplaceGrid } from "./_components/MarketplaceGrid";
import { CATEGORY_LABEL, isCategory } from "./_components/product-helpers";

export const metadata: Metadata = {
  title: "Marketplace — Solink",
  description: "Solar panels, inverters, batteries and services with source tracking and verification status on every field.",
};

export default async function MarketplacePage({ searchParams }: PageProps<"/marketplace">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const category: ProductCategory | null = isCategory(raw) ? raw : null;

  const { data: all, mode } = await listProducts();
  const counts: Partial<Record<ProductCategory | "all", number>> = { all: all.length };
  for (const p of all) counts[p.category] = (counts[p.category] ?? 0) + 1;
  const products = category ? all.filter((p) => p.category === category) : all;

  return (
    <div className="pb-28">
      <PageHeader
        eyebrow="Choose"
        title="Marketplace"
        description="Every product carries its data source, verification status and the date it was last updated. Missing fields are shown as missing — never estimated."
        actions={<Button href="/compare" variant="outline">Compare panels</Button>}
      />

      {mode === "demo" && <DemoBanner className="mb-4" text="DEMO CATALOG — NOT REAL" detail="No real product dataset is connected. All products below are labeled demo records." />}

      <Card className="mb-6">
        <CardHeader
          title={<><Database className="size-4 text-[var(--brand-strong)]" aria-hidden /> How real product data reaches Solink</>}
          subtitle="Solink does not scrape or guess specifications. Records are imported from a chosen source, versioned, and marked Verified only after review."
          action={<Button href="/admin/products/import" variant="outline" size="sm"><Upload className="size-3.5" aria-hidden /> Import products</Button>}
        />
        <CardBody className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
          <PlaceholderNote k="REAL_SOLAR_PANEL_DATA_SOURCE" />
          <div className="flex flex-wrap gap-1.5 text-[12.5px] text-fg-muted md:max-w-xs md:flex-col">
            <span>Labels you will see:</span>
            <span className="flex flex-wrap gap-1.5"><DataBadge cls="source" compact /><DataBadge cls="calculated" compact /><DataBadge cls="demo" compact /><DataBadge cls="unavailable" compact /></span>
            <Link href="/admin/products/import" className="underline underline-offset-2 hover:text-fg">Open the import tool</Link>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <CategoryPills active={category} counts={counts} />
        <MarketplaceGrid
          key={category ?? "all"}
          products={products}
          emptyTitle={category ? `No ${CATEGORY_LABEL[category].toLowerCase()} yet` : "No products yet"}
        />
      </div>

      <CompareTray />
    </div>
  );
}
