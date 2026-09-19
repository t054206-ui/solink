import { PageHeader } from "@/components/layout/PageHeader";
import { getProfile, listProducts } from "@/lib/data/repositories";
import { getPlatformSettings } from "@/lib/data/settings";
import { PotentialAnalysis } from "./PotentialAnalysis";

export const metadata = { title: "Solar Potential" };

export default async function AnalysisPage() {
  const [{ data: profile, mode }, settings, { data: panels }] = await Promise.all([
    getProfile(),
    getPlatformSettings(),
    listProducts({ category: "solar_panel" }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Plan · Step 2"
        title="Solar Potential"
        description="What your roof could produce, save and avoid: built only from your profile, the selected panel's specifications and clearly labeled assumptions."
      />
      <PotentialAnalysis profile={profile} mode={mode} settings={settings} panels={panels} />
    </div>
  );
}
