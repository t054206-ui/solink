import type { Metadata } from "next";
import { SectionShell } from "../_components/SectionShell";

export const metadata: Metadata = { title: "Reports" };

export default function ManufacturerReportsPage() {
  return (
    <SectionShell
      title="Reports"
      description="Product activity, inquiries, purchase requests, verification status and update history, as downloadable summaries. Only reports that real data can produce."
      emptyTitle="Nothing to report yet"
      emptyBody={<p>Verification status and update history already exist per product under My Products. Activity and inquiry reports need the tracking and request tables first.</p>}
      needs={{ title: "MANUFACTURER REPORTS", body: "Depends on migration 0007 (product_events, manufacturer_requests). The product update history is already kept by the database in product_versions and can be surfaced here without schema changes." }}
    />
  );
}
