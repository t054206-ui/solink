"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useRef } from "react";
import { Box } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useSceneGate } from "./useSceneGate";
import type { Plan } from "./DesignScene";

const DesignScene = dynamic(() => import("./DesignScene"), { ssr: false, loading: () => null });

/**
 * The Designer's plan, in perspective, as it is being drawn.
 *
 * The plan is deferred so that dragging on the drawing never waits on the 3D
 * view: the drawing is the tool, and this follows it. The card says what the
 * picture is made of and what it leaves out.
 */
export function DesignVisual({ plan }: { plan: Plan }) {
  const deferred = useDeferredValue(plan);
  const holder = useRef<HTMLDivElement>(null);
  const gate = useSceneGate(holder);
  const panels = plan.panels.length;
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={<><Box className="size-4 text-fg-muted" aria-hidden /> Your layout in 3D</>}
        subtitle="Drawn from the plan above as you change it: your roof size, your panels at their catalogue size and position, your obstacles and blocks."
      />
      <div ref={holder} className="relative isolate aspect-[16/10] w-full bg-bg sm:aspect-[16/9]">
        <div aria-hidden="true" className="grid-rule pointer-events-none absolute inset-0 -z-10" style={{ maskImage: "radial-gradient(70% 70% at 50% 45%, #000, transparent)", WebkitMaskImage: "radial-gradient(70% 70% at 50% 45%, #000, transparent)" }} />
        <div
          className="absolute inset-0"
          role="img"
          aria-label={`Perspective view of the plan: a ${plan.length} by ${plan.width} metre roof with ${panels} panel${panels === 1 ? "" : "s"}, ${plan.obstacles.length} obstacle${plan.obstacles.length === 1 ? "" : "s"} and ${plan.blocks.length} block${plan.blocks.length === 1 ? "" : "s"}.`}
          style={{ maskImage: "linear-gradient(to bottom, #000 80%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, #000 80%, transparent 100%)" }}
        >
          <DesignScene plan={deferred} paused={gate.paused} still={gate.still} economy={gate.economy} parallax={gate.parallax} />
        </div>
      </div>
      <p className="border-t border-border px-3 py-2 text-[11.5px] leading-snug text-fg-muted">
        A picture of the plan, not a survey of the building. Panels are shown flat because the plan is a footprint; obstacles and blocks stand at nominal heights, and the parapet is only a visual edge.
      </p>
    </Card>
  );
}
