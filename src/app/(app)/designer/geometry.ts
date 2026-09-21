/**
 * Pure geometry for the Solar Designer. No physics, no irradiance, no prices —
 * only rectangles in metres. Everything here is deterministic and labeled
 * "calculated" in the UI because it derives from real panel dimensions and
 * from sizes the homeowner typed.
 */
import type { Obstacle, PanelGeometry, PlacedModule, PlacedPanel, RoofSpec } from "./designTypes";

export interface Rect { x: number; y: number; w: number; h: number }

export const SNAP_M = 0.1;
export const EDGE_MARGIN_M = 0.5;
export const DEFAULT_WALKWAY_M = 0.6;
export const GAP_M = 0.02;
const EPS = 1e-6;

export const snap = (v: number, step = SNAP_M) => Math.round(v / step) * step;
export const round2 = (v: number) => Math.round(v * 100) / 100;

export const setbackOf = (roof: RoofSpec) => Math.max(0, roof.setback_m ?? EDGE_MARGIN_M);
export const walkwayOf = (roof: RoofSpec) => Math.max(0, roof.walkway_m ?? DEFAULT_WALKWAY_M);

export function panelSize(p: PanelGeometry, rotation: 0 | 90): { w: number; h: number } {
  return rotation === 0 ? { w: p.length_m, h: p.width_m } : { w: p.width_m, h: p.length_m };
}

export function panelRect(p: PlacedPanel, g: PanelGeometry): Rect {
  const { w, h } = panelSize(g, p.rotation);
  return { x: p.x, y: p.y, w, h };
}

export const moduleRect = (m: PlacedModule): Rect => ({ x: m.x, y: m.y, w: m.w, h: m.h });

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS;
}

export function insideRoof(r: Rect, roof: RoofSpec): boolean {
  return r.x >= -EPS && r.y >= -EPS && r.x + r.w <= roof.length_m + EPS && r.y + r.h <= roof.width_m + EPS;
}

/** True when the rect intrudes into the clear strip along any roof edge. */
export function inSetback(r: Rect, roof: RoofSpec): boolean {
  const s = setbackOf(roof);
  if (s <= 0) return false;
  return r.x < s - EPS || r.y < s - EPS || r.x + r.w > roof.length_m - s + EPS || r.y + r.h > roof.width_m - s + EPS;
}

/** Clamp a rect's origin so the rect stays inside the roof. */
export function clampToRoof(x: number, y: number, w: number, h: number, roof: RoofSpec): { x: number; y: number } {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, roof.length_m - w)),
    y: Math.min(Math.max(0, y), Math.max(0, roof.width_m - h)),
  };
}

/** Snap a moving rect's edges to nearby rect edges (within `tol` metres), leaving GAP_M between them. */
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

export interface ProblemReport {
  panelIds: Set<string>;
  moduleIds: Set<string>;
  /** Hard problems: overlaps and things off the roof. */
  messages: string[];
  /** Soft problems: inside the edge setback. Shown, not painted red. */
  clearance: string[];
}

/** Detect panel–panel, panel–obstacle, panel–module, module–module, out-of-roof and setback problems. */
export function detectProblems(panels: PlacedPanel[], modules: PlacedModule[], obstacles: Obstacle[], roof: RoofSpec, g: PanelGeometry | null): ProblemReport {
  const panelIds = new Set<string>();
  const moduleIds = new Set<string>();
  const messages: string[] = [];
  const clearance: string[] = [];
  const setback = setbackOf(roof);

  const pr = g ? panels.map((p) => ({ p, r: panelRect(p, g) })) : [];
  for (let i = 0; i < pr.length; i++) {
    const a = pr[i];
    if (!insideRoof(a.r, roof)) { panelIds.add(a.p.id); messages.push(`Panel ${i + 1} extends beyond the roof edge.`); }
    else if (inSetback(a.r, roof)) clearance.push(`Panel ${i + 1} is inside the ${setback} m edge setback.`);
    for (let j = i + 1; j < pr.length; j++) {
      if (rectsOverlap(a.r, pr[j].r)) { panelIds.add(a.p.id); panelIds.add(pr[j].p.id); messages.push(`Panels ${i + 1} and ${j + 1} overlap.`); }
    }
    for (const o of obstacles) if (rectsOverlap(a.r, o)) { panelIds.add(a.p.id); messages.push(`Panel ${i + 1} overlaps ${o.label || "an obstacle"}.`); }
    for (const m of modules) if (rectsOverlap(a.r, moduleRect(m))) { panelIds.add(a.p.id); moduleIds.add(m.id); messages.push(`Panel ${i + 1} sits on the ${m.label.toLowerCase()}.`); }
  }
  for (let i = 0; i < modules.length; i++) {
    const a = modules[i], ar = moduleRect(a);
    if (!insideRoof(ar, roof)) { moduleIds.add(a.id); messages.push(`${a.label} extends beyond the roof edge.`); }
    for (const o of obstacles) if (rectsOverlap(ar, o)) { moduleIds.add(a.id); messages.push(`${a.label} overlaps ${o.label || "an obstacle"}.`); }
    for (let j = i + 1; j < modules.length; j++) {
      // Two walkways may cross; anything else standing on a walkway or on each other is a clash.
      const b = modules[j];
      if (a.kind === "walkway" && b.kind === "walkway") continue;
      if (rectsOverlap(ar, moduleRect(b))) { moduleIds.add(a.id); moduleIds.add(b.id); messages.push(`${a.label} and ${b.label} overlap.`); }
    }
  }
  return { panelIds, moduleIds, messages, clearance };
}

/** First position (scanning left→right, top→bottom on a 0.1 m grid) where a new rect fits without overlap. */
export function firstFreeSpot(w: number, h: number, blockers: Rect[], roof: RoofSpec, preferInsideSetback = true): { x: number; y: number } | null {
  if (w > roof.length_m || h > roof.width_m) return null;
  const s = preferInsideSetback ? setbackOf(roof) : 0;
  const scan = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y + h <= y1 + EPS; y = round2(y + SNAP_M)) {
      for (let x = x0; x + w <= x1 + EPS; x = round2(x + SNAP_M)) {
        const r = { x, y, w, h };
        if (!blockers.some((b) => rectsOverlap(r, b))) return { x, y };
      }
    }
    return null;
  };
  return scan(s, s, roof.length_m - s, roof.width_m - s) ?? (s > 0 ? scan(0, 0, roof.length_m, roof.width_m) : null);
}

/**
 * Rows of panels inside an area, skipping blockers. Optionally leaves a
 * walkway of `walkway` metres after every `walkwayEvery` rows, and reports
 * those strips so the caller can draw them as walkway modules. Tries both
 * rotations and keeps the one that fits more panels (rotation 0 wins ties).
 */
export function fillRows(area: Rect, g: PanelGeometry, blockers: Rect[], makeId: () => string, opts: { walkwayEvery?: number; walkway?: number; maxPanels?: number } = {}): { panels: PlacedPanel[]; walkways: Rect[] } {
  const attempt = (rotation: 0 | 90) => {
    const { w, h } = panelSize(g, rotation);
    const panels: PlacedPanel[] = [];
    const walkways: Rect[] = [];
    if (area.w < w || area.h < h) return { panels, walkways };
    let y = area.y, row = 0;
    while (y + h <= area.y + area.h + EPS) {
      for (let x = area.x; x + w <= area.x + area.w + EPS; x = round2(x + w + GAP_M)) {
        const r = { x: round2(x), y: round2(y), w, h };
        if (blockers.some((b) => rectsOverlap(r, b))) continue;
        panels.push({ id: makeId(), x: r.x, y: r.y, rotation });
        if (opts.maxPanels && panels.length >= opts.maxPanels) return { panels, walkways };
      }
      row++;
      y = round2(y + h + GAP_M);
      if (opts.walkwayEvery && opts.walkway && row % opts.walkwayEvery === 0) {
        // A walkway is due. If it and another row no longer fit, stop here:
        // a third row jammed against the second would break the layout's promise.
        if (y + opts.walkway + h > area.y + area.h + EPS) break;
        walkways.push({ x: area.x, y, w: area.w, h: opts.walkway });
        y = round2(y + opts.walkway);
      }
    }
    return { panels, walkways };
  };
  const a = attempt(0), b = attempt(90);
  return b.panels.length > a.panels.length ? b : a;
}

/** The roof minus its setback, as a rect. */
export function usableArea(roof: RoofSpec): Rect {
  const s = setbackOf(roof);
  return { x: s, y: s, w: Math.max(0, roof.length_m - 2 * s), h: Math.max(0, roof.width_m - 2 * s) };
}

/** Dense grid inside the setback, skipping obstacles and modules. */
export function autoFillGrid(roof: RoofSpec, g: PanelGeometry, blockers: Rect[], makeId: () => string, maxPanels?: number): PlacedPanel[] {
  return fillRows(usableArea(roof), g, blockers, makeId, { maxPanels }).panels;
}

export type InspireGoal = "max_energy" | "serviceable" | "mixed_use";
export interface InspireResult { panels: PlacedPanel[]; modules: PlacedModule[]; notes: string[] }

/**
 * "Get inspired": three deterministic layouts for the same roof. Pure geometry
 * from the panel's dimensions and the homeowner's setback, walkway and share
 * settings; nothing here knows about sun, money or structure, and the notes
 * say what each layout gives up.
 */
export function inspire(roof: RoofSpec, g: PanelGeometry, goal: InspireGoal, makeId: () => string, opts: { amenityShare: number }): InspireResult {
  const area = usableArea(roof);
  const blockers: Rect[] = [...roof.obstacles];
  const setback = setbackOf(roof), walkway = walkwayOf(roof);
  const toWalkways = (rs: Rect[]): PlacedModule[] => rs.map((r) => ({ id: makeId(), kind: "walkway", label: "Walkway", x: round2(r.x), y: round2(r.y), w: round2(r.w), h: round2(r.h) }));

  if (goal === "max_energy") {
    const { panels } = fillRows(area, g, blockers, makeId);
    return {
      panels, modules: [],
      notes: [
        `Dense rows inside the ${setback} m setback; ${panels.length} panels.`,
        "No walkway between rows. Cleaning and inspection reach panels from the setback strip only, which suits small roofs and short rows.",
      ],
    };
  }

  if (goal === "serviceable") {
    const { panels, walkways } = fillRows(area, g, blockers, makeId, { walkwayEvery: 2, walkway });
    return {
      panels, modules: toWalkways(walkways),
      notes: [
        `Pairs of rows with a ${walkway} m walkway after every second row; ${panels.length} panels.`,
        "Every panel edge can be reached on foot for cleaning, which matters in Kuwait's dust. Fewer panels than the dense layout.",
      ],
    };
  }

  // mixed_use: a leisure strip along the far (bottom) edge, the rest serviceable rows.
  const share = Math.min(0.8, Math.max(0.1, opts.amenityShare));
  const stripH = round2(Math.max(1.5, area.h * share));
  const strip: Rect = { x: area.x, y: round2(area.y + area.h - stripH), w: area.w, h: stripH };
  const leisure: PlacedModule = { id: makeId(), kind: "seating", label: "Leisure zone", x: strip.x, y: strip.y, w: round2(strip.w), h: round2(strip.h) };
  const panelArea: Rect = { x: area.x, y: area.y, w: area.w, h: Math.max(0, round2(area.h - stripH - walkway)) };
  const { panels, walkways } = fillRows(panelArea, g, blockers, makeId, { walkwayEvery: 2, walkway });
  const between: Rect = { x: area.x, y: round2(panelArea.y + panelArea.h), w: area.w, h: walkway };
  return {
    panels, modules: [leisure, ...toWalkways([...walkways, between])],
    notes: [
      `${Math.round(share * 100)} % of the usable depth reserved as one leisure zone along the far edge, separated from the panels by a ${walkway} m walkway; ${panels.length} panels.`,
      "The leisure zone is a placeholder footprint: replace it with the seating, planters or pergola you would actually put there, at their real sizes.",
    ],
  };
}

export function areaSummary(panels: PlacedPanel[], modules: PlacedModule[], roof: RoofSpec, g: PanelGeometry) {
  const roofArea = roof.length_m * roof.width_m;
  const obstacleArea = roof.obstacles.reduce((s, o) => s + o.w * o.h, 0);
  const moduleArea = modules.reduce((s, m) => s + m.w * m.h, 0);
  const panelArea = g.length_m * g.width_m;
  const used = panels.length * panelArea;
  const usableNet = Math.max(0, roofArea - obstacleArea);
  return {
    roofArea, obstacleArea, moduleArea, panelArea, used,
    remaining: Math.max(0, roofArea - obstacleArea - moduleArea - used),
    /** Panel area over roof minus obstacles, percent; null when there is nothing to divide by. */
    coveragePct: usableNet > 0 ? (used / usableNet) * 100 : null,
  };
}

/** Panels only: count × the manufacturer's weight. Null when the spec is missing. Mounting and ballast are not in the catalogue. */
export function panelWeightKg(count: number, weightKg: number | null | undefined): number | null {
  return weightKg === null || weightKg === undefined ? null : count * weightKg;
}
