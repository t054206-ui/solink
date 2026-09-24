"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw, Trash2, Undo2, Grid3x3, Sparkles, Save, ArrowRight, ArrowUp, ArrowDown, ArrowLeft, Eraser, AlertTriangle, FolderOpen, Image as ImageIcon, PenLine, Lightbulb, Scale, ListChecks, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Metric, hasValue } from "@/components/ui/Metric";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { AiResting } from "@/components/ui/AiResting";
import { UnavailableState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { InfoTip } from "@/components/help/InfoTip";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { systemCapacityKwp, annualProductionKwh, formatNumber } from "@/lib/solar/calculations";
import { classified, unavailable, type Classified } from "@/lib/classification";
import type { DataMode } from "@/lib/data/mode";
import type { PlatformSettings } from "@/lib/data/settings";
import { resolveAssumption } from "../_plan/AssumptionField";
import type { RoofOrientation, SolarProfile } from "@/lib/types";
import type { RoofScanResult } from "@/app/api/ai/inspect-roof/route";
import { cn, formatMoney } from "@/lib/utils";
import { EMPTY_DESIGNER_STORE, newId, type DesignerStore, type ModuleKind, type Obstacle, type PanelGeometry, type PlacedModule, type PlacedPanel, type RoofSpec, type SavedDesign } from "./designTypes";
import { MODULE_KINDS, MODULE_ORDER } from "./modules";
import { areaSummary, autoFillGrid, clampToRoof, detectProblems, firstFreeSpot, inspire, moduleRect, panelRect, panelSize, panelWeightKg, round2, setbackOf, snap, snapToNeighbours as snapNeighbours, walkwayOf, type InspireGoal, type Rect } from "./geometry";
import { DesignVisual } from "@/components/three/DesignVisual";
import type { Plan } from "@/components/three/DesignScene";
import { saveDesignAction } from "./actions";

export interface PanelOption {
  id: string; name: string; manufacturer: string; model: string;
  length_m: number | null; width_m: number | null; rated_power_w: number | null; weight_kg: number | null;
  price: number | null; currency: string; installation_cost: number | null; is_demo: boolean;
}

type ServerProfile = Pick<SolarProfile, "roof_length_m" | "roof_width_m" | "roof_orientation" | "roof_tilt_deg" | "shading_notes">;

interface AiSuggestion { panels: { x: number; y: number; rotation: 0 | 90 }[]; rationale: string[]; assumptions: string[]; missing_data: string[]; disclaimer: string }
type AiState = { status: "idle" } | { status: "loading" } | { status: "not_configured"; message: string } | { status: "error"; message: string } | { status: "ready"; suggestion: AiSuggestion };
type ScanState = { status: "idle" } | { status: "loading" } | { status: "not_configured"; message: string } | { status: "error"; message: string } | { status: "ready"; result: RoofScanResult };

/** One undo step holds both layers, so undoing an inspired layout removes its walkways too. */
interface Snapshot { panels: PlacedPanel[]; modules: PlacedModule[]; obstacles?: Obstacle[] }
type Selection = { kind: "panel" | "module" | "obstacle"; id: string } | null;

const ORIENTATIONS: RoofOrientation[] = ["flat", "N", "NE", "E", "SE", "S", "SW", "W", "NW", "unknown"];
const PX_PER_M = 60;
const PAD = 28;
const MAX_HISTORY = 40;
const EMPTY: Snapshot = { panels: [], modules: [] };

const DEFAULT_ROOF: RoofSpec = { length_m: 12, width_m: 8, orientation: "flat", tilt_deg: 0, obstacles: [], setback_m: 0.5, walkway_m: 0.6 };

/**
 * The roof planner. Two ways in, both always available: type the roof, or drop
 * a photo of it under the grid and trace what is there. Panels come from the
 * catalogue at their real size; every other block is whatever size the
 * homeowner typed. The drawing is geometry and says so; what the roof can
 * carry, what the system will produce and what it costs stay unavailable until
 * the data exists.
 */
export function DesignerCanvas({ mode, panels, preselectPanelId, serverProfile, settings }: { mode: DataMode; panels: PanelOption[]; preselectPanelId: string | null; serverProfile: ServerProfile | null; settings: PlatformSettings }) {
  const router = useRouter();
  const [localProfile, , profileLoaded] = useLocalStore<Partial<SolarProfile> | null>("profile", null);
  const [store, setStore, storeLoaded] = useLocalStore<DesignerStore>("designer", EMPTY_DESIGNER_STORE);
  // Simple by default (the owner's choice, 2026-09-22): a parent sees roof, panel,
  // one button and the results. Everything else waits behind this switch.
  const [advanced, setAdvanced] = useLocalStore<boolean>("designer:advanced", false);

  /* ---------------- roof & obstacles ---------------- */
  const prefillRoof = useMemo<RoofSpec>(() => {
    const src = profileLoaded && localProfile?.roof_length_m && localProfile?.roof_width_m ? localProfile : serverProfile;
    if (!src?.roof_length_m || !src?.roof_width_m) return DEFAULT_ROOF;
    return { ...DEFAULT_ROOF, length_m: src.roof_length_m, width_m: src.roof_width_m, orientation: (src.roof_orientation as RoofOrientation | null) ?? DEFAULT_ROOF.orientation, tilt_deg: src.roof_tilt_deg ?? DEFAULT_ROOF.tilt_deg };
  }, [profileLoaded, localProfile, serverProfile]);
  const prefillShading = (profileLoaded ? localProfile?.shading_notes : null) ?? serverProfile?.shading_notes ?? "";
  const [roofState, setRoofState] = useState<RoofSpec | null>(null);
  const [shadingState, setShadingState] = useState<string | null>(null);
  const roof = roofState ?? prefillRoof;
  const shadingNotes = shadingState ?? prefillShading;
  const setRoof = useCallback((u: RoofSpec | ((r: RoofSpec) => RoofSpec)) => setRoofState((prev) => (typeof u === "function" ? u(prev ?? prefillRoof) : u)), [prefillRoof]);
  const setShadingNotes = (v: string) => setShadingState(v);
  const setback = setbackOf(roof), walkway = walkwayOf(roof);

  const [obstacleDraft, setObstacleDraft] = useState({ x: "1", y: "1", w: "1.5", h: "1.5", label: "Water tank" });

  /* ---------------- panel product ---------------- */
  const usable = useMemo(() => panels.filter((p) => p.length_m && p.width_m), [panels]);
  const [panelId, setPanelId] = useState<string>(() => {
    const pre = panels.find((p) => p.id === preselectPanelId && p.length_m && p.width_m);
    return pre?.id ?? usable[0]?.id ?? "";
  });
  const product = useMemo(() => panels.find((p) => p.id === panelId) ?? null, [panels, panelId]);
  const geom = useMemo<PanelGeometry | null>(() => (product && product.length_m && product.width_m ? { length_m: product.length_m, width_m: product.width_m, rated_power_w: product.rated_power_w, weight_kg: product.weight_kg } : null), [product]);

  /* ---------------- modules palette ---------------- */
  const [moduleDraft, setModuleDraft] = useState<{ kind: ModuleKind; label: string; w: string; h: string }>({ kind: "walkway", label: MODULE_KINDS.walkway.label, w: String(MODULE_KINDS.walkway.w), h: String(MODULE_KINDS.walkway.h) });
  const pickModuleKind = (kind: ModuleKind) => setModuleDraft({ kind, label: MODULE_KINDS[kind].label, w: String(MODULE_KINDS[kind].w), h: String(MODULE_KINDS[kind].h) });

  /* ---------------- layout state + history ---------------- */
  const [lay, setLay] = useState<Snapshot>(EMPTY);
  const placed = lay.panels, modules = lay.modules;
  const [sel, setSel] = useState<Selection>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [snapNeighboursOn, setSnapNeighboursOn] = useState(true);
  const [aiSuggested, setAiSuggested] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const commit = useCallback((next: Partial<Snapshot> | ((prev: Snapshot) => Partial<Snapshot>), opts: { keepAi?: boolean } = {}) => {
    setLay((prev) => {
      const patch = typeof next === "function" ? next(prev) : next;
      setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), prev]);
      return { ...prev, ...patch };
    });
    if (!opts.keepAi) setAiSuggested(false);
  }, []);

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setLay({ panels: prev.panels, modules: prev.modules });
      if (prev.obstacles) setRoof((r) => ({ ...r, obstacles: prev.obstacles! }));
      setSel((s) => {
        if (!s) return s;
        const list = s.kind === "panel" ? prev.panels : s.kind === "module" ? prev.modules : (prev.obstacles ?? roof.obstacles);
        return list.some((p) => p.id === s.id) ? s : null;
      });
      return h.slice(0, -1);
    });
  };

  const changePanel = (id: string) => {
    if (id === panelId) return;
    setPanelId(id);
    if (placed.length) { setLay((l) => ({ ...l, panels: [] })); setHistory([]); setSel(null); setAiSuggested(false); setNotice("Panels cleared because the panel model changed. Modules were kept."); }
  };

  const panelBlockers = useMemo<Rect[]>(() => [...roof.obstacles, ...modules.map(moduleRect)], [roof.obstacles, modules]);
  const moduleBlockers = useMemo<Rect[]>(() => (geom ? [...roof.obstacles, ...placed.map((p) => panelRect(p, geom)), ...modules.map(moduleRect)] : [...roof.obstacles, ...modules.map(moduleRect)]), [roof.obstacles, placed, modules, geom]);

  const addPanel = (rotation: 0 | 90 = 0) => {
    if (!geom) return;
    const blockers = [...panelBlockers, ...placed.map((p) => panelRect(p, geom))];
    const a = panelSize(geom, rotation), b = panelSize(geom, rotation === 0 ? 90 : 0);
    let rot = rotation;
    let spot = firstFreeSpot(a.w, a.h, blockers, roof);
    if (!spot) { spot = firstFreeSpot(b.w, b.h, blockers, roof); rot = rotation === 0 ? 90 : 0; }
    if (!spot) { setNotice("No free space for another panel at this size."); return; }
    const p: PlacedPanel = { id: newId("pnl"), x: spot.x, y: spot.y, rotation: rot };
    commit((prev) => ({ panels: [...prev.panels, p] }));
    setSel({ kind: "panel", id: p.id });
    setNotice(null);
  };
  const addModule = () => {
    const w = Math.max(0.1, round2(Number(moduleDraft.w) || 0.1)), h = Math.max(0.1, round2(Number(moduleDraft.h) || 0.1));
    const spot = firstFreeSpot(w, h, moduleBlockers, roof, false);
    if (!spot) { setNotice(`No free space for a ${w} × ${h} m block.`); return; }
    const m: PlacedModule = { id: newId("mod"), kind: moduleDraft.kind, label: moduleDraft.label.trim() || MODULE_KINDS[moduleDraft.kind].label, x: spot.x, y: spot.y, w, h };
    commit((prev) => ({ modules: [...prev.modules, m] }));
    setSel({ kind: "module", id: m.id });
    setNotice(null);
  };
  const rotateSelected = () => {
    if (!sel) return;
    if (sel.kind === "panel" && geom) {
      commit((prev) => ({ panels: prev.panels.map((p) => {
        if (p.id !== sel.id) return p;
        const rot: 0 | 90 = p.rotation === 0 ? 90 : 0;
        const { w, h } = panelSize(geom, rot);
        const c = clampToRoof(p.x, p.y, w, h, roof);
        return { ...p, rotation: rot, x: c.x, y: c.y };
      }) }));
    } else if (sel.kind === "module") {
      commit((prev) => ({ modules: prev.modules.map((m) => {
        if (m.id !== sel.id) return m;
        const c = clampToRoof(m.x, m.y, m.h, m.w, roof);
        return { ...m, w: m.h, h: m.w, x: c.x, y: c.y };
      }) }));
    } else if (sel.kind === "obstacle") {
      setHistory((hist) => [...hist.slice(-(MAX_HISTORY - 1)), { ...lay, obstacles: roof.obstacles }]);
      setRoof((r) => ({ ...r, obstacles: r.obstacles.map((o) => (o.id !== sel.id ? o : { ...o, w: o.h, h: o.w, ...clampToRoof(o.x, o.y, o.h, o.w, r) })) }));
    }
  };
  const removeSelected = () => {
    if (!sel) return;
    if (sel.kind === "obstacle") {
      setHistory((hist) => [...hist.slice(-(MAX_HISTORY - 1)), { ...lay, obstacles: roof.obstacles }]);
      setRoof((r) => ({ ...r, obstacles: r.obstacles.filter((o) => o.id !== sel.id) }));
      setSel(null);
      return;
    }
    commit((prev) => (sel.kind === "panel" ? { panels: prev.panels.filter((p) => p.id !== sel.id) } : { modules: prev.modules.filter((m) => m.id !== sel.id) }));
    setSel(null);
  };
  const clearAll = () => { if (!placed.length && !modules.length) return; commit(EMPTY); setSel(null); setAiSuggested(false); setInspireNotes(null); };
  const nudge = (dx: number, dy: number) => {
    if (!sel) return;
    if (sel.kind === "panel" && geom) {
      commit((prev) => ({ panels: prev.panels.map((p) => {
        if (p.id !== sel.id) return p;
        const { w, h } = panelSize(geom, p.rotation);
        const c = clampToRoof(round2(p.x + dx), round2(p.y + dy), w, h, roof);
        return { ...p, x: c.x, y: c.y };
      }) }));
    } else if (sel.kind === "module") {
      commit((prev) => ({ modules: prev.modules.map((m) => (m.id !== sel.id ? m : { ...m, ...clampToRoof(round2(m.x + dx), round2(m.y + dy), m.w, m.h, roof) })) }));
    } else if (sel.kind === "obstacle") {
      setHistory((hist) => [...hist.slice(-(MAX_HISTORY - 1)), { ...lay, obstacles: roof.obstacles }]);
      setRoof((r) => ({ ...r, obstacles: r.obstacles.map((o) => (o.id !== sel.id ? o : { ...o, ...clampToRoof(round2(o.x + dx), round2(o.y + dy), o.w, o.h, r) })) }));
    }
  };
  const autoFill = () => {
    if (!geom) return;
    const layout = autoFillGrid(roof, geom, panelBlockers, () => newId("pnl"));
    commit({ panels: layout });
    setSel(null);
    setInspireNotes(null);
    setNotice(layout.length ? null : `The roof (minus the ${setback} m setback) is too small for this panel.`);
  };

  /* ---------------- get inspired ---------------- */
  const [amenityShare, setAmenityShare] = useState("30");
  const [inspireNotes, setInspireNotes] = useState<{ goal: InspireGoal; notes: string[] } | null>(null);
  const getInspired = (goal: InspireGoal) => {
    if (!geom) return;
    const share = Math.min(80, Math.max(10, Number(amenityShare) || 30)) / 100;
    const r = inspire(roof, geom, goal, () => newId(goal === "max_energy" ? "pnl" : "ins"), { amenityShare: share });
    commit({ panels: r.panels, modules: r.modules });
    setSel(null);
    setInspireNotes({ goal, notes: r.notes });
    setNotice(r.panels.length ? null : "No panel fits inside the setback on this roof.");
  };

  /* ---------------- photo underlay + tracing ---------------- */
  const [photo, setPhoto] = useState<{ url: string; file: File } | null>(null);
  const [photoOpacity, setPhotoOpacity] = useState(0.6);
  const [traceMode, setTraceMode] = useState(false);
  const [traceDraft, setTraceDraft] = useState<Rect | null>(null);
  const traceRef = useRef<{ x0: number; y0: number } | null>(null);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  const onPhotoFile = (f: File | null) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setNotice("Use a JPEG, PNG or WEBP photo."); return; }
    setPhoto({ url: URL.createObjectURL(f), file: f });
    setScan({ status: "idle" });
    setNotice(null);
  };
  const [scan, setScan] = useState<ScanState>({ status: "idle" });
  const readPhoto = async () => {
    if (!photo) return;
    setScan({ status: "loading" });
    try {
      const body = new FormData();
      body.append("frames", photo.file);
      body.append("roof_area_m2", String(round2(roof.length_m * roof.width_m)));
      const res = await fetch("/api/ai/inspect-roof", { method: "POST", body });
      const json = await res.json();
      if (json.ok) setScan({ status: "ready", result: json.result as RoofScanResult });
      else if (json.reason === "not_configured") setScan({ status: "not_configured", message: json.message });
      else setScan({ status: "error", message: json.message ?? "The photo could not be read." });
    } catch {
      setScan({ status: "error", message: "Network error while sending the photo." });
    }
  };

  /* ---------------- drag (pointer events) ---------------- */
  const svgRef = useRef<SVGSVGElement>(null);
  const viewW = roof.length_m * PX_PER_M + PAD * 2;
  const viewH = roof.width_m * PX_PER_M + PAD * 2;
  // "resize" drags the bottom-right corner of a block; panels are never resized (they are real products).
  const dragRef = useRef<{ kind: "panel" | "module" | "resize" | "obstacle" | "obstacle-resize"; id: string; offX: number; offY: number; before: Snapshot; moved: boolean } | null>(null);

  const toMetres = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    const sx = viewW / r.width, sy = viewH / r.height;
    return { x: ((e.clientX - r.left) * sx - PAD) / PX_PER_M, y: ((e.clientY - r.top) * sy - PAD) / PX_PER_M };
  };
  const clampPt = (m: { x: number; y: number }) => ({ x: Math.min(roof.length_m, Math.max(0, m.x)), y: Math.min(roof.width_m, Math.max(0, m.y)) });

  const startDrag = (e: ReactPointerEvent<SVGGElement>, kind: "panel" | "module" | "obstacle", id: string, x: number, y: number) => {
    if (traceMode) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const m = toMetres(e);
    dragRef.current = { kind, id, offX: m.x - x, offY: m.y - y, before: { ...lay, obstacles: roof.obstacles }, moved: false };
    setSel({ kind, id });
    svgRef.current?.focus();
  };
  const startResize = (e: ReactPointerEvent<SVGRectElement>, target: { kind: "module" | "obstacle"; id: string }) => {
    if (traceMode) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { kind: target.kind === "module" ? "resize" : "obstacle-resize", id: target.id, offX: 0, offY: 0, before: { ...lay, obstacles: roof.obstacles }, moved: false };
    setSel(target);
  };
  /** Set an obstacle's size directly; snapped, at least 0.2 m, kept on the roof. */
  const resizeObstacle = (id: string, w: number, h: number) => {
    setHistory((hist) => [...hist.slice(-(MAX_HISTORY - 1)), { ...lay, obstacles: roof.obstacles }]);
    setRoof((r) => ({ ...r, obstacles: r.obstacles.map((o) => {
      if (o.id !== id) return o;
      return { ...o, w: round2(Math.min(Math.max(0.2, snap(w)), r.length_m - o.x)), h: round2(Math.min(Math.max(0.2, snap(h)), r.width_m - o.y)) };
    }) }));
  };
  /** Set a block's size directly (keyboard and the size fields); snapped, at least 0.2 m, kept on the roof. */
  const resizeModule = (id: string, w: number, h: number) => {
    commit((prev) => ({ modules: prev.modules.map((m) => {
      if (m.id !== id) return m;
      const nw = round2(Math.min(Math.max(0.2, snap(w)), roof.length_m - m.x));
      const nh = round2(Math.min(Math.max(0.2, snap(h)), roof.width_m - m.y));
      return { ...m, w: nw, h: nh };
    }) }));
  };
  const onSvgPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (traceMode) {
      const m = clampPt(toMetres(e));
      traceRef.current = { x0: snap(m.x), y0: snap(m.y) };
      setTraceDraft(null);
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    setSel(null);
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const t = traceRef.current;
    if (t) {
      const m = clampPt(toMetres(e));
      const x1 = snap(m.x), y1 = snap(m.y);
      setTraceDraft({ x: round2(Math.min(t.x0, x1)), y: round2(Math.min(t.y0, y1)), w: round2(Math.abs(x1 - t.x0)), h: round2(Math.abs(y1 - t.y0)) });
      return;
    }
    const d = dragRef.current; if (!d) return;
    const m = toMetres(e);
    if (d.kind === "obstacle" || d.kind === "obstacle-resize") {
      setRoof((r) => ({ ...r, obstacles: r.obstacles.map((o) => {
        if (o.id !== d.id) return o;
        if (d.kind === "obstacle-resize") {
          const w = round2(Math.min(Math.max(0.2, snap(m.x - o.x)), r.length_m - o.x));
          const h = round2(Math.min(Math.max(0.2, snap(m.y - o.y)), r.width_m - o.y));
          if (w !== o.w || h !== o.h) d.moved = true;
          return { ...o, w, h };
        }
        const c = clampToRoof(snap(m.x - d.offX), snap(m.y - d.offY), o.w, o.h, r);
        if (c.x !== o.x || c.y !== o.y) d.moved = true;
        return { ...o, x: round2(c.x), y: round2(c.y) };
      }) }));
      return;
    }
    setLay((prev) => {
      if (d.kind === "resize") {
        return { ...prev, modules: prev.modules.map((mod) => {
          if (mod.id !== d.id) return mod;
          const w = round2(Math.min(Math.max(0.2, snap(m.x - mod.x)), roof.length_m - mod.x));
          const h = round2(Math.min(Math.max(0.2, snap(m.y - mod.y)), roof.width_m - mod.y));
          if (w !== mod.w || h !== mod.h) d.moved = true;
          return { ...mod, w, h };
        }) };
      }
      if (d.kind === "panel") {
        if (!geom) return prev;
        return { ...prev, panels: prev.panels.map((p) => {
          if (p.id !== d.id) return p;
          const { w, h } = panelSize(geom, p.rotation);
          let x = snap(m.x - d.offX), y = snap(m.y - d.offY);
          if (snapNeighboursOn) {
            const others = [...prev.panels.filter((o) => o.id !== p.id).map((o) => panelRect(o, geom)), ...prev.modules.map(moduleRect)];
            ({ x, y } = snapNeighbours({ x, y, w, h }, others));
          }
          const c = clampToRoof(x, y, w, h, roof);
          if (c.x !== p.x || c.y !== p.y) d.moved = true;
          return { ...p, x: round2(c.x), y: round2(c.y) };
        }) };
      }
      return { ...prev, modules: prev.modules.map((mod) => {
        if (mod.id !== d.id) return mod;
        let x = snap(m.x - d.offX), y = snap(m.y - d.offY);
        if (snapNeighboursOn) {
          const others = [...(geom ? prev.panels.map((o) => panelRect(o, geom)) : []), ...prev.modules.filter((o) => o.id !== mod.id).map(moduleRect)];
          ({ x, y } = snapNeighbours({ x, y, w: mod.w, h: mod.h }, others));
        }
        const c = clampToRoof(x, y, mod.w, mod.h, roof);
        if (c.x !== mod.x || c.y !== mod.y) d.moved = true;
        return { ...mod, x: round2(c.x), y: round2(c.y) };
      }) };
    });
  };
  const endPointer = () => {
    const t = traceRef.current;
    if (t) {
      traceRef.current = null;
      const r = traceDraft;
      setTraceDraft(null);
      if (r && r.w >= 0.2 && r.h >= 0.2) {
        const o: Obstacle = { id: newId("obs"), x: r.x, y: r.y, w: r.w, h: r.h, label: obstacleDraft.label.trim() || "Obstacle" };
        setRoof((rf) => ({ ...rf, obstacles: [...rf.obstacles, o] }));
        setNotice(`Added "${o.label}", ${r.w} × ${r.h} m, from your tracing. Change the label above before tracing the next one.`);
      }
      return;
    }
    const d = dragRef.current; if (!d) return;
    if (d.moved) { setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), d.before]); setAiSuggested(false); }
    dragRef.current = null;
  };

  const onKeyDown = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    if (!sel) return;
    const step = e.shiftKey ? 0.5 : 0.1;
    const map: Record<string, () => void> = {
      ArrowLeft: () => nudge(-step, 0), ArrowRight: () => nudge(step, 0), ArrowUp: () => nudge(0, -step), ArrowDown: () => nudge(0, step),
      r: rotateSelected, R: rotateSelected, Delete: removeSelected, Backspace: removeSelected, Escape: () => setSel(null),
    };
    const fn = map[e.key];
    if (fn) { e.preventDefault(); fn(); }
  };

  /* ---------------- derived metrics ---------------- */
  const problems = useMemo(() => detectProblems(placed, modules, roof.obstacles, roof, geom), [placed, modules, roof, geom]);
  const areas = useMemo(() => (geom ? areaSummary(placed, modules, roof, geom) : null), [placed, modules, roof, geom]);
  const capacity = systemCapacityKwp(placed.length, geom?.rated_power_w ?? null);

  const [psh, setPsh] = useState("");
  const [pr, setPr] = useState("");
  const pshNum = psh.trim() === "" ? null : Number(psh);
  const prNum = pr.trim() === "" ? null : Number(pr);
  // Platform values (Global Solar Atlas sun hours, PVWatts losses) unless the person typed their own.
  const pshR = resolveAssumption(Number.isFinite(pshNum as number) ? pshNum : null, settings.peak_sun_hours_per_day);
  const prR = resolveAssumption(Number.isFinite(prNum as number) ? prNum : null, settings.performance_ratio);
  const productionRaw = annualProductionKwh(capacity.value, { peakSunHoursPerDay: pshR.value, performanceRatio: prR.value });
  const production: Classified = productionRaw.value !== null
    ? { ...productionRaw, notes: [...(productionRaw.notes ?? []), pshR.cls === "user" || prR.cls === "user" ? "Uses a value you typed under more options, not a data source." : `Sun hours and losses from platform settings: ${pshR.source ?? ""}${prR.source ? `; ${prR.source}` : ""}`] }
    : productionRaw;

  const cost: Classified = (() => {
    if (!product) return unavailable("Select a panel.");
    const missing: string[] = [];
    if (product.price === null) missing.push("panel price not provided");
    if (product.installation_cost === null) missing.push("installation (your installer's quote)");
    if (missing.length) return unavailable(missing.join(" · "));
    return classified(placed.length * (product.price as number) + (product.installation_cost as number), "calculated", "Catalog prices", [`${placed.length} × ${product.price} + installation ${product.installation_cost}`]);
  })();

  const countCls: Classified = classified(placed.length, "calculated", "Roof geometry");
  const usedCls: Classified = areas ? classified(areas.used, "calculated", "Panel dimensions × count") : unavailable("Select a panel with dimensions.");
  const coverageCls: Classified = areas ? (areas.coveragePct === null ? unavailable("The roof has no free area.") : classified(areas.coveragePct, "calculated", "Panel area ÷ (roof − obstacles)", ["Modules and setback are not deducted: this is how much of the open roof carries panels."])) : unavailable("Select a panel with dimensions.");
  const remainingCls: Classified = areas ? classified(areas.remaining, "calculated", "Roof − obstacles − modules − panels", ["Gross area; the setback strip is included in what remains."]) : unavailable("Select a panel with dimensions.");
  const weightTotal = panelWeightKg(placed.length, geom?.weight_kg);
  const weightCls: Classified = !geom ? unavailable("Select a panel.") : weightTotal === null ? unavailable("The manufacturer's weight is not in this panel's specification.") : classified(weightTotal, "calculated", "Count × manufacturer's weight per panel", ["Panels only. Mounting rails, clamps and ballast are not in the catalogue and are not included."]);
  const loadCls: Classified = !geom || geom.weight_kg === null || geom.weight_kg === undefined ? unavailable("Needs the panel's weight.") : classified(geom.weight_kg / (geom.length_m * geom.width_m), "calculated", "Weight ÷ panel area", ["Spread over the panel's own footprint, at rest. Wind uplift, point loads at the feet and ballast are separate questions for the engineer."]);

  /* ---------------- AI smart placement ---------------- */
  const [ai, setAi] = useState<AiState>({ status: "idle" });
  const requestAi = async () => {
    if (!geom || !product) return;
    setAi({ status: "loading" });
    try {
      const res = await fetch("/api/ai/placement", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roof: { length_m: roof.length_m, width_m: roof.width_m, orientation: roof.orientation, tilt_deg: roof.tilt_deg, obstacles: [...roof.obstacles.map(({ x, y, w, h, label }) => ({ x, y, w, h, label })), ...modules.map((m) => ({ x: m.x, y: m.y, w: m.w, h: m.h, label: `${m.label} (keep clear)` }))] },
          panel: { length_m: geom.length_m, width_m: geom.width_m, rated_power_w: geom.rated_power_w, name: product.name },
          shadingNotes: shadingNotes || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) setAi({ status: "ready", suggestion: json.suggestion as AiSuggestion });
      else if (json.reason === "not_configured") setAi({ status: "not_configured", message: json.message });
      else setAi({ status: "error", message: json.message ?? "The AI placement request failed." });
    } catch {
      setAi({ status: "error", message: "Network error while contacting the placement service." });
    }
  };
  const applyAi = () => {
    if (ai.status !== "ready") return;
    const layout: PlacedPanel[] = ai.suggestion.panels.map((p) => ({ id: newId("ai"), x: round2(p.x), y: round2(p.y), rotation: p.rotation === 90 ? 90 : 0 }));
    commit({ panels: layout }, { keepAi: true });
    setAiSuggested(true);
    setSel(null);
    setInspireNotes(null);
  };

  /* ---------------- save ---------------- */
  const [name, setName] = useState("My roof design");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const buildDesign = (): Omit<SavedDesign, "id" | "created_at"> | null => {
    if (!product || !geom || !areas) return null;
    return {
      name: name.trim() || "My roof design", roof, panel_product_id: product.id, panel_name: product.name, panel: geom, layout: placed, modules,
      summary: {
        panel_count: placed.length, used_area_m2: round2(areas.used), remaining_area_m2: round2(areas.remaining), capacity_kwp: capacity.value,
        module_count: modules.length, coverage_pct: areas.coveragePct === null ? null : round2(areas.coveragePct), total_panel_weight_kg: weightTotal === null ? null : round2(weightTotal),
      },
      is_ai_suggested: aiSuggested, is_demo_product: product.is_demo,
    };
  };
  const save = async () => {
    const d = buildDesign();
    if (!d) return;
    if (!placed.length) { setNotice("Place at least one panel before saving."); return; }
    setSaving(true); setNotice(null);
    try {
      if (mode === "supabase") {
        const r = await saveDesignAction(d);
        if (r.ok) { setSavedId(r.id); setNotice("Design saved."); }
        else if (r.reason === "demo") saveLocal(d);
        else setNotice(r.message ?? "Could not save the design.");
      } else saveLocal(d);
    } finally { setSaving(false); }
  };
  const saveLocal = (d: Omit<SavedDesign, "id" | "created_at">) => {
    const full: SavedDesign = { ...d, id: newId("dsg"), created_at: new Date().toISOString() };
    setStore((s) => ({ designs: [full, ...(s?.designs ?? [])].slice(0, 30) }));
    setSavedId(full.id);
    setNotice("Design saved on this device (demo mode: not sent to a server).");
  };
  const loadDesign = (d: SavedDesign) => {
    const opt = panels.find((p) => p.id === d.panel_product_id);
    if (!opt || !opt.length_m) { setNotice("That design's panel is no longer in the catalog."); return; }
    setPanelId(d.panel_product_id);
    setRoof({ ...DEFAULT_ROOF, ...d.roof });
    setLay({ panels: d.layout, modules: d.modules ?? [] }); setHistory([]); setSel(null);
    setAiSuggested(d.is_ai_suggested);
    setInspireNotes(null);
    setName(d.name); setSavedId(d.id);
    setNotice(`Loaded "${d.name}".`);
  };
  const deleteDesign = (id: string) => setStore((s) => ({ designs: (s?.designs ?? []).filter((d) => d.id !== id) }));

  /* ---------------- obstacles + roof fields ---------------- */
  const addObstacle = () => {
    const o: Obstacle = { id: newId("obs"), x: Number(obstacleDraft.x) || 0, y: Number(obstacleDraft.y) || 0, w: Math.max(0.1, Number(obstacleDraft.w) || 0.1), h: Math.max(0.1, Number(obstacleDraft.h) || 0.1), label: obstacleDraft.label.trim() || "Obstacle" };
    const c = clampToRoof(o.x, o.y, o.w, o.h, roof);
    setRoof((r) => ({ ...r, obstacles: [...r.obstacles, { ...o, x: c.x, y: c.y }] }));
  };
  const removeObstacle = (id: string) => setRoof((r) => ({ ...r, obstacles: r.obstacles.filter((o) => o.id !== id) }));
  const setRoofDim = (k: "length_m" | "width_m" | "tilt_deg" | "setback_m" | "walkway_m", v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setRoof((r) => ({ ...r, [k]: k === "tilt_deg" ? Math.min(90, Math.max(0, n)) : k === "setback_m" || k === "walkway_m" ? Math.min(5, Math.max(0, n)) : Math.min(100, Math.max(1, n)) }));
  };

  const selectedPanel = sel?.kind === "panel" ? placed.find((p) => p.id === sel.id) ?? null : null;
  const selectedModule = sel?.kind === "module" ? modules.find((m) => m.id === sel.id) ?? null : null;
  const selectedObstacle = sel?.kind === "obstacle" ? roof.obstacles.find((o) => o.id === sel.id) ?? null : null;
  const gridLines = useMemo(() => ({ v: Array.from({ length: Math.floor(roof.length_m) + 1 }, (_, i) => i), h: Array.from({ length: Math.floor(roof.width_m) + 1 }, (_, i) => i) }), [roof.length_m, roof.width_m]);
  const moduleGroups = useMemo(() => MODULE_ORDER.map((k) => ({ kind: k, items: modules.filter((m) => m.kind === k) })).filter((g) => g.items.length), [modules]);
  // The same plan the drawing shows, in the 3D view's terms. Read-only: the view never writes back.
  const plan3d = useMemo<Plan>(() => ({
    length: roof.length_m,
    width: roof.width_m,
    panels: geom ? placed.map((p) => panelRect(p, geom)) : [],
    obstacles: roof.obstacles,
    blocks: modules.map((m) => ({ x: m.x, y: m.y, w: m.w, h: m.h, kind: m.kind })),
  }), [roof.length_m, roof.width_m, roof.obstacles, placed, modules, geom]);

  return (
    <div className="space-y-4">
      <div role="note" className="flex items-start gap-2 rounded-[10px] border border-[var(--warn)]/50 bg-warn-soft px-3 py-2 text-[13px] text-warn-fg">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span><strong>This is a planning visualization and is not a certified engineering design.</strong> Structural loads, wiring, wind uplift, setbacks and local code must be assessed by a licensed installer and, where the roof carries anything new, a structural engineer.</span>
      </div>
      {product?.is_demo && <DemoBanner text="DEMO PRODUCT — NOT REAL" detail="The selected panel is an illustrative demo record. Its dimensions, weight and power are not from a real manufacturer." />}

      <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-border bg-elevated px-3 py-2.5 text-[13px] has-[:checked]:border-[var(--brand)]">
        <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 font-medium text-fg"><SlidersHorizontal className="size-4 text-fg-muted" aria-hidden /> Show more options</span>
          <span className="block text-[12.5px] text-fg-muted">Roof direction and tilt, a photo of your roof, walkways and planters, space at the edges, AI placement, weight on the roof, and your own assumptions. Off by default; the simple view is enough to size a system.</span>
        </span>
      </label>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* ---------------- Setup ---------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader title={<>Your roof <InfoTip term="roof_size" /></>} subtitle="How long and how wide, in metres, seen from above." />
            <CardBody className="grid grid-cols-2 gap-3">
              <Field label="Length (m)"><Input type="number" min={1} max={100} step={0.1} value={roof.length_m} onChange={(e) => setRoofDim("length_m", e.target.value)} /></Field>
              <Field label="Width (m)"><Input type="number" min={1} max={100} step={0.1} value={roof.width_m} onChange={(e) => setRoofDim("width_m", e.target.value)} /></Field>
              {advanced && (<>
              <Field label={<>Orientation <InfoTip term="orientation" /></>}>
                <Select value={roof.orientation} onChange={(e) => setRoof((r) => ({ ...r, orientation: e.target.value as RoofOrientation }))}>
                  {ORIENTATIONS.map((o) => <option key={o} value={o}>{o === "flat" ? "Flat roof" : o === "unknown" ? "Unknown" : o}</option>)}
                </Select>
              </Field>
              <Field label={<>Tilt (°) <InfoTip term="tilt" /></>}><Input type="number" min={0} max={90} step={1} value={roof.tilt_deg} onChange={(e) => setRoofDim("tilt_deg", e.target.value)} /></Field>
              <Field label={<>Space at the edges (m) <InfoTip term="setback" /></>}>
                <div className="relative"><Input type="number" min={0} max={5} step={0.1} value={setback} onChange={(e) => setRoofDim("setback_m", e.target.value)} /><DataBadge cls="user" compact className="absolute right-2 top-1/2 -translate-y-1/2" /></div>
              </Field>
              <Field label={<>Walkway width (m) <InfoTip term="walkway" /></>}>
                <div className="relative"><Input type="number" min={0} max={5} step={0.1} value={walkway} onChange={(e) => setRoofDim("walkway_m", e.target.value)} /><DataBadge cls="user" compact className="absolute right-2 top-1/2 -translate-y-1/2" /></div>
              </Field>
              <Field label={<>Shading notes <InfoTip term="shading" /></>} className="col-span-2" help="Optional. Passed to AI Smart Placement only.">
                <Textarea value={shadingNotes} onChange={(e) => setShadingNotes(e.target.value)} className="min-h-16" maxLength={500} placeholder="e.g. neighbour's building casts shade on the west edge after 3 pm" />
              </Field>
              </>)}
            </CardBody>
          </Card>

          {/* Shown without "more options" since 2026-09-23: the roof photo left the
              Solar Profile and this is where it lives now, so it has to be findable. */}
          <Card>
            <CardHeader title={<><ImageIcon className="size-4 text-fg-muted" aria-hidden /> Photo of the roof <InfoTip term="photo_trace" /></>} subtitle="Take or upload a photo of the roof. It goes under the grid, stretched to the dimensions above, so you can trace what is on it, and Solink can read it for obstacles." />
            <CardBody className="space-y-3">
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload a roof photo" onChange={(e) => onPhotoFile(e.target.files?.[0] ?? null)} className="block w-full text-[12.5px] text-fg-secondary file:mr-3 file:rounded-[var(--radius)] file:border file:border-border-strong file:bg-elevated file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-fg hover:file:bg-inset" />
              {photo && (
                <>
                  <label className="flex items-center gap-2 text-[12.5px] text-fg-secondary">Photo opacity
                    <input type="range" min={0.1} max={1} step={0.05} value={photoOpacity} onChange={(e) => setPhotoOpacity(Number(e.target.value))} className="flex-1 accent-[var(--brand)]" aria-label="Photo opacity" />
                  </label>
                  <button type="button" onClick={() => setTraceMode((t) => !t)} aria-pressed={traceMode} className={cn("flex w-full items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-left text-[12.5px]", traceMode ? "border-[var(--brand)] bg-brand-soft text-fg" : "border-border bg-elevated text-fg-secondary hover:bg-inset")}>
                    <PenLine className="size-4 shrink-0" aria-hidden />
                    <span>{traceMode ? "Tracing: drag a box on the photo to add an obstacle. Click again to stop." : "Trace obstacles on the photo"}</span>
                  </button>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-fg-muted">Ask the AI what is on the roof</span>
                    <Button size="sm" variant="secondary" onClick={readPhoto} disabled={scan.status === "loading"}>{scan.status === "loading" ? "Reading…" : "Read photo"}</Button>
                  </div>
                  {scan.status === "not_configured" && (
                    <AiResting title="Photo reading isn't available right now">Trace the roof on the photo by hand; every tool below works without it.</AiResting>
                  )}
                  {scan.status === "error" && <UnavailableState title="Could not read the photo">{scan.message}</UnavailableState>}
                  {scan.status === "ready" && (
                    <div className="space-y-2 text-[12.5px]">
                      <div className="flex items-center gap-2"><DataBadge cls="ai" compact /><span className="text-fg-muted">Image quality: {scan.result.image_quality.rating}. It cannot measure; you place and size everything.</span></div>
                      {scan.result.obstructions.length > 0 && (
                        <ul className="space-y-1">
                          {scan.result.obstructions.map((o, i) => (
                            <li key={i} className="flex items-start justify-between gap-2 rounded-md bg-inset px-2.5 py-1.5">
                              <span><span className="font-medium text-fg">{o.item}</span> <span className="text-fg-muted">{o.note}</span></span>
                              <button type="button" onClick={() => { setObstacleDraft((d) => ({ ...d, label: o.item })); setTraceMode(true); }} className="shrink-0 text-[12px] font-medium text-[var(--brand-strong)] underline-offset-2 hover:underline">Trace it</button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {scan.result.shading_notes && (
                        <div className="rounded-md bg-inset px-2.5 py-1.5">
                          <p className="text-fg-secondary">{scan.result.shading_notes}</p>
                          <button type="button" onClick={() => setShadingNotes(scan.result.shading_notes)} className="mt-1 text-[12px] font-medium text-[var(--brand-strong)] underline-offset-2 hover:underline">Use as shading notes</button>
                        </div>
                      )}
                      {scan.result.cannot_determine.length > 0 && <p className="text-fg-muted">Could not determine: {scan.result.cannot_determine.join("; ")}.</p>}
                      <p className="italic text-fg-muted">{scan.result.disclaimer}</p>
                    </div>
                  )}
                </>
              )}
              {!photo && <p className="text-[12px] text-fg-muted">Optional. Without a photo, the grid alone is the canvas.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={<>Anything on the roof? <InfoTip term="obstacle" /></>} subtitle="A water tank, an AC unit, a stairwell. Panels will not be placed on them." />
            <CardBody className="space-y-3">
              {roof.obstacles.length > 0 && (
                <ul className="space-y-1.5">
                  {roof.obstacles.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 rounded-md bg-inset px-2.5 py-1.5 text-[12.5px]">
                      <span className="truncate"><span className="font-medium text-fg">{o.label}</span> <span className="tabular text-fg-muted">{o.w}×{o.h} m at ({o.x}, {o.y})</span></span>
                      <button type="button" onClick={() => removeObstacle(o.id)} aria-label={`Remove ${o.label}`} className="grid size-7 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-elevated hover:text-critical-fg"><Trash2 className="size-3.5" aria-hidden /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Field label="Label" className="col-span-2"><Input value={obstacleDraft.label} onChange={(e) => setObstacleDraft({ ...obstacleDraft, label: e.target.value })} list="obstacle-labels" /><datalist id="obstacle-labels"><option value="Water tank" /><option value="AC unit" /><option value="Stairwell" /><option value="Satellite dish" /><option value="Skylight" /></datalist></Field>
                <Field label="x (m)"><Input type="number" step={0.1} min={0} value={obstacleDraft.x} onChange={(e) => setObstacleDraft({ ...obstacleDraft, x: e.target.value })} /></Field>
                <Field label="y (m)"><Input type="number" step={0.1} min={0} value={obstacleDraft.y} onChange={(e) => setObstacleDraft({ ...obstacleDraft, y: e.target.value })} /></Field>
                <Field label="Width (m)"><Input type="number" step={0.1} min={0.1} value={obstacleDraft.w} onChange={(e) => setObstacleDraft({ ...obstacleDraft, w: e.target.value })} /></Field>
                <Field label="Depth (m)"><Input type="number" step={0.1} min={0.1} value={obstacleDraft.h} onChange={(e) => setObstacleDraft({ ...obstacleDraft, h: e.target.value })} /></Field>
              </div>
              <Button variant="outline" size="sm" onClick={addObstacle} className="w-full"><Plus className="size-4" aria-hidden /> Add obstacle</Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pick a panel" subtitle="Real panels from the catalogue, drawn at their true size." />
            <CardBody className="space-y-3">
              <Field label="Panel model">
                <Select value={panelId} onChange={(e) => changePanel(e.target.value)}>
                  {panels.length === 0 && <option value="">No panels in the catalog</option>}
                  {panels.map((p) => <option key={p.id} value={p.id} disabled={!p.length_m || !p.width_m}>{p.name}{!p.length_m || !p.width_m ? ": dimensions unavailable" : ""}</option>)}
                </Select>
              </Field>
              {product && geom && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
                  <dt className="text-fg-muted">Size</dt><dd className="tabular text-right text-fg">{geom.length_m.toFixed(3)} × {geom.width_m.toFixed(3)} m <DataBadge cls={product.is_demo ? "demo" : "source"} compact /></dd>
                  <dt className="text-fg-muted">Power <InfoTip term="rated_power" /></dt><dd className="tabular text-right text-fg">{geom.rated_power_w !== null ? `${geom.rated_power_w} W` : "Not stated"}</dd>
                  <dt className="text-fg-muted">Weight</dt><dd className="tabular text-right text-fg">{geom.weight_kg !== null && geom.weight_kg !== undefined ? `${geom.weight_kg} kg` : "Not stated"}</dd>
                  <dt className="text-fg-muted">Area / panel</dt><dd className="tabular text-right text-fg">{(geom.length_m * geom.width_m).toFixed(2)} m² <DataBadge cls="calculated" compact /></dd>
                  <dt className="text-fg-muted">Price</dt><dd className="tabular text-right text-fg">{product.price !== null ? formatMoney(product.price, product.currency) : "Price on request from supplier"}</dd>
                </dl>
              )}
            </CardBody>
          </Card>

          {advanced && <Card>
            <CardHeader title={<>Walkways, planters, seating <InfoTip term="modules" /></>} subtitle="Blocks at the size you type; shapes only, not products." />
            <CardBody className="space-y-3">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Module kind">
                {MODULE_ORDER.map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={moduleDraft.kind === k} onClick={() => pickModuleKind(k)} className={cn("rounded-full border px-3 py-1 text-[12.5px]", moduleDraft.kind === k ? "border-[var(--brand)] bg-brand-soft text-fg" : "border-border text-fg-secondary hover:bg-inset")}>{MODULE_KINDS[k].label}</button>
                ))}
              </div>
              <p className="text-[12px] text-fg-muted">{MODULE_KINDS[moduleDraft.kind].description}</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Label" className="col-span-2"><Input value={moduleDraft.label} onChange={(e) => setModuleDraft({ ...moduleDraft, label: e.target.value })} maxLength={40} /></Field>
                <Field label="Width (m)"><div className="relative"><Input type="number" step={0.1} min={0.1} max={50} value={moduleDraft.w} onChange={(e) => setModuleDraft({ ...moduleDraft, w: e.target.value })} /><DataBadge cls="user" compact className="absolute right-2 top-1/2 -translate-y-1/2" /></div></Field>
                <Field label="Depth (m)"><div className="relative"><Input type="number" step={0.1} min={0.1} max={50} value={moduleDraft.h} onChange={(e) => setModuleDraft({ ...moduleDraft, h: e.target.value })} /><DataBadge cls="user" compact className="absolute right-2 top-1/2 -translate-y-1/2" /></div></Field>
              </div>
              <Button variant="outline" size="sm" onClick={addModule} className="w-full"><Plus className="size-4" aria-hidden /> Add {MODULE_KINDS[moduleDraft.kind].label.toLowerCase()}</Button>
            </CardBody>
          </Card>}
        </div>

        {/* ---------------- Canvas ---------------- */}
        <div className="space-y-3 min-w-0">
          <Card>
            <CardBody className="pt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={autoFill} disabled={!geom}><Grid3x3 className="size-4" aria-hidden /> Fill my roof with panels</Button>
                <InfoTip term="auto_fill" />
                <Button size="sm" variant="outline" onClick={() => addPanel(0)} disabled={!geom}><Plus className="size-4" aria-hidden /> Add a panel</Button>
                <Button size="sm" variant="outline" onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 className="size-4" aria-hidden /> Undo</Button>
                <Button size="sm" variant="ghost" onClick={clearAll} disabled={!placed.length && !modules.length}><Eraser className="size-4" aria-hidden /> Clear all</Button>
                {advanced && <label className="ml-auto flex items-center gap-2 text-[12.5px] text-fg-secondary select-none">
                  <input type="checkbox" checked={snapNeighboursOn} onChange={(e) => setSnapNeighboursOn(e.target.checked)} className="accent-[var(--brand)]" /> Snap to neighbours
                </label>}
              </div>

              <div className="relative overflow-hidden rounded-[var(--radius)] border border-border bg-inset">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${viewW} ${viewH}`}
                  className={cn("block w-full h-auto touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]", traceMode && "cursor-crosshair")}
                  style={{ maxHeight: "70dvh" }}
                  tabIndex={0}
                  role="application"
                  aria-label={`Roof plan ${roof.length_m} by ${roof.width_m} metres with ${placed.length} panels and ${modules.length} modules. Use arrow keys to move the selection, R to rotate, Delete to remove.`}
                  onPointerMove={onPointerMove}
                  onPointerUp={endPointer}
                  onPointerCancel={endPointer}
                  onPointerDown={onSvgPointerDown}
                  onKeyDown={onKeyDown}
                >
                  <defs>
                    <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--fg-muted)" strokeWidth="2" />
                    </pattern>
                    {/* The landing module's look at plan scale: dark cells in a silver frame.
                        Bounding-box units, so each panel gets its own cell grid whichever way it turns. */}
                    <pattern id="cellsPortrait" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width={1 / 6} height={1 / 10}>
                      <rect width={1 / 6} height={1 / 10} fill="#0b1a2e" />
                      <rect x={0.008} y={0.005} width={1 / 6 - 0.016} height={1 / 10 - 0.01} fill="#1b3657" />
                    </pattern>
                    <pattern id="cellsLandscape" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width={1 / 10} height={1 / 6}>
                      <rect width={1 / 10} height={1 / 6} fill="#0b1a2e" />
                      <rect x={0.005} y={0.008} width={1 / 10 - 0.01} height={1 / 6 - 0.016} fill="#1b3657" />
                    </pattern>
                    <clipPath id="roofClip"><rect x={0} y={0} width={roof.length_m * PX_PER_M} height={roof.width_m * PX_PER_M} /></clipPath>
                  </defs>
                  <g transform={`translate(${PAD} ${PAD})`}>
                    {/* roof */}
                    <rect x={0} y={0} width={roof.length_m * PX_PER_M} height={roof.width_m * PX_PER_M} fill="var(--bg-elevated)" stroke="var(--navy)" strokeWidth={2} />
                    {/* photo underlay, stretched to the typed dimensions */}
                    {photo && <image href={photo.url} x={0} y={0} width={roof.length_m * PX_PER_M} height={roof.width_m * PX_PER_M} preserveAspectRatio="none" opacity={photoOpacity} clipPath="url(#roofClip)" />}
                    {/* 1 m grid */}
                    {gridLines.v.map((i) => <line key={`v${i}`} x1={i * PX_PER_M} x2={i * PX_PER_M} y1={0} y2={roof.width_m * PX_PER_M} stroke="var(--grid)" strokeWidth={1} opacity={photo ? 0.7 : 1} />)}
                    {gridLines.h.map((i) => <line key={`h${i}`} x1={0} x2={roof.length_m * PX_PER_M} y1={i * PX_PER_M} y2={i * PX_PER_M} stroke="var(--grid)" strokeWidth={1} opacity={photo ? 0.7 : 1} />)}
                    {/* setback line */}
                    {setback > 0 && roof.length_m > 2 * setback && roof.width_m > 2 * setback && (
                      <rect x={setback * PX_PER_M} y={setback * PX_PER_M} width={(roof.length_m - 2 * setback) * PX_PER_M} height={(roof.width_m - 2 * setback) * PX_PER_M} fill="none" stroke="var(--fg-muted)" strokeDasharray="4 4" strokeWidth={1} />
                    )}
                    {/* dimension labels */}
                    <text x={(roof.length_m * PX_PER_M) / 2} y={-9} textAnchor="middle" fontSize={11} fill="var(--fg-muted)" className="tabular">{roof.length_m} m</text>
                    <text x={-9} y={(roof.width_m * PX_PER_M) / 2} textAnchor="middle" fontSize={11} fill="var(--fg-muted)" transform={`rotate(-90 -9 ${(roof.width_m * PX_PER_M) / 2})`} className="tabular">{roof.width_m} m</text>
                    {/* obstacles */}
                    {roof.obstacles.map((o) => {
                      const isSel = sel?.kind === "obstacle" && sel.id === o.id;
                      return (
                        <g key={o.id} onPointerDown={(e) => startDrag(e, "obstacle", o.id, o.x, o.y)} className={traceMode ? "" : "cursor-grab active:cursor-grabbing"} role="button" aria-label={`${o.label}, ${o.w} by ${o.h} metres at ${o.x}, ${o.y}. Drag to move.`}>
                          <rect x={o.x * PX_PER_M} y={o.y * PX_PER_M} width={o.w * PX_PER_M} height={o.h * PX_PER_M} fill="url(#hatch)" stroke={isSel ? "var(--brand-strong)" : "var(--fg-muted)"} strokeWidth={isSel ? 3 : 1.5} />
                          <text x={o.x * PX_PER_M + 4} y={o.y * PX_PER_M + 13} fontSize={10.5} fill="var(--fg-secondary)" className="pointer-events-none">{o.label}</text>
                          {!traceMode && (
                            <rect
                              x={(o.x + o.w) * PX_PER_M - 9} y={(o.y + o.h) * PX_PER_M - 9} width={18} height={18} rx={3}
                              fill={isSel ? "var(--brand)" : "var(--bg-elevated)"} stroke={isSel ? "var(--bg-elevated)" : "var(--fg-muted)"} strokeWidth={2}
                              className="cursor-nwse-resize"
                              role="button" aria-label={`Resize ${o.label}: drag this corner`}
                              onPointerDown={(e) => startResize(e, { kind: "obstacle", id: o.id })}
                            />
                          )}
                        </g>
                      );
                    })}
                    {/* modules */}
                    {modules.map((m) => {
                      const meta = MODULE_KINDS[m.kind];
                      const bad = problems.moduleIds.has(m.id);
                      const isSel = sel?.kind === "module" && sel.id === m.id;
                      return (
                        <g key={m.id} onPointerDown={(e) => startDrag(e, "module", m.id, m.x, m.y)} className={traceMode ? "" : "cursor-grab active:cursor-grabbing"} role="button" aria-label={`${m.label}, ${m.w} by ${m.h} metres at ${m.x}, ${m.y}${bad ? ", has a problem" : ""}`}>
                          <rect x={m.x * PX_PER_M} y={m.y * PX_PER_M} width={m.w * PX_PER_M} height={m.h * PX_PER_M} rx={3}
                            fill={bad ? "var(--critical-soft)" : meta.fill}
                            stroke={bad ? "var(--critical)" : isSel ? "var(--brand-strong)" : meta.stroke}
                            strokeWidth={isSel ? 3 : 1.5} strokeDasharray={meta.dashed && !isSel ? "5 4" : undefined} />
                          {m.kind === "pergola" && <><line x1={m.x * PX_PER_M} y1={m.y * PX_PER_M} x2={(m.x + m.w) * PX_PER_M} y2={(m.y + m.h) * PX_PER_M} stroke={meta.stroke} strokeOpacity={0.3} /><line x1={(m.x + m.w) * PX_PER_M} y1={m.y * PX_PER_M} x2={m.x * PX_PER_M} y2={(m.y + m.h) * PX_PER_M} stroke={meta.stroke} strokeOpacity={0.3} /></>}
                          <text x={(m.x + m.w / 2) * PX_PER_M} y={(m.y + m.h / 2) * PX_PER_M + 4} textAnchor="middle" fontSize={10.5} fill={bad ? "var(--critical-fg)" : "var(--fg-secondary)"} className="pointer-events-none">{m.label}</text>
                          {!traceMode && (
                            // Corner handle: always present on a block so it can be grabbed
                            // without selecting first; larger and solid once selected.
                            <rect
                              x={(m.x + m.w) * PX_PER_M - 9} y={(m.y + m.h) * PX_PER_M - 9} width={18} height={18} rx={3}
                              fill={isSel ? "var(--brand)" : "var(--bg-elevated)"} stroke={isSel ? "var(--bg-elevated)" : meta.stroke} strokeWidth={2}
                              className="cursor-nwse-resize"
                              role="button" aria-label={`Resize ${m.label}: drag this corner`}
                              onPointerDown={(e) => startResize(e, { kind: "module", id: m.id })}
                            />
                          )}
                        </g>
                      );
                    })}
                    {/* panels */}
                    {geom && placed.map((p, i) => {
                      const r = panelRect(p, geom);
                      const bad = problems.panelIds.has(p.id);
                      const isSel = sel?.kind === "panel" && sel.id === p.id;
                      return (
                        <g key={p.id} onPointerDown={(e) => startDrag(e, "panel", p.id, p.x, p.y)} className={traceMode ? "" : "cursor-grab active:cursor-grabbing"} role="button" aria-label={`Panel ${i + 1} at ${p.x}, ${p.y} metres${bad ? ", has a problem" : ""}`}>
                          {/* A soft shadow under the module; purely visual, never hit-tested. */}
                          <rect x={r.x * PX_PER_M + 1.5} y={r.y * PX_PER_M + 2.5} width={r.w * PX_PER_M} height={r.h * PX_PER_M} rx={2} fill="#0e1116" opacity={0.14} className="pointer-events-none" />
                          {/* Problem and AI-suggested states keep their colours: they carry meaning. A plain panel is drawn as a module. */}
                          <rect x={r.x * PX_PER_M} y={r.y * PX_PER_M} width={r.w * PX_PER_M} height={r.h * PX_PER_M} rx={2}
                            fill={bad ? "var(--critical-soft)" : aiSuggested ? "var(--cls-ai-soft)" : r.w > r.h ? "url(#cellsLandscape)" : "url(#cellsPortrait)"}
                            stroke={bad ? "var(--critical)" : aiSuggested ? "var(--cls-ai)" : "#aab2bb"}
                            strokeWidth={bad || aiSuggested ? 1.5 : 2} />
                          {isSel && <rect x={r.x * PX_PER_M - 2.5} y={r.y * PX_PER_M - 2.5} width={r.w * PX_PER_M + 5} height={r.h * PX_PER_M + 5} rx={4} fill="none" stroke="var(--brand-strong)" strokeWidth={3} className="pointer-events-none" />}
                          {(bad || aiSuggested) && <>
                            <line x1={r.x * PX_PER_M} x2={(r.x + r.w) * PX_PER_M} y1={(r.y + r.h / 2) * PX_PER_M} y2={(r.y + r.h / 2) * PX_PER_M} stroke={bad ? "var(--critical)" : "var(--series-1)"} strokeOpacity={0.35} />
                            <line y1={r.y * PX_PER_M} y2={(r.y + r.h) * PX_PER_M} x1={(r.x + r.w / 2) * PX_PER_M} x2={(r.x + r.w / 2) * PX_PER_M} stroke={bad ? "var(--critical)" : "var(--series-1)"} strokeOpacity={0.35} />
                          </>}
                          <text x={(r.x + r.w / 2) * PX_PER_M} y={(r.y + r.h / 2) * PX_PER_M + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={bad ? "var(--critical-fg)" : aiSuggested ? "var(--fg-secondary)" : "#ffffff"} paintOrder="stroke" stroke={bad || aiSuggested ? "none" : "#0b1a2e"} strokeWidth={3} className="tabular pointer-events-none">{i + 1}</text>
                        </g>
                      );
                    })}
                    {/* tracing box */}
                    {traceDraft && <rect x={traceDraft.x * PX_PER_M} y={traceDraft.y * PX_PER_M} width={traceDraft.w * PX_PER_M} height={traceDraft.h * PX_PER_M} fill="var(--brand-soft)" stroke="var(--brand)" strokeDasharray="4 3" strokeWidth={1.5} className="pointer-events-none" />}
                  </g>
                </svg>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] text-fg-muted">
                  {selectedPanel ? `Panel ${placed.indexOf(selectedPanel) + 1} selected. Drag to move, rotate with the arrow button. Panels keep their real size; pick another model to change it.`
                    : selectedModule ? `${selectedModule.label} selected at (${selectedModule.x}, ${selectedModule.y}) m. Drag the corner to resize, or type a size:`
                    : selectedObstacle ? `${selectedObstacle.label} selected at (${selectedObstacle.x}, ${selectedObstacle.y}) m. Drag it to move, drag the corner to resize, or type a size:`
                    : traceMode ? "Tracing mode: drag on the drawing to add an obstacle." : "Tap anything on the drawing to select it. Drag to move; drag a corner square to resize a block or an obstacle."}
                </span>
                {selectedObstacle && (
                  <span className="flex items-center gap-1 text-[12.5px] text-fg-secondary">
                    <Input type="number" step={0.1} min={0.2} value={selectedObstacle.w} onChange={(e) => resizeObstacle(selectedObstacle.id, Number(e.target.value) || selectedObstacle.w, selectedObstacle.h)} aria-label="Obstacle width in metres" className="h-8 w-20" />
                    <span aria-hidden>×</span>
                    <Input type="number" step={0.1} min={0.2} value={selectedObstacle.h} onChange={(e) => resizeObstacle(selectedObstacle.id, selectedObstacle.w, Number(e.target.value) || selectedObstacle.h)} aria-label="Obstacle depth in metres" className="h-8 w-20" />
                    <span>m</span>
                  </span>
                )}
                {selectedModule && (
                  <span className="flex items-center gap-1 text-[12.5px] text-fg-secondary">
                    <Input type="number" step={0.1} min={0.2} value={selectedModule.w} onChange={(e) => resizeModule(selectedModule.id, Number(e.target.value) || selectedModule.w, selectedModule.h)} aria-label="Block width in metres" className="h-8 w-20" />
                    <span aria-hidden>×</span>
                    <Input type="number" step={0.1} min={0.2} value={selectedModule.h} onChange={(e) => resizeModule(selectedModule.id, selectedModule.w, Number(e.target.value) || selectedModule.h)} aria-label="Block depth in metres" className="h-8 w-20" />
                    <span>m</span>
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" aria-label="Nudge left" disabled={!sel} onClick={() => nudge(-0.1, 0)} className={ctl}><ArrowLeft className="size-4" aria-hidden /></button>
                  <button type="button" aria-label="Nudge up" disabled={!sel} onClick={() => nudge(0, -0.1)} className={ctl}><ArrowUp className="size-4" aria-hidden /></button>
                  <button type="button" aria-label="Nudge down" disabled={!sel} onClick={() => nudge(0, 0.1)} className={ctl}><ArrowDown className="size-4" aria-hidden /></button>
                  <button type="button" aria-label="Nudge right" disabled={!sel} onClick={() => nudge(0.1, 0)} className={ctl}><ArrowRight className="size-4" aria-hidden /></button>
                  <button type="button" aria-label="Rotate selection (R)" disabled={!sel} onClick={rotateSelected} className={ctl}><RotateCw className="size-4" aria-hidden /></button>
                  <button type="button" aria-label="Remove selection (Delete)" disabled={!sel} onClick={removeSelected} className={cn(ctl, "hover:text-critical-fg")}><Trash2 className="size-4" aria-hidden /></button>
                </div>
              </div>
              {advanced
                ? <p className="text-[11.5px] text-fg-muted">Keyboard: focus the drawing, then arrow keys (Shift = 0.5 m), <kbd className="rounded border border-border px-1">R</kbd> rotate, <kbd className="rounded border border-border px-1">Delete</kbd> remove, <kbd className="rounded border border-border px-1">Esc</kbd> deselect. Positions snap to 0.1 m. The dashed line is the {setback} m setback.</p>
                : <p className="text-[11.5px] text-fg-muted">The dashed line is the {setback} m kept clear at the edges. Tap a panel, then use the arrows to move it or the bin to remove it.</p>}

              {problems.messages.length > 0 && (
                <div role="alert" className="rounded-[10px] border border-[var(--critical)]/40 bg-critical-soft px-3 py-2 text-[12.5px] text-critical-fg">
                  <div className="font-semibold">Layout problems ({problems.messages.length})</div>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">{problems.messages.slice(0, 6).map((m, i) => <li key={i}>{m}</li>)}{problems.messages.length > 6 && <li>…and {problems.messages.length - 6} more</li>}</ul>
                </div>
              )}
              {problems.clearance.length > 0 && (
                <div role="status" className="rounded-[10px] border border-[var(--warn)]/40 bg-warn-soft px-3 py-2 text-[12.5px] text-warn-fg">
                  <div className="font-semibold">Clearance ({problems.clearance.length})</div>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">{problems.clearance.slice(0, 4).map((m, i) => <li key={i}>{m}</li>)}{problems.clearance.length > 4 && <li>…and {problems.clearance.length - 4} more</li>}</ul>
                </div>
              )}
              {notice && <p className="text-[12.5px] text-fg-secondary" role="status">{notice}</p>}
            </CardBody>
          </Card>

          <DesignVisual plan={plan3d} />

          {/* Get inspired */}
          <Card>
            <CardHeader title={<><Lightbulb className="size-4 text-fg-muted" aria-hidden /> Try a ready layout <InfoTip term="get_inspired" /></>} subtitle="Three starting points for your roof. Pick one, then move anything you like." />
            <CardBody className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <InspireButton active={inspireNotes?.goal === "max_energy"} onClick={() => getInspired("max_energy")} disabled={!geom} title="Most panels" body="Dense rows, no walkways." />
                <InspireButton active={inspireNotes?.goal === "serviceable"} onClick={() => getInspired("serviceable")} disabled={!geom} title="Easy to clean" body={`A ${walkway} m walkway after every second row.`} />
                <InspireButton active={inspireNotes?.goal === "mixed_use"} onClick={() => getInspired("mixed_use")} disabled={!geom} title="Panels and a terrace" body="A leisure zone along the far edge." />
              </div>
              {advanced && <div className="flex items-center gap-2 text-[12.5px] text-fg-secondary">
                <label htmlFor="amenity-share" className="shrink-0">Leisure share of the usable depth</label>
                <div className="relative w-24"><Input id="amenity-share" type="number" min={10} max={80} step={5} value={amenityShare} onChange={(e) => setAmenityShare(e.target.value)} /><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted">%</span></div>
                <DataBadge cls="user" compact />
              </div>}
              {inspireNotes && (
                <div className="space-y-1 text-[12.5px]">
                  <div className="flex items-center gap-2"><DataBadge cls="calculated" compact /><span className="font-medium text-fg">Applied. Drag anything to change it; Undo brings the previous layout back.</span></div>
                  <ul className="list-disc space-y-0.5 pl-4 text-fg-secondary">{inspireNotes.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                </div>
              )}
            </CardBody>
          </Card>

          {/* AI Smart Placement */}
          {advanced && <Card>
            <CardHeader title={<><Sparkles className="size-4 text-[var(--cls-ai)]" aria-hidden /> AI Smart Placement</>} subtitle="Ask the AI Solar Agent for a suggested layout. It sees only the roof, obstacles, modules, panel size and your shading notes."
              action={<Button size="sm" variant="secondary" onClick={requestAi} disabled={!geom || ai.status === "loading"}>{ai.status === "loading" ? "Thinking…" : "Suggest placement"}</Button>} />
            <CardBody>
              {ai.status === "idle" && <p className="text-[13px] text-fg-muted">No suggestion requested yet. Suggestions are labeled <DataBadge cls="ai" compact /> and can be wrong: check them against the overlap warnings.</p>}
              {ai.status === "loading" && <p className="text-[13px] text-fg-muted">Requesting a layout…</p>}
              {ai.status === "not_configured" && (
                <AiResting title="Smart placement isn't available right now">Place panels yourself, or try one of the three &ldquo;Get inspired&rdquo; layouts.</AiResting>
              )}
              {ai.status === "error" && <UnavailableState title="Suggestion failed">{ai.message}</UnavailableState>}
              {ai.status === "ready" && (
                <div className="space-y-3 text-[13px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <DataBadge cls="ai" />
                    <span className="text-fg-secondary">{ai.suggestion.panels.length} panels suggested</span>
                    <Button size="sm" onClick={applyAi} className="ml-auto">Apply suggestion</Button>
                  </div>
                  <AiList title="Rationale" items={ai.suggestion.rationale} />
                  <AiList title="Assumptions" items={ai.suggestion.assumptions} />
                  <AiList title="Missing data" items={ai.suggestion.missing_data} />
                  <p className="text-[12px] text-fg-muted italic">{ai.suggestion.disclaimer}</p>
                </div>
              )}
            </CardBody>
          </Card>}
        </div>

        {/* ---------------- Summary ---------------- */}
        <div className="space-y-3">
          {aiSuggested && <div className="flex items-center gap-2 text-[12.5px] text-fg-secondary"><DataBadge cls="ai" /> Layout applied from an AI suggestion.</div>}
          <Metric label="Panels that fit" term="panel_count" data={countCls} format={(v) => String(v)} />
          {hasValue(coverageCls) && <Metric label="Roof used" term="coverage" data={coverageCls} unit="%" format={(v) => formatNumber(v, 0)} />}
          {hasValue(capacity) && <Metric label="System size" term="kwp" data={capacity} unit="kWp" format={(v) => formatNumber(v, 2)} />}
          {hasValue(production) && <Metric label="Yearly production, roughly" term="yearly_production" data={production} unit="kWh" format={(v) => formatNumber(v, 0)} footnote={production.value !== null ? production.notes?.[production.notes.length - 1] : undefined} />}
          {advanced && <>
          {hasValue(usedCls) && <Metric label="Panel area" data={usedCls} unit="m²" format={(v) => formatNumber(v, 1)} />}
          {hasValue(remainingCls) && <Metric label="Space left" term="remaining_area" data={remainingCls} unit="m²" format={(v) => formatNumber(v, 1)} />}
          </>}

          {advanced && <Card>
            <CardHeader title={<><Scale className="size-4 text-fg-muted" aria-hidden /> Weight on the roof <InfoTip term="panel_weight" /></>} subtitle="What the panels weigh is known from the manufacturer. What the roof can carry is not: that is a fact about this building." />
            <CardBody className="space-y-3">
              {hasValue(weightCls) && <Metric label="Total panel weight" data={weightCls} unit="kg" format={(v) => formatNumber(v, 0)} />}
              {hasValue(loadCls) && <Metric label="Panel load over its footprint" data={loadCls} unit="kg/m²" format={(v) => formatNumber(v, 1)} />}
              <div className="rounded-[var(--radius)] border border-border bg-inset px-3 py-2 text-[12.5px] text-fg-secondary">
                <div className="flex flex-wrap items-center gap-1.5">What the roof can carry <InfoTip term="roof_load" /> comes from your building&apos;s structural engineer.</div>
                <p className="mt-1 text-fg-muted">Mounting, ballast and wind uplift are not in the catalogue. Compare the figures above with the engineer’s permissible load before anything is ordered.</p>
              </div>
            </CardBody>
          </Card>}

          {advanced && <Card>
            <CardHeader title={<><ListChecks className="size-4 text-fg-muted" aria-hidden /> Components</>} subtitle="Everything on the drawing, itemised." />
            <CardBody>
              {!placed.length && !modules.length ? <p className="text-[12.5px] text-fg-muted">Nothing placed yet.</p> : (
                <ul className="space-y-2 text-[12.5px]">
                  {placed.length > 0 && product && geom && (
                    <li className="rounded-md bg-inset px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2"><span className="font-medium text-fg">{placed.length} × {product.name}</span><DataBadge cls={product.is_demo ? "demo" : "source"} compact /></div>
                      <div className="tabular text-fg-muted">{geom.length_m.toFixed(3)} × {geom.width_m.toFixed(3)} m each · {areas ? formatNumber(areas.used, 1) : "–"} m² · {geom.rated_power_w !== null ? `${geom.rated_power_w} W each` : "power unavailable"} · {geom.weight_kg !== null && geom.weight_kg !== undefined ? `${geom.weight_kg} kg each` : "weight unavailable"}</div>
                    </li>
                  )}
                  {moduleGroups.map((g) => (
                    <li key={g.kind} className="rounded-md bg-inset px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2"><span className="font-medium text-fg">{g.items.length} × {MODULE_KINDS[g.kind].label}</span><DataBadge cls="user" compact /></div>
                      <div className="tabular text-fg-muted">{formatNumber(g.items.reduce((s, m) => s + m.w * m.h, 0), 1)} m² · {g.items.map((m) => `${m.w}×${m.h}`).join(", ")} m · sizes you typed, not products</div>
                    </li>
                  ))}
                  {roof.obstacles.length > 0 && areas && (
                    <li className="rounded-md bg-inset px-2.5 py-2">
                      <div className="font-medium text-fg">{roof.obstacles.length} obstacle{roof.obstacles.length === 1 ? "" : "s"} kept clear</div>
                      <div className="tabular text-fg-muted">{formatNumber(areas.obstacleArea, 1)} m² · {roof.obstacles.map((o) => o.label).join(", ")}</div>
                    </li>
                  )}
                  {areas && (
                    <li className="px-2.5 pt-1 tabular text-fg-muted">Roof {roof.length_m} × {roof.width_m} m = {formatNumber(areas.roofArea, 1)} m² · setback {setback} m · walkway {walkway} m</li>
                  )}
                </ul>
              )}
            </CardBody>
          </Card>}

          {advanced && <Card>
            <CardHeader title={<>Your own assumptions <InfoTip term="energy_production" /></>} subtitle="Yearly production uses the platform's sourced sun hours and losses. Type a value here to override it; it is then labelled as yours." />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label={<>Peak sun h/day <InfoTip term="peak_sun_hours" /></>} help={settings.peak_sun_hours_per_day ? `Platform: ${settings.peak_sun_hours_per_day.value}` : "Optional · your own value"}>
                  <div className="relative"><Input type="number" step={0.1} min={0} max={12} value={psh} onChange={(e) => setPsh(e.target.value)} placeholder={settings.peak_sun_hours_per_day ? String(settings.peak_sun_hours_per_day.value) : "e.g. 5.5"} aria-label="Peak sun hours per day (your assumption)" /><DataBadge cls={pshR.cls === "user" ? "user" : "source"} compact className="absolute right-2 top-1/2 -translate-y-1/2" /></div>
                </Field>
                <Field label={<>Performance ratio <InfoTip term="performance_ratio" /></>} help={settings.performance_ratio ? `Platform: ${settings.performance_ratio.value}` : "Optional · your own value"}>
                  <div className="relative"><Input type="number" step={0.01} min={0} max={1} value={pr} onChange={(e) => setPr(e.target.value)} placeholder={settings.performance_ratio ? String(settings.performance_ratio.value) : "0–1, e.g. 0.8"} aria-label="Performance ratio (your assumption)" /><DataBadge cls={prR.cls === "user" ? "user" : "source"} compact className="absolute right-2 top-1/2 -translate-y-1/2" /></div>
                </Field>
              </div>
            </CardBody>
          </Card>}

          {hasValue(cost) ? <Metric label="Estimated cost" term="estimated_cost" data={cost} format={(v) => formatMoney(v, product?.currency ?? "KWD")} /> : (
            <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-3 text-[13px] shadow-sm">
              <p className="font-medium text-fg-heading">Estimated cost</p>
              <p className="mt-0.5 leading-relaxed text-fg-secondary">Save the design and request an installation quote; the installer&apos;s price completes the estimate.</p>
            </div>
          )}

          <Card>
            <CardHeader title="Save this design" subtitle="Keep it, and use it to ask installers for a quote." />
            <CardBody className="space-y-3">
              <Field label="Design name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
              <div className="flex flex-col gap-2">
                <Button onClick={save} disabled={saving || !placed.length || !geom}><Save className="size-4" aria-hidden /> {saving ? "Saving…" : "Save design"}</Button>
                <Button variant="outline" disabled={!savedId} onClick={() => savedId && router.push(`/purchase?design=${encodeURIComponent(savedId)}`)}>Continue to purchase <ArrowRight className="size-4" aria-hidden /></Button>
              </div>
              {mode === "demo" && <p className="text-[11.5px] text-fg-muted">Demo mode: designs are stored in this browser only.</p>}
            </CardBody>
          </Card>

          {mode === "demo" && storeLoaded && store.designs.length > 0 && (
            <Card>
              <CardHeader title="Saved designs" subtitle="On this device" />
              <CardBody>
                <ul className="space-y-2">
                  {store.designs.map((d) => (
                    <li key={d.id} className="rounded-md border border-border bg-inset px-3 py-2 text-[12.5px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-fg">{d.name}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          {d.is_ai_suggested && <Badge tone="neutral"><DataBadge cls="ai" compact /></Badge>}
                          <button type="button" onClick={() => loadDesign(d)} aria-label={`Load ${d.name}`} className={ctl}><FolderOpen className="size-3.5" aria-hidden /></button>
                          <button type="button" onClick={() => deleteDesign(d.id)} aria-label={`Delete ${d.name}`} className={cn(ctl, "hover:text-critical-fg")}><Trash2 className="size-3.5" aria-hidden /></button>
                        </div>
                      </div>
                      <div className="tabular text-fg-muted">{d.summary.panel_count} panels{d.modules?.length ? ` · ${d.modules.length} modules` : ""} · {d.summary.capacity_kwp !== null ? `${formatNumber(d.summary.capacity_kwp, 2)} kWp` : "capacity n/a"} · {d.roof.length_m}×{d.roof.width_m} m</div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const ctl = "grid size-9 place-items-center rounded-[10px] border border-border bg-elevated text-fg-secondary hover:bg-inset hover:text-fg disabled:opacity-40 disabled:pointer-events-none";

function InspireButton({ active, onClick, disabled, title, body }: { active: boolean; onClick: () => void; disabled: boolean; title: string; body: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className={cn("rounded-[var(--radius)] border p-3 text-left transition-colors hover:bg-inset disabled:opacity-50", active ? "border-[var(--brand)] ring-2 ring-[var(--ring)]" : "border-border")}>
      <div className="text-[13px] font-semibold text-fg">{title}</div>
      <div className="mt-0.5 text-[12px] text-fg-muted">{body}</div>
    </button>
  );
}

function AiList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">{title}</div>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-fg-secondary">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}
