import { getManufacturer, listManufacturerSources } from "@/lib/data/repositories";

/** GET /api/manufacturers/{id or slug}: one company with its recorded sources. Archived companies are returned and say so. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    const { data, mode } = await getManufacturer(slug);
    if (!data) return Response.json({ ok: false, message: "Manufacturer not found." }, { status: 404 });
    const { data: sources } = await listManufacturerSources(data.id);
    return Response.json({ ok: true, mode, manufacturer: data, sources });
  } catch (e) {
    return Response.json({ ok: false, message: e instanceof Error ? e.message : "Could not load the manufacturer." }, { status: 500 });
  }
}
