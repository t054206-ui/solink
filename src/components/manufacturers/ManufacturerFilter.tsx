"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Form";

/**
 * Manufacturer filter for the marketplace. The options are the companies the
 * server loaded from the database; choosing one changes the `manufacturer`
 * query parameter, and the server page re-queries products by manufacturer_id.
 */
export function ManufacturerFilter({ options, active }: { options: { slug: string; name: string; count: number }[]; active: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const onChange = (slug: string) => {
    const next = new URLSearchParams(sp.toString());
    if (slug) next.set("manufacturer", slug); else next.delete("manufacturer");
    router.push(next.toString() ? `${pathname}?${next}` : pathname);
  };
  return (
    <div className="flex items-center gap-2 sm:w-72">
      <label htmlFor="marketplace-manufacturer" className="shrink-0 text-[13px] text-fg-muted">Manufacturer</label>
      <Select id="marketplace-manufacturer" value={active ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">All manufacturers</option>
        {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}{o.count ? ` (${o.count})` : ""}</option>)}
      </Select>
    </div>
  );
}
