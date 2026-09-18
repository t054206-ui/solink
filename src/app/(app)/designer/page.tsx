import { PageHeader } from "@/components/layout/PageHeader";
import { listProducts, getProfile } from "@/lib/data/repositories";
import { specNum } from "@/lib/utils";
import { DesignerCanvas, type PanelOption } from "./DesignerCanvas";

export const metadata = { title: "Solar Designer — Solink" };

/**
 * Feature 8 + 9: Build-It-Yourself Solar Designer with AI Smart Placement.
 * The server passes real catalog panels (dimensions from specs) and the data mode.
 */
export default async function DesignerPage({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  const sp = await searchParams;
  const [{ data: products, mode }, { data: profile }] = await Promise.all([
    listProducts({ category: "solar_panel" }).catch(() => ({ data: [], mode: "demo" as const })),
    getProfile().catch(() => ({ data: null, mode: "demo" as const })),
  ]);

  const panels: PanelOption[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    manufacturer: p.manufacturer_name,
    model: p.model,
    length_m: specNum(p.specs.length_mm) !== null ? (specNum(p.specs.length_mm) as number) / 1000 : null,
    width_m: specNum(p.specs.width_mm) !== null ? (specNum(p.specs.width_mm) as number) / 1000 : null,
    rated_power_w: specNum(p.specs.rated_power_w),
    price: specNum(p.price),
    currency: p.currency,
    installation_cost: specNum(p.installation_cost),
    is_demo: p.is_demo,
  }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="Choose"
        title="Build It Yourself Solar Designer"
        description="Lay real panels on a scaled drawing of your roof, avoid obstacles, and see how many fit. Panel counts, areas and capacity are pure geometry from the manufacturer's dimensions; production and cost need data that has not been provided yet."
      />
      <DesignerCanvas
        mode={mode}
        panels={panels}
        preselectPanelId={sp.panel ?? null}
        serverProfile={profile ? { roof_length_m: profile.roof_length_m ?? null, roof_width_m: profile.roof_width_m ?? null, roof_orientation: profile.roof_orientation ?? null, roof_tilt_deg: profile.roof_tilt_deg ?? null, shading_notes: profile.shading_notes ?? null } : null}
      />
    </div>
  );
}
