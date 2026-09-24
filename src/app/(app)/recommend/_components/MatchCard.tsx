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
import { RevealVisual } from "@/components/three/PageVisuals";

/**
 * One ranked panel.
 *
 * Everything on the face of the card is either a recorded specification or a
 * figure derived from one, and the sources sit one click away rather than
 * behind a trip to another page. Selecting hands off to the existing designer
 * route, which is what writes the choice to `solar_designs.panel_product_id`.
 */
export function MatchCard({ match, rank, featured = false }: { match: Match; rank: number; featured?: boolean }) {
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

  const lengthMm = getSpecNum(p.specs, "length_mm");
  const widthMm = getSpecNum(p.specs, "width_mm");

  if (featured) {
    // The top of the ranked list, presented. The same facts, flags, reasons and
    // actions as every other card; only the arrangement differs.
    return (
      <Card className="@container overflow-hidden border-border-strong shadow-[var(--shadow)]">
        <div className="grid @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="relative border-b border-border bg-bg @2xl:border-b-0 @2xl:border-e">
            <div className="grid-rule pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative mx-auto max-w-md p-3 @2xl:max-w-none">
              <RevealVisual
                w={widthMm !== null ? widthMm / 1000 : null}
                h={lengthMm !== null ? lengthMm / 1000 : null}
                caption={lengthMm !== null && widthMm !== null ? "Drawn at the size its record states." : "Its record does not state a size, so a nominal module is drawn."}
                overlay={
                  <>
                    <FactChip className="start-2 top-2" label="Rated power" value={facts[0].value} muted={facts[0].muted} color="var(--sun-ink)" />
                    <FactChip className="end-2 top-2 text-end" label="Efficiency" value={facts[1].value} muted={facts[1].muted} color="var(--brand-strong)" />
                  </>
                }
              />
            </div>
          </div>
          <CardBody className="space-y-4 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="micro rounded-full bg-brand px-2.5 py-1" style={{ color: "var(--brand-fg)" }}>Your top match · #{rank}</span>
                <VerificationBadge status={p.source.verification_status} />
              </div>
              <h3 className="display mt-3 text-[26px] leading-tight text-[color:var(--brand-strong)]">
                <Link href={`/marketplace/${p.id}`} className="underline-offset-2 hover:underline">{p.name}</Link>
              </h3>
              <p className="mt-1 text-[12.5px] text-fg-muted">{p.manufacturer_name} · <span className="font-mono">{p.model}</span></p>
              <p className="mt-1.5 text-[12px] text-fg-muted">First in the list ordered by what you said matters. Not an objective best.</p>
            </div>
            <Flags match={match} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 @lg:grid-cols-3 @2xl:grid-cols-2 @4xl:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="micro">{f.label}</dt>
                  <dd className={`figure text-[15px] ${factInk(f)}`}>{f.value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-fg">Why this matches</span>
                <DataBadge cls="calculated" compact />
              </div>
              <ol className="mt-2 space-y-1.5">
                {match.reasons.map((r, i) => (
                  <li key={r} className="flex gap-2.5 rounded-[var(--radius)] border border-border bg-inset px-3 py-2 text-[13px] leading-relaxed text-fg-secondary">
                    <span className="figure grid size-5 shrink-0 place-items-center rounded-full bg-sun-soft text-[11px] text-fg-mustard" aria-hidden="true">{i + 1}</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            </div>
            <Actions p={p} openSources={openSources} setOpenSources={setOpenSources} />
          </CardBody>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="micro rounded-full border border-border bg-inset px-2 py-0.5 text-fg-secondary">#{rank}</span>
              <VerificationBadge status={p.source.verification_status} />
            </div>
            <h3 className="mt-1.5 text-[16px] font-semibold leading-snug text-fg-heading">
              <Link href={`/marketplace/${p.id}`} className="underline-offset-2 hover:underline">
                {p.name}
              </Link>
            </h3>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              {p.manufacturer_name} · <span className="font-mono">{p.model}</span>
            </p>
          </div>
          <Flags match={match} />
        </div>

        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="micro">{f.label}</dt>
              <dd className={`figure text-[14.5px] ${factInk(f)}`}>{f.value}</dd>
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

        <Actions p={p} openSources={openSources} setOpenSources={setOpenSources} />
      </CardBody>
    </Card>
  );
}

function Flags({ match }: { match: Match }) {
  return (
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
  );
}

function Actions({ p, openSources, setOpenSources }: { p: Match["product"]; openSources: boolean; setOpenSources: (f: (v: boolean) => boolean) => void }) {
  return (
    <>
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
          <h4 className="text-[13px] font-medium text-fg-heading">Sources &amp; References</h4>
          <SourceReferences product={p} compact className="mt-1" />
        </div>
      ) : null}
    </>
  );
}

/** One of the match's own facts, parked beside the presented module. */
/** A fact's ink: amber for the power figure, navy for the rest, grey when missing. */
function factInk(f: { label: string; muted?: boolean }) {
  return f.muted ? "text-fg-na" : f.label === "Rated power" ? "text-[color:var(--sun-ink)]" : "text-[color:var(--brand-strong)]";
}

function FactChip({ label, value, muted, className, color }: { label: string; value: string; muted?: boolean; className: string; color: string }) {
  return (
    <div className={`pointer-events-none absolute rounded-[var(--radius)] border border-border bg-elevated/90 px-2.5 py-1.5 shadow-[var(--shadow-sm)] ${className}`}>
      <span className="micro block">{label}</span>
      <span className="figure block text-[15px] font-medium" style={{ color: muted ? "var(--fg-na)" : color }}>{value}</span>
    </div>
  );
}
