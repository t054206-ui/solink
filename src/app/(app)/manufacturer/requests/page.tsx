import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { listManufacturerRequests } from "@/lib/data/repositories";
import { getManufacturerAccess } from "../_lib/access";
import { listOwnProducts } from "../_lib/data";
import { RequestsPanel } from "../_components/RequestsPanel";

export const metadata: Metadata = { title: "Requests" };

export default async function RequestsPage() {
  const access = await getManufacturerAccess();
  if (!access.manufacturer) return <EmptyState title="No manufacturer linked to your account" />;
  const [{ data: requests }, { data: products }] = await Promise.all([
    listManufacturerRequests({ manufacturerId: access.manufacturer.id }).catch(() => ({ data: [], mode: access.mode })),
    listOwnProducts(access.manufacturer.id),
  ]);
  const open = requests.filter((r) => r.status === "new" || r.status === "reviewing" || r.status === "in_progress").length;
  return (
    <>
      <PageHeader eyebrow="Manufacturer" title="Requests" description={`Product, availability, business, distributor and partnership inquiries addressed to your company, sent from your Solink page. ${requests.length} on record, ${open} open. You see a requester's display name and governorate, never their address, email or phone.`} />
      <RequestsPanel requests={requests} products={products} mode={access.mode} />
    </>
  );
}
