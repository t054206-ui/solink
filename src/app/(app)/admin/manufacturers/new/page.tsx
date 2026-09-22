import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDataMode } from "@/lib/data/mode";
import { ManufacturerForm } from "../../_components/ManufacturerForm";

export const metadata: Metadata = { title: "Admin · Add manufacturer" };

export default function NewManufacturerPage() {
  return (
    <>
      <PageHeader eyebrow="Admin · Manufacturers" title="Add manufacturer" description="A company record. It is created Unverified with no products; products are linked from the product form or an import, and verification is a separate decision on the company's page." />
      <ManufacturerForm mode={getDataMode()} />
    </>
  );
}
