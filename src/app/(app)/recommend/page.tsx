import type { Metadata } from "next";
import { Check, ShieldOff } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { listProducts } from "@/lib/data/repositories";
import { RecommendForm } from "./_components/RecommendForm";

export const metadata: Metadata = {
  title: "AI recommendation",
  description: "Ask the AI Solar Agent to explain the trade-offs between the panels in the catalog for your situation.",
};

const ALLOWED = [
  "Compare only the panels that exist in the Solink catalog, using their recorded specifications.",
  "Explain trade-offs: power vs. roof area, efficiency, temperature coefficient in a hot climate, warranty length.",
  "Point out which fields are missing, unverified or demo, and what data would make the advice firmer.",
  "Suggest who each realistic option might suit, given the priorities you selected.",
];
const NOT_ALLOWED = [
  "Declare one panel objectively “the best”. There is no single winner.",
  "Invent or guess prices, installation costs, production figures or savings.",
  "Mention products, manufacturers or specifications that are not in the catalog.",
  "Treat demo records as real products.",
];

export default async function RecommendPage() {
  // The catalogue comes from the database on every request. Nothing about the
  // panels below is defined in the front end.
  const { data: panels, mode } = await listProducts({ category: "solar_panel" });

  return (
    <div>
      <PageHero
        label="Find your panel"
        eyebrow="Choose"
        title="Find your panel"
        description="Describe your situation. Solink filters the catalogue against it, ranks what is left by what you said matters, and shows the sources behind every figure. The AI Solar Agent adds the trade-offs in words."
        actions={<Button href="/compare" variant="outline">Compare panels yourself</Button>}
        focus="20% 40%"
      >
        <ol className="grid gap-2 sm:grid-cols-3" aria-label="How this works">
          {[["01", "Describe", "Your budget, roof, use and priorities."], ["02", "Filter and rank", "Solink's arithmetic on the catalogue records."], ["03", "Explain", "The AI Solar Agent's trade-offs, labelled as AI."]].map(([n, t, d]) => (
            <li key={n} className="border-t border-border pt-2">
              <span className="micro" style={{ color: "var(--fg-mustard)" }}>{n}</span>
              <span className="mt-0.5 block text-[13.5px] font-semibold text-fg">{t}</span>
              <span className="block text-[12.5px] leading-snug text-fg-muted">{d}</span>
            </li>
          ))}
        </ol>
      </PageHero>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <RecommendForm panels={panels} mode={mode} />
        <div className="space-y-5">
          <Card>
            <CardHeader title="What the AI may do" action={<DataBadge cls="ai" compact />} />
            <CardBody>
              <ul className="space-y-2 text-[13px] text-fg-secondary">
                {ALLOWED.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />{t}</li>)}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="What the AI must never do" />
            <CardBody>
              <ul className="space-y-2 text-[13px] text-fg-secondary">
                {NOT_ALLOWED.map((t) => <li key={t} className="flex gap-2"><ShieldOff className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden />{t}</li>)}
              </ul>
              <p className="mt-4 text-[12.5px] leading-relaxed text-fg-muted">Every AI answer is labeled <DataBadge cls="ai" compact /> so it is never mistaken for source data or a Solink calculation. Treat it as a starting point for your own comparison.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
