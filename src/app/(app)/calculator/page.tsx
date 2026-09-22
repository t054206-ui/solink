import { PageHeader } from "@/components/layout/PageHeader";
import { getDataMode } from "@/lib/data/mode";
import { listProducts } from "@/lib/data/repositories";
import { getPlatformSettings } from "@/lib/data/settings";
import { getSpecNum } from "../marketplace/_components/product-helpers";
import { SavingsCalculator, type CalcPanelOption } from "./SavingsCalculator";

export const metadata = { title: "Savings Calculator" };

export default async function CalculatorPage() {
  const [settings, { data: panels }] = await Promise.all([getPlatformSettings(), listProducts({ category: "solar_panel" })]);
  const mode = getDataMode();
  // The catalogue's panels, so the "Panels × watts" mode can take a rating from a real record instead of a typed number.
  const options: CalcPanelOption[] = panels
    .map((p) => ({ id: p.id, label: `${p.manufacturer_name}. ${p.model}`, ratedW: getSpecNum(p.specs, "rated_power_w"), isDemo: p.is_demo, source: p.source.data_source }))
    .filter((o) => o.ratedW !== null)
    .sort((a, b) => a.label.localeCompare(b.label));
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Plan · Step 3"
        title="Savings Calculator"
        description="Change any input and every figure updates. Nothing is assumed for you: tariffs, costs and site factors come from platform settings or from you, and each result says which."
      />
      <SavingsCalculator settings={settings} mode={mode} panels={options} />
    </div>
  );
}
