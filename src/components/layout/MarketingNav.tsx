"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SolinkMark } from "@/components/brand/Logo";
import { useT } from "@/lib/i18n/provider";
import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";

/**
 * A floating pill rather than a full-width bar. All three reference sites do
 * this, and it is the right call here too: the hero is one object in an empty
 * room, and a solid bar across the top puts a lid on the room.
 */
export function MarketingNav() {
  const t = useT();
  const [open, setOpen] = useState(false);

  const links: { href: string; label: string }[] = [
    { href: "/#journey", label: t("nav.journey") },
    { href: "/marketplace", label: t("nav.marketplace") },
    { href: "/guide", label: t("nav.guide") },
    { href: "/about", label: t("nav.about") },
  ];

  return (
    <header className="pointer-events-none sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-border bg-elevated/95 py-2 pe-2 ps-4 shadow-[var(--shadow-sm)] backdrop-blur-[2px]">
        <Link href="/" className="inline-flex items-center gap-2 text-fg" aria-label="Solink">
          <SolinkMark className="size-5" />
          <span className="text-[15px] font-semibold leading-none tracking-[-0.02em]">Solink</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="press rounded-full px-3.5 py-2 text-[13.5px] text-fg-secondary hover:bg-inset hover:text-fg"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <LocaleToggle className="hidden sm:inline-flex" />
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="press hidden h-9 items-center rounded-full bg-brand px-4 text-[13.5px] font-medium text-brand-fg hover:bg-brand-hover sm:inline-flex"
          >
            {t("nav.open")}
          </Link>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-fg md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="pointer-events-auto mx-auto mt-2 flex max-w-5xl flex-col gap-1 rounded-[var(--radius-lg)] border border-border bg-elevated p-2 md:hidden">
          {links.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius)] px-3 py-2.5 text-sm text-fg hover:bg-inset"
            >
              {n.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 px-1 pt-1">
            <LocaleToggle />
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="press inline-flex h-9 flex-1 items-center justify-center rounded-full bg-brand px-4 text-[13.5px] font-medium text-brand-fg"
            >
              {t("nav.open")}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
