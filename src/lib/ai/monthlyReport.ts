import "server-only";
import { askClaudeJson, buildContextBlock, isClaudeConfigured, type AgentContextBlock } from "./claude";
import { yieldPerSunlight, type MonthlyIrradiation } from "@/lib/weather/openmeteo";
import type { Incident, MaintenanceCase, MonthlyReport } from "@/lib/types";

/**
 * The reading half of the monthly report.
 *
 * Everything numeric is computed before Claude is asked anything; this module
 * turns those numbers into sentences a homeowner can act on, and refuses to let
 * the model reach further than the data does.
 *
 * The sentence "production fell because of dust" is the one this file exists to
 * prevent. A drop in output has three ordinary explanations — less sunlight, a
 * dirty or failing array, or maintenance downtime — and cloud cover cannot tell
 * them apart. Measured irradiation can: divide production by the sunlight that
 * fell and you get yield per unit of sunlight. Hold that steady and the sky did
 * it; watch it fall and the system did. So attribution is allowed only when
 * both months have measured sunlight, and forbidden outright when they do not.
 */

/** The first observation is the plain-language summary; the UI renders it as the lead. */
export interface MonthlyAnalysis {
  observations: string[];
  issues: string[];
  recommendations: string[];
  cls: "ai" | "unavailable";
}

export interface AnalysisInput {
  report: MonthlyReport;
  month: string;
  previousMonth: string;
  sun: MonthlyIrradiation | null;
  previousSun: MonthlyIrradiation | null;
  /** Previous month's total, only when it is comparable: same measurement basis. */
  previousTotalKwh: number | null;
  cases: MaintenanceCase[];
  incidents: Incident[];
  system: { capacity_kwp: number | null; panel_count: number | null; monitoring_source: string | null };
  /** Demo months are sample data. They get observations, never anything that costs money. */
  isDemo: boolean;
  locale: "en" | "ar";
}

const SCHEMA = `{
  "observations": string[],   // 2 to 4 sentences. The FIRST is a one-paragraph plain summary of the month for a homeowner with no technical background.
  "issues": string[],         // 0 to 3. Things that deserve attention. Empty array when there are none. Never invent one to fill the list.
  "recommendations": string[] // 0 to 3. Empty array when nothing is worth doing.
}`;

function describeSun(label: string, s: MonthlyIrradiation | null): string {
  if (!s) return `${label}: no measured sunlight available.`;
  const gap = s.coverage.complete
    ? "the whole month"
    : `${s.coverage.days_returned} of ${s.coverage.days_in_month} days (the archive lags a few days, so the end of the month may be missing)`;
  return [
    `${label}: ${s.total_kwh_m2} kWh/m² of sunlight fell, averaging ${s.mean_daily_kwh_m2} kWh/m² a day.`,
    `Mean cloud cover ${s.mean_cloud_pct}%. Mean temperature ${s.mean_temp_c}°C.`,
    `Covers ${gap}. Source: ${s.source} (ERA5 reanalysis for the area, not a sensor on this roof).`,
  ].join(" ");
}

function describeMaintenance(cases: MaintenanceCase[], incidents: Incident[]): string {
  if (cases.length === 0 && incidents.length === 0) return "No maintenance was carried out and no incidents were recorded this month.";
  const lines: string[] = [];
  for (const c of cases) {
    const when = c.appointment_at ?? c.updated_at;
    const cost = typeof c.cost.value === "number" ? `${c.cost.value} ${c.cost.unit ?? ""}`.trim() : "cost not recorded";
    lines.push(`- ${c.kind.replace(/_/g, " ")} on ${when.slice(0, 10)}: ${c.work_performed ?? "no write-up"} (${cost}).`);
  }
  for (const i of incidents) {
    lines.push(`- incident on ${i.occurred_at.slice(0, 10)}: ${i.reported_problem}. Status ${i.status}. ${i.action_taken ?? "No action recorded."}`);
  }
  return lines.join("\n");
}

/**
 * The rules that change with the data. Kept in one place so it is obvious what
 * the model is and is not allowed to claim in each case.
 */
function attributionRules(hasBothMonthsOfSun: boolean, isDemo: boolean): string {
  const sun = hasBothMonthsOfSun
    ? `Measured sunlight is available for BOTH months, so you may explain a change in production, but only through yield per unit of sunlight, which is given to you:
- Production moved and yield per sunlight held roughly steady (within about 5%): the sky explains it. Say so plainly.
- Yield per sunlight fell by more than about 5%: the system produced less from the same sunlight. Report that as a fact and say what could cause it (soiling, shading, a failing string, downtime during maintenance) as possibilities to check, never as a diagnosis. You cannot see the panels.
- Yield per sunlight rose: say so; cleaning or a repair is the usual reason, but only claim it if the maintenance history in the context supports it.`
    : `Measured sunlight is NOT available for both months. You therefore CANNOT explain why production changed. Do not attribute any change to dust, soiling, shading, cloud, heat, or a fault. Do not reason from cloud cover or temperature to a cause: they cannot tell a dusty month from a cloudy one.
When production is lower than the previous month, say exactly this and nothing more about the cause: "below its usual band, cause undetermined without sunlight data."`;

  const demo = isDemo
    ? `
This month is SAMPLE DATA. The homeowner has no monitoring hardware connected, so these figures describe nothing real.
- Every observation must be readable as a demonstration of what the report will say, not as a finding about their system.
- Recommendations MUST be empty, or contain only free actions the reader can take themselves. Never recommend booking a cleaning, a repair, an inspection, a technician visit, or any purchase. Nothing that costs money.
- Never tell them to act on a number that is not real.`
    : "";

  return `${sun}${demo}`;
}

export async function analyseMonth(input: AnalysisInput): Promise<MonthlyAnalysis> {
  if (!isClaudeConfigured()) {
    return { observations: [], issues: [], recommendations: [], cls: "unavailable" };
  }

  const total = input.report.energy.total_kwh;
  const thisYield = yieldPerSunlight(total, input.sun);
  const prevYield = yieldPerSunlight(input.previousTotalKwh, input.previousSun);
  const hasBoth = thisYield !== null && prevYield !== null;
  const yieldChange = hasBoth && prevYield > 0 ? Math.round(((thisYield - prevYield) / prevYield) * 1000) / 10 : null;

  const blocks: AgentContextBlock[] = [
    {
      title: "System",
      cls: input.isDemo ? "demo" : "source",
      content: [
        `Capacity: ${input.system.capacity_kwp ?? "unknown"} kWp across ${input.system.panel_count ?? "an unknown number of"} panels.`,
        input.system.monitoring_source
          ? `Monitoring source: ${input.system.monitoring_source}.`
          : "No monitoring hardware is connected. Production figures below are a sample series, not measurements.",
      ].join(" "),
    },
    {
      title: "Production",
      cls: input.report.energy.cls,
      content: [
        `Month ${input.month}: ${total ?? "unavailable"} kWh.`,
        input.previousTotalKwh !== null
          ? `Previous month ${input.previousMonth}: ${input.previousTotalKwh} kWh. Change ${input.report.energy.trend_pct ?? "not comparable"}%.`
          : `Previous month ${input.previousMonth}: not comparable, so do not state a month-over-month change.`,
        `Daily values: ${input.report.energy.breakdown.map((d) => `${d.day.slice(-2)}:${d.kwh}`).join(" ") || "none"}.`,
      ].join(" "),
    },
    { title: "Sunlight", cls: input.sun ? "source" : "unavailable", content: [describeSun(`This month (${input.month})`, input.sun), describeSun(`Previous month (${input.previousMonth})`, input.previousSun)].join("\n") },
    {
      title: "Yield per sunlight",
      cls: hasBoth ? "calculated" : "unavailable",
      content: hasBoth
        ? `This month ${thisYield} kWh per kWh/m². Previous month ${prevYield}. Change ${yieldChange}%. This is production divided by the sunlight that fell, so it is the figure that separates a darker month from a weaker system.`
        : "Not computable: one or both months lack measured sunlight, or the two months were not measured the same way.",
    },
    { title: "Maintenance", cls: input.isDemo ? "demo" : "source", content: describeMaintenance(input.cases, input.incidents) },
    {
      title: "Not available",
      cls: "unavailable",
      content: [
        input.system.monitoring_source ? null : "Real production measurements: no monitoring hardware is connected.",
        input.sun ? null : "Measured sunlight for this month.",
        input.sun && !input.sun.coverage.complete ? `Sunlight for the last ${input.sun.coverage.days_in_month - input.sun.coverage.days_returned} day(s) of the month.` : null,
        input.report.financial.estimated_savings === null ? "A money figure for the energy produced." : null,
      ].filter(Boolean).join("\n") || "Nothing material is missing.",
    },
  ];

  const system = `You are writing the monthly report for one homeowner's solar system in Kuwait.

${attributionRules(hasBoth, input.isDemo)}

How to write:
- Plain language for someone with no technical background. No jargon without a plain gloss.
- Short sentences. Give the number, then what it means.
- Never invent a figure. Every number you use must appear in the context.
- Do not repeat the same point across observations, issues and recommendations.
- Write in ${input.locale === "ar" ? "Arabic" : "English"}.`;

  const r = await askClaudeJson<{ observations?: unknown; issues?: unknown; recommendations?: unknown }>({
    system,
    prompt: `${buildContextBlock(blocks)}\n\nWrite this month's report.`,
    schemaDescription: SCHEMA,
    maxTokens: 2000,
  });

  if (!r.ok) return { observations: [], issues: [], recommendations: [], cls: "unavailable" };

  const strings = (v: unknown, cap: number): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, cap) : [];

  const recommendations = strings(r.data.recommendations, 3);

  return {
    observations: strings(r.data.observations, 4),
    issues: strings(r.data.issues, 3),
    // Belt and braces: the prompt forbids paid advice on sample data, and the
    // code refuses to carry it either. A model is not a permission system.
    recommendations: input.isDemo ? [] : recommendations,
    cls: "ai",
  };
}
