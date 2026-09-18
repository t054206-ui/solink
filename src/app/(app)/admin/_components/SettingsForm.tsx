"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Form";
import { Placeholder } from "@/components/ui/Placeholder";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import type { PlaceholderKey } from "@/lib/config/placeholders";
import type { DataMode } from "@/lib/data/mode";
import { formatDate } from "@/lib/utils";
import { upsertSettingAction, clearSettingAction } from "../actions";
import type { SettingRow } from "../_lib/data";

export interface SettingDef {
  key: string; label: string; placeholder: PlaceholderKey; unit?: string; help: string;
  kind: "number" | "text" | "thresholds" | "json";
}

export const SETTING_DEFS: SettingDef[] = [
  { key: "electricity_tariff_per_kwh", label: "Electricity tariff", placeholder: "ELECTRICITY_TARIFF", unit: "KWD / kWh", kind: "number", help: "Price the homeowner pays per kWh. Source: utility tariff document or regulator page." },
  { key: "peak_sun_hours_per_day", label: "Peak sun hours per day", placeholder: "SOLAR_RESOURCE_DATA_SOURCE", unit: "h/day", kind: "number", help: "Site solar resource (kWh/m²/day). Source: irradiance dataset or measured data." },
  { key: "performance_ratio", label: "Performance ratio", placeholder: "SYSTEM_LOSS_FACTOR", unit: "0–1", kind: "number", help: "System losses from heat, soiling, wiring and inverter." },
  { key: "grid_co2_kg_per_kwh", label: "Grid CO₂ emission factor", placeholder: "GRID_CO2_EMISSION_FACTOR", unit: "kg CO₂ / kWh", kind: "number", help: "Emission intensity of the Kuwait grid." },
  { key: "expected_panel_degradation_rate", label: "Expected panel degradation rate", placeholder: "EXPECTED_PANEL_DEGRADATION_RATE", unit: "fraction / year", kind: "number", help: "E.g. from manufacturer performance warranty. Product-specific values live on the product." },
  { key: "tco_period_years", label: "TCO analysis period", placeholder: "TCO_PERIOD", unit: "years", kind: "number", help: "Horizon for total-cost-of-ownership comparisons." },
  { key: "production_alert_thresholds", label: "Production alert thresholds", placeholder: "PRODUCTION_ALERT_THRESHOLDS", kind: "thresholds", help: "Percent deviation below expected production that triggers a warning and an alert." },
  { key: "end_of_life_criteria", label: "End-of-life criteria", placeholder: "END_OF_LIFE_CRITERIA", kind: "json", help: "JSON object describing when equipment is considered end-of-life (e.g. {\"min_output_pct\": …, \"max_age_years\": …})." },
  { key: "payment_provider", label: "Payment provider", placeholder: "PAYMENT_PROVIDER", kind: "text", help: "Name of the selected payment provider. Credentials belong in environment variables, never here." },
  { key: "notification_provider", label: "Email / notification provider", placeholder: "EMAIL_NOTIFICATION_PROVIDER", kind: "text", help: "Name of the selected email/SMS/push provider. Credentials belong in environment variables." },
];

function describeValue(def: SettingDef, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (def.kind === "number") { const v = typeof value === "object" && value !== null && "value" in value ? (value as { value: unknown }).value : value; return typeof v === "number" ? `${v}${def.unit ? ` ${def.unit}` : ""}` : String(v); }
  if (def.kind === "thresholds" && typeof value === "object") { const t = value as { warn_pct?: number; alert_pct?: number }; return `warn at −${t.warn_pct ?? "?"} % · alert at −${t.alert_pct ?? "?"} %`; }
  if (def.kind === "text") return typeof value === "object" && value !== null && "value" in value ? String((value as { value: unknown }).value) : String(value);
  return JSON.stringify(value);
}

function SettingEditor({ def, row, mode }: { def: SettingDef; row: SettingRow | undefined; mode: DataMode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [num, setNum] = useState("");
  const [text, setText] = useState("");
  const [warn, setWarn] = useState("");
  const [alert, setAlert] = useState("");
  const [json, setJson] = useState("");
  const [source, setSource] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const current = describeValue(def, row?.value ?? null);

  const buildValue = (): { value: unknown } | { error: string } => {
    if (def.kind === "number") { const n = Number(num); if (num.trim() === "" || !Number.isFinite(n)) return { error: "Enter a number." }; return { value: { value: n } }; }
    if (def.kind === "text") { if (!text.trim()) return { error: "Enter a value." }; return { value: { value: text.trim() } }; }
    if (def.kind === "thresholds") { const w = Number(warn), a = Number(alert); if (!Number.isFinite(w) || !Number.isFinite(a) || warn === "" || alert === "") return { error: "Enter both percentages." }; if (w >= a) return { error: "Warning threshold must be smaller than alert threshold." }; return { value: { warn_pct: w, alert_pct: a } }; }
    try { const parsed: unknown = JSON.parse(json); if (typeof parsed !== "object" || parsed === null) return { error: "Must be a JSON object." }; return { value: parsed }; } catch { return { error: "Invalid JSON." }; }
  };
  const canSave = source.trim().length > 0 && !("error" in buildValue());

  const save = () => {
    const v = buildValue();
    if ("error" in v) { setMsg({ ok: false, text: v.error }); return; }
    if (!source.trim()) { setMsg({ ok: false, text: "A source is required." }); return; }
    if (mode === "demo") { setMsg({ ok: false, text: "Demo mode: platform settings need Supabase (platform_settings table). Nothing was saved." }); return; }
    start(async () => { const r = await upsertSettingAction({ key: def.key, value: v.value, source }); setMsg({ ok: r.ok, text: r.ok ? "Saved with source." : r.error }); if (r.ok) { router.refresh(); setSource(""); } });
  };
  const clear = () => {
    if (mode === "demo") { setMsg({ ok: false, text: "Demo mode: nothing to clear on a server." }); return; }
    start(async () => { const r = await clearSettingAction({ key: def.key }); setMsg({ ok: r.ok, text: r.ok ? "Cleared — the placeholder is shown again." : r.error }); if (r.ok) router.refresh(); });
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-fg">{def.label}</h3>
          <div className="font-mono text-[11.5px] text-fg-muted">{def.key}</div>
        </div>
        {current ? <DataBadge cls="source" source={row?.source ?? undefined} /> : <DataBadge cls="unavailable" compact />}
      </div>
      <p className="mt-1.5 text-[12.5px] text-fg-secondary">{def.help}</p>
      <div className="mt-3 rounded-[10px] border border-border bg-inset p-3 text-[13px]">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-fg-muted">Current value</div>
        {current ? (
          <div className="mt-1"><span className="tabular font-medium text-fg">{current}</span><div className="mt-0.5 text-[12px] text-fg-muted">Source: {row?.source ?? "—"} · updated {formatDate(row?.updated_at)}</div></div>
        ) : <div className="mt-1"><Placeholder k={def.placeholder} /><div className="mt-0.5 text-[12px] text-fg-muted">Not provided. Homeowners can enter their own value, labeled user-provided.</div></div>}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>New value{def.unit ? <span className="font-normal text-fg-muted"> ({def.unit})</span> : null}</Label>
          {def.kind === "number" && <Input type="number" inputMode="decimal" step="any" value={num} onChange={(e) => setNum(e.target.value)} placeholder="Enter value" />}
          {def.kind === "text" && <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Provider name" />}
          {def.kind === "thresholds" && <div className="grid grid-cols-2 gap-2"><Input type="number" inputMode="decimal" step="any" min={0} max={100} aria-label="Warning percent" value={warn} onChange={(e) => setWarn(e.target.value)} placeholder="warn %" /><Input type="number" inputMode="decimal" step="any" min={0} max={100} aria-label="Alert percent" value={alert} onChange={(e) => setAlert(e.target.value)} placeholder="alert %" /></div>}
          {def.kind === "json" && <Textarea value={json} onChange={(e) => setJson(e.target.value)} placeholder='{"…": …}' className="font-mono text-[12.5px]" />}
        </div>
        <div>
          <Label>Source <span className="text-critical-fg" aria-hidden>*</span></Label>
          <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Document, URL or organisation and date" required aria-required />
          <p className="mt-1 text-[11.5px] text-fg-muted">Required — a value cannot be saved without saying where it came from.</p>
        </div>
      </div>
      {msg && <p role="status" className={`mt-2 text-[12.5px] ${msg.ok ? "text-good-fg" : "text-critical-fg"}`}>{msg.text}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={pending || !canSave}><Save className="size-3.5" aria-hidden /> Save with source</Button>
        {current && <Button size="sm" variant="ghost" onClick={clear} disabled={pending}><Eraser className="size-3.5" aria-hidden /> Clear value</Button>}
      </div>
    </div>
  );
}

export function SettingsForm({ rows, mode }: { rows: SettingRow[]; mode: DataMode }) {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return (
    <div className="space-y-4">
      {mode === "demo" && <DemoBanner text="DEMO MODE" detail="platform_settings lives in Supabase. Every setting below is unset and shows its placeholder; the form is visible so the workflow can be reviewed, but nothing can be saved." />}
      <div className="grid gap-4 lg:grid-cols-2">
        {SETTING_DEFS.map((d) => <SettingEditor key={d.key} def={d} row={byKey.get(d.key)} mode={mode} />)}
      </div>
    </div>
  );
}
