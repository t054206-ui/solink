import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getProduct, listManufacturers, listProductPrices, listProductSources, listProviders } from "@/lib/data/repositories";
import { PricesCard, SourceDocumentsCard } from "../../../marketplace/_components/ProvenanceCards";
import { getDataMode } from "@/lib/data/mode";
import { ProductForm } from "../../_components/ProductForm";
import { ProductEditLoader } from "../../_components/ProductEditLoader";
import { safe } from "../../_lib/data";
import { isLocalId } from "../../_components/admin-helpers";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Admin · Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mode = getDataMode();
  const [m, p] = await Promise.all([safe(listManufacturers, []), safe(listProviders, [])]);
  const product = isLocalId(id) ? null : (await safe(() => getProduct(id), null)).data;
  if (!product && mode === "supabase") {
    return (<><PageHeader eyebrow="Admin · Solar Products" title="Product not found" /><EmptyState title="No product with this id" /></>);
  }
  // Provenance and prices (0011) are shown read-only beside the form: they are written by imports, suppliers and the manufacturer portal, not edited here.
  const [{ data: docs }, { data: prices }] = product
    ? await Promise.all([safe(() => listProductSources([product.id]), []), safe(() => listProductPrices([product.id]), [])])
    : [{ data: [] }, { data: [] }];
  return (
    <>
      <PageHeader eyebrow="Admin · Solar Products" title={product ? `${product.manufacturer_name}. ${product.model}` : "Locally created product"} description={product ? [product.name, product.series ? `${product.series} series` : null].filter(Boolean).join(" · ") : undefined} />
      {mode === "demo" ? (
        <ProductEditLoader id={id} server={product} manufacturers={m.data} providers={p.data} />
      ) : (
        <ProductForm initial={product!} manufacturers={m.data} providers={p.data} mode={mode} />
      )}
      {product && mode === "supabase" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <SourceDocumentsCard docs={docs} />
          <PricesCard prices={prices} />
        </div>
      )}
    </>
  );
}
