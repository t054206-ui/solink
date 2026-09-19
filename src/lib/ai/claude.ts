import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/config/env";
import { PLACEHOLDERS } from "@/lib/config/placeholders";

/**
 * Central Claude client for Solink. SERVER ONLY.
 * All AI features (Solar Agent, image inspection, recommendations, monitoring
 * interpretation, report explanations) go through this module so reliability
 * rules are enforced in one place.
 */

export type AiResult<T = string> =
  | { ok: true; data: T; model: string; usage?: { input: number; output: number } }
  | { ok: false; reason: "not_configured" | "refused" | "error" | "rate_limited"; message: string };

let client: Anthropic | null = null;

export function isClaudeConfigured(): boolean {
  return Boolean(serverEnv().claudeApiKey);
}

function getClient(): Anthropic | null {
  const key = serverEnv().claudeApiKey;
  if (!key) return null;
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

/**
 * Non-negotiable behaviour for every Solink AI call. Kept stable (cache-friendly).
 */
export const SOLINK_AI_RULES = `You are the Solink AI Solar Agent, the single AI assistant inside Solink, a solar-energy platform for homeowners in Kuwait and the GCC.

Reliability rules (never break these):
1. Use ONLY the data provided in the <context> block. Never invent measurements, product specifications, prices, weather, production figures, maintenance history, tariffs, statistics, or customer information.
2. If the context does not contain what is needed, say exactly: "I don't have enough information to determine that." and state what data would be required.
3. Label every statement by type: OBSERVED (from source data in context), CALCULATED (arithmetic on observed values. Show the arithmetic), ESTIMATE (assumption-based; name the assumption), or AI INTERPRETATION (your reasoning).
4. Items marked DEMO in the context are not real. Say so if the user asks about them.
5. Never claim a component is definitely damaged from an image alone; never claim equipment will definitely fail; never claim panels "definitely need cleaning". Use "may", "appears", "is consistent with", and recommend inspection or additional data.
6. Correlation is not causation: environmental indicators (PM2.5, PM10) are not measurements of dust on panels.
7. Do not present a single option as objectively "best". Explain trade-offs for different needs.
8. Write for a homeowner without technical background; keep technical detail available but brief. Use short paragraphs. Answer in the user's language (English or Arabic).`;

export interface AgentContextBlock { title: string; cls: string; content: string }

export function buildContextBlock(blocks: AgentContextBlock[]): string {
  if (blocks.length === 0) return "<context>\n(no user data available)\n</context>";
  return `<context>\n${blocks.map((b) => `<${slug(b.title)} classification="${b.cls}">\n${b.content}\n</${slug(b.title)}>`).join("\n")}\n</context>`;
}
function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_"); }

export async function askClaude(opts: {
  system?: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<AiResult<string>> {
  const c = getClient();
  if (!c) return { ok: false, reason: "not_configured", message: `Claude API is not connected. ${PLACEHOLDERS.CLAUDE_API_KEY}` };
  const model = serverEnv().claudeModel;
  try {
    const res = await c.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 4000,
      system: [
        { type: "text", text: SOLINK_AI_RULES, cache_control: { type: "ephemeral" } },
        ...(opts.system ? [{ type: "text" as const, text: opts.system }] : []),
      ],
      thinking: { type: "adaptive" },
      output_config: { effort: opts.effort ?? "medium" },
      messages: opts.messages,
    });
    if (res.stop_reason === "refusal") {
      return { ok: false, reason: "refused", message: "The AI declined to answer this request." };
    }
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return { ok: true, data: text, model: res.model, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, reason: "rate_limited", message: "The AI service is busy. Please try again shortly." };
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, reason: "not_configured", message: "The Claude API key is invalid." };
    const message = err instanceof Anthropic.APIError ? `AI service error (${err.status}).` : "AI service is unavailable.";
    return { ok: false, reason: "error", message };
  }
}

/** Ask Claude for strict JSON matching a described schema. Returns parsed object or error. */
export async function askClaudeJson<T>(opts: {
  system?: string;
  prompt: string;
  images?: { media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string }[];
  schemaDescription: string;
  maxTokens?: number;
}): Promise<AiResult<T>> {
  const content: Anthropic.ContentBlockParam[] = [
    ...(opts.images ?? []).map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.media_type, data: img.data } })),
    { type: "text", text: `${opts.prompt}\n\nRespond with ONLY a JSON object (no markdown fences) matching this schema:\n${opts.schemaDescription}` },
  ];
  const r = await askClaude({ system: opts.system, messages: [{ role: "user", content }], maxTokens: opts.maxTokens ?? 3000, effort: "medium" });
  if (!r.ok) return r;
  try {
    const cleaned = r.data.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    return { ok: true, data: JSON.parse(cleaned) as T, model: r.model, usage: r.usage };
  } catch {
    return { ok: false, reason: "error", message: "The AI returned an unreadable response." };
  }
}
