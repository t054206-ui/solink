"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { MARKETING_NAV } from "@/lib/navigation";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "./ThemeToggle";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {MARKETING_NAV.slice(0, 3).map((n) => <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm text-fg-secondary hover:text-fg hover:bg-inset">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button href="/dashboard" size="sm" className="hidden sm:inline-flex">Open Solink</Button>
          <button className="md:hidden grid size-9 place-items-center rounded-md text-fg" aria-label="Menu" onClick={() => setOpen((o) => !o)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-elevated px-4 py-3 flex flex-col gap-1">
          {MARKETING_NAV.map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm text-fg hover:bg-inset">{n.label}</Link>)}
        </div>
      )}
    </header>
  );
}
