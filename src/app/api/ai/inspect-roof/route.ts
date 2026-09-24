import { askClaudeJson, isClaudeConfigured } from "@/lib/ai/claude";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import type { HouseType, RoofOrientation } from "@/lib/types";
import { requireUser } from "@/lib/api/auth";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/api/rateLimit";
import { sniffFileType } from "@/lib/files/sniffFileType";

export type Confidence = "low" | "medium" | "high";

interface Suggestion<T> {
  value: T;
  confidence: Confidence;
  why: string;
}

export interface RoofScanResult {
  image_quality: { rating: "good" | "fair" | "poor"; notes: string };
  suggestions: {
    house_type?: Suggestion<HouseType> | null;
    roof_orientation?: Suggestion<RoofOrientation> | null;
    roof_tilt_deg?: Suggestion<number> | null;
    obstructed_fraction?: Suggestion<number> | null;
  };
  obstructions: { item: string; note: string }[];
  shading: { source: string; note: string }[];
  shading_notes: string;
  cannot_determine: string[];
  disclaimer: string;
}

const MAX_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL = 20 * 1024 * 1024;
const MAX_FRAMES = 6;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Visual screening of a homeowner's roof, so they can photograph it instead of
 * typing every field. Accepts stills, or frames a browser pulled out of a video.
 *
 * The hard rule, stated three times because it is the whole risk of this
 * feature: a photograph has no scale, so it CANNOT measure. No area, no
 * dimensions, no true compass bearing. Asked for a roof size, a vision model
 * will produce a confident number and it will be wrong, which is exactly the
 * failure this product exists to avoid. Area keeps coming from the homeowner or
 * from the Solar API; this endpoint describes what is on the roof and how much
 * of it is occupied, and returns everything it could not determine as an
 * explicit list rather than as silence.
 *
 * Nothing is stored. Frames go to Claude and are discarded, which is also why
 * this works before Supabase exists.
 */
export async function POST(req: Request) {
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const limited = await checkRateLimit(rateLimitKey(req, gate.user.id === "demo" ? null : gate.user.id, "ai/inspect-roof"), LIMITS.ai);
  if (limited) return limited;
  if (!isClaudeConfigured()) {
    return Response.json(
      { ok: false, reason: "not_configured", message: `Roof analysis is not connected yet. ${PLACEHOLDERS.CLAUDE_API_KEY}` },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ ok: false, reason: "invalid_input", message: "Could not read the upload." }, { status: 400 });

  const files = form.getAll("frames").filter((f): f is File => f instanceof File);
  const note = String(form.get("note") ?? "");
  const knownAreaRaw = String(form.get("roof_area_m2") ?? "");
  const knownArea = knownAreaRaw.trim() === "" ? null : Number(knownAreaRaw);

  if (files.length === 0) return Response.json({ ok: false, reason: "invalid_input", message: "Attach at least one photo." }, { status: 400 });
  if (files.length > MAX_FRAMES) return Response.json({ ok: false, reason: "invalid_input", message: `Send at most ${MAX_FRAMES} images.` }, { status: 400 });

  let total = 0;
  const sniffed: string[] = [];
  for (const f of files) {
    if (!ALLOWED.has(f.type)) return Response.json({ ok: false, reason: "invalid_input", message: "Use JPEG, PNG or WEBP images." }, { status: 400 });
    if (f.size > MAX_BYTES) return Response.json({ ok: false, reason: "invalid_input", message: "Each image must be under 6 MB." }, { status: 400 });
    const type = await sniffFileType(f);
    if (!type || !ALLOWED.has(type)) return Response.json({ ok: false, reason: "invalid_input", message: "One of those files' contents doesn't match a JPEG, PNG or WEBP image." }, { status: 400 });
    sniffed.push(type);
    total += f.size;
  }
  if (total > MAX_TOTAL) return Response.json({ ok: false, reason: "invalid_input", message: "Those images are too large in total." }, { status: 400 });

  const images = await Promise.all(
    files.map(async (f, i) => ({
      media_type: sniffed[i] as "image/jpeg" | "image/png" | "image/webp",
      data: Buffer.from(await f.arrayBuffer()).toString("base64"),
    })),
  );

  const areaLine =
    knownArea && Number.isFinite(knownArea)
      ? `The homeowner says the total roof area is ${knownArea} m². You may estimate what FRACTION of it looks occupied, but never restate or revise the area itself.`
      : `No roof area has been given. Do not estimate one. List it under cannot_determine.`;

  const r = await askClaudeJson<RoofScanResult>({
    system: [
      "You are screening photographs of a homeowner's roof in Kuwait to help them fill in a solar profile.",
      "YOU CANNOT MEASURE ANYTHING. A photograph has no scale reference. Never state or estimate roof area, length, width, or a precise compass bearing. If asked for a size, refuse and add it to cannot_determine.",
      "Describe only what is visible. Give confidence honestly and prefer 'low' when unsure.",
      "Flat roofs with parapet walls, rooftop water tanks and split-AC condenser units are normal in Kuwait; note them as obstructions rather than as faults.",
      "Every suggestion you return will be shown to the homeowner for confirmation before it is used. Suggest, never assert.",
    ].join(" "),
    prompt: [
      `Look at ${files.length === 1 ? "this photograph" : `these ${files.length} views`} of a roof.`,
      areaLine,
      "Identify: the building type; whether the roof is flat or pitched (and an approximate pitch in degrees only if clearly pitched, else 0 for flat);",
      "anything occupying roof space (water tanks, AC units, satellite dishes, stairwell housings, pipework, stored items);",
      "anything that could cast shade (taller neighbouring buildings, palm trees, masts, parapets).",
      "Only suggest roof_orientation if a genuinely reliable cue is visible, otherwise omit it.",
      "Write shading_notes as one short paragraph the homeowner could paste straight into a form field.",
      "List everything you could not determine from the images, and always include roof area and exact dimensions in that list.",
      note ? `Homeowner note: ${note}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    images,
    schemaDescription: `{"image_quality":{"rating":"good|fair|poor","notes":string},"suggestions":{"house_type":{"value":"villa|townhouse|apartment_building|commercial|other","confidence":"low|medium|high","why":string}|null,"roof_orientation":{"value":"unknown|flat|N|NE|E|SE|S|SW|W|NW","confidence":"low|medium|high","why":string}|null,"roof_tilt_deg":{"value":number,"confidence":"low|medium|high","why":string}|null,"obstructed_fraction":{"value":number,"confidence":"low|medium|high","why":string}|null},"obstructions":[{"item":string,"note":string}],"shading":[{"source":string,"note":string}],"shading_notes":string,"cannot_determine":[string],"disclaimer":"This is a visual reading of photographs, not a survey. Nothing here is measured."}`,
  });

  if (!r.ok) return Response.json(r, { status: 502 });
  return Response.json({ ok: true, result: r.data, model: r.model, cls: "ai" });
}
