import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ManufacturerCard } from "@/components/manufacturers/ManufacturerCard";
import { listManufacturers } from "@/lib/data/repositories";
import { adminManufacturerHref } from "@/lib/manufacturers/helpers";
import { safe } from "../_lib/data";
import { ModeNotice } from "../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · Manufacturers" };

type Props = { searchParams: Promise<{ q?: string | string[]; archived?: string | string[] }> };

/**
 * Manufacturer directory for administrators. The search and the archived
 * toggle are query parameters, so the database does the filtering
 * (name, legal name, HQ country, type) and the page is shareable.
 */
export default async function ManufacturersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const includeArchived = (Array.isArray(sp.archived) ? sp.archived[0] : sp.archived) === "1";
  const m = await safe(() => listManufacturers({ q: q || undefined, includeArchived, includeDemo: true }), []);
  const real = m.data.filter((x) => !x.is_demo);
  const demo = m.data.filter((x) => x.is_demo);
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Manufacturers"
        description="Every manufacturer company in the manufacturers table, with its products, verification and Kuwait availability as Solink has checked them. Products link to a company by manufacturer_id; a new name typed into a product form still creates a company here as Unverified."
        actions={<Button href="/admin/manufacturers/new" size="sm"><Plus className="size-4" aria-hidden /> Add manufacturer</Button>}
      />
      <div className="space-y-4">
        <ModeNotice mode={m.mode} />
        <form method="get" action="/admin/manufacturers" className="flex flex-col gap-2 sm:flex-row sm:items-center" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
            <Input type="search" name="q" defaultValue={q} placeholder="Search by company name, legal name, country or type" aria-label="Search manufacturers" className="pl-9" />
          </div>
          <label className="flex h-9 items-center gap-1.5 text-[13px] text-fg-secondary"><input type="checkbox" name="archived" value="1" defaultChecked={includeArchived} className="size-4 accent-[var(--brand)]" /> Include archived</label>
          <Button type="submit" variant="outline" size="md">Search</Button>
        </form>
        <p className="text-[12.5px] text-fg-muted" aria-live="polite">{real.length} {real.length === 1 ? "company" : "companies"}{demo.length ? ` · ${demo.length} demo` : ""}{q ? ` matching “${q}”` : ""}{includeArchived ? ", archived included" : ""}</p>
        {m.error ? <ErrorState>{m.error}</ErrorState> : m.data.length === 0 ? (
          <EmptyState title={q ? "No manufacturers match your search" : "No manufacturers yet"}>{q ? "Try a shorter name or the country." : "Add the first company with the button above."}</EmptyState>
        ) : (
          <>
            {real.length > 0 && (
              <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                {real.map((x) => <li key={x.id}><ManufacturerCard m={x} href={adminManufacturerHref(x)} /></li>)}
              </ul>
            )}
            {demo.length > 0 && (
              <details className="rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-inset p-3" open={real.length === 0}>
                <summary className="cursor-pointer text-[13px] font-medium text-fg-secondary">Demo companies ({demo.length}): labelled records that exist only for demo mode</summary>
                <ul className="mt-3 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                  {demo.map((x) => <li key={x.id}><ManufacturerCard m={x} href={adminManufacturerHref(x)} /></li>)}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </>
  );
}
