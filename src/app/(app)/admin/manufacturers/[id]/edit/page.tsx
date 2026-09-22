import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { getManufacturer } from "@/lib/data/repositories";
import { safe } from "../../../_lib/data";
import { ManufacturerForm } from "../../../_components/ManufacturerForm";

export const metadata: Metadata = { title: "Admin · Edit manufacturer" };

export default async function EditManufacturerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await safe(() => getManufacturer(id), null);
  if (!m.data) return (<><PageHeader eyebrow="Admin · Manufacturers" title="Manufacturer not found" /><EmptyState title="No manufacturer with this id" /></>);
  return (
    <>
      <Link href={`/admin/manufacturers/${id}`} className="mb-3 inline-flex items-center gap-1 text-[13px] text-fg-secondary hover:text-fg"><ArrowLeft className="size-3.5" aria-hidden /> Back to {m.data.name}</Link>
      <PageHeader eyebrow="Admin · Manufacturers" title={`Edit ${m.data.name}`} description="Profile fields only. Verification, availability and archiving are decided on the company page, each with a note." />
      <ManufacturerForm initial={m.data} mode={m.mode} />
    </>
  );
}
