import type { ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DataBadge } from "@/components/ui/DataBadge";
import { cn } from "@/lib/utils";
import type { DataMode } from "@/lib/data/mode";

/** Who the queue is being viewed as. In demo mode this is the labeled demo maintenance company. */
export function ProviderIdentity({ name, mode, isDemoProvider, className }: { name: string | null; mode: DataMode; isDemoProvider: boolean; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-1.5 text-[12.5px] text-fg-muted", className)}>
      Signed in as
      <span className="font-medium text-fg-secondary">{name ?? "your provider company"}</span>
      {isDemoProvider && <DataBadge cls="demo" compact />}
      {mode === "supabase"
        ? <span>· row-level security scopes every case, appointment and price to this company.</span>
        : <span>· demo mode has no access scoping, so every labeled demo record is listed.</span>}
    </p>
  );
}

/** The privacy rule for provider screens, stated where the customer data would be. */
export function PrivacyNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-[10px] border border-border bg-inset px-3 py-2 text-[12.5px] leading-relaxed text-fg-secondary", className)}>
      <EyeOff className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
      <span>Solink shows you only what the job needs: the system and its governorate. Addresses, email addresses and phone numbers are never shown here.</span>
    </p>
  );
}

/** Summary tile for the queue. */
export function StatTile({ label, value, sub }: { label: ReactNode; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-4 shadow-sm">
      <div className="text-[12.5px] font-medium text-fg-secondary">{label}</div>
      <div className="tabular mt-1 text-2xl font-semibold leading-tight text-fg">{value}</div>
      <div className="mt-1 text-[11.5px] leading-snug text-fg-muted">{sub}</div>
    </div>
  );
}

/** A small labelled fact on a case card. */
export function Fact({ k, children }: { k: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-fg-muted">{k}:</span>
      <span className="text-fg-secondary">{children}</span>
    </span>
  );
}

export function LocalBadge() {
  return <Badge tone="neutral">Saved on this device</Badge>;
}
