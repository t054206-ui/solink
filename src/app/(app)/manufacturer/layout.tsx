import type { ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { AuditMode } from "@/components/ui/AuditMode";
import { getManufacturerAccess } from "./_lib/access";

/**
 * Manufacturer portal shell. Navigation lives in the app sidebar (one entry
 * per section), so this layout only gates access and labels demo mode.
 */
export default async function ManufacturerLayout({ children }: { children: ReactNode }) {
  const access = await getManufacturerAccess();
  if (!access.authorized) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-inset px-6 py-10 text-center">
          <div className="mb-3 grid size-11 place-items-center rounded-full bg-critical-soft text-critical-fg"><ShieldOff className="size-5" aria-hidden /></div>
          <h1 className="text-lg font-semibold">Not authorized</h1>
          <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-fg-secondary">
            {access.reason ?? "This area is for manufacturers publishing products on Solink."} Manufacturer access currently requires <code className="font-mono text-[12px]">user_profiles.manufacturer_id</code> to point at your company; a Solink administrator links it.
          </p>
          <div className="mt-5 flex gap-2">
            <Button href="/dashboard" variant="outline">Back to dashboard</Button>
            {!access.userId && <Button href="/login?next=/manufacturer/products">Sign in</Button>}
          </div>
        </div>
        <PlaceholderNote k="ADMIN_AUTHENTICATION_PERMISSIONS" className="mt-4" />
      </div>
    );
  }
  return (
    <AuditMode>
    <div className="space-y-4">
      {access.mode === "demo" && (
        <DemoBanner text="DEMO MODE: MANUFACTURER" detail={`Supabase is not connected. You are acting as ${access.manufacturer?.name ?? "the demo manufacturer"}; products are labelled demo records and anything you save is stored in this browser only.`} />
      )}
      {children}
    </div>
    </AuditMode>
  );
}
