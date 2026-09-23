import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calculator, LibraryBig, PencilRuler, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { SourceReferences } from "@/components/ui/SourceReferences";
import { DEMO_PRODUCT_BANNER } from "@/lib/demo/data";
import { getProduct, listProductPrices, listProductSources } from "@/lib/data/repositories";
import { PricesCard, SourceDocumentsCard } from "../_components/ProvenanceCards";
import { SupplierPurchase } from "../_components/SupplierPurchase";
import { CompareToggle } from "../_components/CompareToggle";
import { CompareTray } from "../_components/CompareTray";
import { PriceCell } from "../_components/PriceCell";
import { CATEGORY_SINGULAR } from "../_components/product-helpers";
import { VerificationBadge } from "../_components/VerificationBadge";
import { ManufacturerLink } from "../_components/ManufacturerLink";
import { RecordProductEvent } from "../_components/RecordProductEvent";
import { CalculatedHelpers } from "./_components/CalculatedHelpers";
import { ImageGallery } from "./_components/ImageGallery";
import { SourceCard } from "./_components/SourceCard";
import { SpecTable } from "./_components/SpecTable";
import { InfoTip } from "@/components/help/InfoTip";

export async function generateMetadata({ params }: PageProps<"/marketplace/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { data } = await getProduct(id);
  return { title: data ? `${data.name}: Solink Marketplace` : "Product not found: Solink" };
}

export default async function ProductDetailPage({ params }: PageProps<"/marketplace/[id]">) {
  const { id } = await params;
  const { data: p } = await getProduct(id);
  if (!p || p.is_archived) notFound();
  // Provenance tables (0011): the documents behind the record and any supplier price on record.
  const [{ data: docs }, { data: prices }] = await Promise.all([listProductSources([p.id]), listProductPrices([p.id])]);

  const isPanel = p.category === "solar_panel";

  return (
    <div className="pb-28">
      <Link href="/marketplace" className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-secondary hover:text-fg"><ArrowLeft className="size-3.5" aria-hidden /> Back to marketplace</Link>

      <PageHeader
        eyebrow={<span className="inline-flex flex-wrap items-center gap-2">Choose · {CATEGORY_SINGULAR[p.category]}{p.series ? <> · {p.series} series</> : null}</span>}
        title={p.name}
        description={<span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5"><span>Manufacturer: <ManufacturerLink product={p} className="font-medium text-fg" /> · <span className="font-mono">{p.model}</span></span><VerificationBadge status={p.source.verification_status} /><Badge tone="brand">{CATEGORY_SINGULAR[p.category]}</Badge>{p.is_outdated && <Badge tone="warn">Outdated</Badge>}</span>}
        actions={
          <>
            <CompareToggle id={p.id} size="md" />
            {isPanel && <Button href={`/designer?panel=${encodeURIComponent(p.id)}`} variant="outline"><PencilRuler className="size-4" aria-hidden /> Use in Designer</Button>}
            <Button href={`/purchase?panel=${encodeURIComponent(p.id)}`} variant="outline"><Wrench className="size-4" aria-hidden /> Plan installation</Button>
          </>
        }
      />

      {p.is_demo && <DemoBanner className="mb-5" text={DEMO_PRODUCT_BANNER} detail="This record exists only to exercise the interface. No manufacturer, model, figure or price here is real." />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardBody className="grid gap-5 pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <ImageGallery images={p.images} alt={`${p.manufacturer_name} ${p.model}`} />
              <div className="space-y-4">
                {p.description && <p className="text-[14px] leading-relaxed text-fg-secondary">{p.description}</p>}
                <div className="rounded-[10px] border border-border bg-inset p-3">
                  <div className="text-[12px] text-fg-muted">Price on record</div>
                  <div className="mt-1"><PriceCell product={p} /></div>
                  <SupplierPurchase prices={prices} className="mt-3 border-t border-border/70 pt-3" />
                </div>
                <div className="flex flex-wrap gap-1.5 text-[12px] text-fg-muted">
                  <span>Data class of manufacturer fields:</span>
                  <DataBadge cls={p.is_demo ? "demo" : "source"} compact source={p.source.data_source} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={<>Specifications <InfoTip term="datasheet" /></>} subtitle="Each value is labeled with its data class. Fields the source did not provide are shown as unavailable." />
            <CardBody><SpecTable product={p} /></CardBody>
          </Card>

          {isPanel && (
            <Card>
              <CardHeader title={<><Calculator className="size-4 text-[var(--brand-strong)]" aria-hidden /> Derived figures</>} subtitle="Deterministic calculations from the specs above: no assumptions involved." action={<DataBadge cls="calculated" compact />} />
              <CardBody><CalculatedHelpers product={p} /></CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={<><LibraryBig className="size-4 text-[var(--brand-strong)]" aria-hidden /> Sources &amp; References</>}
              subtitle="Each reference sits against the thing it actually supports. Where nothing was found the row says so."
            />
            <CardBody><SourceReferences product={p} /></CardBody>
          </Card>

          <SourceCard product={p} />
          <SourceDocumentsCard docs={docs} />
          <PricesCard prices={prices} />
          <Card>
            <CardHeader title="Next steps" />
            <CardBody className="flex flex-col gap-2">
              <CompareToggle id={p.id} size="md" className="w-full" />
              {isPanel && <Button href={`/designer?panel=${encodeURIComponent(p.id)}`} variant="outline" className="w-full"><PencilRuler className="size-4" aria-hidden /> Use in Designer</Button>}
              <Button href={`/purchase?panel=${encodeURIComponent(p.id)}`} variant="outline" className="w-full"><Wrench className="size-4" aria-hidden /> Plan installation</Button>
              <Link href="/recommend" className="mt-1 text-center text-[13px] text-fg-secondary underline underline-offset-2 hover:text-fg">Ask the AI how this compares</Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <CompareTray />
      {!p.is_demo && <RecordProductEvent productIds={[p.id]} kind="view" />}
    </div>
  );
}
