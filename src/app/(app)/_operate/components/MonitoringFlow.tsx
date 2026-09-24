import type { SolarPassport, SolarSystem } from "@/lib/types";
import { EnergyFlow, ChartFrame } from "@/components/illustrations/Illustrations";

/**
 * How a reading reaches Solink, drawn from the system's own record:
 * Panels → Inverter → Monitoring → Solink. Each step is solid only when the
 * record has it. No reading is drawn; the chart frame stays empty until
 * production records exist (owner, 2026-09-24).
 */
export function MonitoringFlow({ system, passport, withChart = true }: { system: SolarSystem; passport: SolarPassport | null; withChart?: boolean }) {
  const panelCount = passport?.panel_count ?? system.panel_count;
  const capacity = passport?.capacity_kwp ?? system.capacity_kwp;
  const panelModel = passport?.panel_snapshot ? `${passport.panel_snapshot.manufacturer} ${passport.panel_snapshot.model}` : null;
  const inverter = passport?.inverter_snapshot ? `${passport.inverter_snapshot.manufacturer} ${passport.inverter_snapshot.model}` : null;
  const hasInverter = Boolean(inverter || system.inverter_product_id);
  const panelsDetail = [panelCount ? `${panelCount} panels` : null, capacity ? `${capacity.toLocaleString("en-US", { maximumFractionDigits: 1 })} kWp` : null].filter(Boolean).join(" · ");
  return (
    <div className="space-y-5">
      <EnergyFlow
        label="How your system's readings reach Solink"
        steps={[
          { glyph: "panel", label: "Panels", detail: panelsDetail || panelModel || "From your Solar Passport", ready: Boolean(panelCount || capacity) },
          { glyph: "inverter", label: "Inverter", detail: inverter ?? (hasInverter ? "On record" : "Added at installation"), ready: hasInverter },
          { glyph: "monitor", label: "Monitoring", detail: system.monitoring_source ?? "Your inverter's data link", ready: Boolean(system.monitoring_source) },
          { glyph: "solink", label: "Solink", detail: "Charts, signals and reports", ready: true },
        ]}
      />
      {withChart && (
        <ChartFrame caption={system.monitoring_source ? "Daily production draws here as readings arrive." : "Daily production draws here once your inverter reports to Solink."} />
      )}
    </div>
  );
}
