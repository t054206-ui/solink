import { ExternalLink, FileBadge } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { InfoTip } from "@/components/help/InfoTip";
import type { Product } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { VerificationBadge } from "../../_components/VerificationBadge";

function LinkOrNone({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) return <span className="text-fg-muted">Not provided</span>;
  let host = href;
  try { host = new URL(href).hostname; } catch { /* keep raw */ }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-data underline underline-offset-2 hover:opacity-80" aria-label={`${label} (opens in a new tab)`}>
      {host} <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

/** Source tracking and verification for a product record. */
export function SourceCard({ product: p }: { product: Product }) {
  const s = p.source;
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Data source", value: <span className="inline-flex flex-wrap items-center gap-1.5">{s.data_source}<DataBadge cls={p.is_demo ? "demo" : "source"} compact /></span> },
    { label: "Source URL", value: <LinkOrNone href={s.source_url} label="Source URL" /> },
    { label: "Datasheet", value: <LinkOrNone href={s.datasheet_url} label="Datasheet" /> },
    { label: "Manufacturer website", value: <LinkOrNone href={s.manufacturer_doc_url} label="Manufacturer website" /> },
    { label: "Date added", value: formatDate(s.date_added) },
    { label: "Last updated", value: formatDate(s.date_last_updated) },
    { label: "Verification", value: <span className="inline-flex flex-wrap items-center gap-1.5"><VerificationBadge status={s.verification_status} />{s.verification_status === "verified" && s.verified_at && <span className="text-[12px] text-fg-muted">on {formatDate(s.verified_at)}</span>}</span> },
    { label: "Spec version", value: p.current_version_id ? <code className="rounded bg-inset px-1.5 py-0.5 font-mono text-[12px]">{p.current_version_id}</code> : <span className="text-fg-muted">No version recorded</span> },
  ];
  return (
    <Card>
      <CardHeader title={<><FileBadge className="size-4 text-[var(--brand-strong)]" aria-hidden /> Source &amp; verification</>} subtitle="Where this record came from and whether it has been checked." />
      <CardBody>
        <dl className="divide-y divide-border/70 text-[13px]">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <dt className="shrink-0 text-fg-muted sm:w-40">{r.label}</dt>
              <dd className="min-w-0 break-words font-medium text-fg sm:text-right">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex items-start gap-1 text-[12px] leading-relaxed text-fg-muted">
          <InfoTip term="passport" />
          <span>Solar Passports snapshot this exact spec version at installation, so later edits to the catalog never change an installed system&apos;s record.</span>
        </p>
        {s.verification_status !== "verified" && (
          <p className="mt-2 text-[12px] text-fg-muted">This record has not been verified by Solink. Confirm specifications against the manufacturer datasheet before purchasing.</p>
        )}
      </CardBody>
    </Card>
  );
}
