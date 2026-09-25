import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { listProducts } from "@/lib/data/repositories";
import { getPlatformSettings, settingsToAssumptions } from "@/lib/data/settings";
import { CompareTable } from "./_components/CompareTable";

export const metadata: Metadata = {
  title: "Compare panels",
  description: "Side-by-side solar panel comparison with every value labeled by its data class.",
};

export default async function ComparePage() {
  const [{ data: panels, mode }, settings] = await Promise.all([
    listProducts({ category: "solar_panel" }),
    getPlatformSettings(),
  ]);
  const assumptions = settingsToAssumptions(settings);

  return (
    <div>
      {mode === "demo" && <DemoBanner className="mb-5" text="DEMO CATALOG: NOT REAL" detail="Only demo panel records are available until a real product dataset is connected." />}
      <CompareTable
        panels={panels}
        platformAssumptions={assumptions}
        heading={{
          eyebrow: "Choose",
          title: "Compare panels",
          description: "Up to four panels side by side. Manufacturer figures are labeled as source data; anything Solink derives is labeled calculated or estimated, with its assumptions visible.",
          actions: <Button href="/marketplace?category=solar_panel" variant="outline">Back to marketplace</Button>,
        }}
      />
    </div>
  );
}
