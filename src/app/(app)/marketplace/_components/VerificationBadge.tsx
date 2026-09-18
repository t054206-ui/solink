import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { VerificationStatus } from "@/lib/types";
import { VERIFICATION_LABEL } from "./product-helpers";

/**
 * Verification status pill. "Verified" is shown ONLY when the record's
 * verification_status is exactly "verified".
 */
export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  if (status === "verified") {
    return <Badge tone="good" className={className} icon={<ShieldCheck className="size-3" aria-hidden />}>{VERIFICATION_LABEL.verified}</Badge>;
  }
  if (status === "pending_verification") {
    return <Badge tone="warn" className={className} icon={<Clock className="size-3" aria-hidden />}>{VERIFICATION_LABEL.pending_verification}</Badge>;
  }
  return <Badge tone="neutral" className={className} icon={<ShieldAlert className="size-3" aria-hidden />}>{VERIFICATION_LABEL.unverified}</Badge>;
}
