import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/ui/States";
import { listAllProducts } from "../_lib/data";
import { ModeNotice } from "../_components/AdminBits";
import { VerificationQueue } from "../_components/VerificationQueue";

export const metadata: Metadata = { title: "Admin · Verification" };

export default async function VerificationPage() {
  const { data, mode, error } = await listAllProducts();
  return (
    <>
      <PageHeader eyebrow="Admin" title="Verification" description="Queue of unverified and pending products with their validation flags. Verified is only ever set here or in the product form by an admin, with a written note. The database also demotes any flagged record to Pending." />
      <div className="space-y-4">
        <ModeNotice mode={mode} detail="Demo products can be exercised through the flow; the change is stored in this browser only." />
        {error ? <ErrorState>{error}</ErrorState> : <VerificationQueue products={data} mode={mode} />}
      </div>
    </>
  );
}
