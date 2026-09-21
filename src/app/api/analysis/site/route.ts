import { z } from "zod";
import { askClaudeJson } from "@/lib/ai/claude";
import { getDataMode } from "@/lib/data/mode";
import { createClient } from "@/lib/supabase/server";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import {
  buildAnalysisSystemPrompt,
  collectSiteData,
  isAnalysisConfigured,
  SITE_ANALYSIS_SHAPE,
  SiteAnalysisSchema,
  type SiteAnalysis,
  type StageName,
} from "@/lib/solar/siteAnalysis";

/**
 * Site analysis: address in, saved analysis out. Everything runs here.
 *
 *   auth → geocode → Google Solar → WeatherAPI → normalise → Claude → Supabase
 *
 * Every key stays on the server; the browser sends an address and receives an
 * analysis. Every run leaves a row in `ai_analyses`, including the ones that
 * fail, because a run that went wrong is still something that happened.
 *
 * The table has no status column, so the lifecycle lives in `output.status`
 * (completed | failed) alongside the stage that ended it. That is the same
 * shape the recommendation runs use, and it needs no migration.
 */

export const maxDuration = 60;

const Body = z.object({ address: z.string().trim().min(3).max(300) });

const KIND = "site_analysis";

type Fail = {
  ok: false;
  stage: StageName | "auth" | "input" | "persistence";
  reason: string;
  message: string;
};

function fail(status: number, f: Fail) {
  return Response.json(f, { status });
}

export async function POST(req: Request) {
  const startedAt = new Date().toISOString();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(400, { ok: false, stage: "input", reason: "invalid_input", message: "Enter an address to analyse." });
  }
  const address = parsed.data.address;

  // Auth first: the row this run will write is owned by someone, and RLS on
  // ai_analyses requires user_id = auth.uid().
  if (getDataMode() === "demo") {
    return fail(503, {
      ok: false,
      stage: "auth",
      reason: "demo",
      message: "Site analysis needs a connected database and an account. It is not available in demo mode.",
    });
  }
  const supabase = await createClient();
  if (!supabase) {
    return fail(503, { ok: false, stage: "auth", reason: "demo", message: "The database is not connected." });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail(401, { ok: false, stage: "auth", reason: "unauthenticated", message: "Sign in to run a site analysis." });
  }

  /** Records the run and returns the row id, or null when even that failed. */
  async function record(input: Record<string, unknown>, output: Record<string, unknown>, model: string | null) {
    const { data, error } = await supabase!
      .from("ai_analyses")
      .insert({ user_id: user!.id, kind: KIND, input_summary: input, output, model })
      .select("id")
      .single();
    return error ? null : (data.id as string);
  }

  // Steps 3 to 6. Geocoding is the only fatal provider: without coordinates
  // there is nothing to ask the others.
  const collected = await collectSiteData(address);
  if (!collected.ok) {
    await record(
      { address, started_at: startedAt },
      { status: "failed", stage: collected.stage, reason: collected.reason, error: collected.message, completed_at: new Date().toISOString() },
      null,
    );
    return fail(collected.reason === "not_configured" ? 503 : 422, {
      ok: false,
      stage: collected.stage,
      reason: collected.reason,
      message: collected.message,
    });
  }

  const site = collected.data;
  const inputSummary = {
    address,
    started_at: startedAt,
    location: site.location,
    normalised: site,
    providers: {
      // Kept verbatim for traceability. Neither contains a credential.
      google_solar: collected.raw.googleSolar,
      weather: collected.raw.weather,
      geocode: collected.raw.geocode,
    },
  };

  // Step 7. Without a key there is no analysis, and a run that produced no
  // analysis is a failed run, recorded as one.
  if (!isAnalysisConfigured()) {
    await record(inputSummary, {
      status: "failed",
      stage: "analysis",
      reason: "not_configured",
      error: "The AI analysis service is not connected.",
      completed_at: new Date().toISOString(),
    }, null);
    return fail(503, {
      ok: false,
      stage: "analysis",
      reason: "not_configured",
      message: `The data was collected, but the analysis service is not connected. ${PLACEHOLDERS.CLAUDE_API_KEY}`,
    });
  }

  const ai = await askClaudeJson<SiteAnalysis>({
    system: buildAnalysisSystemPrompt(site),
    prompt:
      "Analyse this roof for rooftop solar using only the DATA block. Report what the providers supplied, what you worked out, and what was unavailable.",
    schemaDescription: SITE_ANALYSIS_SHAPE,
    maxTokens: 3000,
  });

  if (!ai.ok) {
    await record(inputSummary, {
      status: "failed",
      stage: "analysis",
      reason: ai.reason,
      error: ai.message,
      completed_at: new Date().toISOString(),
    }, null);
    return fail(502, { ok: false, stage: "analysis", reason: ai.reason, message: "The analysis could not be generated. The collected data was saved, so you can try again." });
  }

  // Claude answered, but an answer of the wrong shape is not an analysis.
  const validated = SiteAnalysisSchema.safeParse(ai.data);
  if (!validated.success) {
    await record(inputSummary, {
      status: "failed",
      stage: "analysis",
      reason: "invalid_structure",
      error: validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 900),
      completed_at: new Date().toISOString(),
    }, ai.model);
    return fail(502, {
      ok: false,
      stage: "analysis",
      reason: "invalid_structure",
      message: "The analysis came back in an unexpected format and was not saved. Please try again.",
    });
  }

  // Step 8. Only now is this a completed run.
  const completedAt = new Date().toISOString();
  const id = await record(
    inputSummary,
    { status: "completed", stage: "analysis", analysis: validated.data, sources: site.sources, unavailable: site.unavailable, completed_at: completedAt },
    ai.model,
  );

  if (!id) {
    return fail(500, {
      ok: false,
      stage: "persistence",
      reason: "error",
      message: "The analysis was generated but could not be saved. Nothing has been stored; please try again.",
    });
  }

  return Response.json({
    ok: true,
    id,
    startedAt,
    completedAt,
    model: ai.model,
    location: site.location,
    solar: site.solar,
    weather: site.weather,
    sources: site.sources,
    unavailable: site.unavailable,
    analysis: validated.data,
  });
}
