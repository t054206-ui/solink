import type { ModuleKind } from "./designTypes";

/**
 * The module palette. Each kind is a generic block, the way a planner app
 * offers a generic sofa: the starting size is only a starting size, and the
 * homeowner is expected to type the real dimensions of whatever they will
 * actually buy. Nothing here is a product, a price or a weight, and the UI
 * says so beside every module.
 */
export interface ModuleKindMeta {
  label: string;
  description: string;
  /** Starting size in metres; editable before placing. */
  w: number;
  h: number;
  /** SVG styling tokens. Never the sun colour: that is for energy figures only. */
  stroke: string;
  fill: string;
  dashed?: boolean;
}

export const MODULE_KINDS: Record<ModuleKind, ModuleKindMeta> = {
  walkway: {
    label: "Walkway",
    description: "A clear strip kept free for cleaning and inspection. Panels cannot sit on it.",
    w: 3, h: 0.8,
    stroke: "var(--fg-muted)", fill: "transparent", dashed: true,
  },
  planter: {
    label: "Planter",
    description: "A planter box or green-roof tray. Enter the size of the one you would buy.",
    w: 1, h: 0.5,
    stroke: "var(--good)", fill: "var(--good-soft)",
  },
  seating: {
    label: "Seating",
    description: "A bench or seating module. Enter its footprint.",
    w: 1.8, h: 0.6,
    stroke: "var(--series-4)", fill: "color-mix(in oklab, var(--series-4) 14%, transparent)",
  },
  pergola: {
    label: "Pergola",
    description: "A shade structure's footprint. Its posts and roof need a structural check like everything else here.",
    w: 3, h: 3,
    stroke: "var(--fg-secondary)", fill: "color-mix(in oklab, var(--fg-secondary) 8%, transparent)",
  },
  custom: {
    label: "Custom block",
    description: "Anything else: a tank, a skylight you want to keep clear, a future extension.",
    w: 1, h: 1,
    stroke: "var(--border-strong)", fill: "transparent", dashed: true,
  },
};

export const MODULE_ORDER: ModuleKind[] = ["walkway", "planter", "seating", "pergola", "custom"];
