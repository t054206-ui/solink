"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CloudSun, SprayCan, Camera, LayoutGrid, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/monitoring", label: "Overview", icon: Activity },
  { href: "/monitoring/weather", label: "Weather", icon: CloudSun },
  { href: "/monitoring/cleaning", label: "Cleaning", icon: SprayCan },
  { href: "/monitoring/inspection", label: "Inspection", icon: Camera },
  { href: "/monitoring/panels", label: "Panels", icon: LayoutGrid },
  { href: "/monitoring/nearby", label: "Nearby", icon: Users },
];

/** Sub-route navigation shared by every /monitoring page. Horizontal scroll on phones. */
export function MonitoringNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Monitoring sections" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {ITEMS.map((it) => {
          const active = it.href === "/monitoring" ? pathname === it.href : pathname.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={active ? "page" : undefined}
                className={cn("relative -mb-px flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[13.5px] font-medium transition-colors", active ? "text-fg" : "text-fg-muted hover:text-fg-secondary")}>
                <it.icon className={cn("size-4", active ? "text-[var(--brand-strong)]" : "")} aria-hidden />
                {it.label}
                {active && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
