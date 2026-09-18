"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const PROVIDER_SECTIONS = [
  { href: "/provider", label: "Case queue" },
  { href: "/provider/appointments", label: "Appointments" },
  { href: "/provider/services", label: "Services & prices" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/provider") return pathname === "/provider" || pathname.startsWith("/provider/cases");
  return pathname === href || pathname.startsWith(href + "/");
}

/** Feature-local provider navigation: horizontal scroll on small screens, side list on large. */
export function ProviderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Provider sections" className="lg:sticky lg:top-24">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {PROVIDER_SECTIONS.map((s) => {
          const active = isActive(pathname, s.href);
          return (
            <li key={s.href} className="shrink-0">
              <Link href={s.href} aria-current={active ? "page" : undefined}
                className={cn("block whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13px] transition-colors lg:whitespace-normal", active ? "bg-brand-soft font-medium text-fg" : "text-fg-secondary hover:bg-inset hover:text-fg")}>
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
