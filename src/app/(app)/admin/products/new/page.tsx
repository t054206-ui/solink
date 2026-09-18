import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { listManufacturers, listProviders } from "@/lib/data/repositories";
import { getDataMode } from "@/lib/data/mode";
import { ProductForm } from "../../_components/ProductForm";
import { safe } from "../../_lib/data";

export const metadata: Metadata = { title: "Admin · New product" };

export default async function NewProductPage() {
  const [m, p] = await Promise.all([safe(listManufacturers, []), safe(listProviders, [])]);
  return (
    <>
      <PageHeader eyebrow="Admin · Solar Products" title="New product" description="Manual admin entry. Every field must come from a real source; anything the source does not state stays Unavailable." />
      <ProductForm manufacturers={m.data} providers={p.data} mode={getDataMode()} />
    </>
  );
}
