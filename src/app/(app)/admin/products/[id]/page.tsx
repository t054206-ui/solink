import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getProduct, listManufacturers, listProviders } from "@/lib/data/repositories";
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
  return (
    <>
      <PageHeader eyebrow="Admin · Solar Products" title={product ? `${product.manufacturer_name} — ${product.model}` : "Locally created product"} description={product?.name} />
      {mode === "demo" ? (
        <ProductEditLoader id={id} server={product} manufacturers={m.data} providers={p.data} />
      ) : (
        <ProductForm initial={product!} manufacturers={m.data} providers={p.data} mode={mode} />
      )}
    </>
  );
}
