"use client";
import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw, Trash2, Undo2, Grid3x3, Sparkles, Save, ArrowRight, ArrowUp, ArrowDown, ArrowLeft, Eraser, AlertTriangle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Metric } from "@/components/ui/Metric";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { UnavailableState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { InfoTip } from "@/components/help/InfoTip";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { systemCapacityKwp, annualProductionKwh, formatNumber } from "@/lib/solar/calculations";
import { classified, unavailable, type Classified } from "@/lib/classification";
import { PLACEHOLDERS } from "@/lib/config/placeholders";
import type { DataMode } from "@/lib/data/mode";
import type { RoofOrientation, SolarProfile } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { EMPTY_DESIGNER_STORE, newId, type DesignerStore, type Obstacle, type PanelGeometry, type PlacedPanel, type RoofSpec, type SavedDesign } from "./designTypes";
import { areaSummary, autoFillGrid, clampToRoof, detectProblems, firstFreeSpot, panelRect, panelSize, round2, snap, snapToNeighbours as snapNeighbours } from "./geometry";
import { saveDesignAction } from "./actions";

export interface PanelOption {
  id: string; name: string; manufacturer: string; model: string;
  length_m: number | null; width_m: number | null; rated_power_w: number | null;
  price: number | null; currency: string; installation_cost: number | null; is_demo: boolean;
}

type ServerProfile = Pick<SolarProfile, "roof_length_m" | "roof_width_m" | "roof_orientation" | "roof_tilt_deg" | "shading_notes">;

interface AiSuggestion { panels: { x: number; y: number; rotation: 0 | 90 }[]; rationale: string[]; assumptions: string[]; missing_data: string[]; disclaimer: string }
type AiState = { status: "idle" } | { status: "loading" } | { status: "not_configured"; message: string } | { status: "error"; message: string } | { status: "ready"; suggestion: AiSuggestion };

const ORIENTATIONS: RoofOrientation[] = ["flat", "N", "NE", "E", "SE", "S", "SW", "W", "NW", "unknown"];
const PX_PER_M = 60;
const PAD = 28;
const MAX_HISTORY = 40;

const DEFAULT_ROOF: RoofSpec = { length_m: 12, width_m: 8, orientation: "flat", tilt_deg: 0, obstacles: [] };

export function DesignerCanvas({ mode, panels, preselectPanelId, serverProfile }: { mode: DataMode; panels: PanelOption[]; preselectPanelId: string | null; serverProfile: ServerProfile | null }) {
  const router = useRouter();
  const [localProfile, , profileLoaded] = useLocalStore<Partial<SolarProfile> | null>("profile", null);
  const [store, setStore, storeLoaded] = useLocalStore<DesignerStore>("designer", EMPTY_DESIGNER_STORE);

  /* ---------------- roof & obstacles ----------------
     Until the user edits the roof, it is derived from the Solar Profile (local store in demo mode, server profile otherwise). */
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

  const [obstacleDraft, setObstacleDraft] = useState({ x: "1", y: "1", w: "1.5", h: "1.5", label: "Water tank" });

  /* ---------------- panel product ---------------- */
  const usable = useMemo(() => panels.filter((p) => p.length_m && p.width_m), [panels]);
  const [panelId, setPanelId] = useState<string>(() => {
    const pre = panels.find((p) => p.id === preselectPanelId && p.length_m && p.width_m);
    return pre?.id ?? usable[0]?.id ?? "";
  });
  const product = useMemo(() => panels.find((p) => p.id === panelId) ?? null, [panels, panelId]);
  const geom = useMemo<PanelGeometry | null>(() => (product && product.length_m && product.width_m ? { length_m: product.length_m, width_m: product.width_m, rated_power_w: product.rated_power_w } : null), [product]);

  /* ---------------- layout state + history ---------------- */
  const [placed, setPlaced] = useState<PlacedPanel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<PlacedPanel[][]>([]);
  const [snapNeighboursOn, setSnapNeighboursOn] = useState(true);
  const [aiSuggested, setAiSuggested] = useState(false);

  const commit = useCallback((next: PlacedPanel[] | ((prev: PlacedPanel[]) => PlacedPanel[]), opts: { keepAi?: boolean } = {}) => {
    setPlaced((prev) => {
      const n = typeof next === "function" ? next(prev) : next;
      setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), prev]);
      return n;
    });
    if (!opts.keepAi) setAiSuggested(false);
  }, []);

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setPlaced(prev);
      setSelectedId((s) => (s && prev.some((p) => p.id === s) ? s : null));
      return h.slice(0, -1);
    });
  };

  /* Changing the panel model changes every rectangle's size; clear the layout instead of showing silently wrong areas. */
  const changePanel = (id: string) => {
    if (id === panelId) return;
    setPanelId(id);
    if (placed.length) { setPlaced([]); setHistory([]); setSelectedId(null); setAiSuggested(false); setNotice("Layout cleared because the panel model changed."); }
  };

  const addPanel = (rotation: 0 | 90 = 0) => {
    if (!geom) return;
    const spot = firstFreeSpot(placed, roof.obstacles, roof, geom, rotation) ?? (rotation === 0 ? firstFreeSpot(placed, roof.obstacles, roof, geom, 90) : null);
    if (!spot) { setNotice("No free space for another panel at this size."); return; }
    const rot = spot && firstFreeSpot(placed, roof.obstacles, roof, geom, rotation) ? rotation : (rotation === 0 ? 90 : 0);
    const p: PlacedPanel = { id: newId("pnl"), x: spot.x, y: spot.y, rotation: rot };
    commit((prev) => [...prev, p]);
    setSelectedId(p.id);
    setNotice(null);
  };
  const rotateSelected = () => {
    if (!selectedId || !geom) return;
    commit((prev) => prev.map((p) => {
      if (p.id !== selectedId) return p;
      const rot: 0 | 90 = p.rotation === 0 ? 90 : 0;
      const { w, h } = panelSize(geom, rot);
      const c = clampToRoof(p.x, p.y, w, h, roof);
      return { ...p, rotation: rot, x: c.x, y: c.y };
    }));
  };
  const removeSelected = () => {
    if (!selectedId) return;
    commit((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  };
  const clearAll = () => { if (!placed.length) return; commit([]); setSelectedId(null); setAiSuggested(false); };
  const nudge = (dx: number, dy: number) => {
    if (!selectedId || !geom) return;
    commit((prev) => prev.map((p) => {
      if (p.id !== selectedId) return p;
      const { w, h } = panelSize(geom, p.rotation);
      const c = clampToRoof(round2(p.x + dx), round2(p.y + dy), w, h, roof);
      return { ...p, x: c.x, y: c.y };
    }));
  };
  const autoFill = () => {
    if (!geom) return;
    const layout = autoFillGrid(roof, geom, () => newId("pnl"));
    commit(layout);
    setSelectedId(null);
    setNotice(layout.length ? null : "The roof (minus the 0.5 m margin) is too small for this panel.");
  };

  /* ---------------- drag (pointer events) ---------------- */
  const svgRef = useRef<SVGSVGElement>(null);
  const viewW = roof.length_m * PX_PER_M + PAD * 2;
  const viewH = roof.width_m * PX_PER_M + PAD * 2;
  const dragRef = useRef<{ id: string; offX: number; offY: number; before: PlacedPanel[]; moved: boolean } | null>(null);

  const toMetres = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    const sx = viewW / r.width, sy = viewH / r.height;
    return { x: ((e.clientX - r.left) * sx - PAD) / PX_PER_M, y: ((e.clientY - r.top) * sy - PAD) / PX_PER_M };
  };
  const onPanelPointerDown = (e: ReactPointerEvent<SVGGElement>, p: PlacedPanel) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const m = toMetres(e);
    dragRef.current = { id: p.id, offX: m.x - p.x, offY: m.y - p.y, before: placed, moved: false };
    setSelectedId(p.id);
    svgRef.current?.focus();
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = dragRef.current; if (!d || !geom) return;
    const m = toMetres(e);
    setPlaced((prev) => prev.map((p) => {
      if (p.id !== d.id) return p;
      const { w, h } = panelSize(geom, p.rotation);
      let x = snap(m.x - d.offX), y = snap(m.y - d.offY);
      if (snapNeighboursOn) {
        const others = prev.filter((o) => o.id !== p.id).map((o) => panelRect(o, geom));
        ({ x, y } = snapNeighbours({ x, y, w, h }, others));
      }
      const c = clampToRoof(x, y, w, h, roof);
      if (c.x !== p.x || c.y !== p.y) d.moved = true;
      return { ...p, x: round2(c.x), y: round2(c.y) };
    }));
  };
  const endDrag = () => {
    const d = dragRef.current; if (!d) return;
    if (d.moved) { setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), d.before]); setAiSuggested(false); }
    dragRef.current = null;
  };

  const onKeyDown = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    if (!selectedId) return;
    const step = e.shiftKey ? 0.5 : 0.1;
    const map: Record<string, () => void> = {
      ArrowLeft: () => nudge(-step, 0), ArrowRight: () => nudge(step, 0), ArrowUp: () => nudge(0, -step), ArrowDown: () => nudge(0, step),
      r: rotateSelected, R: rotateSelected, Delete: removeSelected, Backspace: removeSelected, Escape: () => setSelectedId(null),
    };
    const fn = map[e.key];
    if (fn) { e.preventDefault(); fn(); }
  };

  /* ---------------- derived metrics ---------------- */
  const problems = useMemo(() => (geom ? detectProblems(placed, roof.obstacles, roof, geom) : { panelIds: new Set<string>(), messages: [] }), [placed, roof, geom]);
  const areas = useMemo(() => (geom ? areaSummary(placed, roof, geom) : null), [placed, roof, geom]);
  const capacity = systemCapacityKwp(placed.length, geom?.rated_power_w ?? null);

  const [psh, setPsh] = useState("");
  const [pr, setPr] = useState("");
  const pshNum = psh.trim() === "" ? null : Number(psh);
  const prNum = pr.trim() === "" ? null : Number(pr);
  const productionRaw = annualProductionKwh(capacity.value, { peakSunHoursPerDay: Number.isFinite(pshNum as number) ? pshNum : null, performanceRatio: Number.isFinite(prNum as number) ? prNum : null });
  const production: Classified = productionRaw.value !== null ? { ...productionRaw, notes: [...(productionRaw.notes ?? []), "Peak sun hours and performance ratio were entered by you (user-provided), not taken from a data source."] } : productionRaw;

  const cost: Classified = (() => {
    if (!product) return unavailable("Select a panel.");
    const missing: string[] = [];
    if (product.price === null) missing.push("panel price not provided");
    if (product.installation_cost === null) missing.push(PLACEHOLDERS.INSTALLATION_PRICE);
    if (missing.length) return unavailable(missing.join(" · "));
    return classified(placed.length * (product.price as number) + (product.installation_cost as number), "calculated", "Catalog prices", [`${placed.length} × ${product.price} + installation ${product.installation_cost}`]);
  })();

  const countCls: Classified = classified(placed.length, "calculated", "Roof geometry");
  const usedCls: Classified = areas ? classified(areas.used, "calculated", "Panel dimensions × count") : unavailable("Select a panel with dimensions.");
  const remainingCls: Classified = areas ? classified(areas.remaining, "calculated", "Roof − obstacles − panels", ["Gross area; ignores walkways and setbacks."]) : unavailable("Select a panel with dimensions.");

  /* ---------------- AI smart placement ---------------- */
  const [ai, setAi] = useState<AiState>({ status: "idle" });
  const requestAi = async () => {
    if (!geom || !product) return;
    setAi({ status: "loading" });
    try {
      const res = await fetch("/api/ai/placement", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roof: { length_m: roof.length_m, width_m: roof.width_m, orientation: roof.orientation, tilt_deg: roof.tilt_deg, obstacles: roof.obstacles.map(({ x, y, w, h, label }) => ({ x, y, w, h, label })) },
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
    commit(layout, { keepAi: true });
    setAiSuggested(true);
    setSelectedId(null);
  };

  /* ---------------- save ---------------- */
  const [name, setName] = useState("My roof design");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const buildDesign = (): Omit<SavedDesign, "id" | "created_at"> | null => {
    if (!product || !geom || !areas) return null;
    return {
      name: name.trim() || "My roof design", roof, panel_product_id: product.id, panel_name: product.name, panel: geom, layout: placed,
      summary: { panel_count: placed.length, used_area_m2: round2(areas.used), remaining_area_m2: round2(areas.remaining), capacity_kwp: capacity.value },
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
    setRoof(d.roof);
    setPlaced(d.layout); setHistory([]); setSelectedId(null);
    setAiSuggested(d.is_ai_suggested);
    setName(d.name); setSavedId(d.id);
    setNotice(`Loaded "${d.name}".`);
  };
  const deleteDesign = (id: string) => setStore((s) => ({ designs: (s?.designs ?? []).filter((d) => d.id !== id) }));

  /* ---------------- obstacles ---------------- */
  const addObstacle = () => {
    const o: Obstacle = { id: newId("obs"), x: Number(obstacleDraft.x) || 0, y: Number(obstacleDraft.y) || 0, w: Math.max(0.1, Number(obstacleDraft.w) || 0.1), h: Math.max(0.1, Number(obstacleDraft.h) || 0.1), label: obstacleDraft.label.trim() || "Obstacle" };
    const c = clampToRoof(o.x, o.y, o.w, o.h, roof);
    setRoof((r) => ({ ...r, obstacles: [...r.obstacles, { ...o, x: c.x, y: c.y }] }));
  };
  const removeObstacle = (id: string) => setRoof((r) => ({ ...r, obstacles: r.obstacles.filter((o) => o.id !== id) }));
  const setRoofDim = (k: "length_m" | "width_m" | "tilt_deg", v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setRoof((r) => ({ ...r, [k]: k === "tilt_deg" ? Math.min(90, Math.max(0, n)) : Math.min(100, Math.max(1, n)) }));
  };

  const selected = placed.find((p) => p.id === selectedId) ?? null;
  const gridLines = useMemo(() => ({ v: Array.from({ length: Math.floor(roof.length_m) + 1 }, (_, i) => i), h: Array.from({ length: Math.floor(roof.width_m) + 1 }, (_, i) => i) }), [roof.length_m, roof.width_m]);

  return (
    <div className="space-y-4">
      <div role="note" className="flex items-start gap-2 rounded-[10px] border border-[var(--warn)]/50 bg-warn-soft px-3 py-2 text-[13px] text-warn-fg">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span><strong>This is a planning visualization and is not a certified engineering design.</strong> Structural loads, wiring, wind uplift, setbacks and local code must be assessed by a licensed installer.</span>
      </div>
      {product?.is_demo && <DemoBanner text="DEMO PRODUCT — NOT REAL" detail="The selected panel is an illustrative demo record. Its dimensions and power are not from a real manufacturer." />}

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* ---------------- Setup ---------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Roof" subtitle="Dimensions in metres, seen from above." />
            <CardBody className="grid grid-cols-2 gap-3">
              <Field label="Length (m)"><Input type="number" min={1} max={100} step={0.1} value={roof.length_m} onChange={(e) => setRoofDim("length_m", e.target.value)} /></Field>
              <Field label="Width (m)"><Input type="number" min={1} max={100} step={0.1} value={roof.width_m} onChange={(e) => setRoofDim("width_m", e.target.value)} /></Field>
              <Field label={<>Orientation <InfoTip term="orientation" /></>}>
                <Select value={roof.orientation} onChange={(e) => setRoof((r) => ({ ...r, orientation: e.target.value as RoofOrientation }))}>
                  {ORIENTATIONS.map((o) => <option key={o} value={o}>{o === "flat" ? "Flat roof" : o === "unknown" ? "Unknown" : o}</option>)}
                </Select>
              </Field>
              <Field label={<>Tilt (°) <InfoTip term="tilt" /></>}><Input type="number" min={0} max={90} step={1} value={roof.tilt_deg} onChange={(e) => setRoofDim("tilt_deg", e.target.value)} /></Field>
              <Field label={<>Shading notes <InfoTip term="shading" /></>} className="col-span-2" help="Optional. Passed to AI Smart Placement only.">
                <Textarea value={shadingNotes} onChange={(e) => setShadingNotes(e.target.value)} className="min-h-16" maxLength={500} placeholder="e.g. neighbour's building casts shade on the west edge after 3 pm" />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Obstacles" subtitle="Water tanks, AC units, stairwells: panels cannot be placed on them." />
            <CardBody className="space-y-3">
              {roof.obstacles.length > 0 && (
                <ul className="space-y-1.5">
                  {roof.obstacles.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 rounded-md bg-inset px-2.5 py-1.5 text-[12.5px]">
                      <span className="truncate"><span className="font-medium text-fg">{o.label}</span> <span className="tabular text-fg-muted">{o.w}×{o.h} m at ({o.x}, {o.y})</span></span>
                      <button type="button" onClick={() => removeObstacle(o.id)} aria-label={`Remove ${o.label}`} className="grid size-7 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-elevated hover:text-critical-fg"><Trash2 className="size-3.5"  aria-hidden /></button>
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
              <Button variant="outline" size="sm" onClick={addObstacle} className="w-full"><Plus className="size-4"  aria-hidden /> Add obstacle</Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Panel" subtitle="Real catalog dimensions are used for every rectangle." />
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
                  <dt className="text-fg-muted">Rated power</dt><dd className="tabular text-right text-fg">{geom.rated_power_w !== null ? `${geom.rated_power_w} W` : "Unavailable"}</dd>
                  <dt className="text-fg-muted">Area / panel</dt><dd className="tabular text-right text-fg">{(geom.length_m * geom.width_m).toFixed(2)} m² <DataBadge cls="calculated" compact /></dd>
                  <dt className="text-fg-muted">Price</dt><dd className="tabular text-right text-fg">{product.price !== null ? formatMoney(product.price, product.currency) : "Unavailable"}</dd>
                </dl>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ---------------- Canvas ---------------- */}
        <div className="space-y-3 min-w-0">
          <Card>
            <CardBody className="pt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => addPanel(0)} disabled={!geom}><Plus className="size-4"  aria-hidden /> Add panel</Button>
                <Button size="sm" variant="outline" onClick={autoFill} disabled={!geom}><Grid3x3 className="size-4"  aria-hidden /> Auto-fill grid</Button>
                <Button size="sm" variant="outline" onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 className="size-4"  aria-hidden /> Undo</Button>
                <Button size="sm" variant="ghost" onClick={clearAll} disabled={!placed.length}><Eraser className="size-4"  aria-hidden /> Clear all</Button>
                <label className="ml-auto flex items-center gap-2 text-[12.5px] text-fg-secondary select-none">
                  <input type="checkbox" checked={snapNeighboursOn} onChange={(e) => setSnapNeighboursOn(e.target.checked)} className="accent-[var(--brand)]" /> Snap to neighbours
                </label>
              </div>

              <div className="relative overflow-hidden rounded-[var(--radius)] border border-border bg-inset">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${viewW} ${viewH}`}
                  className="block w-full h-auto touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  style={{ maxHeight: "70dvh" }}
                  tabIndex={0}
                  role="application"
                  aria-label={`Roof plan ${roof.length_m} by ${roof.width_m} metres with ${placed.length} panels. Use arrow keys to move the selected panel, R to rotate, Delete to remove.`}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onPointerDown={() => setSelectedId(null)}
                  onKeyDown={onKeyDown}
                >
                  <defs>
                    <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--fg-muted)" strokeWidth="2" />
                    </pattern>
                  </defs>
                  <g transform={`translate(${PAD} ${PAD})`}>
                    {/* roof */}
                    <rect x={0} y={0} width={roof.length_m * PX_PER_M} height={roof.width_m * PX_PER_M} fill="var(--bg-elevated)" stroke="var(--navy)" strokeWidth={2} />
                    {/* 1 m grid */}
                    {gridLines.v.map((i) => <line key={`v${i}`} x1={i * PX_PER_M} x2={i * PX_PER_M} y1={0} y2={roof.width_m * PX_PER_M} stroke="var(--grid)" strokeWidth={1} />)}
                    {gridLines.h.map((i) => <line key={`h${i}`} x1={0} x2={roof.length_m * PX_PER_M} y1={i * PX_PER_M} y2={i * PX_PER_M} stroke="var(--grid)" strokeWidth={1} />)}
                    {/* dimension labels */}
                    <text x={(roof.length_m * PX_PER_M) / 2} y={-9} textAnchor="middle" fontSize={11} fill="var(--fg-muted)" className="tabular">{roof.length_m} m</text>
                    <text x={-9} y={(roof.width_m * PX_PER_M) / 2} textAnchor="middle" fontSize={11} fill="var(--fg-muted)" transform={`rotate(-90 -9 ${(roof.width_m * PX_PER_M) / 2})`} className="tabular">{roof.width_m} m</text>
                    {/* obstacles */}
                    {roof.obstacles.map((o) => (
                      <g key={o.id}>
                        <rect x={o.x * PX_PER_M} y={o.y * PX_PER_M} width={o.w * PX_PER_M} height={o.h * PX_PER_M} fill="url(#hatch)" stroke="var(--fg-muted)" strokeWidth={1.5} />
                        <text x={o.x * PX_PER_M + 4} y={o.y * PX_PER_M + 13} fontSize={10.5} fill="var(--fg-secondary)">{o.label}</text>
                      </g>
                    ))}
                    {/* panels */}
                    {geom && placed.map((p, i) => {
                      const r = panelRect(p, geom);
                      const bad = problems.panelIds.has(p.id);
                      const sel = p.id === selectedId;
                      return (
                        <g key={p.id} onPointerDown={(e) => onPanelPointerDown(e, p)} className="cursor-grab active:cursor-grabbing" role="button" aria-label={`Panel ${i + 1} at ${p.x}, ${p.y} metres${bad ? ", has a problem" : ""}`}>
                          <rect x={r.x * PX_PER_M} y={r.y * PX_PER_M} width={r.w * PX_PER_M} height={r.h * PX_PER_M} rx={2}
                            fill={bad ? "var(--critical-soft)" : aiSuggested ? "var(--cls-ai-soft)" : "var(--data-soft)"}
                            stroke={bad ? "var(--critical)" : sel ? "var(--brand-strong)" : aiSuggested ? "var(--cls-ai)" : "var(--series-1)"}
                            strokeWidth={sel ? 3 : 1.5} />
                          {/* cell lines for a panel look */}
                          <line x1={r.x * PX_PER_M} x2={(r.x + r.w) * PX_PER_M} y1={(r.y + r.h / 2) * PX_PER_M} y2={(r.y + r.h / 2) * PX_PER_M} stroke={bad ? "var(--critical)" : "var(--series-1)"} strokeOpacity={0.35} />
                          <line y1={r.y * PX_PER_M} y2={(r.y + r.h) * PX_PER_M} x1={(r.x + r.w / 2) * PX_PER_M} x2={(r.x + r.w / 2) * PX_PER_M} stroke={bad ? "var(--critical)" : "var(--series-1)"} strokeOpacity={0.35} />
                          <text x={(r.x + r.w / 2) * PX_PER_M} y={(r.y + r.h / 2) * PX_PER_M + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={bad ? "var(--critical-fg)" : "var(--fg-secondary)"} className="tabular pointer-events-none">{i + 1}</text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>

              {/* Touch / accessibility controls for the selected panel */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] text-fg-muted">{selected ? `Panel ${placed.indexOf(selected) + 1} selected: (${selected.x}, ${selected.y}) m, ${selected.rotation}°` : "Tap a panel to select it. Drag to move."}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" aria-label="Nudge left" disabled={!selected} onClick={() => nudge(-0.1, 0)} className={ctl}><ArrowLeft className="size-4"  aria-hidden /></button>
                  <button type="button" aria-label="Nudge up" disabled={!selected} onClick={() => nudge(0, -0.1)} className={ctl}><ArrowUp className="size-4"  aria-hidden /></button>
                  <button type="button" aria-label="Nudge down" disabled={!selected} onClick={() => nudge(0, 0.1)} className={ctl}><ArrowDown className="size-4"  aria-hidden /></button>
                  <button type="button" aria-label="Nudge right" disabled={!selected} onClick={() => nudge(0.1, 0)} className={ctl}><ArrowRight className="size-4"  aria-hidden /></button>
                  <button type="button" aria-label="Rotate selected panel (R)" disabled={!selected} onClick={rotateSelected} className={ctl}><RotateCw className="size-4"  aria-hidden /></button>
                  <button type="button" aria-label="Remove selected panel (Delete)" disabled={!selected} onClick={removeSelected} className={cn(ctl, "hover:text-critical-fg")}><Trash2 className="size-4"  aria-hidden /></button>
                </div>
              </div>
              <p className="text-[11.5px] text-fg-muted">Keyboard: focus the drawing, then use arrow keys (Shift = 0.5 m), <kbd className="rounded border border-border px-1">R</kbd> rotate, <kbd className="rounded border border-border px-1">Delete</kbd> remove, <kbd className="rounded border border-border px-1">Esc</kbd> deselect. Positions snap to 0.1 m.</p>

              {problems.messages.length > 0 && (
                <div role="alert" className="rounded-[10px] border border-[var(--critical)]/40 bg-critical-soft px-3 py-2 text-[12.5px] text-critical-fg">
                  <div className="font-semibold">Layout problems ({problems.messages.length})</div>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">{problems.messages.slice(0, 6).map((m, i) => <li key={i}>{m}</li>)}{problems.messages.length > 6 && <li>…and {problems.messages.length - 6} more</li>}</ul>
                </div>
              )}
              {notice && <p className="text-[12.5px] text-fg-secondary" role="status">{notice}</p>}
            </CardBody>
          </Card>

          {/* AI Smart Placement */}
          <Card>
            <CardHeader title={<><Sparkles className="size-4 text-[var(--cls-ai)]" aria-hidden /> AI Smart Placement</>} subtitle="Ask the AI Solar Agent for a suggested layout. It sees only the roof, obstacles, panel size and your shading notes."
              action={<Button size="sm" variant="secondary" onClick={requestAi} disabled={!geom || ai.status === "loading"}>{ai.status === "loading" ? "Thinking…" : "Suggest placement"}</Button>} />
            <CardBody>
              {ai.status === "idle" && <p className="text-[13px] text-fg-muted">No suggestion requested yet. Suggestions are labeled <DataBadge cls="ai" compact /> and can be wrong: check them against the overlap warnings.</p>}
              {ai.status === "loading" && <p className="text-[13px] text-fg-muted">Requesting a layout…</p>}
              {ai.status === "not_configured" && (
                <UnavailableState title="Smart placement is not connected">
                  <p>{ai.message}</p>
                  <PlaceholderNote k="CLAUDE_API_KEY" className="mt-3 text-left" />
                </UnavailableState>
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
          </Card>
        </div>

        {/* ---------------- Summary ---------------- */}
        <div className="space-y-3">
          {aiSuggested && <div className="flex items-center gap-2 text-[12.5px] text-fg-secondary"><DataBadge cls="ai" /> Layout applied from an AI suggestion.</div>}
          <Metric label="Panels placed" data={countCls} format={(v) => String(v)} />
          <Metric label="Used area" data={usedCls} unit="m²" format={(v) => formatNumber(v, 1)} />
          <Metric label="Remaining available area" data={remainingCls} unit="m²" format={(v) => formatNumber(v, 1)} />
          <Metric label="System capacity" term="kwp" data={capacity} unit="kWp" format={(v) => formatNumber(v, 2)} />

          <Card>
            <CardHeader title={<>Annual production <InfoTip term="energy_production" /></>} subtitle="Needs a solar resource figure and a performance ratio. Neither has been provided, so enter your own assumptions." />
            <CardBody className="space-y-3">
              <Metric label="Estimated annual production" data={production} unit="kWh" format={(v) => formatNumber(v, 0)} footnote={production.value !== null ? "Based on your assumptions below" : undefined} />
              <div className="grid grid-cols-2 gap-2">
                <Field label={<>Peak sun h/day <InfoTip term="peak_sun_hours" /></>} help={<Placeholder k="SOLAR_RESOURCE_DATA_SOURCE" />}>
                  <div className="relative"><Input type="number" step={0.1} min={0} max={12} value={psh} onChange={(e) => setPsh(e.target.value)} placeholder="e.g. 5.5" aria-label="Peak sun hours per day (your assumption)" /><DataBadge cls="user" compact className="absolute right-2 top-1/2 -translate-y-1/2" /></div>
                </Field>
                <Field label={<>Performance ratio <InfoTip term="performance_ratio" /></>} help={<Placeholder k="SYSTEM_LOSS_FACTOR" />}>
                  <div className="relative"><Input type="number" step={0.01} min={0} max={1} value={pr} onChange={(e) => setPr(e.target.value)} placeholder="0–1, e.g. 0.8" aria-label="Performance ratio (your assumption)" /><DataBadge cls="user" compact className="absolute right-2 top-1/2 -translate-y-1/2" /></div>
                </Field>
              </div>
            </CardBody>
          </Card>

          <Metric label="Estimated cost" data={cost} format={(v) => formatMoney(v, product?.currency ?? "KWD")} footnote={cost.value === null ? <span className="flex flex-wrap items-center gap-1">Installation: <Placeholder k="INSTALLATION_PRICE" /></span> : undefined} />

          <Card>
            <CardHeader title="Save design" />
            <CardBody className="space-y-3">
              <Field label="Design name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
              <div className="flex flex-col gap-2">
                <Button onClick={save} disabled={saving || !placed.length || !geom}><Save className="size-4"  aria-hidden /> {saving ? "Saving…" : "Save design"}</Button>
                <Button variant="outline" disabled={!savedId} onClick={() => savedId && router.push(`/purchase?design=${encodeURIComponent(savedId)}`)}>Continue to purchase <ArrowRight className="size-4"  aria-hidden /></Button>
              </div>
              {mode === "demo" && <p className="text-[11.5px] text-fg-muted">Demo mode: designs are stored in this browser only. <Placeholder k="SUPABASE_PROJECT" /></p>}
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
                          <button type="button" onClick={() => loadDesign(d)} aria-label={`Load ${d.name}`} className={ctl}><FolderOpen className="size-3.5"  aria-hidden /></button>
                          <button type="button" onClick={() => deleteDesign(d.id)} aria-label={`Delete ${d.name}`} className={cn(ctl, "hover:text-critical-fg")}><Trash2 className="size-3.5"  aria-hidden /></button>
                        </div>
                      </div>
                      <div className="tabular text-fg-muted">{d.summary.panel_count} panels · {d.summary.capacity_kwp !== null ? `${formatNumber(d.summary.capacity_kwp, 2)} kWp` : "capacity n/a"} · {d.roof.length_m}×{d.roof.width_m} m</div>
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

function AiList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">{title}</div>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-fg-secondary">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}
