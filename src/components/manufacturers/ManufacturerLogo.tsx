import { cn } from "@/lib/utils";
import { initials } from "@/lib/manufacturers/helpers";

/**
 * The company's logo when one is on record; otherwise the initials on a plain
 * tile with "No logo provided" in the title. Never a stock image.
 */
export function ManufacturerLogo({ name, logoUrl, size = "md", className }: { name: string; logoUrl: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "sm" ? "size-9 text-[12px]" : size === "lg" ? "size-16 text-[20px]" : "size-12 text-[15px]";
  if (logoUrl) {
    return (
      <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius)] border border-border bg-white", dim, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={`${name} logo`} className="size-full object-contain p-1" />
      </span>
    );
  }
  return (
    <span title="No logo provided" aria-label={`${name}: no logo provided`} className={cn("grid shrink-0 place-items-center rounded-[var(--radius)] border border-border bg-inset font-semibold tracking-wide text-fg-secondary", dim, className)}>
      {initials(name)}
    </span>
  );
}
