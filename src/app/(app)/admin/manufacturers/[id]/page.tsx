import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { ManufacturerProfile } from "@/components/manufacturers/ManufacturerProfile";
import { getManufacturer, listManufacturerSources, listManufacturerVersions, listProductDocuments, listProducts } from "@/lib/data/repositories";
import { manufacturerHref } from "@/lib/manufacturers/helpers";
import { formatDate } from "@/lib/utils";
import { safe } from "../../_lib/data";
import { ManufacturerAdminPanel } from "../../_components/ManufacturerAdminPanel";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await getManufacturer(id);
  return { title: data ? `Admin · ${data.name}` : "Admin · Manufacturer not found" };
}

export default async function AdminManufacturerPage({ params }: Props) {
  const { id } = await params;
  const m = await safe(() => getManufacturer(id), null);
  if (!m.data) return (<><PageHeader eyebrow="Admin · Manufacturers" title="Manufacturer not found" /><EmptyState title="No manufacturer with this id" /></>);
  const mf = m.data;
  const [products, sources, versions] = await Promise.all([
    safe(() => listProducts({ manufacturerId: mf.id, includeArchived: true }), []),
    safe(() => listManufacturerSources(mf.id), []),
    safe(() => listManufacturerVersions(mf.id), []),
  ]);
  const docs = await safe(() => listProductDocuments(products.data.map((p) => p.id)), []);
  return (
    <>
      <Link href="/admin/manufacturers" className="mb-3 inline-flex items-center gap-1 text-[13px] text-fg-secondary hover:text-fg"><ArrowLeft className="size-3.5" aria-hidden /> All manufacturers</Link>
      <PageHeader
        eyebrow="Admin · Manufacturers"
        title={mf.name}
        description={<span className="font-mono text-[12px]">{mf.id} · /{mf.slug}</span>}
        actions={<>
          <Button href={`/admin/manufacturers/${mf.id}/edit`} variant="outline" size="sm"><Pencil className="size-3.5" aria-hidden /> Edit company</Button>
          <Button href={manufacturerHref(mf)} variant="ghost" size="sm"><ExternalLink className="size-3.5" aria-hidden /> Public profile</Button>
        </>}
      />
      <div className="space-y-6">
        <ManufacturerProfile m={mf} products={products.data} docs={docs.data} sources={sources.data} mode={m.mode} />
        <ManufacturerAdminPanel m={mf} mode={m.mode} />
        <Card>
          <CardHeader title="Record history" subtitle="manufacturer_versions: one immutable copy per change. A Solar Passport names the version that was current when it was issued." />
          <CardBody>
            {versions.data.length === 0 ? <p className="text-[13px] text-fg-muted">No versions recorded{m.mode === "demo" ? " in demo mode" : ""}.</p> : (
              <ol className="divide-y divide-border/70 text-[13px]">
                {versions.data.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                    <span><span className="font-medium text-fg">v{v.version}</span> <span className="text-fg-secondary">{v.change_note ?? ""}</span>{v.id === mf.current_version_id && <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-strong)]">current</span>}</span>
                    <span className="font-mono text-[11.5px] text-fg-muted">{v.id} · {formatDate(v.created_at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
