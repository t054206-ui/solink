"use client";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { CalculatorVisual } from "@/components/three/PageVisuals";
import type { CalcSceneData } from "@/components/three/CalculatorScene";
import type { Classified } from "@/lib/classification";
import { formatNumber } from "@/lib/solar/calculations";
import { formatMoney } from "@/lib/utils";

/**
 * The calculator's visual summary, in its own contained area at the top of
 * the page: the 3D panel → energy → calculation → savings scene, and four
 * small cards with the calculator's own results. A result the calculator
 * does not have reads "Not available yet", never 0. Nothing is computed here.
 */
export function CalculatorShowcase({ production, savings, payback, lifetimeSavings, netBenefit, cumulativeSavings, currency }: {
  production: Classified;
  savings: Classified;
  payback: Classified;
  lifetimeSavings: Classified;
  netBenefit: Classified;
  /** The calculator's own cumulative-savings series (one value per year), or null when it cannot build one. */
  cumulativeSavings: number[] | null;
  currency: string;
}) {
  const scene: CalcSceneData = useMemo(() => {
    const has = (c: Classified) => c.value !== null && c.value !== undefined;
    const last = cumulativeSavings && cumulativeSavings.length ? cumulativeSavings[cumulativeSavings.length - 1] : null;
    return {
      display: has(savings) ? { value: formatNumber(savings.value as number, 0), unit: `${currency} / year` } : null,
      // Normalised for drawing only; the shape is the calculator's series.
      trajectory: cumulativeSavings && last && last > 0 ? cumulativeSavings.map((v) => v / last) : null,
      paybackYear: has(payback) ? Math.max(1, Math.ceil(payback.value as number)) : null,
      flowing: has(production),
    };
  }, [savings, payback, production, cumulativeSavings, currency]);

  const net = netBenefit.value ?? null;

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="relative min-w-0 border-b border-border bg-inset md:border-b-0 md:border-e">
          <div className="grid-rule pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative p-2 sm:p-3">
            <CalculatorVisual data={scene} caption="An illustration. The screen and the year slabs show only what the calculator has worked out." />
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-4 p-4 sm:p-5">
          <div>
            <p className="micro" style={{ color: "var(--fg-mustard)" }}>Savings at a glance</p>
            <p className="mt-1 text-[12.5px] text-fg-muted">From the results below; updates as you type.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Tile label="Annual savings" data={savings} value={(v) => formatMoney(v, currency, 0)} />
            <Tile label="Payback" data={payback} value={(v) => `${formatNumber(v, 1)} years`} />
            <Tile label="Lifetime savings" data={lifetimeSavings} value={(v) => formatMoney(v, currency, 0)} />
            <Tile label="Net benefit" data={netBenefit} value={(v) => formatMoney(v, currency, 0)} good={net !== null && net > 0} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Tile({ label, data, value, good = false }: { label: string; data: Classified; value: (v: number) => string; good?: boolean }) {
  const has = data.value !== null && data.value !== undefined;
  return (
    <div className="min-w-0 rounded-[var(--radius)] border border-border bg-elevated p-3">
      <div className="flex items-center justify-between gap-1.5">
        <span className="truncate text-[12px] font-medium text-fg-secondary">{label}</span>
        {has && <DataBadge cls={data.cls} compact />}
      </div>
      {has ? (
        <p className="figure mt-1.5 truncate text-[18px] font-medium leading-tight" style={{ color: good ? "var(--good-fg)" : "var(--brand-strong)" }}>{value(data.value as number)}</p>
      ) : (
        <p className="mt-1.5 text-[12.5px] leading-tight text-fg-na">Not available yet</p>
      )}
    </div>
  );
}
