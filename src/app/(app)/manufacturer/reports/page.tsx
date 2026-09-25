import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { EmptyState } from "@/components/ui/States";
import { VerificationBadge } from "@/app/(app)/marketplace/_components/VerificationBadge";
import { countProductEvents, listManufacturerRequests } from "@/lib/data/repositories";
import { REQUEST_KIND_LABEL, REQUEST_STATUS_LABEL } from "@/lib/manufacturers/requests";
import { formatDate } from "@/lib/utils";
import { getManufacturerAccess } from "../_lib/access";
import { listOwnProducts } from "../_lib/data";

export const metadata: Metadata = { title: "Reports" };

/** A summary of what the database holds for this company: verification per product, activity, requests. Nothing here is projected. */
export default async function ManufacturerReportsPage() {
  const access = await getManufacturerAccess();
  if (!access.manufacturer) return <EmptyState title="No manufacturer linked to your account" />;
  const { data: products } = await listOwnProducts(access.manufacturer.id);
  const [{ data: counts }, { data: requests }] = await Promise.all([
    countProductEvents(products.map((p) => p.id)).catch(() => ({ data: [], mode: access.mode })),
    listManufacturerRequests({ manufacturerId: access.manufacturer.id }).catch(() => ({ data: [], mode: access.mode })),
  ]);
  const byStatus = new Map<string, number>();
  for (const p of products) byStatus.set(p.source.verification_status, (byStatus.get(p.source.verification_status) ?? 0) + 1);
  const events = counts.reduce((s, c) => s + c.count, 0);
  const byKind = new Map<string, number>();
  for (const r of requests) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
  return (
    <>
      <PageHeader eyebrow="Manufacturer" title="Reports" description="Verification status, recorded activity and requests for your company, as the database holds them today. Use the browser's print function for a paper copy." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Verification" subtitle="Per product, as set by Solink's administrators." action={<DataBadge cls="source" compact />} />
          <CardBody>
            {products.length === 0 ? <p className="text-[13px] text-fg-muted">No products yet.</p> : (
              <ul className="divide-y divide-border/70 text-[13px]">
                {products.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-1.5"><span className="font-medium text-fg">{p.model}{p.is_archived && <Badge tone="neutral" className="ml-2">Archived</Badge>}</span><span className="flex items-center gap-2"><span className="text-fg-muted">{formatDate(p.source.date_last_updated)}</span><VerificationBadge status={p.source.verification_status} /></span></li>)}
              </ul>
            )}
            <p className="mt-3 text-[12.5px] text-fg-muted">{Array.from(byStatus.entries()).map(([s, n]) => `${n} ${s.replace(/_/g, " ")}`).join(" · ") || "Not set"}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Activity" subtitle="Recorded events across all your products since 2026-09-22." action={<DataBadge cls="calculated" compact />} />
          <CardBody>
            <div className="figure text-[30px] font-medium text-fg">{events}</div>
            <p className="text-[12.5px] text-fg-muted">{events === 0 ? "Nothing recorded yet." : "Per product and kind under Product Performance."}</p>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Requests" subtitle={`${requests.length} received.`} action={<DataBadge cls="source" compact />} />
          <CardBody>
            {requests.length === 0 ? <p className="text-[13px] text-fg-muted">No requests received yet.</p> : (
              <ul className="grid gap-2 text-[13px] sm:grid-cols-2">
                {Array.from(byKind.entries()).map(([k, n]) => <li key={k} className="flex justify-between rounded-[var(--radius)] bg-inset px-3 py-2"><span className="text-fg-secondary">{REQUEST_KIND_LABEL[k as keyof typeof REQUEST_KIND_LABEL]}</span><span className="figure text-fg">{n}</span></li>)}
                <li className="flex justify-between rounded-[var(--radius)] bg-inset px-3 py-2 sm:col-span-2"><span className="text-fg-secondary">Open (new, reviewing, in progress)</span><span className="figure text-fg">{requests.filter((r) => ["new", "reviewing", "in_progress"].includes(r.status)).length}</span></li>
              </ul>
            )}
            {requests.length > 0 && <p className="mt-3 text-[12.5px] text-fg-muted">Statuses in use: {Array.from(new Set(requests.map((r) => REQUEST_STATUS_LABEL[r.status]))).join(", ")}.</p>}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
