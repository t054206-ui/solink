import { askClaudeJson, isClaudeConfigured } from "@/lib/ai/claude";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import { requireUser } from "@/lib/api/auth";

export interface InspectionResult {
  image_quality: { rating: "good" | "fair" | "poor"; notes: string };
  findings: { observation: string; possible_cause: string; confidence: "low" | "medium" | "high" }[];
  uncertainty: string;
  recommended_next_step: string;
  disclaimer: string;
}

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * AI visual screening of a solar-panel photo. Returns findings with uncertainty.
 * This is NOT an engineering diagnosis and the prompt forbids certainty claims.
 */
export async function POST(req: Request) {
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  if (!isClaudeConfigured()) return Response.json({ ok: false, reason: "not_configured", message: `Image inspection is not connected yet. ${PLACEHOLDERS.CLAUDE_API_KEY}` }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  const note = String(form?.get("note") ?? "");
  if (!(file instanceof File)) return Response.json({ ok: false, reason: "invalid_input", message: "Please attach an image." }, { status: 400 });
  if (!ALLOWED.has(file.type)) return Response.json({ ok: false, reason: "invalid_input", message: "Use a JPEG, PNG, WEBP or GIF image." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ ok: false, reason: "invalid_input", message: "Image is larger than 6 MB." }, { status: 400 });
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const r = await askClaudeJson<InspectionResult>({
    system: "You are performing a VISUAL SCREENING of a solar panel photograph for a homeowner. You cannot measure anything. Describe only what is visible; give confidence honestly; never state that a component is damaged with certainty; always recommend a qualified inspection for anything concerning.",
    prompt: `Inspect this solar panel image for visible dust/soiling, cracks, discoloration, hot-spot-like marks, delamination, unusual appearance, or visible damage. Assess image quality first. ${note ? `Homeowner note: ${note}` : ""}`,
    images: [{ media_type: file.type as "image/jpeg", data }],
    schemaDescription: `{"image_quality":{"rating":"good|fair|poor","notes":string},"findings":[{"observation":string,"possible_cause":string,"confidence":"low|medium|high"}],"uncertainty":string,"recommended_next_step":string,"disclaimer":"This is a visual screening from a photograph, not a professional engineering diagnosis."}`,
  });
  if (!r.ok) return Response.json(r, { status: 502 });
  return Response.json({ ok: true, result: r.data, model: r.model, cls: "ai" });
}
