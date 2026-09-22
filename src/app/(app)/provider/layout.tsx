import type { ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { getProviderAccess } from "./_lib/access";

/**
 * Maintenance-provider shell. Navigation lives in the app sidebar (one entry
 * per section, like the manufacturer portal). Access is gated by user_profiles.provider_company_id
 * in Supabase mode (and RLS scopes every read to that company); demo mode is
 * allowed and labeled. The role model is not final:
 * [PLACEHOLDER: ADMIN AUTHENTICATION / PERMISSIONS].
 */
export default async function ProviderLayout({ children }: { children: ReactNode }) {
  const access = await getProviderAccess();
  if (!access.authorized) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-inset px-6 py-10 text-center">
          <div className="mb-3 grid size-11 place-items-center rounded-full bg-critical-soft text-critical-fg"><ShieldOff className="size-5" aria-hidden /></div>
          <h1 className="text-lg font-semibold">Not authorized</h1>
          <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-fg-secondary">
            {access.reason ?? "This area is for maintenance providers working with Solink."} Provider access currently requires <code className="font-mono text-[12px]">user_profiles.provider_company_id</code> to point at your company.
          </p>
          <div className="mt-5 flex gap-2">
            <Button href="/dashboard" variant="outline">Back to dashboard</Button>
            {!access.userId && <Button href="/login?next=/provider">Sign in</Button>}
          </div>
        </div>
        <PlaceholderNote k="ADMIN_AUTHENTICATION_PERMISSIONS" className="mt-4" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {access.mode === "demo" && (
        <DemoBanner
          text="DEMO MODE: MAINTENANCE PROVIDER"
          detail={`Supabase is not connected. You are acting as ${access.providerName ?? "the demo maintenance company"}; cases are labeled demo records and anything you record is stored in this browser only.`}
        />
      )}
      {children}
    </div>
  );
}
