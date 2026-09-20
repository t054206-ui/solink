import type { DictKey } from "@/lib/i18n/dictionary";

/**
 * The parts a module comes apart into, front to back.
 *
 * Shared by the scene, which places the geometry, and by the studio, which
 * writes the caption. One list so the order the parts separate in and the
 * order the sentences appear in cannot drift apart.
 *
 * `base` and `explode` are metres along the module's own normal, at the same
 * 1 unit = 1 metre scale the rest of the scene uses. Positive is toward the
 * viewer. The assembled stack is 10 mm thick in total, which is the real
 * thickness of a laminate; the exploded one is 820 mm, which is not — it is a
 * diagram, and the note under the object says so.
 */

export type PanelLayerId = "glass" | "cells" | "backsheet" | "frame" | "junction";

export interface PanelLayer {
  id: PanelLayerId;
  nameKey: DictKey;
  descKey: DictKey;
  base: number;
  explode: number;
}

export const PANEL_LAYERS = [
  { id: "glass", nameKey: "panel.glass", descKey: "panel.glassD", base: 0.0086, explode: 0.3 },
  { id: "cells", nameKey: "panel.cells", descKey: "panel.cellsD", base: 0, explode: 0.1 },
  { id: "backsheet", nameKey: "panel.backsheet", descKey: "panel.backsheetD", base: -0.0072, explode: -0.12 },
  { id: "frame", nameKey: "panel.frame", descKey: "panel.frameD", base: -0.006, explode: -0.34 },
  { id: "junction", nameKey: "panel.junction", descKey: "panel.junctionD", base: -0.026, explode: -0.52 },
] as const satisfies readonly PanelLayer[];

export const LAYER_COUNT = PANEL_LAYERS.length;
