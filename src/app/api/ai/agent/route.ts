import { z } from "zod";
import { askClaude, buildContextBlock, isClaudeConfigured } from "@/lib/ai/claude";
import { buildUserContext } from "@/lib/ai/context";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import { requireUser } from "@/lib/api/auth";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/api/rateLimit";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) })).min(1).max(40),
  systemId: z.string().optional(),
});

/** Central AI Solar Agent endpoint. Retrieves real user data, then asks Claude. */
export async function POST(req: Request) {
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const limited = await checkRateLimit(rateLimitKey(req, gate.user.id === "demo" ? null : gate.user.id, "ai/agent"), LIMITS.ai);
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid_input", message: "Invalid request." }, { status: 400 });
  if (!isClaudeConfigured()) {
    return Response.json({ ok: false, reason: "not_configured", message: `The AI Solar Agent is not connected yet. ${PLACEHOLDERS.CLAUDE_API_KEY}` }, { status: 503 });
  }
  const { blocks, used } = await buildUserContext({ systemId: parsed.data.systemId, includeProducts: true });
  const context = buildContextBlock(blocks);
  const history = parsed.data.messages.slice(0, -1);
  const last = parsed.data.messages.at(-1)!;
  const r = await askClaude({
    system: `Here is everything Solink knows about this user. Answer only from it.\n${context}`,
    messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: last.content }],
    maxTokens: 2500,
    effort: "medium",
  });
  if (!r.ok) return Response.json(r, { status: r.reason === "not_configured" ? 503 : 502 });
  return Response.json({ ok: true, answer: r.data, contextUsed: used, model: r.model, cls: "ai" });
}
