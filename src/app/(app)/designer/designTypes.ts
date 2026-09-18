/**
 * Types shared by the Solar Designer (Features 8/9) and the Purchase flow (Feature 10).
 * All coordinates are metres, origin at the top-left corner of the roof, x to the right, y downward.
 */
import type { RoofOrientation } from "@/lib/types";

export interface Obstacle { id: string; x: number; y: number; w: number; h: number; label: string }
export interface PlacedPanel { id: string; x: number; y: number; rotation: 0 | 90 }
export interface RoofSpec { length_m: number; width_m: number; orientation: RoofOrientation; tilt_deg: number; obstacles: Obstacle[] }

/** Panel geometry taken from real catalog specs (never invented). */
export interface PanelGeometry { length_m: number; width_m: number; rated_power_w: number | null }

export interface DesignSummary { panel_count: number; used_area_m2: number; remaining_area_m2: number; capacity_kwp: number | null }

/** A saved design — persisted in localStorage (demo) or solar_designs (Supabase). */
export interface SavedDesign {
  id: string;
  name: string;
  roof: RoofSpec;
  panel_product_id: string;
  panel_name: string;
  panel: PanelGeometry;
  layout: PlacedPanel[];
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
