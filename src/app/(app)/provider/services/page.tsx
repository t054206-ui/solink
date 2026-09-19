import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { getProviderAccess } from "../_lib/access";
import { loadProviderServices } from "../_lib/prices";
import { ProviderIdentity } from "../_components/ProviderBits";
import { ServicesEditor } from "../_components/ServicesEditor";

export const metadata: Metadata = {
  title: "Provider services and prices",
  description: "The six maintenance services your company can offer, with your price and the days and hours you are available.",
};

export default async function ProviderServicesPage() {
  const access = await getProviderAccess();
  const serverServices = await loadProviderServices(access);

  return (
    <div>
      <PageHeader
        eyebrow="Maintenance provider"
        title="Services & prices"
        description="What you offer, what it costs and when you are available. Until you enter a real price, Solink shows the placeholder to homeowners: it never estimates a maintenance cost on your behalf."
      />
      <ProviderIdentity name={access.providerName} mode={access.mode} isDemoProvider={access.isDemoProvider} className="mb-4" />
      <ServicesEditor mode={access.mode} serverServices={serverServices} />
      <PlaceholderNote k="MAINTENANCE_PRICE" className="mt-4" />
    </div>
  );
}
