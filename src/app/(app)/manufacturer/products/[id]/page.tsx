import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { getProduct } from "@/lib/data/repositories";
import { getManufacturerAccess } from "../../_lib/access";
import { OwnProductEditor } from "../../_components/OwnProductEditor";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditOwnProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getManufacturerAccess();
  if (!access.manufacturer) return <EmptyState title="No manufacturer linked to your account" />;
  const { data: server } = await getProduct(id).catch(() => ({ data: null }));
  return (
    <>
      <PageHeader
        eyebrow="Manufacturer · Products"
        title={server?.name ?? "Edit product"}
        description="Change what your datasheet changed. Saving a product that was verified sends it back for verification; the specifications frozen in any homeowner's Solar Passport are not touched."
      />
      <OwnProductEditor id={id} server={server} me={access.manufacturer} mode={access.mode} />
    </>
  );
}
