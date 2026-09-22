import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { EmptyState } from "@/components/ui/States";
import { countProductEvents } from "@/lib/data/repositories";
import { EVENT_KINDS, EVENT_KIND_LABEL } from "@/lib/manufacturers/requests";
import { getManufacturerAccess } from "../_lib/access";
import { listOwnProducts } from "../_lib/data";

export const metadata: Metadata = { title: "Product Performance" };

/**
 * Counts of what Solink actually recorded: a signed-in person opening a
 * product page, adding it to a comparison, or requesting it. Calculated from
 * rows in product_events, never estimated, and never a ranking.
 */
export default async function ProductPerformancePage() {
  const access = await getManufacturerAccess();
  if (!access.manufacturer) return <EmptyState title="No manufacturer linked to your account" />;
  const { data: products } = await listOwnProducts(access.manufacturer.id);
  const active = products.filter((p) => !p.is_archived);
  const { data: counts } = await countProductEvents(active.map((p) => p.id)).catch(() => ({ data: [], mode: access.mode }));
  const get = (pid: string, kind: string) => counts.find((c) => c.product_id === pid && c.kind === kind)?.count ?? 0;
  const total = counts.reduce((s, c) => s + c.count, 0);
  return (
    <>
      <PageHeader eyebrow="Manufacturer" title="Product Performance" description="How your products are used on Solink: page views, comparisons, use in designs and purchase requests by signed-in people. Only what Solink recorded; a zero means nothing was recorded, not that nothing happened elsewhere." />
      <Card>
        <CardHeader title="Activity per product" subtitle={total === 0 ? "No activity has been recorded yet." : `${total} recorded ${total === 1 ? "event" : "events"} across ${active.length} ${active.length === 1 ? "product" : "products"}.`} action={<DataBadge cls="calculated" compact source="product_events" />} />
        <CardBody>
          {active.length === 0 ? <EmptyState title="No products yet">Activity appears once you have published a product.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="table-dense">
                <thead><tr><th scope="col">Product</th>{EVENT_KINDS.map((k) => <th key={k} scope="col">{EVENT_KIND_LABEL[k]}</th>)}</tr></thead>
                <tbody>
                  {active.map((p) => (
                    <tr key={p.id}>
                      <th scope="row" className="font-medium text-fg">{p.model}</th>
                      {EVENT_KINDS.map((k) => { const n = get(p.id, k); return <td key={k} className={n === 0 ? "text-fg-muted" : "figure text-fg"}>{n}</td>; })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[12.5px] leading-relaxed text-fg-muted">Recording started on 2026-09-22 with migration 0007. Guests are not counted, and Solink stores no page history: one row per event with the product, the kind and the time.</p>
        </CardBody>
      </Card>
    </>
  );
}
