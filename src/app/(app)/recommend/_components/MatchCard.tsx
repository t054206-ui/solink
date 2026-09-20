"use client";
import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronDown, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { SourceReferences } from "@/components/ui/SourceReferences";
import { getSpecNum } from "../../marketplace/_components/product-helpers";
import { VerificationBadge } from "../../marketplace/_components/VerificationBadge";
import type { Match } from "./match";

/**
 * One ranked panel.
 *
 * Everything on the face of the card is either a recorded specification or a
 * figure derived from one, and the sources sit one click away rather than
 * behind a trip to another page. Selecting hands off to the existing designer
 * route, which is what writes the choice to `solar_designs.panel_product_id`.
 */
export function MatchCard({ match, rank }: { match: Match; rank: number }) {
  const [openSources, setOpenSources] = useState(false);
  const p = match.product;

  const power = getSpecNum(p.specs, "rated_power_w");
  const eff = getSpecNum(p.specs, "module_efficiency_pct");
  const tc = getSpecNum(p.specs, "temperature_coefficient_pmax_pct_per_c");
  const warranty = getSpecNum(p.specs, "performance_warranty_years");
  const price = p.source.kuwait_price_kwd;

  const facts: { label: string; value: string; muted?: boolean }[] = [
    { label: "Rated power", value: power !== null ? `${power} W` : "Unavailable", muted: power === null },
    { label: "Efficiency", value: eff !== null ? `${eff} %` : "Unavailable", muted: eff === null },
    { label: "Power temp. coefficient", value: tc !== null ? `${tc} %/°C` : "Unavailable", muted: tc === null },
    { label: "Performance warranty", value: warranty !== null ? `${warranty} years` : "Unavailable", muted: warranty === null },
    {
      label: "Kuwait price",
      value: typeof price === "number" ? `${price.toFixed(3)} KWD` : "No local price published",
      muted: typeof price !== "number",
    },
  ];

  return (
    <Card>
      <CardBody className="space-y-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="micro rounded-full border border-border bg-inset px-2 py-0.5 text-fg-secondary">#{rank}</span>
              <VerificationBadge status={p.source.verification_status} />
            </div>
            <h3 className="mt-1.5 text-[16px] font-semibold leading-snug text-fg">
              <Link href={`/marketplace/${p.id}`} className="underline-offset-2 hover:underline">
                {p.name}
              </Link>
            </h3>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              {p.manufacturer_name} · <span className="font-mono">{p.model}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {match.flags.manufacturerConfirmed ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 text-[11.5px] text-fg-secondary">
                <BadgeCheck className="size-3.5 text-good" aria-hidden="true" /> Datasheet-confirmed specs
              </span>
            ) : (
              <span className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[11.5px] text-fg-muted">Retailer-stated specs</span>
            )}
            {match.flags.kuwaitListed ? (
              <span className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[11.5px] text-fg-secondary">Listed in Kuwait, not independently verified</span>
            ) : null}
          </div>
        </div>

        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="micro">{f.label}</dt>
              <dd className={`figure text-[14.5px] ${f.muted ? "text-fg-muted" : "text-fg"}`}>{f.value}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-[10px] border border-border bg-inset p-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-fg">Why this matches</span>
            <DataBadge cls="calculated" compact />
          </div>
          <ul className="mt-1.5 space-y-1 text-[13px] leading-relaxed text-fg-secondary">
            {match.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden="true" className="text-fg-muted">
                  ·
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button href={`/designer?panel=${encodeURIComponent(p.id)}`}>
            <PencilRuler className="size-4" aria-hidden="true" /> Select this panel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpenSources((v) => !v)}
            aria-expanded={openSources}
            aria-controls={`sources-${p.id}`}
          >
            View sources
            <ChevronDown className={`size-4 transition-transform ${openSources ? "rotate-180" : ""}`} aria-hidden="true" />
          </Button>
        </div>

        {openSources ? (
          <div id={`sources-${p.id}`} className="rounded-[10px] border border-border bg-elevated p-3">
            <h4 className="text-[13px] font-medium text-fg">Sources &amp; References</h4>
            <SourceReferences product={p} compact className="mt-1" />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
