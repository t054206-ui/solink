import { Stage } from "@/components/layout/Stage";
import { StudioVisual } from "@/components/three/StudioVisual";
import { listProducts, getProfile } from "@/lib/data/repositories";
import { getPlatformSettings } from "@/lib/data/settings";
import { specNum } from "@/lib/utils";
import { DesignerCanvas, type PanelOption } from "./DesignerCanvas";

export const metadata = { title: "Solar Designer" };

/**
 * Feature 8 + 9: Build-It-Yourself Solar Designer with AI Smart Placement.
 * The server passes real catalog panels (dimensions from specs) and the data mode.
 */
export default async function DesignerPage({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  const sp = await searchParams;
  const [{ data: products, mode }, { data: profile }, settings] = await Promise.all([
    listProducts({ category: "solar_panel" }).catch(() => ({ data: [], mode: "demo" as const })),
    getProfile().catch(() => ({ data: null, mode: "demo" as const })),
    getPlatformSettings(),
  ]);

  const panels: PanelOption[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    manufacturer: p.manufacturer_name,
    model: p.model,
    length_m: specNum(p.specs.length_mm) !== null ? (specNum(p.specs.length_mm) as number) / 1000 : null,
    width_m: specNum(p.specs.width_mm) !== null ? (specNum(p.specs.width_mm) as number) / 1000 : null,
    rated_power_w: specNum(p.specs.rated_power_w),
    weight_kg: specNum(p.specs.weight_kg),
    price: specNum(p.price),
    currency: p.currency,
    installation_cost: specNum(p.installation_cost),
    is_demo: p.is_demo,
  }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <Stage label="Solar Designer" focus="75% 30%" className="mb-4">
        <div className="grid items-center md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="relative z-10 px-5 pb-2 pt-7 sm:px-8 sm:pt-9 md:py-10 lg:ps-10">
            <p className="micro wipe">Choose</p>
            <h1 className="display wipe mt-4 text-[clamp(2.3rem,4.6vw,3.8rem)] text-fg-heading" style={{ animationDelay: "90ms" }}>Solar Designer</h1>
            <p className="wipe mt-4 max-w-xl text-[15.5px] leading-relaxed text-fg-secondary" style={{ animationDelay: "180ms" }}>See how many panels fit on your roof. Type its size, pick a panel, press one button, and drag things around if you like. Press any ⓘ for a plain explanation. More tools are one switch away when you want them.</p>
          </div>
          <StudioVisual className="px-3 pb-3 sm:px-6 md:ps-0 md:pe-4 md:pt-4" />
        </div>
      </Stage>
      <DesignerCanvas
        mode={mode}
        settings={settings}
        panels={panels}
        preselectPanelId={sp.panel ?? null}
        serverProfile={profile ? { roof_length_m: profile.roof_length_m ?? null, roof_width_m: profile.roof_width_m ?? null, roof_orientation: profile.roof_orientation ?? null, roof_tilt_deg: profile.roof_tilt_deg ?? null, shading_notes: profile.shading_notes ?? null } : null}
      />
    </div>
  );
}
