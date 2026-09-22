import type { ReactNode } from "react";
import { Flag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Placeholder } from "@/components/ui/Placeholder";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/lib/types";
import type { DataMode } from "@/lib/data/mode";
import { flagTone } from "./admin-helpers";
import { VerificationBadge } from "@/app/(app)/marketplace/_components/VerificationBadge";

/** Compact admin-role notice required on every admin page. */
export function AdminRoleNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-[12px] text-fg-muted", className)}>
      Admin access is gated by <code className="font-mono">user_profiles.role = &apos;admin&apos;</code> only. The permission model is not final: <Placeholder k="ADMIN_AUTHENTICATION_PERMISSIONS" />
    </p>
  );
}

/** Shown at the top of list pages: demo banner in demo mode, RLS note otherwise. */
export function ModeNotice({ mode, detail }: { mode: DataMode; detail?: string }) {
  if (mode === "demo") return <DemoBanner detail={detail ?? "Supabase is not connected; these are labeled demo records."} />;
  return null;
}

/** The one verification pill, shared with the marketplace so the five states read the same everywhere. */
export function VerificationPill({ status }: { status: VerificationStatus }) {
  return <VerificationBadge status={status} />;
}

/** Validation flags are displayed, never auto-corrected. */
export function FlagList({ flags, className }: { flags: string[]; className?: string }) {
  if (flags.length === 0) return <span className={cn("text-[12px] text-fg-muted", className)}>No flags</span>;
  return (
    <ul className={cn("flex flex-wrap gap-1", className)} aria-label={`${flags.length} validation flags`}>
      {flags.map((f) => <li key={f}><Badge tone={flagTone(f)} icon={<Flag className="size-3" aria-hidden />} className="whitespace-normal text-left">{f}</Badge></li>)}
    </ul>
  );
}

/* ---------- minimal responsive table primitives ---------- */
export function Table({ children, caption, className }: { children: ReactNode; caption?: string; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-elevated", className)}>
      <table className="w-full min-w-[640px] text-[13px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th scope="col" className={cn("border-b border-border bg-inset px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-wider text-fg-muted", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border px-3 py-2 align-top text-fg-secondary last:border-b-0", className)}>{children}</td>;
}

export function StatCard({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const inner = (
    <>
      <div className="text-[12.5px] font-medium text-fg-secondary">{label}</div>
      <div className="tabular mt-1 text-2xl font-semibold text-fg">{value}</div>
      {hint && <div className="mt-1 text-[11.5px] text-fg-muted">{hint}</div>}
    </>
  );
  const cls = "rounded-[var(--radius-lg)] border border-border bg-elevated p-4 shadow-sm";
  return href ? <a href={href} className={cn(cls, "block transition-colors hover:border-border-strong")}>{inner}</a> : <div className={cls}>{inner}</div>;
}
