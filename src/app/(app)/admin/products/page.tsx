import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/ui/States";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { listAllProducts } from "../_lib/data";
import { ModeNotice } from "../_components/AdminBits";
import { ProductsTable } from "../_components/ProductsTable";

export const metadata: Metadata = { title: "Admin · Solar Products" };

export default async function AdminProductsPage() {
  const { data, mode, error } = await listAllProducts();
  const real = data.filter((p) => !p.is_demo).length;
  return (
    <>
      <PageHeader eyebrow="Admin" title="Solar Products" description={`${data.length} product${data.length === 1 ? "" : "s"} · ${real} real · ${data.length - real} demo. Mirrors the solar_products table; versions are snapshotted automatically.`} />
      <div className="space-y-4">
        <ModeNotice mode={mode} />
        {real === 0 && <PlaceholderNote k="REAL_SOLAR_PANEL_DATA_SOURCE" />}
        {error ? <ErrorState>{error}</ErrorState> : <ProductsTable products={data} mode={mode} />}
      </div>
    </>
  );
}
