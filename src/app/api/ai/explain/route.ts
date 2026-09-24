import { z } from "zod";
import { askClaude, buildContextBlock, isClaudeConfigured } from "@/lib/ai/claude";
import { buildUserContext } from "@/lib/ai/context";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import { requireUser } from "@/lib/api/auth";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/api/rateLimit";

const Body = z.object({ subject: z.enum(["report", "alert", "term", "maintenance", "performance"]), payload: z.unknown(), systemId: z.string().optional() });

/** "Explain this" — reports, alerts, warnings, performance trends. */
export async function POST(req: Request) {
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const limited = await checkRateLimit(rateLimitKey(req, gate.user.id === "demo" ? null : gate.user.id, "ai/explain"), LIMITS.ai);
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid_input", message: "Invalid request." }, { status: 400 });
  if (!isClaudeConfigured()) return Response.json({ ok: false, reason: "not_configured", message: `AI explanations are not connected yet. ${PLACEHOLDERS.CLAUDE_API_KEY}` }, { status: 503 });
  const { blocks } = await buildUserContext({ systemId: parsed.data.systemId });
  const r = await askClaude({
    system: buildContextBlock(blocks),
    messages: [{ role: "user", content: `Explain this ${parsed.data.subject} for me in plain language, labeling observed vs calculated vs estimated vs interpretation:\n${JSON.stringify(parsed.data.payload)}` }],
    maxTokens: 1500,
  });
  if (!r.ok) return Response.json(r, { status: 502 });
  return Response.json({ ok: true, answer: r.data, cls: "ai" });
}
