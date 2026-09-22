import { getManufacturer, listProducts } from "@/lib/data/repositories";

/** GET /api/manufacturers/{id or slug}/products: the company's active products, by manufacturer_id. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    const { data: m, mode } = await getManufacturer(slug);
    if (!m) return Response.json({ ok: false, message: "Manufacturer not found." }, { status: 404 });
    const { data: products } = await listProducts({ manufacturerId: m.id });
    return Response.json({ ok: true, mode, manufacturer: { id: m.id, slug: m.slug, name: m.name }, count: products.length, products });
  } catch (e) {
    return Response.json({ ok: false, message: e instanceof Error ? e.message : "Could not load products." }, { status: 500 });
  }
}
