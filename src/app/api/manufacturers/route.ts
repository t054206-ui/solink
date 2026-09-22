import { listManufacturers } from "@/lib/data/repositories";

/**
 * GET /api/manufacturers?q=&archived=1
 * The active manufacturer companies, from the database (RLS applies through
 * the caller's session cookie; the manufacturers table is readable by every
 * signed-in role and the archived rows only join the list on request).
 * Writes go through the admin server actions, as every other write in Solink.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const includeArchived = url.searchParams.get("archived") === "1";
  try {
    const { data, mode } = await listManufacturers({ q, includeArchived });
    return Response.json({ ok: true, mode, count: data.length, manufacturers: data });
  } catch (e) {
    return Response.json({ ok: false, message: e instanceof Error ? e.message : "Could not load manufacturers." }, { status: 500 });
  }
}
