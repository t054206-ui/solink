import { InfoTip } from "@/components/help/InfoTip";
import { DataBadge } from "@/components/ui/DataBadge";
import type { Product } from "@/lib/types";
import { specText } from "@/lib/utils";
import { getSpec, humanizeKey, type AnySpec } from "../../_components/product-helpers";
import { PriceCell } from "../../_components/PriceCell";

interface RowDef { key: string; label: string; term?: string; /** always show for these categories even when the field is missing */ always?: Product["category"][] }
interface GroupDef { title: string; rows: RowDef[] }

const PANEL: Product["category"][] = ["solar_panel"];

const GROUPS: GroupDef[] = [
  { title: "Electrical", rows: [
    { key: "rated_power_w", label: "Rated power (Pmax)", term: "peak_power", always: PANEL },
    { key: "module_efficiency_pct", label: "Module efficiency", term: "efficiency", always: PANEL },
    { key: "max_system_voltage_v", label: "Max system voltage", always: PANEL },
    { key: "voc_v", label: "Open-circuit voltage (Voc)", term: "voc", always: PANEL },
    { key: "isc_a", label: "Short-circuit current (Isc)", term: "isc", always: PANEL },
    { key: "vmp_v", label: "Voltage at max power (Vmp)", term: "vmp", always: PANEL },
    { key: "imp_a", label: "Current at max power (Imp)", term: "imp", always: PANEL },
    { key: "rated_ac_power_kw", label: "Rated AC power", term: "inverter" },
    { key: "max_dc_input_kw", label: "Max DC input" },
    { key: "mppt_count", label: "MPPT trackers" },
    { key: "efficiency_pct", label: "Efficiency" },
    { key: "usable_capacity_kwh", label: "Usable capacity", term: "battery" },
    { key: "chemistry", label: "Chemistry" },
    { key: "cycles", label: "Rated cycles" },
  ] },
  { title: "Mechanical", rows: [
    { key: "length_mm", label: "Length", always: PANEL },
    { key: "width_mm", label: "Width", always: PANEL },
    { key: "thickness_mm", label: "Thickness", always: PANEL },
    { key: "weight_kg", label: "Weight", always: PANEL },
    { key: "number_of_cells", label: "Number of cells", always: PANEL },
    { key: "cell_technology", label: "Cell technology", always: PANEL },
  ] },
  { title: "Thermal", rows: [
    { key: "temperature_coefficient_pmax_pct_per_c", label: "Temperature coefficient (Pmax)", term: "temperature_coefficient", always: PANEL },
    { key: "operating_temperature_range_c", label: "Operating temperature range", always: PANEL },
  ] },
  { title: "Warranty & lifetime", rows: [
    { key: "product_warranty_years", label: "Product warranty", term: "product_warranty", always: PANEL },
    { key: "performance_warranty_years", label: "Performance warranty", term: "performance_warranty", always: PANEL },
    { key: "performance_warranty_end_pct", label: "Guaranteed output at end of warranty", term: "degradation", always: PANEL },
    { key: "expected_lifetime_years", label: "Expected lifetime", always: PANEL },
  ] },
];

const KNOWN_KEYS = new Set(GROUPS.flatMap((g) => g.rows.map((r) => r.key)).concat(["additional"]));

function SpecRow({ label, term, spec, product }: { label: string; term?: string; spec: AnySpec | undefined; product: Product }) {
  const has = !!spec && spec.value !== null && spec.value !== undefined;
  return (
    <tr className="border-b border-border/70 last:border-0">
      <th scope="row" className="py-2.5 pr-3 text-left align-top text-[13px] font-medium text-fg-secondary">
        <span className="inline-flex items-center gap-1">{label}{term && <InfoTip term={term} />}</span>
      </th>
      <td className="tabular py-2.5 pr-3 text-right align-top text-[13.5px] font-medium text-fg sm:text-left">{specText(spec)}</td>
      <td className="py-2.5 text-right align-top">
        {has ? <DataBadge cls={product.is_demo ? "demo" : "source"} compact source={product.source.data_source} /> : <DataBadge cls="unavailable" compact />}
      </td>
    </tr>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`spec-${title.replace(/\W+/g, "-").toLowerCase()}`}>
      <h3 id={`spec-${title.replace(/\W+/g, "-").toLowerCase()}`} className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">{title}</h3>
      <table className="w-full">
        <thead className="sr-only"><tr><th scope="col">Specification</th><th scope="col">Value</th><th scope="col">Data class</th></tr></thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

/**
 * Full specification table grouped by topic. Rows for absent fields are shown
 * as Unavailable for panels (the schema requires them); for other categories
 * only fields the record actually carries are listed.
 */
export function SpecTable({ product }: { product: Product }) {
  const specs = product.specs ?? {};
  const groups = GROUPS.map((g) => ({
    title: g.title,
    rows: g.rows.filter((r) => getSpec(specs, r.key) !== undefined || r.always?.includes(product.category)),
  })).filter((g) => g.rows.length > 0);

  const additional: { key: string; label: string; spec: AnySpec }[] = [];
  const extra = specs.additional;
  if (extra && typeof extra === "object") {
    for (const [k, v] of Object.entries(extra as Record<string, unknown>)) {
      const s = getSpec({ [k]: v } as Product["specs"], k);
      if (s) additional.push({ key: `additional.${k}`, label: humanizeKey(k), spec: s });
    }
  }
  for (const k of Object.keys(specs)) {
    if (KNOWN_KEYS.has(k)) continue;
    const s = getSpec(specs, k);
    if (s) additional.push({ key: k, label: humanizeKey(k), spec: s });
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <Group key={g.title} title={g.title}>
          {g.rows.map((r) => <SpecRow key={r.key} label={r.label} term={r.term} spec={getSpec(specs, r.key)} product={product} />)}
        </Group>
      ))}

      <section aria-labelledby="spec-costs">
        <h3 id="spec-costs" className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Costs</h3>
        <table className="w-full">
          <thead className="sr-only"><tr><th scope="col">Cost</th><th scope="col">Value</th></tr></thead>
          <tbody>
            {([
              ["Price", "price"],
              ["Installation", "installation_cost"],
              ["Annual maintenance", "annual_maintenance_cost"],
              ["Cleaning", "cleaning_cost"],
            ] as const).map(([label, field]) => (
              <tr key={field} className="border-b border-border/70 last:border-0">
                <th scope="row" className="py-2.5 pr-3 text-left align-top text-[13px] font-medium text-fg-secondary">{label}{field === "price" && <InfoTip term="tco" />}</th>
                <td className="py-2.5 text-right align-top sm:text-left"><PriceCell product={product} field={field} compact /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Group title="Additional specs">
        {additional.length === 0 ? (
          <tr><td colSpan={3} className="py-2.5 text-[13px] text-fg-muted">No additional specifications were provided by the source.</td></tr>
        ) : additional.map((a) => <SpecRow key={a.key} label={a.label} spec={a.spec} product={product} />)}
      </Group>
    </div>
  );
}
