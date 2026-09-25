import Link from "next/link";
import { ArrowRight, Database, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PLACEHOLDERS, PLACEHOLDER_NOTES, type PlaceholderKey } from "@/lib/config/placeholders";
import { listManufacturers, listProducts, listProviders } from "@/lib/data/repositories";
import { getPlaceholderStatus, type PlaceholderState } from "@/lib/config/placeholderStatus";
import { cn } from "@/lib/utils";

/**
 * The admin view is deliberately about what is NOT decided yet. The product's
 * position is that an undecided value is a visible object, not a blank, so the
 * platform owner's home screen is a list of them.
 */
export default async function AdminDashboard() {
  const [{ data: products, mode }, { data: manufacturers }, { data: providers }, status] = await Promise.all([
    listProducts(),
    listManufacturers(),
    listProviders(),
    getPlaceholderStatus(),
  ]);
  const isDemo = mode === "demo";
  const queue = products.filter((p) => p.source.verification_status !== "verified");
  // Open first, then partial, then resolved, so the list reads as a to-do list.
  const order: Record<PlaceholderState, number> = { open: 0, partial: 1, resolved: 2 };
  const keys = (Object.keys(PLACEHOLDERS) as PlaceholderKey[]).sort((a, b) => order[status[a].state] - order[status[b].state]);
  const count = (st: PlaceholderState) => keys.filter((k) => status[k].state === st).length;

  return (
    <>
      {isDemo && <DemoBanner />}
      <PageHeader
        eyebrow="Administrator"
        title="Platform"
        description="Verification, catalogue and the decisions the platform is still waiting on."
        actions={
          <Link
            href="/admin"
            className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-border-strong px-4 text-[13.5px] font-medium text-fg hover:bg-inset"
          >
            Admin area
            <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        }
      />

      <div className="grid gap-[var(--grid-gap)] sm:grid-cols-3">
        <Tile icon={<ShieldCheck className="size-4" aria-hidden="true" />} label="Awaiting verification" value={queue.length} isDemo={isDemo} />
        <Tile icon={<Database className="size-4" aria-hidden="true" />} label="Products in catalogue" value={products.length} isDemo={isDemo} />
        <Tile icon={<Users className="size-4" aria-hidden="true" />} label="Companies registered" value={providers.length + manufacturers.length} isDemo={isDemo} />
      </div>

      <Card className="mt-[var(--grid-gap)]">
        <CardHeader
          title="Verification queue"
          subtitle="Verified is only ever set by an explicit admin action with a note. Nothing here is automatic."
        />
        <div className="overflow-x-auto">
          <table className="table-dense">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Manufacturer</th>
                <th scope="col">Source</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="font-medium text-fg">
                    {p.model}
                    {p.is_demo && <DataBadge cls="demo" compact className="ms-2 align-middle" />}
                  </th>
                  <td className="text-fg-secondary">{p.manufacturer_name ?? "Not set"}</td>
                  <td className="text-fg-muted">{p.source.data_source}</td>
                  <td>
                    <Badge tone={p.source.verification_status === "pending_verification" ? "warn" : "neutral"}>
                      {p.source.verification_status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-[var(--grid-gap)]">
        <CardHeader
          title={`Decisions · ${count("open")} open · ${count("partial")} partial · ${count("resolved")} resolved`}
          subtitle="Every one of these is a real value Solink refuses to invent. Open ones render as a placeholder wherever they would otherwise appear; resolved ones are checked against the live setting, key or value behind them."
        />
        <CardBody className="grid gap-2 sm:grid-cols-2">
          {keys.map((k) => {
            const st = status[k];
            return (
              <div
                key={k}
                className={cn(
                  "rounded-[var(--radius)] border p-2.5",
                  st.state === "open" && "border-dashed border-border-strong",
                  st.state === "partial" && "border-dashed border-[var(--warn)]/60 bg-warn-soft/40",
                  st.state === "resolved" && "border-border bg-good-soft/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={cn("font-mono text-[11px] leading-tight", st.state === "resolved" ? "text-fg-muted line-through" : "text-[var(--cls-estimated)]")}>{PLACEHOLDERS[k]}</div>
                  <Badge tone={st.state === "resolved" ? "good" : st.state === "partial" ? "warn" : "neutral"}>{st.state}</Badge>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-fg-secondary">{st.detail}</p>
                {st.state === "open" && <p className="mt-1 text-[12px] leading-snug text-fg-muted">{PLACEHOLDER_NOTES[k]}</p>}
              </div>
            );
          })}
        </CardBody>
      </Card>
    </>
  );
}

function Tile({ icon, label, value, isDemo }: { icon: React.ReactNode; label: string; value: number; isDemo: boolean }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 text-fg-muted">
          {icon}
          <span className="micro">{label}</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="figure text-[30px] font-medium leading-none text-fg">{value}</span>
          <DataBadge cls={isDemo ? "demo" : "source"} compact className="mb-1" />
        </div>
      </CardBody>
    </Card>
  );
}
