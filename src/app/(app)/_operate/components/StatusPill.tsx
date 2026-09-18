import { Badge } from "@/components/ui/Badge";
import type { MonitorStatus } from "@/lib/types";
import { MONITOR_STATUS_LABEL } from "../production";

const TONE: Record<MonitorStatus, "good" | "warn" | "serious" | "critical" | "neutral"> = {
  normal: "good", monitor: "warn", inspection_recommended: "serious", maintenance_recommended: "critical", insufficient_data: "neutral",
};

/** The five allowed monitoring statuses, in the allowed wording. */
export function StatusPill({ status, className }: { status: MonitorStatus; className?: string }) {
  return <Badge tone={TONE[status]} className={className}>{MONITOR_STATUS_LABEL[status]}</Badge>;
}
