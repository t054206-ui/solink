import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { getManufacturerAccess } from "../_lib/access";
import { listOwnProducts } from "../_lib/data";
import { CompanyProfileForm } from "../_components/CompanyProfileForm";

export const metadata: Metadata = { title: "Company Profile" };

export default async function CompanyPage() {
  const access = await getManufacturerAccess();
  if (!access.manufacturer) return <EmptyState title="No manufacturer linked to your account" />;
  const { data: products } = await listOwnProducts(access.manufacturer.id);
  return (
    <>
      <PageHeader eyebrow="Manufacturer" title="Company Profile" description="Your company as Solink shows it. Edit what is yours; verification stays with Solink's administrators." />
      <CompanyProfileForm me={access.manufacturer} productCount={products.filter((p) => !p.is_archived).length} mode={access.mode} />
    </>
  );
}
