/**
 * Builds a MonthlyReport from the records Solink actually has.
 * - Energy and Maintenance sections are computed from production, maintenance and incident records
 *   (classification follows the input: demo series → demo).
 * - Financial and Environmental sections need a tariff / emission factor: when the platform settings
 *   do not provide them the values stay null with the matching placeholder as the reason.
 * - The AI section is always "unavailable" here; it is filled only by a real Claude call.
 */
import type { Incident, MaintenanceCase, MonthlyReport, ProductionRecord } from "@/lib/types";
import type { SolarAssumptions } from "@/lib/solar/calculations";
import { annualSavings, co2AvoidedKg } from "@/lib/solar/calculations";
import { dailyBreakdown, previousMonth, recordsForMonth, seriesClass, sumKwh, toMonth } from "../../_ops/production";

export interface BuildReportInput {
  id: string; systemId: string; month: string;
  production: ProductionRecord[]; cases: MaintenanceCase[]; incidents: Incident[];
  assumptions: SolarAssumptions; currency?: string;
}

export function caseMonth(c: MaintenanceCase): string { return toMonth(c.appointment_at ?? c.updated_at); }

export function buildMonthlyReport(i: BuildReportInput): MonthlyReport {
  const monthRecords = recordsForMonth(i.production, i.month);
  const prevRecords = recordsForMonth(i.production, previousMonth(i.month));
  const cls = seriesClass(monthRecords);
  const total = monthRecords.length ? sumKwh(monthRecords) : null;
  const prevTotal = prevRecords.length >= 25 ? sumKwh(prevRecords) : null; // need most of the previous month to compare
  const trend = total !== null && prevTotal !== null && prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : null;

  const monthCases = i.cases.filter((c) => c.system_id === i.systemId && caseMonth(c) === i.month && (c.status === "resolved" || c.status === "closed") && c.work_performed);
  const monthIncidents = i.incidents.filter((x) => x.system_id === i.systemId && toMonth(x.occurred_at) === i.month);
  const costs = monthCases.map((c) => c.cost);
  const knownCosts = costs.filter((c): c is { value: number; unit?: string } => typeof c.value === "number");
  const maintenanceCosts = costs.length > 0 && knownCosts.length === costs.length ? knownCosts.reduce((s, c) => s + c.value, 0) : null;

  const savings = annualSavings(total, i.assumptions); // production × tariff; the function name says annual, the formula is per kWh
  const co2 = co2AvoidedKg(total, i.assumptions);
  const financialNotes: string[] = [];
  if (savings.value === null) financialNotes.push(savings.reason ?? "Needs an electricity rate."); else financialNotes.push(...(savings.notes ?? []), "Monthly total × tariff.");
  if (maintenanceCosts === null) financialNotes.push(costs.length === 0 ? "No completed maintenance this month." : "No cost was entered for this month's work.");

  return {
    id: i.id, system_id: i.systemId, month: i.month,
    energy: { total_kwh: total, breakdown: dailyBreakdown(i.production, i.month), trend_pct: trend, cls: total === null ? "unavailable" : cls },
    financial: { estimated_savings: savings.value, maintenance_costs: maintenanceCosts, currency: i.currency ?? i.assumptions.currency ?? "KWD", cls: savings.value === null && maintenanceCosts === null ? "unavailable" : "estimated", notes: financialNotes },
    maintenance: {
      incidents: monthIncidents.length,
      cleanings: monthCases.filter((c) => c.kind === "cleaning").length,
      repairs: monthCases.filter((c) => c.kind === "repair" || c.kind === "minor_maintenance").length,
      replacements: monthCases.filter((c) => c.kind === "replacement").length,
    },
    environmental: { co2_kg: co2.value, cls: co2.value === null ? "unavailable" : "estimated", notes: co2.value === null ? [co2.reason ?? "Needs the grid emission factor."] : (co2.notes ?? []) },
    ai: { observations: [], issues: [], recommendations: [], cls: "unavailable" },
    generated_at: new Date().toISOString(),
    is_demo: cls === "demo",
  };
}
