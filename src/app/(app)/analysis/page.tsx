import { PageHeader } from "@/components/layout/PageHeader";
import { getProfile, listProducts, listSiteAnalyses } from "@/lib/data/repositories";
import { getPlatformSettings } from "@/lib/data/settings";
import { SiteAnalysisSchema } from "@/lib/solar/siteAnalysis";
import { PotentialAnalysis } from "./PotentialAnalysis";
import { SiteAnalysis } from "./SiteAnalysis";

export const metadata = { title: "Solar Potential" };

export default async function AnalysisPage() {
  const [{ data: profile, mode }, settings, { data: panels }] = await Promise.all([
    getProfile(),
    getPlatformSettings(),
    listProducts({ category: "solar_panel" }),
  ]);

  // The last completed run, so a refresh shows the analysis again instead of an
  // empty form. RLS scopes this to the signed-in user; a failure here must not
  // take the rest of the page down with it.
  //
  // The stored analysis is checked against the same schema it was written
  // through. It was valid when it was saved, so this only matters for a row
  // that arrived some other way, and such a row is dropped rather than rendered
  // into a crash: the page then shows the empty form, which is the truth.
  //
  // Several rows are read, not one: a failed run is stored as a row too, so
  // asking for only the most recent one would hide a good analysis behind the
  // next attempt that went wrong. The newest completed run is the one to show.
  const latest = await listSiteAnalyses(10)
    .then((r) => r.data.find((a) => a.output?.status === "completed" && SiteAnalysisSchema.safeParse(a.output.analysis).success) ?? null)
    .catch(() => null);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Plan · Step 2"
        title="Solar Potential"
        description="What your roof could produce, save and avoid: built only from your profile, the selected panel's specifications and clearly labeled assumptions."
      />
      <div className="mb-6">
        <SiteAnalysis latest={latest} />
      </div>

      <PotentialAnalysis profile={profile} mode={mode} settings={settings} panels={panels} />
    </div>
  );
}
