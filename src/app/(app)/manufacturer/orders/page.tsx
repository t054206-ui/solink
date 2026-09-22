import type { Metadata } from "next";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { SectionShell } from "../_components/SectionShell";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <SectionShell
      title="Orders"
      description="Orders that involve your products, from Request Received to Completed. Solink processes no payments today, so nothing here moves money."
      emptyTitle="No orders visible"
      emptyBody={<p>Solink’s orders run between a homeowner and an installer, and the current permissions do not show them to manufacturers. Payment processing is not currently connected.</p>}
      needs={{ title: "MANUFACTURER VIEW OF ORDERS", body: "A read policy giving a manufacturer the orders that contain its products, without the homeowner's personal details, is not written yet. It would follow the same privacy rule as provider screens." }}
    >
      <PlaceholderNote k="PAYMENT_PROVIDER" />
    </SectionShell>
  );
}
