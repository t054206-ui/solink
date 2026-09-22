import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { ProductForm } from "@/app/(app)/admin/_components/ProductForm";
import { getManufacturerAccess } from "../../_lib/access";
import { saveOwnProductAction } from "../../actions";

export const metadata: Metadata = { title: "Add product" };

/**
 * The same form Solink's administrators use, pinned to this manufacturer and
 * without verification controls: what is saved here is pending until an
 * administrator checks it against the datasheet.
 */
export default async function NewOwnProductPage() {
  const access = await getManufacturerAccess();
  if (!access.manufacturer) return <EmptyState title="No manufacturer linked to your account" />;
  return (
    <>
      <PageHeader
        eyebrow="Manufacturer · Products"
        title="Add product"
        description="Enter what your datasheet states and nothing more. Fields the datasheet does not cover stay Unavailable, and the product is submitted for verification when you save."
      />
      <ProductForm manufacturers={[access.manufacturer]} providers={[]} mode={access.mode} lockedManufacturer={access.manufacturer} canVerify={false} basePath="/manufacturer/products" saveAction={saveOwnProductAction} />
    </>
  );
}
