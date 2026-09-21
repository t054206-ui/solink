/**
 * Types shared by the Solar Designer (Features 8/9) and the Purchase flow (Feature 10).
 * All coordinates are metres, origin at the top-left corner of the roof, x to the right, y downward.
 */
import type { RoofOrientation } from "@/lib/types";

export interface Obstacle { id: string; x: number; y: number; w: number; h: number; label: string }
export interface PlacedPanel { id: string; x: number; y: number; rotation: 0 | 90 }

/**
 * A modular block that is not a panel: a walkway, a planter, seating, a pergola,
 * or anything the homeowner names. Sizes are whatever they typed, so they are
 * "user" data, never a catalogue figure. Panels cannot sit on a module.
 */
export type ModuleKind = "walkway" | "planter" | "seating" | "pergola" | "custom";
export interface PlacedModule { id: string; kind: ModuleKind; label: string; x: number; y: number; w: number; h: number }

export interface RoofSpec {
  length_m: number;
  width_m: number;
  orientation: RoofOrientation;
  tilt_deg: number;
  obstacles: Obstacle[];
  /** Clear strip kept free along every roof edge. The homeowner's setting. */
  setback_m?: number;
  /** Minimum clear width of a service walkway between panel rows. The homeowner's setting. */
  walkway_m?: number;
}

/** Panel geometry taken from real catalog specs (never invented). */
export interface PanelGeometry { length_m: number; width_m: number; rated_power_w: number | null; weight_kg?: number | null }

export interface DesignSummary {
  panel_count: number;
  used_area_m2: number;
  remaining_area_m2: number;
  capacity_kwp: number | null;
  module_count?: number;
  /** Panel area as a share of the roof minus obstacles, in percent. */
  coverage_pct?: number | null;
  /** Panels only, from the manufacturer's weight spec. Mounting and ballast are not in the catalogue. */
  total_panel_weight_kg?: number | null;
}

/** A saved design — persisted in localStorage (demo) or solar_designs (Supabase). */
export interface SavedDesign {
  id: string;
  name: string;
  roof: RoofSpec;
  panel_product_id: string;
  panel_name: string;
  panel: PanelGeometry;
  layout: PlacedPanel[];
  modules?: PlacedModule[];
  summary: DesignSummary;
  is_ai_suggested: boolean;
  is_demo_product: boolean;
  created_at: string;
}

export interface DesignerStore { designs: SavedDesign[] }
export const EMPTY_DESIGNER_STORE: DesignerStore = { designs: [] };

export function newId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rnd}`;
}
