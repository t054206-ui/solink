import Link from "next/link";
import { ArrowRight, FileWarning, PackageCheck, ShieldQuestion, Sun } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { listManufacturerRequests, listManufacturers, listProducts } from "@/lib/data/repositories";
import { getManufacturerAccess } from "@/app/(app)/manufacturer/_lib/access";
import type { ManufacturerRequest, Product, SpecValue } from "@/lib/types";
import { InfoTip } from "@/components/help/InfoTip";

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
  const [{ data: products, mode }, { data: manufacturers }, access] = await Promise.all([
    listProducts({ includeArchived: true }),
    listManufacturers(),
    getManufacturerAccess(),
  ]);
  const { data: requests } = access.manufacturer ? await listManufacturerRequests({ manufacturerId: access.manufacturer.id }).catch(() => ({ data: [] as ManufacturerRequest[], mode })) : { data: [] as ManufacturerRequest[] };
  const openRequests = requests.filter((r) => r.status === "new" || r.status === "reviewing" || r.status === "in_progress").length;
  // Supabase mode: the company linked to the signed-in account. Demo mode: the labelled demo manufacturer.
  const me = access.manufacturer ?? manufacturers.find((m) => m.id === MINE) ?? manufacturers[0] ?? null;
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
            href="/manufacturer/products/new"
            className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-[13.5px] font-medium text-brand-fg hover:bg-brand-hover"
          >
            Add a product
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
                    : "Not set";
                return (
                  <tr key={p.id}>
                    <th scope="row" className="font-medium text-fg">
                      {p.model}
                      {p.is_demo && <DataBadge cls="demo" compact className="ms-2 align-middle" />}
                    </th>
                    <td className="figure">{w && "value" in w && w.value ? `${w.value} W` : "Not set"}</td>
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

      <div className="mt-[var(--grid-gap)] grid gap-[var(--grid-gap)] lg:grid-cols-2">
        <Card>
          <CardHeader title={<>Company verification <InfoTip term="company_verification" /></>} subtitle="Set by a Solink administrator after checking your company; you can see it, not change it." />
          <CardBody className="flex flex-wrap items-center gap-3">
            <Badge tone={me?.verification_status === "verified" ? "good" : me?.verification_status === "pending_verification" ? "warn" : "neutral"}>
              {(me?.verification_status ?? "unverified").replace(/_/g, " ")}
            </Badge>
            <span className="text-[13px] text-fg-secondary">{verified} verified · {pending} pending · {unverified} unverified product{mine.length === 1 ? "" : "s"}</span>
            <Link href="/manufacturer/company" className="ms-auto text-[12.5px] font-medium text-fg-secondary hover:text-fg">Company profile</Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Requests" subtitle="Product, availability and business inquiries addressed to you, sent from your Solink page." action={<Link href="/manufacturer/requests" className="text-[12.5px] font-medium text-fg-secondary hover:text-fg">Open inbox</Link>} />
          <CardBody className="flex flex-wrap items-center gap-3">
            <span className="figure text-[26px] font-medium leading-none text-fg">{openRequests}</span>
            <span className="text-[13px] text-fg-secondary">{openRequests === 0 ? `No open requests${requests.length ? ` (${requests.length} answered or closed)` : ""}.` : `open ${openRequests === 1 ? "request" : "requests"} waiting for an answer · ${requests.length} in total`}</span>
          </CardBody>
        </Card>
      </div>

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
              <span className="micro">Updated {p.source.date_last_updated ?? "Not set"}</span>
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
