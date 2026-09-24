import type { ReactNode } from "react";
import { OverviewHero, type HeroAction } from "./OverviewHero";
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
 * The top of the homeowner Overview when there is a system: the Overview hero
 * (words, actions, the rooftop), and the path the energy takes, sun → array →
 * home, pinned along its bottom edge with the system's own figures on it.
 *
 * The path only moves when there is a production figure to move (`live`).
 * Without one it is a still, dashed hairline that says why, because a flow
 * animating past "no reading" would be a live feature that is not happening.
 * The rooftop is an illustration and is captioned as such.
 */
export function SystemStage({ eyebrow, title, description, actions, sun, array, home, live, idleLabel, caption }: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions: HeroAction[];
  sun: FlowNode;
  array: FlowNode;
  home: FlowNode;
  live: boolean;
  idleLabel: string;
  caption: string;
}) {
  return (
    <OverviewHero label="Your system" eyebrow={eyebrow} title={title} description={description} actions={actions} caption={caption}>
      <ol aria-label="Energy path: sun, panels, home" className="grid border-t border-border sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        <Node node={sun} />
        <Connector live={live} />
        <Node node={array} />
        <Connector live={live} label={live ? undefined : idleLabel} />
        <Node node={home} />
      </ol>
    </OverviewHero>
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
          <span className="text-[26px] font-medium leading-none text-[color:var(--brand-strong)]">
            <RevealCount to={node.figure.value} decimals={node.figure.decimals} className={node.energy ? "text-[color:var(--sun-ink)]" : ""} />
            <span className="ms-1 text-[13px] font-medium text-fg-muted">{node.figure.unit}</span>
          </span>
        ) : null}
        {node.text ? <span className={node.figure ? "text-[13px] text-fg-secondary" : "text-[14px] font-medium text-fg-na"}>{node.text}</span> : null}
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
