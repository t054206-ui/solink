import type { Metadata } from "next";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getManufacturerAccess } from "../_lib/access";
import { listOwnProducts } from "../_lib/data";
import { MyProductsTable } from "../_components/MyProductsTable";

export const metadata: Metadata = { title: "My Products" };

export default async function MyProductsPage() {
  const access = await getManufacturerAccess();
  const { data, mode } = await listOwnProducts(access.manufacturer?.id ?? null);
  return (
    <>
      <PageHeader
        eyebrow="Manufacturer · Products"
        title="My Products"
        description="Everything your company has published on Solink, with its verification state. A specification you have not provided reads exactly that; Solink never fills it in."
        actions={<Button href="/manufacturer/products/new" size="sm"><PackagePlus className="size-4" aria-hidden /> Add product</Button>}
      />
      <Card>
        <MyProductsTable products={data} me={access.manufacturer} mode={mode} />
      </Card>
    </>
  );
}
