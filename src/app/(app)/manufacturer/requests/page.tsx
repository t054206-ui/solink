import type { Metadata } from "next";
import { SectionShell } from "../_components/SectionShell";

export const metadata: Metadata = { title: "Requests" };

export default function RequestsPage() {
  return (
    <SectionShell
      title="Requests"
      description="Product, availability, business, distributor and partnership inquiries addressed to your company, with a status from New to Closed. You see a requester's display name and governorate, never their address, email or phone."
      emptyTitle="No requests yet"
      emptyBody={<p>When customers or businesses send requests about your products, they will appear here.</p>}
      needs={{ title: "MANUFACTURER REQUESTS", body: "The manufacturer_requests table and its row-level security are proposed in migration 0007 and not applied. Until then no request can be created or shown." }}
    />
  );
}
