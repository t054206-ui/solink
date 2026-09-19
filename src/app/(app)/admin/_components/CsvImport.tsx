"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { Download, FileUp, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Form";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { DataMode } from "@/lib/data/mode";
import type { Product } from "@/lib/types";
import { Table, Th, Td, FlagList } from "./AdminBits";
import { applyCsvImportAction } from "../actions";
import {
  ADMIN_PRODUCTS_STORE, IMPORT_FIELDS, IMPORT_REQUIRED_KEYS, autoMap, csvTemplate, detectDelimiter, newLocalId, normalizeImportRows, parseCsv, toNumericSpec,
  type AdminProductStore, type NormalizedImportRow,
} from "./admin-helpers";

const STATUS_TONE: Record<NormalizedImportRow["status"], "good" | "warn" | "critical" | "neutral"> = { ok: "good", flagged: "warn", duplicate: "neutral", rejected: "critical" };

export function CsvImport({ mode }: { mode: DataMode }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [, setStore] = useLocalStore<AdminProductStore>(ADMIN_PRODUCTS_STORE, {});
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const onFile = async (f: File | undefined) => {
    setResult(null); setParseError(null);
    if (!f) return;
    const text = await f.text();
    const parsed = parseCsv(text, detectDelimiter(text));
    if (parsed.length < 1) { setParseError("The file is empty."); return; }
    const hdr = parsed[0].map((h) => h.trim());
    if (hdr.some((h) => h === "")) setParseError("Some header cells are empty; unnamed columns cannot be mapped.");
    setFileName(f.name); setHeaders(hdr); setRows(parsed.slice(1)); setMapping(autoMap(hdr));
  };

  const mappedKeys = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);
  const missingRequired = IMPORT_REQUIRED_KEYS.filter((k) => !mappedKeys.has(k));
  const normalized = useMemo(() => (headers.length && missingRequired.length === 0 ? normalizeImportRows(headers, rows, mapping) : []), [headers, rows, mapping, missingRequired.length]);
  const counts = useMemo(() => normalized.reduce((acc, r) => { acc[r.status]++; return acc; }, { ok: 0, flagged: 0, duplicate: 0, rejected: 0 } as Record<NormalizedImportRow["status"], number>), [normalized]);

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "solink-solar-panel-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => { setFileName(null); setHeaders([]); setRows([]); setMapping({}); setResult(null); setParseError(null); if (fileRef.current) fileRef.current.value = ""; };

  const apply = () => {
    if (!fileName || normalized.length === 0) return;
    if (mode === "demo") {
      const now = new Date().toISOString();
      const additions: AdminProductStore = {};
      let inserted = 0;
      for (const r of normalized) {
        if (r.status === "rejected" || r.status === "duplicate") continue;
        const id = newLocalId();
        const product: Product = {
          id, category: "solar_panel", manufacturer_id: null, manufacturer_name: r.manufacturer, model: r.model, name: r.name, description: null,
          price: toNumericSpec(r.price), currency: "KWD", installation_cost: { value: null, status: "unavailable" }, annual_maintenance_cost: { value: null, status: "unavailable" }, cleaning_cost: { value: null, status: "unavailable" }, expected_annual_production_kwh: { value: null, status: "unavailable" },
          images: [], specs: { ...r.specs, additional: {} },
          source: { data_source: `CSV import ${fileName} (local browser only)`, source_url: r.source.source_url, datasheet_url: r.source.datasheet_url, manufacturer_doc_url: r.source.manufacturer_doc_url, date_added: now, date_last_updated: now, verification_status: "unverified" },
          is_demo: false, is_archived: false, is_outdated: false, current_version_id: null,
        };
        additions[id] = product; inserted++;
      }
      setStore((prev) => ({ ...prev, ...additions }));
      setResult({ ok: true, text: `${inserted} row(s) stored in this browser only as Unverified (demo mode, no database). ${counts.duplicate} duplicate(s) and ${counts.rejected} rejected row(s) were skipped. Flags are kept on the records for review.` });
      return;
    }
    start(async () => {
      const r = await applyCsvImportAction({ fileName, headers, mapping, rows: normalized });
      if (r.ok) setResult({ ok: true, text: `Import ${r.importId} applied: ${r.inserted} product(s) inserted as Unverified (${r.flagged} with flags), ${r.duplicates} duplicate(s) skipped, ${r.rejected} rejected. Review them in Verification.` });
      else setResult({ ok: false, text: r.error });
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-border-strong bg-elevated px-4 text-sm font-medium text-fg hover:bg-inset">
          <FileUp className="size-4" aria-hidden /> Choose CSV file
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <Button type="button" variant="ghost" onClick={downloadTemplate}><Download className="size-4" aria-hidden /> Download header-only template</Button>
        {fileName && <Button type="button" variant="ghost" onClick={reset}><RotateCcw className="size-4" aria-hidden /> Start over</Button>}
      </div>
      <p className="text-[12.5px] text-fg-muted">The file is parsed in your browser; nothing is uploaded until you press Apply. The template contains column headers only: no sample values, because Solink never invents product data.</p>
      {parseError && <p role="alert" className="text-[13px] text-critical-fg">{parseError}</p>}

      {headers.length > 0 && (
        <>
          <section aria-labelledby="map-h">
            <h3 id="map-h" className="text-[15px] font-semibold">1. Map columns <span className="text-fg-muted font-normal">— {fileName}, {rows.length} data row{rows.length === 1 ? "" : "s"}</span></h3>
            <p className="mt-1 text-[12.5px] text-fg-muted">Required: {IMPORT_REQUIRED_KEYS.join(", ")}. Unmapped columns are kept in the raw row for audit but not imported.</p>
            {missingRequired.length > 0 && <p role="alert" className="mt-2 text-[13px] text-critical-fg">Map these required fields to continue: {missingRequired.join(", ")}.</p>}
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h, i) => (
                <div key={`${h}-${i}`} className="rounded-[10px] border border-border bg-inset p-2.5">
                  <div className="truncate font-mono text-[12px] text-fg" title={h}>{h || <em>(empty header)</em>}</div>
                  <div className="truncate text-[11.5px] text-fg-muted" title={rows[0]?.[i]}>first value: {rows[0]?.[i] || "—"}</div>
                  <Select aria-label={`Map column ${h}`} className="mt-1.5 h-9 text-[13px]" value={mapping[h] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}>
                    <option value="">— not imported —</option>
                    {IMPORT_FIELDS.map((f) => <option key={f.key} value={f.key} disabled={mappedKeys.has(f.key) && mapping[h] !== f.key}>{f.label}{f.required ? " *" : ""}{f.unit ? ` (${f.unit})` : ""}</option>)}
                  </Select>
                </div>
              ))}
            </div>
          </section>

          {missingRequired.length === 0 && (
            <section aria-labelledby="prev-h" className="space-y-3">
              <h3 id="prev-h" className="text-[15px] font-semibold">2. Preview & validation</h3>
              <div className="flex flex-wrap gap-2 text-[12.5px]">
                <Badge tone="good">{counts.ok} ok</Badge><Badge tone="warn">{counts.flagged} flagged</Badge><Badge tone="neutral">{counts.duplicate} duplicate</Badge><Badge tone="critical">{counts.rejected} rejected</Badge>
              </div>
              <p className="text-[12.5px] text-fg-muted">Flags mirror the database validation (missing required fields, out-of-range values, Vmp &lt; Voc, Imp &lt; Isc, Vmp × Imp ≈ P, efficiency vs power/area). Flagged rows are imported <strong>as-is</strong> and marked for review; values are never corrected. Duplicates (same manufacturer + model) and rows missing manufacturer/model are skipped.</p>
              <Table caption="Import preview">
                <thead><tr><Th>Row</Th><Th>Status</Th><Th>Manufacturer</Th><Th>Model</Th><Th>Power</Th><Th>Eff.</Th><Th>L × W</Th><Th>Flags</Th></tr></thead>
                <tbody>
                  {normalized.slice(0, 200).map((r) => (
                    <tr key={r.rowNumber}>
                      <Td className="tabular">{r.rowNumber}</Td>
                      <Td><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></Td>
                      <Td className="text-fg">{r.manufacturer || <em className="text-critical-fg">missing</em>}</Td>
                      <Td className="font-mono text-[12px]">{r.model || <em className="text-critical-fg">missing</em>}</Td>
                      <Td className="tabular">{typeof r.specs.rated_power_w?.value === "number" ? `${r.specs.rated_power_w.value} W` : "—"}</Td>
                      <Td className="tabular">{typeof r.specs.module_efficiency_pct?.value === "number" ? `${r.specs.module_efficiency_pct.value} %` : "—"}</Td>
                      <Td className="tabular">{typeof r.specs.length_mm?.value === "number" && typeof r.specs.width_mm?.value === "number" ? `${r.specs.length_mm.value} × ${r.specs.width_mm.value} mm` : "—"}</Td>
                      <Td><FlagList flags={r.flags} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {normalized.length > 200 && <p className="text-[12px] text-fg-muted">Showing the first 200 of {normalized.length} rows; all rows are processed on Apply.</p>}

              <h3 className="text-[15px] font-semibold">3. Apply</h3>
              {mode === "demo" && <DemoBanner text="LOCAL ONLY" detail="Supabase is not connected. Applying stores the rows in this browser as Unverified products so the flow can be tested; nothing reaches a database." />}
              <p className="text-[12.5px] text-fg-muted">Creates a <code className="font-mono">product_imports</code> record, one <code className="font-mono">product_import_rows</code> entry per row (raw + normalized + flags), and one <code className="font-mono">solar_products</code> row per accepted line with <code className="font-mono">verification_status: unverified</code> and <code className="font-mono">source.data_source = “CSV import {fileName}”</code>.</p>
              {result && <p role="status" className={`flex items-start gap-2 text-[13px] ${result.ok ? "text-good-fg" : "text-critical-fg"}`}>{result.ok && <CheckCircle2 className="size-4 shrink-0 mt-0.5" aria-hidden />}{result.text}</p>}
              <Button type="button" onClick={apply} disabled={pending || normalized.length === 0 || counts.ok + counts.flagged === 0 || (result?.ok ?? false)}>{pending ? "Applying…" : `Apply import (${counts.ok + counts.flagged} row${counts.ok + counts.flagged === 1 ? "" : "s"})`}</Button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
