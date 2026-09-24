import { Badge } from "@/components/ui/Badge";
import { DataBadge } from "@/components/ui/DataBadge";
import { InfoTip } from "@/components/help/InfoTip";
import type { DataClass } from "@/lib/classification";
import { formatDate } from "@/lib/utils";
import type { EquipmentRow, WarrantyInfo } from "./equipment";

/**
 * Equipment, age and warranty expiry. Installed dates and warranty terms come
 * from the frozen passport snapshot; expiry dates are date arithmetic on them.
 * The status column never judges a component: end-of-life criteria do not exist.
 */
export function EquipmentTable({ rows, cls, repairCount }: { rows: EquipmentRow[]; cls: DataClass; repairCount: number }) {
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-[760px] text-[13px]">
        <caption className="sr-only">Installed equipment with age, warranty expiry, repairs and replacement status</caption>
        <thead>
          <tr className="text-left text-[12px] text-fg-muted">
            <th scope="col" className="py-2 pr-3 font-medium">Component</th>
            <th scope="col" className="py-2 pr-3 font-medium">Installed</th>
            <th scope="col" className="py-2 pr-3 font-medium">Age</th>
            <th scope="col" className="py-2 pr-3 font-medium"><span className="inline-flex items-center gap-1">Product warranty <InfoTip term="product_warranty" /></span></th>
            <th scope="col" className="py-2 pr-3 font-medium"><span className="inline-flex items-center gap-1">Performance warranty <InfoTip term="performance_warranty" /></span></th>
            <th scope="col" className="py-2 pr-3 font-medium">Repairs</th>
            <th scope="col" className="py-2 pr-3 font-medium">Replacements</th>
            <th scope="col" className="py-2 pr-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.key} className="align-top">
              <th scope="row" className="py-3 pr-3 text-left font-medium text-fg">
                {r.label}
                <span className="mt-0.5 block text-[11.5px] font-normal text-fg-muted">
                  {r.identity ?? r.missing}
                  {r.identity && <span className="ml-1.5 inline-flex align-middle"><DataBadge cls={cls} compact /></span>}
                </span>
              </th>
              <td className="tabular py-3 pr-3 text-fg-secondary">{r.installedIso ? formatDate(r.installedIso) : "—"}</td>
              <td className="py-3 pr-3">
                {r.ageYears === null ? <span className="text-fg-na">—</span> : (
                  <span className="inline-flex items-center gap-1.5"><span className="tabular text-fg">{r.ageYears.toFixed(1)} years</span><DataBadge cls="calculated" compact /></span>
                )}
              </td>
              <td className="py-3 pr-3"><WarrantyCell w={r.product} /></td>
              <td className="py-3 pr-3">
                <WarrantyCell w={r.performance} />
                {r.performanceEndPct !== null && <span className="mt-0.5 block text-[11.5px] text-fg-muted">to {r.performanceEndPct}% of rated power</span>}
              </td>
              <td className="py-3 pr-3 text-fg-secondary"><span className="tabular">{repairCount}</span> <span className="text-fg-muted">system-wide</span></td>
              <td className="tabular py-3 pr-3 text-fg-secondary">{r.replacements.length}</td>
              <td className="py-3 pr-3">
                <Badge tone="neutral">Criteria not defined</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WarrantyCell({ w }: { w: WarrantyInfo }) {
  if (w.years === null) return <span className="text-fg-na">Not recorded</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="tabular font-medium text-fg">{w.endIso ? formatDate(w.endIso) : "start date unknown"}</span>
      <span className="text-fg-muted">({w.years} yrs)</span>
      {w.expired && <Badge tone="serious">expired</Badge>}
      <DataBadge cls="calculated" compact />
    </span>
  );
}
