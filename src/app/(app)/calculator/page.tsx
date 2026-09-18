import { PageHeader } from "@/components/layout/PageHeader";
import { getDataMode } from "@/lib/data/mode";
import { getPlatformSettings } from "@/lib/data/settings";
import { SavingsCalculator } from "./SavingsCalculator";

export const metadata = { title: "Savings Calculator" };

export default async function CalculatorPage() {
  const [settings, mode] = [await getPlatformSettings(), getDataMode()];
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Plan · Step 3"
        title="Savings Calculator"
        description="Change any input and every figure updates. Nothing is assumed for you: tariffs, costs and site factors come from platform settings or from you, and each result says which."
      />
      <SavingsCalculator settings={settings} mode={mode} />
    </div>
  );
}
