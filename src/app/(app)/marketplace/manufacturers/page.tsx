import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { ManufacturerCard } from "@/components/manufacturers/ManufacturerCard";
import { listManufacturers } from "@/lib/data/repositories";
import { manufacturerHref } from "@/lib/manufacturers/helpers";

export const metadata: Metadata = { title: "Manufacturers", description: "The companies behind the products in the Solink marketplace, with verification and availability as Solink has checked them." };

/** Public directory: the active manufacturer companies, read from the database on every request. */
export default async function ManufacturerDirectoryPage() {
  const { data, mode } = await listManufacturers();
  return (
    <div>
      <Link href="/marketplace" className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-secondary hover:text-fg"><ArrowLeft className="size-3.5" aria-hidden /> Back to marketplace</Link>
      <PageHeader eyebrow="Choose" title="Manufacturers" description="Every company whose products can appear in the marketplace. Verification and Kuwait availability are Solink's checks; where no check has been made the card says so rather than guessing." />
      {mode === "demo" && <DemoBanner className="mb-4" text="DEMO CATALOG: NOT REAL" detail="No Supabase connection; these are labeled demo companies." />}
      {data.length === 0 ? <EmptyState title="No manufacturers yet" /> : (
        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {data.map((m) => <li key={m.id}><ManufacturerCard m={m} href={manufacturerHref(m)} /></li>)}
        </ul>
      )}
    </div>
  );
}
