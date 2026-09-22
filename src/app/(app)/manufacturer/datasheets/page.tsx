import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getManufacturerAccess } from "../_lib/access";
import { listDocumentsFor, listOwnProducts } from "../_lib/data";
import { DatasheetsPanel } from "../_components/DatasheetsPanel";

export const metadata: Metadata = { title: "Datasheets" };

export default async function DatasheetsPage() {
  const access = await getManufacturerAccess();
  const { data: products, mode } = await listOwnProducts(access.manufacturer?.id ?? null);
  const docs = await listDocumentsFor(products.map((p) => p.id));
  return (
    <>
      <PageHeader
        eyebrow="Manufacturer · Products"
        title="Datasheets"
        description="The documents behind your specifications. Verification checks each product against its datasheet, so every product needs one. Older documents are kept when a newer one is added."
      />
      <DatasheetsPanel products={products} docs={docs} mode={mode} />
    </>
  );
}
