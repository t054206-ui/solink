import type { ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import { getAdminAccess } from "./_lib/auth";
import { AdminNav } from "./_components/AdminNav";
import { AdminRoleNotice } from "./_components/AdminBits";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { AuditMode } from "@/components/ui/AuditMode";
import { Button } from "@/components/ui/Button";

/**
 * Admin shell. Access is gated by user_profiles.role === 'admin' in Supabase
 * mode; demo mode is allowed and labeled. The permission model is not final:
 * [PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS].
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await getAdminAccess();
  if (!access.authorized) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-inset px-6 py-10 text-center">
          <div className="mb-3 grid size-11 place-items-center rounded-full bg-critical-soft text-critical-fg"><ShieldOff className="size-5" aria-hidden /></div>
          <h1 className="text-lg font-semibold">Not authorized</h1>
          <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-fg-secondary">{access.reason ?? "This area is restricted to Solink administrators."} Admin access currently requires <code className="font-mono text-[12px]">user_profiles.role = &apos;admin&apos;</code>.</p>
          <div className="mt-5 flex gap-2">
            <Button href="/dashboard" variant="outline">Back to dashboard</Button>
            {!access.userId && <Button href="/login?next=/admin">Sign in</Button>}
          </div>
        </div>
        <PlaceholderNote k="ADMIN_AUTHENTICATION_PERMISSIONS" className="mt-4" />
      </div>
    );
  }
  return (
    <AuditMode>
    <div className="space-y-4">
      {access.mode === "demo" && <DemoBanner text="DEMO MODE — ADMIN" detail="Supabase is not connected. Admin pages show labeled demo records; edits are stored in this browser only." />}
      <AdminRoleNotice />
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
        <AdminNav />
        <div className="min-w-0 mt-2 lg:mt-0">{children}</div>
      </div>
    </div>
    </AuditMode>
  );
}
