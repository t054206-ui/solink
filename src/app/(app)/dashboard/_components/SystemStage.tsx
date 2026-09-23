import type { ReactNode } from "react";
import { Stage } from "@/components/layout/Stage";
import { PanelAtRest } from "@/components/three/PanelAtRest";
import { RevealCount } from "@/components/motion/RevealCount";
import { DataBadge } from "@/components/ui/DataBadge";
import type { DataClass } from "@/lib/classification";

/** One stop on the path the energy takes. `figure` is omitted when there is nothing to show. */
export interface FlowNode {
  label: string;
  cls: DataClass;
  figure?: { value: number; decimals: number; unit: string };
  /** Shown in place of a figure, or beside it (e.g. a weather condition). */
  text?: string;
  detail?: string;
  /** Amber is for energy figures only (DIRECTION.md). True for production, nothing else. */
  energy?: boolean;
}

/**
 * The top of the homeowner Overview: the landing hero's layout, carried in.
 * Words and actions on one side, the module on the other, and the path the
 * energy takes, sun → array → home, pinned along the bottom edge with the
 * system's own figures on it.
 *
 * The path only moves when there is a production figure to move (`live`).
 * Without one it is a still, dashed hairline that says why, because a flow
 * animating past "no reading" would be a live feature that is not happening.
 * The module is the landing's generic panel and is captioned as such.
 */
export function SystemStage({ eyebrow, title, description, actions, sun, array, home, live, idleLabel, moduleNote }: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions: ReactNode;
  sun: FlowNode;
  array: FlowNode;
  home: FlowNode;
  live: boolean;
  idleLabel: string;
  moduleNote: string;
}) {
  return (
    <Stage label="Your system" focus="72% 38%">
      <div className="grid items-center gap-6 px-5 pb-2 pt-6 sm:px-7 sm:pt-8 lg:grid-cols-[1.1fr_1fr] lg:gap-4 lg:px-9">
        <div className="min-w-0">
          <p className="micro wipe">{eyebrow}</p>
          <h1 className="display wipe mt-3 text-[clamp(2rem,4.6vw,3.25rem)] text-fg" style={{ animationDelay: "90ms" }}>{title}</h1>
          <p className="wipe mt-4 max-w-xl text-[15px] leading-relaxed text-fg-secondary" style={{ animationDelay: "180ms" }}>{description}</p>
          <div className="rise mt-6 flex flex-wrap gap-2" style={{ animationDelay: "300ms" }}>{actions}</div>
        </div>
        <figure className="mx-auto w-full max-w-[260px] sm:max-w-[320px] lg:max-w-[360px]">
          <PanelAtRest />
          <figcaption className="mt-1 text-center text-[11px] leading-snug text-fg-muted">{moduleNote}</figcaption>
        </figure>
      </div>

      <ol aria-label="Energy path: sun, panels, home" className="grid border-t border-border sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        <Node node={sun} />
        <Connector live={live} />
        <Node node={array} />
        <Connector live={live} label={live ? undefined : idleLabel} />
        <Node node={home} />
      </ol>
    </Stage>
  );
}

function Node({ node }: { node: FlowNode }) {
  return (
    <li className="min-w-0 px-5 py-4 sm:px-7 lg:px-9">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="micro whitespace-nowrap">{node.label}</span>
        <DataBadge cls={node.cls} compact />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {node.figure ? (
          <span className="text-[26px] font-medium leading-none text-fg">
            <RevealCount to={node.figure.value} decimals={node.figure.decimals} className={node.energy ? "text-[color:var(--sun-ink)]" : ""} />
            <span className="ms-1 text-[13px] font-medium text-fg-muted">{node.figure.unit}</span>
          </span>
        ) : null}
        {node.text ? <span className={node.figure ? "text-[13px] text-fg-secondary" : "text-[14px] font-medium text-fg-secondary"}>{node.text}</span> : null}
      </div>
      {node.detail ? <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-fg-muted">{node.detail}</p> : null}
    </li>
  );
}

/** The hairline between two stops. Decorative, so hidden from assistive tech; the idle reason is also in the nodes. */
function Connector({ live, label }: { live: boolean; label?: string }) {
  return (
    <li aria-hidden="true" className="flex items-center gap-2 px-5 sm:w-[clamp(76px,10vw,132px)] sm:flex-col sm:px-0">
      <span className="flow" data-live={live ? "true" : undefined} />
      {label ? <span className="micro leading-snug sm:text-center">{label}</span> : null}
    </li>
  );
}
