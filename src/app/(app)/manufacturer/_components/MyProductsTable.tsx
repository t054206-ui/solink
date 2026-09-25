"use client";
import Link from "next/link";
import { PackagePlus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataBadge } from "@/components/ui/DataBadge";
import { EmptyState } from "@/components/ui/States";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { formatDate, specNum } from "@/lib/utils";
import type { DataMode } from "@/lib/data/mode";
import type { Manufacturer, Product } from "@/lib/types";
import { ADMIN_PRODUCTS_STORE, VERIFICATION_LABEL, type AdminProductStore } from "@/app/(app)/admin/_components/admin-helpers";
import { InfoTip } from "@/components/help/InfoTip";

/**
 * The manufacturer's catalogue. In demo mode the browser store (where the
 * shared product form saves) is merged in, matched by manufacturer, so a
 * product added a minute ago is listed. A missing specification reads
 * "Not provided", never a number.
 */
export function MyProductsTable({ products, me, mode }: { products: Product[]; me: Manufacturer | null; mode: DataMode }) {
  const [store] = useLocalStore<AdminProductStore>(ADMIN_PRODUCTS_STORE, {});
  const local = mode === "demo" && me ? Object.values(store).filter((p) => p.manufacturer_id === me.id || p.manufacturer_name === me.name) : [];
  const byId = new Map<string, Product>();
  for (const p of products) byId.set(p.id, p);
  for (const p of local) byId.set(p.id, p);
  const rows = [...byId.values()].sort((a, b) => (b.source.date_last_updated ?? "").localeCompare(a.source.date_last_updated ?? ""));

  if (rows.length === 0) {
    return (
      <EmptyState title="No products yet">
        <p>Add your first product to start building your Solink catalogue. Every specification you enter is shown to homeowners with your company as its source.</p>
        <Button href="/manufacturer/products/new" size="sm" className="mt-3"><PackagePlus className="size-4" aria-hidden /> Add product</Button>
      </EmptyState>
    );
  }

  const num = (v: unknown, unit: string, digits = 0) => {
    const n = specNum(v as { value: unknown } | undefined);
    return n === null ? <span className="text-fg-na">Not provided</span> : <span className="figure">{n.toFixed(digits)} {unit}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="table-dense">
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Model</th>
            <th scope="col">Rated power <InfoTip term="rated_power" /></th>
            <th scope="col">Efficiency <InfoTip term="efficiency" /></th>
            <th scope="col">Verification <InfoTip term="verification_status" /></th>
            <th scope="col">Updated</th>
            <th scope="col">Status <InfoTip term="listing_status" /></th>
            <th scope="col"><span className="sr-only">Edit</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const status = p.source.verification_status;
            return (
              <tr key={p.id}>
                <th scope="row" className="font-medium text-fg">
                  <span className="flex items-center gap-2.5">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="size-9 shrink-0 rounded-[6px] border border-border object-contain bg-elevated" />
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-[6px] border border-dashed border-border-strong text-[9px] text-fg-muted">no image</span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate">{p.name}</span>
                      {p.is_demo && <DataBadge cls="demo" compact />}
                    </span>
                  </span>
                </th>
                <td className="text-fg-secondary">{p.model}</td>
                <td>{num(p.specs.rated_power_w, "W")}</td>
                <td>{num(p.specs.efficiency_pct, "%", 1)}</td>
                <td><Badge tone={status === "verified" ? "good" : status === "pending_verification" ? "warn" : "neutral"}>{VERIFICATION_LABEL[status] ?? status}</Badge></td>
                <td className="text-fg-muted">{p.source.date_last_updated ? formatDate(p.source.date_last_updated) : "Not set"}</td>
                <td>
                  {p.is_archived ? <Badge tone="neutral">Archived</Badge> : p.is_outdated ? <Badge tone="warn">Outdated</Badge> : <Badge tone="good">Listed</Badge>}
                </td>
                <td>
                  <Link href={`/manufacturer/products/${p.id}`} aria-label={`Edit ${p.name}`} className="grid size-8 place-items-center rounded-[var(--radius)] text-fg-secondary hover:bg-inset hover:text-fg"><Pencil className="size-3.5" aria-hidden /></Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
