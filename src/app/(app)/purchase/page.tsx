import { PageHeader } from "@/components/layout/PageHeader";
import { listProducts, listProviders } from "@/lib/data/repositories";
import { createClient } from "@/lib/supabase/server";
import { specNum, specText } from "@/lib/utils";
import type { Product } from "@/lib/types";
import type { SavedDesign } from "../designer/designTypes";
import { PurchaseFlow } from "./PurchaseFlow";
import type { CatalogItem } from "./purchaseTypes";

export const metadata = { title: "Panel Purchase & Installation" };

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
        title="Panel Purchase & Installation"
        description="Two separate things. Choosing and comparing equipment happens here; buying the equipment happens on the supplier's own website, from the listing on each product page. What this page arranges is the installation: an equipment list sent to installers for a quote, then a date with the one you pick."
      />

      <div className="mb-5 rounded-[var(--radius-lg)] border border-border bg-inset p-4">
        <h2 className="text-[14px] font-semibold text-fg-heading">Solink does not sell panels</h2>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-fg-secondary">
          Solink is a solar planning and product discovery platform. It does not sell panels or process payments, and
          there is no cart or checkout anywhere in it. Once you have chosen a panel, the product page links to the
          supplier listing on record so you can buy it there. Installation is arranged directly with a qualified
          installer, and any price you agree is between you and them.
        </p>
      </div>
      <PurchaseFlow mode={mode} catalog={catalog} providers={providers.map((p) => ({ id: p.id, name: p.name, kind: p.kind, is_demo: p.is_demo, service_area: p.service_area ?? null, verification_status: p.verification_status }))} serverDesigns={serverDesigns} preselectDesignId={sp.design ?? null} />
    </div>
  );
}
