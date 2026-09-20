import { z } from "zod";
import { askClaude, buildContextBlock, isClaudeConfigured } from "@/lib/ai/claude";
import { buildUserContext } from "@/lib/ai/context";
import { PLACEHOLDERS } from "@/lib/config/placeholders";

const Body = z.object({
  budget: z.number().nullable().optional(),
  roofAreaM2: z.number().nullable().optional(),
  monthlyKwh: z.number().nullable().optional(),
  desiredKwp: z.number().nullable().optional(),
  priorities: z.array(z.string()).max(6).optional(),
  notes: z.string().max(1000).optional(),
});

/** AI recommendation: explains trade-offs between the ACTUAL products in the catalog. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid_input", message: "Invalid request." }, { status: 400 });
  if (!isClaudeConfigured()) return Response.json({ ok: false, reason: "not_configured", message: `AI recommendations are not connected yet. ${PLACEHOLDERS.CLAUDE_API_KEY}` }, { status: 503 });
  const { blocks, used } = await buildUserContext({ includeProducts: true });
  const r = await askClaude({
    system: `Compare ONLY the panels listed in the context. Do not rank one as objectively best. For each realistic option explain who it suits and the trade-offs (power vs roof area, efficiency, temperature coefficient in a hot climate, warranty, missing data, unverified status). State clearly which fields are unavailable and that prices/costs are placeholders when they are. Finish with the data that would be needed to make a firmer recommendation.\n${buildContextBlock(blocks)}`,
    messages: [{ role: "user", content: `My inputs: ${JSON.stringify(parsed.data)}. Which panels could suit my situation and why?` }],
    maxTokens: 2500,
  });
  if (!r.ok) return Response.json(r, { status: 502 });
  // The model id travels back so the run recorded in `recommendations` names
  // what actually answered, rather than guessing from configuration.
  return Response.json({ ok: true, answer: r.data, contextUsed: used, model: r.model, cls: "ai" });
}
