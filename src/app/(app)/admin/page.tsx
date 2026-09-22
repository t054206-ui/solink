import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Placeholder } from "@/components/ui/Placeholder";
import { integrationStatus } from "@/lib/config/env";
import type { PlaceholderKey } from "@/lib/config/placeholders";
import { listIncidents, listMaintenance, listProviders, listSystems } from "@/lib/data/repositories";
import { listAllProducts, safe } from "./_lib/data";
import { StatCard, ModeNotice } from "./_components/AdminBits";
import { validateProductSpecs } from "./_components/admin-helpers";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const [products, providers, systems, cases, incidents] = await Promise.all([
    listAllProducts(), safe(listProviders, []), safe(listSystems, []), safe(() => listMaintenance(), []), safe(() => listIncidents(), []),
  ]);
  const mode = products.mode;
  const demo = products.data.filter((p) => p.is_demo).length;
  const unverified = products.data.filter((p) => p.source.verification_status !== "verified").length;
  const flagged = products.data.filter((p) => validateProductSpecs(p.specs, p.category).length > 0).length;
  const openCases = cases.data.filter((c) => c.status !== "resolved" && c.status !== "closed").length;
  const openIncidents = incidents.data.filter((i) => i.status === "open" || i.status === "investigating").length;
  const integrations = integrationStatus();
  const connected = integrations.filter((i) => i.connected).length;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Dashboard" description="Counts come straight from the repositories; in Supabase mode they are limited to what the admin role can read under RLS." />
      <div className="space-y-6">
        <ModeNotice mode={mode} detail="Every count below refers to labeled demo records." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Products" value={products.data.length} hint={`${products.data.length - demo} real · ${demo} demo`} href="/admin/products" />
          <StatCard label="Awaiting verification" value={unverified} hint={`${flagged} with validation flags`} href="/admin/verification" />
          <StatCard label="Providers & companies" value={providers.data.length} hint={`${providers.data.filter((p) => p.verification_status === "verified").length} verified`} href="/admin/providers" />
          <StatCard label="Solar systems" value={systems.data.length} hint={`${systems.data.filter((s) => s.is_demo).length} demo`} href="/admin/systems" />
          <StatCard label="Open maintenance cases" value={openCases} hint={`${cases.data.length} total`} href="/admin/maintenance" />
          <StatCard label="Open incidents" value={openIncidents} hint={`${incidents.data.length} total`} href="/admin/incidents" />
          <StatCard label="Integrations connected" value={`${connected} / ${integrations.length}`} hint="Booleans only. Keys are never shown" href="/admin/integrations" />
          <StatCard label="Data mode" value={mode === "demo" ? "Demo" : "Supabase"} hint={mode === "demo" ? "No database connected" : "RLS applies"} href="/admin/integrations" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Integration status" subtitle="From integrationStatus(): connected or not, never the values." action={<Link href="/admin/integrations" className="text-[13px] font-medium underline underline-offset-2">Details</Link>} />
            <CardBody>
              <ul className="divide-y divide-border">
                {integrations.map((i) => (
                  <li key={i.key} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                    <span className="flex items-center gap-2 text-fg">{i.connected ? <CheckCircle2 className="size-4 text-good-fg" aria-hidden /> : <XCircle className="size-4 text-fg-muted" aria-hidden />}{i.label}</span>
                    {i.connected ? <span className="text-good-fg">Connected</span> : <Placeholder k={i.placeholder as PlaceholderKey} />}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
