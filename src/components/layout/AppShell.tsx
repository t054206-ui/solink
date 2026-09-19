"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X, Bot } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { APP_NAV } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { AgentDrawer } from "./AgentDrawer";

export interface ShellUser { email: string | null; isDemo: boolean; role: "homeowner" | "provider" | "admin" }

/**
 * Authenticated app shell: collapsible sidebar (desktop), bottom-sheet nav
 * (mobile), top bar with notifications and theme, floating AI Solar Agent.
 */
export function AppShell({ children, user, demoMode, unreadCount = 0 }: { children: ReactNode; user: ShellUser; demoMode: boolean; unreadCount?: number }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  // Close the mobile nav when the route changes (including back/forward), using
  // React's "adjust state during render" pattern rather than an effect.
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  const nav = (
    <nav aria-label="App" className="flex flex-col gap-4 px-2 py-2 pb-6">
      {APP_NAV.map((g) => (
        <div key={g.label}>
          <div className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-fg-muted">{g.label}</div>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <li key={it.href}>
                  <Link href={it.href} aria-current={active ? "page" : undefined}
                    className={cn("relative flex h-8 items-center gap-2 rounded-[var(--radius)] px-2 text-[13px] transition-colors max-[1023px]:h-11", active ? "bg-brand-soft font-medium text-fg before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[var(--brand)]" : "text-fg-secondary hover:bg-inset hover:text-fg")}>
                    <it.icon className={cn("size-3.5 shrink-0", active ? "text-[var(--brand)]" : "text-fg-muted")} aria-hidden />
                    <span className="truncate">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-bg">
      {/* Page-level demo notice. Deliberately not sticky: its height varies with
          wrapping, and a fixed offset for the sticky header would overlap it.
          The DEMO chip in the header keeps the warning visible while scrolling. */}
      {demoMode && (
        <div className="demo-stripe border-b border-[var(--cls-demo)]/40 bg-[var(--cls-demo-soft)] px-3 py-1 text-center text-[11.5px] text-[var(--critical-fg)]">
          <strong>DEMO MODE — NOT REAL.</strong> Supabase, monitoring hardware, and real product data are not connected. Everything shown is labeled demo or placeholder. <Link href="/admin/integrations" className="underline underline-offset-2">Integration status</Link>
        </div>
      )}
      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-dvh w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-elevated lg:flex">
          <div className="flex h-[var(--header-height)] shrink-0 items-center border-b border-border px-3"><Logo href="/dashboard" /></div>
          <div className="flex-1 overflow-y-auto">{nav}</div>
          <div className="border-t border-border px-3 py-2 text-[11.5px] text-fg-muted truncate">{user.isDemo ? "Demo homeowner (not signed in)" : user.email}</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between gap-3 border-b border-border bg-bg px-3 sm:px-4">
            <div className="flex items-center gap-2 lg:hidden">
              <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-[var(--radius)] text-fg hover:bg-inset"><Menu className="size-5" /></button>
              <Logo href="/dashboard" compact />
            </div>
            <div className="hidden lg:block font-mono text-[11.5px] uppercase tracking-[0.08em] text-fg-muted">{breadcrumb(pathname)}</div>
            <div className="flex items-center gap-1.5">
              {demoMode && (
                <Link
                  href="/admin/integrations"
                  title="Demo mode: Supabase, monitoring hardware and real product data are not connected."
                  className="demo-stripe mr-1 inline-flex items-center rounded-[2px] border border-[var(--cls-demo)]/55 bg-[var(--cls-demo-soft)] px-1.5 py-px text-[10.5px] font-semibold tracking-[0.06em] text-[var(--critical-fg)]"
                >
                  DEMO
                </Link>
              )}
              <button onClick={() => setAgentOpen(true)} className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-border-strong bg-elevated px-2.5 text-[12.5px] font-medium text-fg hover:bg-inset"><Bot className="size-4 text-[var(--brand-strong)]" /> Ask Solink</button>
              <Link href="/notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} className="relative grid size-9 place-items-center rounded-[var(--radius)] text-fg-muted hover:bg-inset hover:text-fg">
                <Bell className="size-4" />{unreadCount > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand ring-2 ring-[var(--bg)]" />}
              </Link>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 px-3 py-4 sm:px-4 lg:px-5 pb-24 lg:pb-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile nav sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button aria-label="Close navigation" className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-xs overflow-y-auto bg-elevated shadow-card">
            <div className="flex h-16 items-center justify-between px-4"><Logo href="/dashboard" /><button aria-label="Close" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-md text-fg hover:bg-inset"><X className="size-5" /></button></div>
            {nav}
          </div>
        </div>
      )}

      {/* Floating agent button (mobile) */}
      <button onClick={() => setAgentOpen(true)} aria-label="Ask the AI Solar Agent" className="fixed bottom-4 right-4 z-40 grid size-12 place-items-center rounded-[var(--radius-lg)] bg-[var(--brand)] text-[var(--brand-fg)] shadow-card sm:hidden"><Bot className="size-6" /></button>
      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} />
    </div>
  );
}

function breadcrumb(path: string) {
  const item = APP_NAV.flatMap((g) => g.items).find((i) => path === i.href || path.startsWith(i.href + "/"));
  return item ? `Solink / ${item.label}` : "Solink";
}
