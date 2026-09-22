"use server";
import { friendlyDbError } from "@/lib/api/errors";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "@/lib/data/mode";

/**
 * Recommendation run logging.
 *
 * Every run by a signed-in user leaves one row in `recommendations`: what was
 * asked, which products were considered, what came back, and when. The table
 * has no status column, so the run's outcome travels inside `output.status`
 * rather than inventing one.
 *
 * Only the fields the ranking actually used are stored. The free-text note the
 * user may type for the AI is deliberately not recorded here.
 */

const Input = z.object({
  budget: z.number().finite().nullable(),
  roofAreaM2: z.number().finite().nullable(),
  monthlyKwh: z.number().finite().nullable(),
  desiredKwp: z.number().finite().nullable(),
  priorities: z.array(z.string().max(60)).max(6),
});

const Candidate = z.object({
  product_id: z.string().min(1),
  manufacturer: z.string().max(200),
  model: z.string().max(200),
  rank: z.number().int().min(1),
  rated_power_w: z.number().finite().nullable(),
  estimated_cost_kwd: z.number().finite().nullable(),
});

const RunInput = z.object({
  inputs: Input,
  candidates: z.array(Candidate).max(50),
  excluded_count: z.number().int().min(0),
  ranked_by: z.string().max(60).nullable(),
  status: z.enum(["ok", "no_matches", "empty_catalogue"]),
  catalogue_size: z.number().int().min(0),
  /** Set when the AI answered as well. Null for a purely deterministic run. */
  model: z.string().max(120).nullable(),
  ai_status: z.enum(["ok", "not_configured", "error", "skipped"]),
});

export type LogRunInput = z.infer<typeof RunInput>;

export type LogRunResult =
  | { ok: true; id: string }
  | { ok: false; reason: "demo" | "unauthenticated" | "invalid" | "error"; message: string };

export async function logRecommendationRun(raw: unknown): Promise<LogRunResult> {
  const parsed = RunInput.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid", message: "Invalid run payload." };
  if (getDataMode() === "demo") return { ok: false, reason: "demo", message: "Supabase is not connected; this run was not recorded." };

  const c = await createClient();
  if (!c) return { ok: false, reason: "demo", message: "Supabase is not connected; this run was not recorded." };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", message: "Sign in to have your recommendation runs recorded." };

  const d = parsed.data;
  const { data, error } = await c
    .from("recommendations")
    .insert({
      user_id: user.id,
      inputs: { ...d.inputs, ranked_by: d.ranked_by, catalogue_size: d.catalogue_size },
      candidates: d.candidates,
      output: {
        status: d.status,
        ranked_by: d.ranked_by,
        matched: d.candidates.length,
        excluded: d.excluded_count,
        ai: d.ai_status,
      },
      model: d.model,
    })
    .select("id")
    .single();

  if (error) return { ok: false, reason: "error", message: friendlyDbError(error) };
  return { ok: true, id: data.id as string };
}
