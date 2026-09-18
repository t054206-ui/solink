import Link from "next/link";
import { ListTree } from "lucide-react";

export interface TocEntry {
  href: string;
  label: string;
  /** Numbered sections show their number; overview blocks do not. */
  n?: number;
}

function TocList({ entries }: { entries: TocEntry[] }) {
  return (
    <ol className="space-y-0.5">
      {entries.map((e) => (
        <li key={e.href}>
          <Link
            href={e.href}
            className="flex gap-2 rounded-md px-2 py-1.5 text-[13px] leading-snug text-fg-secondary hover:bg-inset hover:text-fg"
          >
            <span aria-hidden className="w-4 shrink-0 text-right tabular text-fg-muted">
              {e.n ?? "·"}
            </span>
            <span className="min-w-0">{e.label}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/**
 * Anchor navigation for the User Guide.
 * Sticky beside the content on large screens, collapsed into a <details>
 * disclosure on small screens. No JavaScript required.
 */
export function GuideToc({ entries }: { entries: TocEntry[] }) {
  return (
    <>
      {/* Mobile / tablet: collapsible */}
      <details className="lg:hidden rounded-[var(--radius-lg)] border border-border bg-elevated shadow-sm">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-[14px] font-semibold text-fg marker:text-fg-muted">
          <ListTree className="size-4 text-[var(--brand-strong)]" aria-hidden />
          On this page
        </summary>
        <nav aria-label="On this page" className="border-t border-border px-2 py-2">
          <TocList entries={entries} />
        </nav>
      </details>

      {/* Desktop: sticky sidebar */}
      <nav
        aria-label="On this page"
        className="hidden lg:block sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2"
      >
        <div className="px-2 pb-2 text-[12px] font-semibold uppercase tracking-wider text-fg-muted">
          On this page
        </div>
        <TocList entries={entries} />
      </nav>
    </>
  );
}
