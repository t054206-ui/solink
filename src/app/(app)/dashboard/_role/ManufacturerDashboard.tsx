import Link from "next/link";
import { ArrowRight, FileWarning, PackageCheck, ShieldQuestion, Sun } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { listManufacturers, listProducts } from "@/lib/data/repositories";
import type { Product, SpecValue } from "@/lib/types";

/**
 * What a manufacturer comes here to do, in the owner's words: publish their
 * products so homeowners can pick one for their roof space and sun direction,
 * and watch the tracking state of what they published.
 *
 * "Tracking state" is the verification pipeline the platform already has —
 * unverified, pending, verified — plus how complete the record is. A
 * manufacturer cannot mark their own product verified; that is an admin action
 * with a note, by design, and this screen says so rather than hiding it.
 */
const MINE = "m-demo-a";

function specCount(p: Product): { filled: number; total: number; missing: string[] } {
  const entries = Object.entries(p.specs).filter(([k]) => k !== "additional");
  const missing: string[] = [];
  let filled = 0;
  for (const [key, raw] of entries) {
    const v = raw as SpecValue | undefined;
    if (v && typeof v === "object" && "value" in v && v.value !== null && v.value !== undefined) filled++;
    else missing.push(key.replace(/_/g, " "));
  }
  return { filled, total: entries.length, missing };
}

export default async function ManufacturerDashboard() {
  const [{ data: products, mode }, { data: manufacturers }] = await Promise.all([
    listProducts(),
    listManufacturers(),
  ]);
  const me = manufacturers.find((m) => m.id === MINE) ?? manufacturers[0] ?? null;
  const mine = products.filter((p) => p.manufacturer_id === (me?.id ?? MINE));
  const isDemo = mode === "demo";

  const verified = mine.filter((p) => p.source.verification_status === "verified").length;
  const pending = mine.filter((p) => p.source.verification_status === "pending_verification").length;
  const unverified = mine.length - verified - pending;

  return (
    <>
      {isDemo && <DemoBanner />}
      <PageHeader
        eyebrow="Manufacturer"
        title={me?.name ?? "Your products"}
        description="Everything you publish here is what homeowners compare against their own roof area and orientation. A specification you leave out is shown to them as missing, never as zero."
        actions={
          <Link
            href="/admin/products/new"
            className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-[13.5px] font-medium text-brand-fg hover:bg-brand-hover"
          >
            Publish a panel
            <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        }
      />

      <div className="grid gap-[var(--grid-gap)] sm:grid-cols-3">
        <Tile icon={<PackageCheck className="size-4" aria-hidden="true" />} label="Published" value={mine.length} cls={isDemo ? "demo" : "source"} />
        <Tile icon={<ShieldQuestion className="size-4" aria-hidden="true" />} label="Awaiting verification" value={pending + unverified} cls={isDemo ? "demo" : "source"} />
        <Tile icon={<Sun className="size-4" aria-hidden="true" />} label="Verified" value={verified} cls={isDemo ? "demo" : "source"} />
      </div>

      <Card className="mt-[var(--grid-gap)]">
        <CardHeader
          title="Your panels and their tracking state"
          subtitle="Verification is an admin action with a written note. You cannot set it yourself, and neither can Solink."
        />
        <div className="overflow-x-auto">
          <table className="table-dense">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Rated power</th>
                <th scope="col">Size</th>
                <th scope="col">Record</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((p) => {
                const s = specCount(p);
                const w = p.specs.rated_power_w;
                const l = p.specs.length_mm;
                const wd = p.specs.width_mm;
                const dims =
                  l && "value" in l && l.value && wd && "value" in wd && wd.value
                    ? `${l.value} × ${wd.value} mm`
                    : "—";
                return (
                  <tr key={p.id}>
                    <th scope="row" className="font-medium text-fg">
                      {p.model}
                      {p.is_demo && <DataBadge cls="demo" compact className="ms-2 align-middle" />}
                    </th>
                    <td className="figure">{w && "value" in w && w.value ? `${w.value} W` : "—"}</td>
                    <td className="figure text-fg-secondary">{dims}</td>
                    <td>
                      <span className="figure text-fg-secondary">
                        {s.filled}/{s.total}
                      </span>
                      {s.missing.length > 0 && (
                        <span className="ms-2 text-[12px] text-fg-muted" title={s.missing.join(", ")}>
                          {s.missing.length} missing
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge
                        tone={
                          p.source.verification_status === "verified"
                            ? "good"
                            : p.source.verification_status === "pending_verification"
                              ? "warn"
                              : "neutral"
                        }
                      >
                        {p.source.verification_status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <CardBody className="space-y-2.5 border-t border-border">
          <p className="text-[13px] leading-snug text-fg-secondary">
            Homeowners match panels to their roof using the dimensions you supply above, which is real geometry and works today. The
            output figure beside each panel is a different matter: it needs a solar resource for the site, and the platform does not
            have one yet.
          </p>
          <PlaceholderNote k="SOLAR_RESOURCE_DATA_SOURCE" />
        </CardBody>
      </Card>

      <Card className="mt-[var(--grid-gap)]">
        <CardHeader title="Where your data comes from" subtitle="Shown to every homeowner alongside the specification." />
        <CardBody className="space-y-2.5">
          {mine.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-2.5 last:border-0 last:pb-0">
              <span className="min-w-0 flex-1 text-[13.5px] font-medium text-fg">{p.model}</span>
              <span className="text-[12.5px] text-fg-muted">{p.source.data_source}</span>
              <Badge tone={p.source.datasheet_url ? "good" : "warn"} icon={p.source.datasheet_url ? undefined : <FileWarning className="size-3" aria-hidden="true" />}>
                {p.source.datasheet_url ? "Datasheet attached" : "No datasheet"}
              </Badge>
              <span className="micro">Updated {p.source.date_last_updated ?? "—"}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}

function Tile({ icon, label, value, cls }: { icon: React.ReactNode; label: string; value: number; cls: "demo" | "source" }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 text-fg-muted">
          {icon}
          <span className="micro">{label}</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="figure text-[30px] font-medium leading-none text-fg">{value}</span>
          <DataBadge cls={cls} compact className="mb-1" />
        </div>
      </CardBody>
    </Card>
  );
}
