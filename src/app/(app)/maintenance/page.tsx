import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { CareVisual } from "@/components/three/PageVisuals";
import { Button } from "@/components/ui/Button";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { getPassport, listAppointments, listIncidents, listMaintenance, listProduction, listProviders, listSystems } from "@/lib/data/repositories";
import { productionDeviation } from "@/lib/solar/calculations";
import { type Classified, unavailable } from "@/lib/classification";
import { ageYears, meanDaily, seriesClass } from "../_ops/production";
import { MaintenanceList } from "./_components/MaintenanceList";
import { PredictiveCard, type PredictiveSignals } from "./_components/PredictiveCard";

export const metadata: Metadata = { title: "Maintenance", description: "Maintenance cases, bookings and predictive signals for your solar system." };

export default async function MaintenancePage() {
  const [{ data: cases, mode }, { data: appointments }, { data: providers }, { data: systems }, { data: incidents }] = await Promise.all([
    listMaintenance(), listAppointments(), listProviders(), listSystems(), listIncidents(),
  ]);
  const nowIso = new Date().toISOString();
  const system = systems[0] ?? null;
  const [{ data: production }, { data: passport }] = system
    ? await Promise.all([listProduction(system.id, 60), getPassport(system.id)])
    : [{ data: [] }, { data: null }];

  const signals = buildSignals({ production, incidents, installationDate: system?.installation_date ?? null, productWarrantyYears: passport?.warranty.product_years ?? null });

  return (
    <div>
      <PageHero
        label="Maintenance"
        eyebrow="Operate"
        title="Maintenance"
        description="Every cleaning, inspection and repair on your system, from first signal to closed record. Nothing here is assumed."
        actions={<Button href="/maintenance/book"><CalendarPlus className="size-4" aria-hidden /> Book maintenance</Button>}
        visual={<CareVisual caption="An illustration of what a cleaning does: dust on the glass, a cleared swath. It is not a picture of your panels and measures nothing." />}
        focus="80% 40%"
      />
      {mode === "demo" && <DemoBanner className="mb-4" detail="Supabase is not connected. Demo cases are shown; anything you create is stored on this device only." />}

      {system ? (
        <MaintenanceList mode={mode} serverCases={cases} serverAppointments={appointments} providers={providers} systems={systems} nowIso={nowIso} />
      ) : (
        <EmptyState title="No installed system yet">Maintenance cases belong to an installed system. Once your system is recorded in the Solar Passport, cases and bookings appear here.</EmptyState>
      )}

      {/* Maintenance costs are no longer shown on these pages (owner, 2026-09-24). The data model is unchanged. */}
      <div className="mt-6">
        <PredictiveCard signals={signals} systemId={system?.id} />
      </div>
    </div>
  );
}

function buildSignals(i: {
  production: Awaited<ReturnType<typeof listProduction>>["data"]; incidents: Awaited<ReturnType<typeof listIncidents>>["data"];
  installationDate: string | null; productWarrantyYears: number | null;
}): PredictiveSignals {
  const cls = seriesClass(i.production);
  const last7 = meanDaily(i.production, 7);
  const prev30 = meanDaily(i.production, 30, 7);
  let trend: Classified = productionDeviation(last7.mean, prev30.mean);
  if (trend.value !== null && cls === "demo") trend = { ...trend, cls: "demo", source: "Simulated demo series" };
  if (trend.value === null) trend = unavailable(i.production.length === 0 ? "No production records. [PLACEHOLDER: SOLAR MONITORING HARDWARE/API]" : "Fewer than 3 daily records in one of the windows.");

  const since = new Date(); since.setMonth(since.getMonth() - 12);
  const recent = i.incidents.filter((x) => new Date(x.occurred_at) >= since);
  const repeated = recent.length;
  const incidentsCls = recent.some((x) => x.is_demo) ? "demo" : "calculated";

  const age = ageYears(i.installationDate);
  const ageC: Classified = age === null ? unavailable("Installation date is not recorded.") : { value: age, cls: "calculated", source: "From installation date", notes: ["(today − installation date) ÷ 365.25"] };
  const warrantyC: Classified = age === null || i.productWarrantyYears === null
    ? unavailable(age === null ? "Installation date is not recorded." : "Product warranty length is not in the passport.")
    : { value: i.productWarrantyYears - age, cls: "calculated", source: "Passport warranty − system age" };

  return {
    trend, trendWindow: { last7Days: last7.count, previous30Days: prev30.count },
    repeatedIncidents: { value: repeated, cls: incidentsCls },
    systemAgeYears: ageC, warrantyYearsRemaining: warrantyC, productionCls: cls,
  };
}
