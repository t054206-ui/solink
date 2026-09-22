import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { VerificationBadge } from "@/app/(app)/marketplace/_components/VerificationBadge";
import type { Manufacturer } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ManufacturerLogo } from "./ManufacturerLogo";
import { AvailabilityBadge } from "./AvailabilityBadge";

/**
 * One company in the directory. Every line comes from the manufacturer row;
 * a field the record does not hold reads "Not provided".
 */
export function ManufacturerCard({ m, href }: { m: Manufacturer; href: string }) {
  const n = m.product_count ?? 0;
  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-start gap-3">
        <ManufacturerLogo name={m.name} logoUrl={m.logo_url} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-snug text-fg"><Link href={href} className="hover:underline underline-offset-2">{m.name}</Link></h3>
          <p className="mt-0.5 truncate text-[12.5px] text-fg-muted">{m.manufacturer_type ?? <span>Type not provided</span>}</p>
        </div>
        {m.is_demo ? <DataBadge cls="demo" compact /> : m.is_archived ? <Badge tone="neutral">Archived</Badge> : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="text-fg-muted">Headquarters</dt><dd className="truncate text-fg">{m.headquarters_country ?? <span className="text-fg-muted">Not provided</span>}</dd>
        <dt className="text-fg-muted">Products</dt><dd className="tabular text-fg">{n === 0 ? <span className="text-fg-muted">No products yet</span> : `${n} ${n === 1 ? "product" : "products"}`}</dd>
        <dt className="text-fg-muted">Last updated</dt><dd className="text-fg">{formatDate(m.updated_at)}</dd>
      </dl>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <VerificationBadge status={m.verification_status} />
        <AvailabilityBadge value={m.kuwait_available} region="kuwait" />
        <AvailabilityBadge value={m.gcc_available} region="gcc" />
      </div>
      <div className="mt-auto flex justify-end pt-3">
        <Link href={href} className="inline-flex h-8 items-center gap-1 rounded-[var(--radius)] border border-border-strong bg-elevated px-3 text-[13px] font-medium text-fg hover:border-[var(--brand)] hover:bg-inset">View details <ArrowRight className="size-3.5" aria-hidden /></Link>
      </div>
    </Card>
  );
}
