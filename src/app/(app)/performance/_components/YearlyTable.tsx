import { Badge } from "@/components/ui/Badge";
import { DataBadge } from "@/components/ui/DataBadge";
import { InfoTip } from "@/components/help/InfoTip";
import type { DataClass } from "@/lib/classification";
import { fmtKwh, fmtPct } from "../../_ops/production";
import type { YearRow } from "./rows";

/**
 * Year-by-year production, yield and service activity.
 * Partial years are marked and never compared with complete ones: a year with
 * four months of records would otherwise look like a collapse in output.
 */
export function YearlyTable({ rows, cls }: { rows: YearRow[]; cls: DataClass }) {
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-[640px] text-[13px]">
        <caption className="sr-only">Production, specific yield, incidents and maintenance per calendar year</caption>
        <thead>
          <tr className="text-left text-[12px] text-fg-muted">
            <th scope="col" className="py-2 pr-3 font-medium">Year</th>
            <th scope="col" className="py-2 pr-3 font-medium">Records</th>
            <th scope="col" className="py-2 pr-3 font-medium">Production</th>
            <th scope="col" className="py-2 pr-3 font-medium">Change vs previous year</th>
            <th scope="col" className="py-2 pr-3 font-medium"><span className="inline-flex items-center gap-1">Specific yield <InfoTip term="specific_yield" /></span></th>
            <th scope="col" className="py-2 pr-3 font-medium">Incidents</th>
            <th scope="col" className="py-2 pr-3 font-medium">Maintenance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.year}>
              <th scope="row" className="py-2.5 pr-3 text-left font-medium text-fg">
                {r.year}
                {!r.complete && <Badge tone="warn" className="ml-2">partial</Badge>}
              </th>
              <td className="tabular py-2.5 pr-3 text-fg-secondary">{r.days} day{r.days === 1 ? "" : "s"}</td>
              <td className="py-2.5 pr-3">
                <span className="tabular font-medium text-fg">{fmtKwh(r.kwh)}</span>
                <span className="ml-1.5 inline-flex align-middle"><DataBadge cls={cls} compact /></span>
              </td>
              <td className="py-2.5 pr-3">
                {r.comparable && r.changePct !== null ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="tabular font-medium text-fg">{fmtPct(r.changePct)}</span>
                    <DataBadge cls={cls === "demo" ? "demo" : "calculated"} compact />
                  </span>
                ) : (
                  <span className="text-fg-muted">{r.changePct === null ? "No earlier year" : "Not compared: partial year"}</span>
                )}
              </td>
              <td className="py-2.5 pr-3">
                {r.yieldPerKwp.value !== null ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="tabular font-medium text-fg">{Math.round(r.yieldPerKwp.value)} kWh/kWp</span>
                    <DataBadge cls={r.yieldPerKwp.cls} compact />
                  </span>
                ) : (
                  <span className="text-fg-muted" title={r.yieldPerKwp.reason}>Unavailable</span>
                )}
              </td>
              <td className="tabular py-2.5 pr-3 text-fg-secondary">{r.incidents}</td>
              <td className="tabular py-2.5 pr-3 text-fg-secondary">{r.maintenance}{r.repairs > 0 && <span className="text-fg-muted"> ({r.repairs} repair/replacement)</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
