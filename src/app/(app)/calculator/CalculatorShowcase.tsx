"use client";
import { useMemo, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { CalculatorVisual } from "@/components/three/PageVisuals";
import type { CalcSceneData } from "@/components/three/CalculatorScene";
import type { Classified, DataClass } from "@/lib/classification";
import { formatNumber } from "@/lib/solar/calculations";
import { cn, formatMoney } from "@/lib/utils";

/**
 * The calculator's visual summary: the 3D panel → energy → calculation →
 * savings scene, and a savings panel beside it. Everything shown comes from
 * the calculator's own results, passed in unchanged; a result the calculator
 * does not have reads "Not available yet", never 0. No figure is computed here.
 */
export function CalculatorShowcase({ production, savings, payback, lifetimeSavings, netBenefit, monthlyBill, cumulativeSavings, horizonYears, currency }: {
  production: Classified;
  savings: Classified;
  payback: Classified;
  lifetimeSavings: Classified;
  netBenefit: Classified;
  /** The bill exactly as the person typed it, or null. */
  monthlyBill: number | null;
  /** The calculator's own cumulative-savings series (one value per year), or null when it cannot build one. */
  cumulativeSavings: number[] | null;
  horizonYears: number | null;
  currency: string;
}) {
  const has = (c: Classified) => c.value !== null && c.value !== undefined;

  const scene: CalcSceneData = useMemo(() => {
    const last = cumulativeSavings && cumulativeSavings.length ? cumulativeSavings[cumulativeSavings.length - 1] : null;
    return {
      display: has(savings) ? { value: formatNumber(savings.value as number, 0), unit: `${currency} / year` } : null,
      // Normalised for drawing only; the shape is the calculator's series.
      trajectory: cumulativeSavings && last && last > 0 ? cumulativeSavings.map((v) => v / last) : null,
      paybackYear: has(payback) ? Math.max(1, Math.ceil(payback.value as number)) : null,
      flowing: has(production),
    };
  }, [savings, payback, production, cumulativeSavings, currency]);

  const steps: { label: string; on: boolean; color: string }[] = [
    { label: "Solar panel", on: true, color: "var(--brand)" },
    { label: "Energy", on: has(production), color: "var(--sun-ink)" },
    { label: "Calculation", on: has(savings), color: "var(--brand-strong)" },
    { label: "Savings", on: has(payback) || has(lifetimeSavings), color: "var(--good-fg)" },
  ];

  const net = has(netBenefit) ? (netBenefit.value as number) : null;

  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="relative border-b border-border bg-inset lg:border-b-0 lg:border-e">
          <div className="grid-rule pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative px-2 pt-2 sm:px-4 sm:pt-3">
            <CalculatorVisual
              data={scene}
              caption="An illustration. The screen and the year slabs show only what the calculator has worked out from your inputs."
              overlay={
                <ol aria-label="How the calculation flows" className="pointer-events-none absolute bottom-2 start-2 flex flex-wrap items-center gap-1 rounded-full border border-border bg-elevated/90 px-2.5 py-1 shadow-[var(--shadow-sm)] sm:bottom-3 sm:start-3 sm:gap-1.5 sm:px-3 sm:py-1.5">
                  {steps.map((s, i) => (
                    <li key={s.label} className="flex items-center gap-1 sm:gap-1.5">
                      {i > 0 && <span aria-hidden="true" className="text-fg-muted">→</span>}
                      <span className="micro" style={{ color: s.on ? s.color : "var(--fg-muted)", opacity: s.on ? 1 : 0.7 }}>{s.label}</span>
                    </li>
                  ))}
                </ol>
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div>
            <p className="micro" style={{ color: "var(--fg-mustard)" }}>Your savings at a glance</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">Drawn from the results below. Change any input and this updates with them.</p>
          </div>

          <Row label="Monthly electricity bill" note="As you entered it" cls={monthlyBill !== null ? "user" : null} value={monthlyBill !== null ? formatMoney(monthlyBill, currency, 3) : null} empty="Not entered" />
          <Row label="Annual production" cls={production.cls} value={has(production) ? `${formatNumber(production.value as number, 0)} kWh` : null} tone="energy" />
          <Row label="Annual savings" cls={savings.cls} value={has(savings) ? formatMoney(savings.value as number, currency, 0) : null} tone="brand" big />
          <Row label="Payback period" cls={payback.cls} value={has(payback) ? `${formatNumber(payback.value as number, 1)} years` : null} tone="brand" />
          <Row label={`Lifetime savings${horizonYears ? `, ${horizonYears} years` : ""}`} cls={lifetimeSavings.cls} value={has(lifetimeSavings) ? formatMoney(lifetimeSavings.value as number, currency, 0) : null} tone="brand" />
          <Row label="Net benefit over the period" cls={netBenefit.cls} value={net !== null ? formatMoney(net, currency, 0) : null} tone={net !== null && net > 0 ? "good" : "brand"} />

          {!has(savings) && (
            <p className="mt-auto rounded-[var(--radius)] border border-border bg-inset p-3 text-[12.5px] leading-relaxed text-fg-secondary">
              Enter your monthly use (or bill) and a system size, and the savings appear here.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Row({ label, note, cls, value, tone = "brand", big = false, empty = "Not available yet" }: {
  label: ReactNode; note?: string; cls: DataClass | null; value: string | null; tone?: "energy" | "brand" | "good"; big?: boolean; empty?: string;
}) {
  const color = tone === "energy" ? "var(--sun-ink)" : tone === "good" ? "var(--good-fg)" : "var(--brand-strong)";
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border/70 pt-2.5 first-of-type:border-t-0">
      <div className="min-w-0">
        <span className="block text-[12.5px] font-medium text-fg-secondary">{label}</span>
        {note && <span className="block text-[11px] text-fg-muted">{note}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {value !== null ? (
          <span className={cn("figure font-medium", big ? "text-[22px]" : "text-[15px]")} style={{ color }}>{value}</span>
        ) : (
          <span className="text-[12.5px] text-fg-na">{empty}</span>
        )}
        {value !== null && cls && <DataBadge cls={cls} compact />}
      </div>
    </div>
  );
}
