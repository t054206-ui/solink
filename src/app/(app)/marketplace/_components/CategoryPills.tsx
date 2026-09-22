import Link from "next/link";
import type { ProductCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "./product-helpers";

/** Category filter rendered as links so the server page can filter via searchParams. */
export function CategoryPills({ active, counts, manufacturer = null }: { active: ProductCategory | null; counts: Partial<Record<ProductCategory | "all", number>>; manufacturer?: string | null }) {
  // The manufacturer filter travels with the category so the two combine.
  const withM = (qs: string) => manufacturer ? `${qs}${qs.includes("?") ? "&" : "?"}manufacturer=${encodeURIComponent(manufacturer)}` : qs;
  const items: { key: ProductCategory | "all"; label: string; href: string }[] = [
    { key: "all", label: "All", href: withM("/marketplace") },
    ...CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORY_LABEL[c], href: withM(`/marketplace?category=${c}`) })),
  ];
  return (
    <nav aria-label="Product category" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1.5 pb-1">
        {items.map((it) => {
          const isActive = it.key === "all" ? active === null : active === it.key;
          const n = counts[it.key] ?? 0;
          return (
            <li key={it.key} className="shrink-0">
              <Link href={it.href} aria-current={isActive ? "page" : undefined}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  isActive ? "border-transparent bg-navy text-white dark:bg-white/15" : "border-border bg-elevated text-fg-secondary hover:bg-inset hover:text-fg")}>
                {it.label}
                <span className={cn("tabular rounded-full px-1.5 text-[11px]", isActive ? "bg-white/20" : "bg-inset text-fg-muted")}>{n}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
