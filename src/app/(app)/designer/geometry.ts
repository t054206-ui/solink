/**
 * Pure geometry for the Solar Designer. No physics, no irradiance, no prices —
 * only rectangles in metres. Everything here is deterministic and labeled
 * "calculated" in the UI because it derives from real panel dimensions.
 */
import type { Obstacle, PanelGeometry, PlacedPanel, RoofSpec } from "./designTypes";

export interface Rect { x: number; y: number; w: number; h: number }

export const SNAP_M = 0.1;
export const EDGE_MARGIN_M = 0.5;
export const GAP_M = 0.02;
const EPS = 1e-6;

export const snap = (v: number, step = SNAP_M) => Math.round(v / step) * step;
export const round2 = (v: number) => Math.round(v * 100) / 100;

export function panelSize(p: PanelGeometry, rotation: 0 | 90): { w: number; h: number } {
  return rotation === 0 ? { w: p.length_m, h: p.width_m } : { w: p.width_m, h: p.length_m };
}

export function panelRect(p: PlacedPanel, g: PanelGeometry): Rect {
  const { w, h } = panelSize(g, p.rotation);
  return { x: p.x, y: p.y, w, h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS;
}

export function insideRoof(r: Rect, roof: RoofSpec): boolean {
  return r.x >= -EPS && r.y >= -EPS && r.x + r.w <= roof.length_m + EPS && r.y + r.h <= roof.width_m + EPS;
}

/** Clamp a rect's origin so the rect stays inside the roof. */
export function clampToRoof(x: number, y: number, w: number, h: number, roof: RoofSpec): { x: number; y: number } {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, roof.length_m - w)),
    y: Math.min(Math.max(0, y), Math.max(0, roof.width_m - h)),
  };
}

/** Snap a moving rect's edges to nearby panel edges (within `tol` metres), leaving GAP_M between them. */
export function snapToNeighbours(moving: Rect, others: Rect[], tol = 0.15): { x: number; y: number } {
  let { x, y } = moving;
  let bestDx = Infinity, bestDy = Infinity;
  for (const o of others) {
    const candidatesX = [o.x + o.w + GAP_M, o.x - moving.w - GAP_M, o.x, o.x + o.w - moving.w];
    const candidatesY = [o.y + o.h + GAP_M, o.y - moving.h - GAP_M, o.y, o.y + o.h - moving.h];
    for (const cx of candidatesX) { const d = Math.abs(cx - moving.x); if (d < tol && d < bestDx) { bestDx = d; x = cx; } }
    for (const cy of candidatesY) { const d = Math.abs(cy - moving.y); if (d < tol && d < bestDy) { bestDy = d; y = cy; } }
  }
  return { x: round2(x), y: round2(y) };
}

export interface OverlapReport { panelIds: Set<string>; messages: string[] }

/** Detect panel–panel, panel–obstacle and out-of-roof problems. */
export function detectProblems(panels: PlacedPanel[], obstacles: Obstacle[], roof: RoofSpec, g: PanelGeometry): OverlapReport {
  const ids = new Set<string>();
  const messages: string[] = [];
  const rects = panels.map((p) => ({ p, r: panelRect(p, g) }));
  for (let i = 0; i < rects.length; i++) {
    const a = rects[i];
    if (!insideRoof(a.r, roof)) { ids.add(a.p.id); messages.push(`Panel ${i + 1} extends beyond the roof edge.`); }
    for (let j = i + 1; j < rects.length; j++) {
      if (rectsOverlap(a.r, rects[j].r)) { ids.add(a.p.id); ids.add(rects[j].p.id); messages.push(`Panels ${i + 1} and ${j + 1} overlap.`); }
    }
    for (const o of obstacles) {
      if (rectsOverlap(a.r, o)) { ids.add(a.p.id); messages.push(`Panel ${i + 1} overlaps ${o.label || "an obstacle"}.`); }
    }
  }
  return { panelIds: ids, messages };
}

/** First position (scanning left→right, top→bottom on a 0.1 m grid) where a new panel fits without overlap. */
export function firstFreeSpot(panels: PlacedPanel[], obstacles: Obstacle[], roof: RoofSpec, g: PanelGeometry, rotation: 0 | 90): { x: number; y: number } | null {
  const { w, h } = panelSize(g, rotation);
  if (w > roof.length_m || h > roof.width_m) return null;
  const blockers: Rect[] = [...panels.map((p) => panelRect(p, g)), ...obstacles];
  const step = SNAP_M;
  for (let y = 0; y + h <= roof.width_m + EPS; y = round2(y + step)) {
    for (let x = 0; x + w <= roof.length_m + EPS; x = round2(x + step)) {
      const r = { x, y, w, h };
      if (!blockers.some((b) => rectsOverlap(r, b))) return { x, y };
    }
  }
  return null;
}

/**
 * Deterministic grid fill: 0.5 m edge margin, 0.02 m gaps, skip obstacles.
 * Tries both rotations and returns the layout with more panels (rotation 0 wins ties).
 */
export function autoFillGrid(roof: RoofSpec, g: PanelGeometry, makeId: () => string, maxPanels?: number): PlacedPanel[] {
  const fillFor = (rotation: 0 | 90): PlacedPanel[] => {
    const { w, h } = panelSize(g, rotation);
    const usableW = roof.length_m - 2 * EDGE_MARGIN_M;
    const usableH = roof.width_m - 2 * EDGE_MARGIN_M;
    if (usableW < w || usableH < h) return [];
    const cols = Math.floor((usableW + GAP_M) / (w + GAP_M));
    const rows = Math.floor((usableH + GAP_M) / (h + GAP_M));
    const out: PlacedPanel[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = round2(EDGE_MARGIN_M + c * (w + GAP_M));
        const y = round2(EDGE_MARGIN_M + r * (h + GAP_M));
        const rect = { x, y, w, h };
        if (roof.obstacles.some((o) => rectsOverlap(rect, o))) continue;
        out.push({ id: makeId(), x, y, rotation });
        if (maxPanels && out.length >= maxPanels) return out;
      }
    }
    return out;
  };
  const a = fillFor(0), b = fillFor(90);
  return b.length > a.length ? b : a;
}

export function areaSummary(panels: PlacedPanel[], roof: RoofSpec, g: PanelGeometry) {
  const roofArea = roof.length_m * roof.width_m;
  const obstacleArea = roof.obstacles.reduce((s, o) => s + o.w * o.h, 0);
  const panelArea = g.length_m * g.width_m;
  const used = panels.length * panelArea;
  return { roofArea, obstacleArea, panelArea, used, remaining: Math.max(0, roofArea - obstacleArea - used) };
}
