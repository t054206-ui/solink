import { z } from "zod";
import { askClaudeJson, isClaudeConfigured } from "@/lib/ai/claude";
import { buildUserContext } from "@/lib/ai/context";
import { buildContextBlock } from "@/lib/ai/claude";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import { requireUser } from "@/lib/api/auth";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/api/rateLimit";

const Body = z.object({ systemId: z.string(), weather: z.unknown().optional() });

export interface MonitorAssessment {
  status: "normal" | "monitor" | "inspection_recommended" | "maintenance_recommended" | "insufficient_data";
  headline: string;
  reasoning: string[];
  evidence: string[];
  missing_data: string[];
  cleaning: { recommendation: "not_indicated" | "may_be_recommended" | "insufficient_data"; rationale: string };
}

/** AI Energy Monitoring Agent: interprets actual production/weather/maintenance data. */
export async function POST(req: Request) {
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const limited = checkRateLimit(rateLimitKey(req, gate.user.id === "demo" ? null : gate.user.id, "ai/monitor"), LIMITS.ai);
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid_input", message: "Invalid request." }, { status: 400 });
  if (!isClaudeConfigured()) return Response.json({ ok: false, reason: "not_configured", message: `AI monitoring is not connected yet. ${PLACEHOLDERS.CLAUDE_API_KEY}` }, { status: 503 });
  const { blocks } = await buildUserContext({ systemId: parsed.data.systemId });
  if (parsed.data.weather) blocks.push({ title: "weather", cls: "source", content: JSON.stringify(parsed.data.weather) });
  const r = await askClaudeJson<MonitorAssessment>({
    system: `Assess the system's status from the context only. Thresholds are undefined (${PLACEHOLDERS.PRODUCTION_ALERT_THRESHOLDS}); therefore prefer "monitor" or "insufficient_data" over stronger statuses unless evidence is clear. PM2.5/PM10 are environmental indicators, not panel soiling measurements.\n${buildContextBlock(blocks)}`,
    prompt: "Assess the current status of this solar system and whether cleaning may be recommended.",
    schemaDescription: `{"status":"normal|monitor|inspection_recommended|maintenance_recommended|insufficient_data","headline":string,"reasoning":string[],"evidence":string[],"missing_data":string[],"cleaning":{"recommendation":"not_indicated|may_be_recommended|insufficient_data","rationale":string}}`,
  });
  if (!r.ok) return Response.json(r, { status: 502 });
  return Response.json({ ok: true, assessment: r.data, cls: "ai" });
}
