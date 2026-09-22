import { MapPinCheck, MapPinOff, MapPinned } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { AVAILABILITY_LABEL, availabilityState } from "@/lib/manufacturers/helpers";

/**
 * Kuwait / GCC availability as Solink has verified it. Three states, and the
 * third is the honest default: "not yet verified" is not "unavailable".
 */
export function AvailabilityBadge({ value, region, className }: { value: boolean | null | undefined; region: "kuwait" | "gcc"; className?: string }) {
  const state = availabilityState(value);
  const l = AVAILABILITY_LABEL[state];
  const Icon = state === "available" ? MapPinCheck : state === "not_available" ? MapPinOff : MapPinned;
  return <Badge tone={l.tone} className={className} icon={<Icon className="size-3" aria-hidden />}>{l[region]}</Badge>;
}
