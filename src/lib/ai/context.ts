import "server-only";
import type { AgentContextBlock } from "./claude";
import * as repo from "@/lib/data/repositories";
import { getDataMode } from "@/lib/data/mode";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import { specText } from "@/lib/utils";

/**
 * Retrieves the user's ACTUAL data for the AI Solar Agent. The agent only sees
 * what this function returns; it is never allowed to invent the rest.
 * In demo mode everything is tagged DEMO so the model states it plainly.
 */
export async function buildUserContext(opts: { systemId?: string; includeProducts?: boolean } = {}): Promise<{ blocks: AgentContextBlock[]; used: string[] }> {
  const mode = getDataMode();
  const blocks: AgentContextBlock[] = [];
  const used: string[] = [];
  const tag = mode === "demo" ? "DEMO: NOT REAL" : "source";

  blocks.push({ title: "platform status", cls: "source", content: [
    `Data mode: ${mode}${mode === "demo" ? " (Supabase not connected; all user data below is labeled demo)" : ""}.`,
    `Live monitoring hardware: not connected (${PLACEHOLDERS.SOLAR_MONITORING_HARDWARE_API}).`,
    `Panel-level monitoring: not connected (${PLACEHOLDERS.PANEL_LEVEL_MONITORING_DATA_SOURCE}).`,
    `Electricity tariff: not provided (${PLACEHOLDERS.ELECTRICITY_TARIFF}).`,
    `Alert thresholds: not defined (${PLACEHOLDERS.PRODUCTION_ALERT_THRESHOLDS}).`,
    `Degradation rate: not provided (${PLACEHOLDERS.EXPECTED_PANEL_DEGRADATION_RATE}).`,
  ].join("\n") });

  const { data: profile } = await repo.getProfile();
  if (profile) {
    used.push("Solar profile");
    blocks.push({ title: "solar profile", cls: mode === "demo" ? "demo" : "user", content: JSON.stringify({
      house_type: profile.house_type, roof_area_m2: profile.roof_area_m2, available_roof_area_m2: profile.available_roof_area_m2,
      roof_orientation: profile.roof_orientation, roof_tilt_deg: profile.roof_tilt_deg, monthly_consumption_kwh: profile.monthly_consumption_kwh,
      monthly_bill: profile.monthly_bill, currency: profile.currency, budget: profile.budget, has_location: profile.lat != null,
    }) });
  }

  const { data: systems } = await repo.listSystems();
  const system = opts.systemId ? systems.find((s) => s.id === opts.systemId) : systems[0];
  if (system) {
    used.push(`System: ${system.name}`);
    blocks.push({ title: "solar system", cls: system.is_demo ? "demo" : "source", content: JSON.stringify({
      name: system.name, status: system.status, capacity_kwp: system.capacity_kwp, panel_count: system.panel_count,
      installation_date: system.installation_date, monitoring_source: system.monitoring_source ?? "none",
    }) });

    const { data: passport } = await repo.getPassport(system.id);
    if (passport) {
      used.push("Solar Passport");
      blocks.push({ title: "solar passport", cls: passport.is_demo ? "demo" : "source", content: JSON.stringify({
        passport_number: passport.passport_number, installer: passport.installation_company, installation_date: passport.installation_date,
        panel: passport.panel_snapshot ? { manufacturer: passport.panel_snapshot.manufacturer, model: passport.panel_snapshot.model,
          rated_power: specText(passport.panel_snapshot.specs.rated_power_w as never), efficiency: specText(passport.panel_snapshot.specs.module_efficiency_pct as never),
          temp_coeff: specText(passport.panel_snapshot.specs.temperature_coefficient_pmax_pct_per_c as never) } : null,
        inverter: passport.inverter_snapshot ? { manufacturer: passport.inverter_snapshot.manufacturer, model: passport.inverter_snapshot.model } : null,
        warranty: passport.warranty,
      }) });
    }

    const { data: prod } = await repo.listProduction(system.id, 60);
    if (prod.length) {
      used.push("Production (last 60 days)");
      const last7 = prod.slice(-7), prev30 = prod.slice(-37, -7);
      const mean = (a: typeof prod) => a.reduce((s, r) => s + r.energy_kwh, 0) / (a.length || 1);
      blocks.push({ title: "production", cls: prod[0].cls === "demo" ? "demo" : "source", content: [
        `Granularity: daily kWh. Source: ${prod[0].source}${prod[0].cls === "demo" ? " (SIMULATED PRODUCTION — NOT REAL)" : ""}.`,
        `Last 7 days: ${last7.map((r) => `${r.period_start.slice(0, 10)}=${r.energy_kwh}`).join(", ")}`,
        `7-day mean: ${mean(last7).toFixed(1)} kWh/day; previous 30-day mean: ${mean(prev30).toFixed(1)} kWh/day.`,
        `Expected production: unavailable (no site solar resource or hardware baseline).`,
      ].join("\n") });
    } else {
      blocks.push({ title: "production", cls: "unavailable", content: `No production data. ${PLACEHOLDERS.SOLAR_MONITORING_HARDWARE_API}` });
    }

    const { data: maint } = await repo.listMaintenance(system.id);
    used.push("Maintenance history");
    blocks.push({ title: "maintenance history", cls: tag, content: maint.length ? maint.map((m) => `${m.created_at.slice(0, 10)} ${m.kind} [${m.status}/${m.urgency}]. ${m.detected_issue}${m.work_performed ? ` | work: ${m.work_performed}` : ""}${m.production_before_kwh != null && m.production_after_kwh != null ? ` | production before ${m.production_before_kwh} → after ${m.production_after_kwh} kWh/day` : ""} | cost: ${specText(m.cost)}`).join("\n") : "No maintenance records." });

    const { data: incidents } = await repo.listIncidents(system.id);
    blocks.push({ title: "incidents", cls: tag, content: incidents.length ? incidents.map((i) => `${i.occurred_at.slice(0, 10)} [${i.status}] ${i.reported_problem}${i.result ? ` → ${i.result}` : ""}`).join("\n") : "No incidents." });

    const { data: alerts } = await repo.listAlerts(system.id);
    blocks.push({ title: "alerts", cls: tag, content: alerts.length ? alerts.map((a) => `${a.created_at.slice(0, 10)} [${a.status}] ${a.title}: ${a.message}`).join("\n") : "No alerts." });

    const { data: reports } = await repo.listReports(system.id);
    blocks.push({ title: "monthly reports", cls: tag, content: reports.length ? reports.map((r) => `${r.month}: total ${r.energy.total_kwh ?? "n/a"} kWh, trend ${r.energy.trend_pct ?? "n/a"}%, savings ${r.financial.estimated_savings ?? "unavailable (" + r.financial.notes.join("; ") + ")"}, incidents ${r.maintenance.incidents}, cleanings ${r.maintenance.cleanings}`).join("\n") : "No reports." });
  } else {
    blocks.push({ title: "solar system", cls: "unavailable", content: "The user has no solar system yet." });
  }

  if (opts.includeProducts) {
    const [{ data: products }, { data: manufacturers }] = await Promise.all([repo.listProducts({ category: "solar_panel" }), repo.listManufacturers({ includeArchived: true, includeDemo: true })]);
    used.push("Marketplace panels");
    blocks.push({ title: "marketplace panels", cls: products.some((p) => p.is_demo) ? "demo" : "source", content: products.map((p) => `${p.id} | manufacturer: ${p.manufacturer_name}${p.manufacturer_id ? ` (manufacturer_id ${p.manufacturer_id})` : " (no manufacturer record linked)"} | model ${p.model}${p.is_demo ? " (DEMO PRODUCT — NOT REAL)" : ""} | power ${specText(p.specs.rated_power_w as never)} | eff ${specText(p.specs.module_efficiency_pct as never)} | size ${specText(p.specs.length_mm as never)} × ${specText(p.specs.width_mm as never)} | temp coeff ${specText(p.specs.temperature_coefficient_pmax_pct_per_c as never)} | product warranty ${specText(p.specs.product_warranty_years as never)} | perf warranty ${specText(p.specs.performance_warranty_years as never)} | price ${specText(p.price)} | install ${specText(p.installation_cost)} | maintenance ${specText(p.annual_maintenance_cost)} | verification ${p.source.verification_status}`).join("\n") });

    // The companies behind those panels, from the manufacturers table. Only
    // what the record holds; a missing field says "not provided" so the model
    // reports it as unavailable instead of filling it from memory. The block
    // is context for trade-offs, not a ranking: verification and availability
    // describe what Solink has checked, not how good a manufacturer is.
    const used_ids = new Set(products.map((p) => p.manufacturer_id).filter(Boolean));
    const relevant = manufacturers.filter((m) => used_ids.has(m.id));
    used.push("Manufacturer records");
    const np = (v: string | null | undefined) => (v && v.trim() ? v : "not provided");
    const avail = (v: boolean | null) => (v === null ? "not yet verified by Solink" : v ? "verified available" : "verified not available");
    blocks.push({ title: "manufacturers", cls: relevant.some((m) => m.is_demo) ? "demo" : "source", content: relevant.length === 0 ? "No manufacturer records are linked to the panels above; manufacturer information is unavailable." : [
      "Rules: use only these fields. If a field reads 'not provided' or 'not yet verified', say that the information is unavailable rather than guessing. Do not treat one manufacturer as better than another because of its size, reputation or country; verification and availability below are Solink's checks of the record, not quality judgements. Never state revenue, capacity, market share, certifications or partnerships: none are recorded.",
      ...relevant.map((m) => `manufacturer_id ${m.id} | name ${m.name}${m.is_demo ? " (DEMO — NOT REAL)" : ""} | legal name ${np(m.legal_name)} | type ${np(m.manufacturer_type)} | headquarters ${np([m.headquarters_city, m.headquarters_country].filter(Boolean).join(", "))} | website ${np(m.website)} | Solink verification of the company record: ${m.verification_status} | Kuwait availability: ${avail(m.kuwait_available)} | GCC availability: ${avail(m.gcc_available)}${m.availability_note ? ` (note: ${m.availability_note})` : ""}${m.is_archived ? " | ARCHIVED manufacturer" : ""}`),
    ].join("\n") });
  }

  return { blocks, used };
}
