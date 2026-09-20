import Link from "next/link";
import { ArrowRight, Database, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PLACEHOLDERS, PLACEHOLDER_NOTES, type PlaceholderKey } from "@/lib/config/placeholders";
import { listManufacturers, listProducts, listProviders } from "@/lib/data/repositories";

/**
 * The admin view is deliberately about what is NOT decided yet. The product's
 * position is that an undecided value is a visible object, not a blank, so the
 * platform owner's home screen is a list of them.
 */
export default async function AdminDashboard() {
  const [{ data: products, mode }, { data: manufacturers }, { data: providers }] = await Promise.all([
    listProducts(),
    listManufacturers(),
    listProviders(),
  ]);
  const isDemo = mode === "demo";
  const queue = products.filter((p) => p.source.verification_status !== "verified");
  const keys = Object.keys(PLACEHOLDERS) as PlaceholderKey[];

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
                  <td className="text-fg-secondary">{p.manufacturer_name ?? "—"}</td>
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
          title={`Decisions outstanding · ${keys.length}`}
          subtitle="Every one of these is a real value Solink refuses to invent. Each is rendered as a placeholder wherever it would otherwise appear."
        />
        <CardBody className="grid gap-2 sm:grid-cols-2">
          {keys.map((k) => (
            <div key={k} className="rounded-[var(--radius)] border border-dashed border-border-strong p-2.5">
              <div className="font-mono text-[11px] leading-tight text-[var(--cls-estimated)]">{PLACEHOLDERS[k]}</div>
              <p className="mt-1 text-[12.5px] leading-snug text-fg-muted">{PLACEHOLDER_NOTES[k]}</p>
            </div>
          ))}
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
