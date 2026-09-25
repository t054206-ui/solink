import Link from "next/link";
import { ExternalLink, FileText, Globe, ImageIcon, LibraryBig, Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { EmptyState } from "@/components/ui/States";
import { InfoTip } from "@/components/help/InfoTip";
import { ProductCard } from "@/app/(app)/marketplace/_components/ProductCard";
import { VerificationBadge } from "@/app/(app)/marketplace/_components/VerificationBadge";
import type { Manufacturer, ManufacturerSource, Product, ProductDocument } from "@/lib/types";
import type { DataMode } from "@/lib/data/mode";
import { formatDate } from "@/lib/utils";
import { SOURCE_FIELD_LABEL, SOURCE_TYPE_LABEL, headquartersText, hostOf } from "@/lib/manufacturers/helpers";
import { ManufacturerLogo } from "./ManufacturerLogo";
import { AvailabilityBadge } from "./AvailabilityBadge";

/**
 * The company profile shared by the public page (/marketplace/manufacturers/
 * [slug]) and the admin page (/admin/manufacturers/[id]). Every fact is
 * labelled by where it came from: SOURCE for what the company or its official
 * site states, PLATFORM ("Solink") for Solink's own classification and
 * verification decisions. Missing facts read "Not provided"; unverified
 * availability reads exactly that.
 */
export function ManufacturerProfile({ m, products, docs, sources, mode, aside }: { m: Manufacturer; products: Product[]; docs: ProductDocument[]; sources: ManufacturerSource[]; mode: DataMode; aside?: React.ReactNode }) {
  const active = products.filter((p) => !p.is_archived);
  const hq = headquartersText(m);
  const srcCls = m.is_demo ? "demo" : "source";
  const byProduct = new Map(products.map((p) => [p.id, p]));
  const productLinks = products.filter((p) => p.source.datasheet_url || p.source.manufacturer_doc_url || p.source.manufacturer_url);
  const images = products.flatMap((p) => p.images.map((src) => ({ src, product: p })));
  const hasDocs = docs.length > 0 || productLinks.length > 0 || images.length > 0 || Boolean(m.website);

  const notProvided = <span className="text-fg-muted">Not provided</span>;

  return (
    <div className="space-y-6">
      {m.is_demo && <DemoBanner text="DEMO MANUFACTURER: NOT REAL" detail="This company record exists only to exercise the interface." />}
      {m.is_archived && <div role="note" className="rounded-[var(--radius)] border border-border bg-inset px-3 py-2 text-[13px] text-fg-secondary"><span className="font-medium text-fg">Archived on {formatDate(m.archived_at)}.</span> This company no longer appears as an active manufacturer in the marketplace. Its products and every Solar Passport that names it are kept unchanged.</div>}

      {m.cover_image_url && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-inset">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.cover_image_url} alt="" className="max-h-56 w-full object-cover" />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={<>Company information <InfoTip term="manufacturer_record" /></>} subtitle="What the company or its official website states, and what Solink has classified or verified. Each row says which." />
            <CardBody>
              <div className="flex items-start gap-4">
                <ManufacturerLogo name={m.name} logoUrl={m.logo_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-semibold text-fg">{m.name}</div>
                  <div className="text-[13px] text-fg-secondary">{m.legal_name ?? <span className="text-fg-muted">Legal name not provided</span>}</div>
                  {m.description ? <p className="mt-2 text-[13.5px] leading-relaxed text-fg-secondary">{m.description}</p> : <p className="mt-2 text-[13px] text-fg-muted">No description has been provided.</p>}
                </div>
              </div>
              <dl className="mt-4 divide-y divide-border/70 text-[13px]">
                <Row k="Company name" v={m.name} cls={srcCls} />
                <Row k="Legal name" v={m.legal_name ?? notProvided} cls={m.legal_name ? srcCls : "unavailable"} />
                <Row k="Manufacturer type" v={m.manufacturer_type ?? notProvided} cls={m.manufacturer_type ? "user" : "unavailable"} clsLabel="Solink" />
                <Row k="Headquarters" v={hq ?? notProvided} cls={hq ? srcCls : "unavailable"} />
                <Row k="Website" v={m.website ? <a href={m.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-data underline underline-offset-2">{hostOf(m.website)} <ExternalLink className="size-3" aria-hidden /></a> : notProvided} cls={m.website ? srcCls : "unavailable"} />
                {(m.contact_email || m.phone) && <Row k="Contact" v={<span className="flex flex-col items-end">{m.contact_email && <a href={`mailto:${m.contact_email}`} className="text-data underline underline-offset-2">{m.contact_email}</a>}{m.phone && <span dir="ltr">{m.phone}</span>}</span>} cls={srcCls} />}
                <Row k={<>Market classification <InfoTip term="market_classification" /></>} v={m.market_regions.length ? m.market_regions.join(" / ") : notProvided} cls={m.market_regions.length ? "user" : "unavailable"} clsLabel="Solink" />
                <Row k={<>Kuwait availability <InfoTip term="kuwait_availability" /></>} v={<AvailabilityBadge value={m.kuwait_available} region="kuwait" />} cls="user" clsLabel="Solink" />
                <Row k="GCC availability" v={<AvailabilityBadge value={m.gcc_available} region="gcc" />} cls="user" clsLabel="Solink" />
                {m.availability_note && <Row k="Availability note" v={<span className="text-fg-secondary">{m.availability_note}</span>} cls="user" clsLabel="Solink" />}
                <Row k={<>Verification <InfoTip term="company_verification" /></>} v={<span className="inline-flex flex-wrap items-center gap-1.5"><VerificationBadge status={m.verification_status} />{m.verification_status === "verified" && m.verification_date && <span className="text-[12px] text-fg-muted">on {formatDate(m.verification_date)}</span>}</span>} cls="user" clsLabel="Solink" />
                {m.verification_status !== "verified" && <Row k="Verification detail" v={<span className="text-fg-secondary">{m.verification_status === "unverified" ? "Verification pending. No administrator has checked this company against a source yet; that does not mean anything here is wrong." : m.verification_note ?? "No note recorded."}</span>} />}
                {m.verification_status === "verified" && (
                  <Row k="Verified against" v={m.verification_source ? <span>{m.verification_source}{m.verification_source_url && <> · <a href={m.verification_source_url} target="_blank" rel="noopener noreferrer" className="text-data underline underline-offset-2">{hostOf(m.verification_source_url)}</a></>}</span> : notProvided} cls="user" clsLabel="Solink" />
                )}
                <Row k="Last updated" v={formatDate(m.updated_at)} />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={<><Package className="size-4 text-[var(--brand-strong)]" aria-hidden /> Products</>} subtitle={active.length ? `${active.length} ${active.length === 1 ? "product" : "products"} in the Solink catalogue. Each opens its own record with specifications, sources and verification.` : "Products appear here as they are added to the catalogue and linked to this company."} />
            <CardBody>
              {active.length === 0 ? (
                <EmptyState title="No products have been added for this manufacturer yet.">Solink never generates placeholder products. When a real product is imported or published by the company, it will be listed here.</EmptyState>
              ) : (
                <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
                  {active.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
                </ul>
              )}
              {products.length > active.length && <p className="mt-3 text-[12.5px] text-fg-muted">{products.length - active.length} archived {products.length - active.length === 1 ? "product is" : "products are"} kept for history and not shown.</p>}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {aside}
          <Card>
            <CardHeader title={<><LibraryBig className="size-4 text-[var(--brand-strong)]" aria-hidden /> Documentation</>} subtitle="Datasheets, technical documents and images on record for this company's products, and its official website." />
            <CardBody>
              {!hasDocs ? (
                <EmptyState title="No manufacturer documents have been added yet." />
              ) : (
                <div className="space-y-4 text-[13px]">
                  {m.website && <DocRow icon={Globe} label="Manufacturer website" href={m.website} detail={hostOf(m.website) ?? m.website} />}
                  {productLinks.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Datasheets and technical documentation</h4>
                      <ul className="space-y-1.5">
                        {productLinks.map((p) => (
                          <li key={p.id} className="space-y-1">
                            {p.source.datasheet_url && <DocRow icon={FileText} label={`${p.model} datasheet`} href={p.source.datasheet_url} detail={p.source.manufacturer_source_note ?? hostOf(p.source.datasheet_url) ?? ""} />}
                            {(p.source.manufacturer_url ?? p.source.manufacturer_doc_url) && <DocRow icon={Globe} label={`${p.model} product page`} href={(p.source.manufacturer_url ?? p.source.manufacturer_doc_url)!} detail={hostOf(p.source.manufacturer_url ?? p.source.manufacturer_doc_url) ?? ""} />}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {docs.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Uploaded documents</h4>
                      <ul className="space-y-1.5">
                        {docs.map((d) => {
                          const p = byProduct.get(d.product_id);
                          const href = d.url && /^https?:\/\//.test(d.url) ? d.url : null;
                          return <li key={d.id}><DocRow icon={FileText} label={`${p?.model ?? "Product"}: ${d.title ?? d.kind}`} href={href} detail={href ? hostOf(href) ?? "" : d.storage_path ? "Stored file (private bucket)" : ""} date={d.created_at} /></li>;
                        })}
                      </ul>
                    </div>
                  )}
                  {images.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Product images</h4>
                      <ul className="grid grid-cols-3 gap-2">
                        {images.slice(0, 6).map(({ src, product }, i) => (
                          <li key={`${product.id}-${i}`} className="aspect-square overflow-hidden rounded-[var(--radius)] border border-border bg-inset">
                            <Link href={`/marketplace/${product.id}`} title={`${product.name}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt={`${m.name} ${product.model}`} className="size-full object-contain p-1" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {images.length > 6 && <p className="mt-1 text-[12px] text-fg-muted">{images.length - 6} more on the product pages.</p>}
                    </div>
                  )}
                </div>
              )}
              <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-fg-muted"><ImageIcon className="size-3.5" aria-hidden /> Only documents recorded in the database are listed. Nothing is fetched or guessed.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sources" subtitle="Where each fact about this company came from, and whether an administrator has checked it." action={<DataBadge cls="source" compact />} />
            <CardBody>
              {sources.length === 0 ? (
                <p className="text-[13px] text-fg-muted">No sources have been recorded for this company yet.{mode === "demo" ? " Demo records cite nothing real." : ""}</p>
              ) : (
                <ul className="divide-y divide-border/70 text-[13px]">
                  {sources.map((s) => (
                    <li key={s.id} className="space-y-0.5 py-2 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-fg">{SOURCE_FIELD_LABEL[s.field ?? "company"] ?? s.field}</span>
                        <VerificationBadge status={s.verification_status} />
                      </div>
                      <div className="text-fg-secondary">{s.source_url ? <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-data underline underline-offset-2">{s.source_name} <ExternalLink className="size-3" aria-hidden /></a> : s.source_name}</div>
                      <div className="text-[12px] text-fg-muted"><Badge tone="neutral">{SOURCE_TYPE_LABEL[s.source_type]}</Badge>{s.date_checked && <> · checked {formatDate(s.date_checked)}</>}</div>
                      {s.notes && <p className="text-[12px] text-fg-muted">{s.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, cls, clsLabel }: { k: React.ReactNode; v: React.ReactNode; cls?: "source" | "user" | "unavailable" | "demo"; clsLabel?: string }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="flex items-center gap-1 text-fg-muted">{k}</dt>
      <dd className="flex min-w-0 flex-col gap-1 font-medium text-fg sm:items-end sm:text-right">
        <span className="min-w-0">{v}</span>
        {cls === "user" ? <Badge tone="neutral" title="Platform data: classified or decided by Solink's administrators, not stated by the company.">{clsLabel ?? "Solink"}</Badge> : cls ? <DataBadge cls={cls} compact /> : null}
      </dd>
    </div>
  );
}

function DocRow({ icon: Icon, label, href, detail, date }: { icon: typeof FileText; label: string; href: string | null; detail: string; date?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-fg-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-fg">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline underline-offset-2">{label} <ExternalLink className="size-3 text-fg-muted" aria-hidden /></a> : label}</div>
        {(detail || date) && <div className="text-[12px] text-fg-muted">{detail}{date ? `${detail ? " · " : ""}added ${formatDate(date)}` : ""}</div>}
      </div>
    </div>
  );
}
