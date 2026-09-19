import { z } from "zod";
import { askClaudeJson, isClaudeConfigured } from "@/lib/ai/claude";
import { PLACEHOLDERS } from "@/lib/config/placeholders";

const Body = z.object({
  roof: z.object({ length_m: z.number().positive(), width_m: z.number().positive(), orientation: z.string().optional(), tilt_deg: z.number().optional(),
    obstacles: z.array(z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number(), label: z.string().optional() })).max(30).default([]) }),
  panel: z.object({ length_m: z.number().positive(), width_m: z.number().positive(), rated_power_w: z.number().positive().nullable(), name: z.string() }),
  shadingNotes: z.string().max(500).optional(),
  maxPanels: z.number().int().positive().max(200).optional(),
});

export interface PlacementSuggestion {
  panels: { x: number; y: number; rotation: 0 | 90 }[];
  rationale: string[];
  assumptions: string[];
  missing_data: string[];
  disclaimer: string;
}

/** AI-assisted panel placement on the roof rectangle supplied by the user. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid_input", message: "Invalid request." }, { status: 400 });
  if (!isClaudeConfigured()) return Response.json({ ok: false, reason: "not_configured", message: `Smart placement is not connected yet. ${PLACEHOLDERS.CLAUDE_API_KEY}` }, { status: 503 });
  const r = await askClaudeJson<PlacementSuggestion>({
    system: `You propose a planning layout of rectangular solar panels on a rectangular roof. Coordinates in metres, origin top-left, x to the right, y downward. Panels must lie fully inside the roof, must not overlap each other or obstacles, and should keep ≥0.5 m edge clearance and walkway access. Use rotation 0 (length along x) or 90. Site solar resource is not available (${PLACEHOLDERS.SOLAR_RESOURCE_DATA_SOURCE}). Do not invent irradiance or production. This is a planning visualization, not a certified engineering design.`,
    prompt: JSON.stringify(parsed.data),
    schemaDescription: `{"panels":[{"x":number,"y":number,"rotation":0|90}],"rationale":string[],"assumptions":string[],"missing_data":string[],"disclaimer":string}`,
    maxTokens: 6000,
  });
  if (!r.ok) return Response.json(r, { status: 502 });
  return Response.json({ ok: true, suggestion: r.data, cls: "ai" });
}
