import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import type { ProviderCompany } from "@/lib/types";
import { MAINT_KIND, MAINT_KIND_ORDER, providerKindsFor } from "../../_ops/meta";
import { InfoTip } from "@/components/help/InfoTip";

/**
 * Feature 43 — Maintenance costs. Service type × provider price. Providers have
 * not entered prices, so every cell is the MAINTENANCE PRICE placeholder; no
 * figure is assumed or averaged.
 */
export function MaintenanceCostsCard({ providers }: { providers: ProviderCompany[] }) {
  const serviceProviders = providers.filter((p) => p.kind.some((k) => k === "maintenance" || k === "cleaning" || k === "installer"));
  return (
    <Card>
      <CardHeader title={<>Maintenance costs <InfoTip term="maintenance_costs" /></>} subtitle="What each service type costs with each provider. Prices are shown only when a provider enters them." />
      <CardBody className="space-y-3">
        {serviceProviders.length === 0 ? (
          <PlaceholderNote k="MAINTENANCE_PRICE" />
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-fg-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">Service</th>
                  {serviceProviders.map((p) => (
                    <th key={p.id} scope="col" className="py-2 pr-3 font-medium">
                      <span className="flex flex-col gap-0.5"><span className="text-fg-secondary">{p.name}</span>{p.is_demo && <DataBadge cls="demo" compact />}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MAINT_KIND_ORDER.map((k) => (
                  <tr key={k}>
                    <th scope="row" className="py-2.5 pr-3 text-left font-medium text-fg">
                      {MAINT_KIND[k].label}
                      <span className="block text-[11.5px] font-normal text-fg-muted">{MAINT_KIND[k].description}</span>
                    </th>
                    {serviceProviders.map((p) => {
                      const offers = p.kind.some((pk) => providerKindsFor(k).includes(pk));
                      return <td key={p.id} className="py-2.5 pr-3 align-top">{offers ? <Placeholder k="MAINTENANCE_PRICE" /> : <span className="text-fg-muted">Not offered</span>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[12.5px] leading-relaxed text-fg-muted">
          Solink never estimates a maintenance price. When a provider publishes a price list, each cell shows the provider&apos;s figure with its source and date. Until then, the exact cost of a booking is agreed with the provider directly.
        </p>
      </CardBody>
    </Card>
  );
}
