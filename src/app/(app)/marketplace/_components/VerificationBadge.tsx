import { ShieldCheck, ShieldAlert, Clock, ShieldX, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { VerificationStatus } from "@/lib/types";
import { VERIFICATION_LABEL } from "./product-helpers";

/**
 * Verification status pill. "Verified" is shown ONLY when the record's
 * verification_status is exactly "verified". Used for products and for
 * manufacturer companies alike; the statuses are the one enum.
 */
export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  if (status === "verified") {
    return <Badge tone="good" className={className} icon={<ShieldCheck className="size-3" aria-hidden />}>{VERIFICATION_LABEL.verified}</Badge>;
  }
  if (status === "pending_verification") {
    return <Badge tone="warn" className={className} icon={<Clock className="size-3" aria-hidden />}>{VERIFICATION_LABEL.pending_verification}</Badge>;
  }
  if (status === "needs_changes") {
    return <Badge tone="serious" className={className} icon={<PencilLine className="size-3" aria-hidden />}>{VERIFICATION_LABEL.needs_changes}</Badge>;
  }
  if (status === "rejected") {
    return <Badge tone="critical" className={className} icon={<ShieldX className="size-3" aria-hidden />}>{VERIFICATION_LABEL.rejected}</Badge>;
  }
  return <Badge tone="neutral" className={className} icon={<ShieldAlert className="size-3" aria-hidden />}>{VERIFICATION_LABEL.unverified}</Badge>;
}
