import type { Metadata } from "next";
import { SectionShell } from "../_components/SectionShell";

export const metadata: Metadata = { title: "Product Performance" };

export default function ProductPerformancePage() {
  return (
    <SectionShell
      title="Product Performance"
      description="How your products do on Solink: views, comparisons, use in designs and purchase requests. Only what Solink actually records; never a claim that one product performs better than another."
      emptyTitle="Insufficient data"
      emptyBody={<p>Solink does not yet record when a homeowner views or compares a product, so there is nothing to count. Performance insights will appear when enough verified data is available.</p>}
      needs={{ title: "PRODUCT ACTIVITY TRACKING", body: "A product_events table (views, comparisons, design use, purchase requests) is proposed in migration 0007. Once applied and written by the marketplace, this page shows counts per product, labelled calculated." }}
    />
  );
}
