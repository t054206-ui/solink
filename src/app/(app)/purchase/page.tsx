import { PageHeader } from "@/components/layout/PageHeader";
import { listProducts, listProviders } from "@/lib/data/repositories";
import { createClient } from "@/lib/supabase/server";
import { specNum, specText } from "@/lib/utils";
import type { Product } from "@/lib/types";
import type { SavedDesign } from "../designer/designTypes";
import { PurchaseFlow } from "./PurchaseFlow";
import type { CatalogItem } from "./purchaseTypes";

export const metadata = { title: "Purchase & Installation — Solink" };

function toItem(p: Product): CatalogItem {
  const len = specNum(p.specs.length_mm), wid = specNum(p.specs.width_mm);
  return {
    id: p.id, category: p.category as CatalogItem["category"], name: p.name, manufacturer: p.manufacturer_name, model: p.model,
    price: specNum(p.price), price_text: specText(p.price), currency: p.currency,
    rated_power_w: specNum(p.specs.rated_power_w), length_m: len !== null ? len / 1000 : null, width_m: wid !== null ? wid / 1000 : null,
    is_demo: p.is_demo, provider_id: p.provider_id ?? null,
  };
}

/** Supabase branch: the signed-in user's saved designs (demo mode reads localStorage on the client). */
async function listServerDesigns(): Promise<SavedDesign[]> {
  const c = await createClient();
  if (!c) return [];
  const { data } = await c.from("solar_designs").select("id,name,roof,panel_product_id,layout,summary,is_ai_suggested,created_at").order("created_at", { ascending: false }).limit(30);
  return (data ?? []).map((r) => {
    const s = (r.summary ?? {}) as Record<string, unknown>;
    return {
      id: r.id as string, name: r.name as string, roof: r.roof as SavedDesign["roof"], panel_product_id: (r.panel_product_id as string) ?? "",
      panel_name: (s.panel_name as string) ?? "Panel", panel: (s.panel as SavedDesign["panel"]) ?? { length_m: 0, width_m: 0, rated_power_w: null },
      layout: (r.layout as SavedDesign["layout"]) ?? [],
      summary: { panel_count: Number(s.panel_count ?? 0), used_area_m2: Number(s.used_area_m2 ?? 0), remaining_area_m2: Number(s.remaining_area_m2 ?? 0), capacity_kwp: typeof s.capacity_kwp === "number" ? s.capacity_kwp : null },
      is_ai_suggested: Boolean(r.is_ai_suggested), is_demo_product: Boolean(s.is_demo_product), created_at: r.created_at as string,
    };
  });
}

export default async function PurchasePage({ searchParams }: { searchParams: Promise<{ design?: string }> }) {
  const sp = await searchParams;
  const [{ data: products, mode }, { data: providers }] = await Promise.all([
    listProducts().catch(() => ({ data: [] as Product[], mode: "demo" as const })),
    listProviders().catch(() => ({ data: [], mode: "demo" as const })),
  ]);
  const serverDesigns = mode === "supabase" ? await listServerDesigns().catch(() => []) : [];
  const wanted = new Set<Product["category"]>(["solar_panel", "inverter", "battery", "installation_package"]);
  const catalog = products.filter((p) => wanted.has(p.category) && !p.is_archived).map(toItem);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="Choose"
        title="Purchase & Installation"
        description="Turn a design into a request: review the equipment, ask installers for a quote, pick an installer and propose an installation date. Nothing here charges money — no payment provider is connected."
      />
      <PurchaseFlow mode={mode} catalog={catalog} providers={providers.map((p) => ({ id: p.id, name: p.name, kind: p.kind, is_demo: p.is_demo, service_area: p.service_area ?? null, verification_status: p.verification_status }))} serverDesigns={serverDesigns} preselectDesignId={sp.design ?? null} />
    </div>
  );
}
