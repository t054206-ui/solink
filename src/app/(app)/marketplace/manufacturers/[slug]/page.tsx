import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ManufacturerProfile } from "@/components/manufacturers/ManufacturerProfile";
import { getManufacturer, listManufacturerSources, listProductDocuments, listProducts } from "@/lib/data/repositories";
import { headquartersText } from "@/lib/manufacturers/helpers";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getManufacturer(slug);
  return { title: data ? `${data.name}: Manufacturer` : "Manufacturer not found" };
}

/** Public company profile. Products, documents and sources come from the database through the manufacturer relationship. */
export default async function ManufacturerPage({ params }: Props) {
  const { slug } = await params;
  const { data: m, mode } = await getManufacturer(slug);
  if (!m) notFound();
  const [{ data: products }, { data: sources }] = await Promise.all([listProducts({ manufacturerId: m.id, includeArchived: true }), listManufacturerSources(m.id)]);
  const { data: docs } = await listProductDocuments(products.map((p) => p.id));
  const hq = headquartersText(m);
  return (
    <div className="pb-8">
      <Link href="/marketplace/manufacturers" className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-secondary hover:text-fg"><ArrowLeft className="size-3.5" aria-hidden /> All manufacturers</Link>
      <PageHeader
        eyebrow="Choose · Manufacturer"
        title={m.name}
        description={<span>{m.manufacturer_type ?? "Manufacturer"}{hq ? ` · ${hq}` : ""}</span>}
        actions={<Button href={`/marketplace?manufacturer=${encodeURIComponent(m.slug)}`} variant="outline">Products in the marketplace</Button>}
      />
      <ManufacturerProfile m={m} products={products} docs={docs} sources={sources} mode={mode} />
    </div>
  );
}
