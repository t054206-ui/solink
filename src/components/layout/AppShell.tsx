"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X, Bot, ChevronDown, LogIn } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { NotBuilt } from "@/components/ui/NotBuilt";
import { findActive, isLinkActive, navFor, ROLE_TAG, type NavEntry, type NavGroup, type NavLink } from "@/lib/navigation";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { AgentDrawer } from "./AgentDrawer";
import { BasketHeaderIcon } from "./BasketHeaderIcon";
import { SkipLink } from "./SkipLink";
import { SignOutButton } from "./SignOutButton";
import { PlaceholderGuard } from "@/components/ui/AuditMode";
import type { Role } from "@/lib/roles";

/** isDemo: no Supabase connected, so there is no account at all. isAuthenticated: false for a signed-out guest even when Supabase IS connected — distinct from isDemo, since making pages like the marketplace public means both now render for people with no session. */
export interface ShellUser { email: string | null; name: string | null; orgName: string | null; isDemo: boolean; isAuthenticated: boolean; role: Role }

/**
 * Authenticated app shell. One sidebar per role (lib/navigation.ts): the
 * homeowner sees a journey, the provider a workload, the admin the platform,
 * the manufacturer a product portal. Groups fold; the group holding the
 * current page is open on arrival. Items with no page yet are dimmed with the
 * not-built marker and are not links. Desktop keeps the fixed 248 px sidebar
 * (no icon-only mode: the owner chose not to add one); phones get a drawer.
 *
 * In demo mode there is no account, so the role comes from the browser store
 * the dashboard's role switcher writes to, and the sidebar follows it.
 */
export function AppShell({ children, user, demoMode, unreadCount = 0 }: { children: ReactNode; user: ShellUser; demoMode: boolean; unreadCount?: number }) {
  const pathname = usePathname();
  const [demoRole] = useLocalStore<Role>("role", "homeowner");
  const role: Role = user.isDemo ? demoRole : user.role;
  const entries = navFor(role);
  const active = findActive(pathname, entries);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  // Groups the person opened or closed by hand; the active group is open by default.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (g: NavGroup) => toggled[g.id] ?? (active?.group?.id === g.id);
  const toggle = (g: NavGroup) => setToggled((t) => ({ ...t, [g.id]: !isOpen(g) }));

  // Close the mobile nav when the route changes (including back/forward), using
  // React's "adjust state during render" pattern rather than an effect.
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    if (mobileOpen) setMobileOpen(false);
    // Arriving inside a group someone had folded: unfold it so the active item is visible.
    if (active?.group && toggled[active.group.id] === false) setToggled((t) => ({ ...t, [active.group!.id]: true }));
  }

  const tag = ROLE_TAG[role];
  const guest = !user.isDemo && !user.isAuthenticated;
  // Footer identity: name, then the company for providers and manufacturers,
  // then the email, for every role. Demo mode has no account, so it says so
  // and offers Sign in instead of Sign out — a real, signed-out guest (now
  // possible on public pages like the marketplace) gets the same treatment,
  // never "Signed in" with nothing to back it.
  const identity: { primary: string; lines: string[] } = user.isDemo
    ? { primary: `Demo ${role === "company" ? "provider" : role}`, lines: ["not signed in"] }
    : guest
    ? { primary: "Not signed in", lines: ["Browsing as a guest"] }
    : {
        primary: user.name ?? user.email ?? "Signed in",
        lines: [
          ...((role === "company" || role === "manufacturer") ? [user.orgName ?? "No company linked"] : []),
          ...(user.email && user.email !== user.name ? [user.email] : []),
        ],
      };

  const nav = (
    <nav aria-label="App" className="flex flex-col gap-1 px-2 py-2 pb-6">
      {entries.map((e) => (e.kind === "link" ? <LeafItem key={e.href} l={e} pathname={pathname} top /> : (
        <div key={e.id}>
          <button
            type="button"
            onClick={() => toggle(e)}
            aria-expanded={isOpen(e)}
            aria-controls={`nav-group-${e.id}`}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-[var(--radius)] px-2 text-start text-[13px] transition-colors max-[1023px]:h-11",
              active?.group?.id === e.id && !isOpen(e) ? "bg-brand-soft font-medium text-fg" : "text-fg hover:bg-inset",
            )}
          >
            <e.icon className={cn("size-4 shrink-0", active?.group?.id === e.id ? "text-[var(--brand)]" : "text-fg-muted")} aria-hidden />
            <span className="flex-1 truncate font-medium">{e.label}</span>
            <ChevronDown className={cn("size-3.5 shrink-0 text-fg-muted transition-transform duration-150", isOpen(e) && "rotate-180")} aria-hidden />
          </button>
          {isOpen(e) && (
            <ul id={`nav-group-${e.id}`} className="ms-3 mt-0.5 space-y-0.5 border-s border-border ps-2">
              {e.items.map((l) => <LeafItem key={l.href} l={l} pathname={pathname} />)}
            </ul>
          )}
        </div>
      )))}
    </nav>
  );

  const footer = (
    <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-medium text-fg">{identity.primary}</div>
        {identity.lines.map((l) => <div key={l} className="truncate text-[11.5px] text-fg-muted" dir="ltr">{l}</div>)}
      </div>
      {user.isDemo || guest
        ? <Link href="/login" className="press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-border-strong bg-elevated px-2.5 text-[12px] font-medium text-fg hover:bg-inset"><LogIn className="size-3.5" aria-hidden /> Sign in</Link>
        : <SignOutButton compact />}
    </div>
  );

  const brand = (
    <div className="flex items-center gap-2">
      <Logo href="/dashboard" />
      {tag && <span className="micro rounded-[3px] border border-border px-1.5 py-0.5 text-[9.5px]">{tag}</span>}
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <SkipLink />
      {demoMode && (
        <div className="demo-stripe border-b border-[var(--cls-demo)]/40 bg-[var(--cls-demo-soft)] px-3 py-1 text-center text-[11.5px] text-[var(--critical-fg)]">
          <strong>DEMO MODE: NOT REAL.</strong> Supabase, monitoring hardware, and real product data are not connected. Everything shown is labeled demo or placeholder. <Link href="/admin/integrations" className="underline underline-offset-2">Integration status</Link>
        </div>
      )}
      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-dvh w-[var(--sidebar-width)] shrink-0 flex-col border-e border-border bg-elevated lg:flex">
          <div className="flex h-[var(--header-height)] shrink-0 items-center border-b border-border px-3">{brand}</div>
          <div className="flex-1 overflow-y-auto">{nav}</div>
          {footer}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between gap-3 border-b border-border bg-bg px-3 sm:px-4">
            <div className="flex items-center gap-2 lg:hidden">
              <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-[var(--radius)] text-fg hover:bg-inset"><Menu className="size-5" aria-hidden /></button>
              <Logo href="/dashboard" compact />
            </div>
            <div className="hidden lg:block font-mono text-[11.5px] uppercase tracking-[0.08em] text-fg-muted">{breadcrumb(active)}</div>
            <div className="flex items-center gap-1.5">
              {demoMode && (
                <Link
                  href="/admin/integrations"
                  title="Demo mode: Supabase, monitoring hardware and real product data are not connected."
                  className="demo-stripe me-1 inline-flex items-center rounded-[2px] border border-[var(--cls-demo)]/55 bg-[var(--cls-demo-soft)] px-1.5 py-px text-[10.5px] font-semibold tracking-[0.06em] text-[var(--critical-fg)]"
                >
                  DEMO
                </Link>
              )}
              <button onClick={() => setAgentOpen(true)} className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-border-strong bg-elevated px-2.5 text-[12.5px] font-medium text-fg hover:bg-inset"><Bot className="size-4 text-[var(--brand-strong)]" aria-hidden /> Ask Solink</button>
              <BasketHeaderIcon />
              <Link href="/notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} className="relative grid size-9 place-items-center rounded-[var(--radius)] text-fg-muted hover:bg-inset hover:text-fg">
                <Bell className="size-4" aria-hidden />{unreadCount > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand ring-2 ring-[var(--bg)]" />}
              </Link>
              <ThemeToggle />
              {!user.isDemo && <SignOutButton compact className="lg:hidden" />}
            </div>
          </header>
          <main id="main" data-app-main className="flex-1 px-3 py-4 sm:px-4 lg:px-5 pb-24 lg:pb-8">
            <PlaceholderGuard />
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button aria-label="Close navigation" className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[86%] max-w-xs flex-col bg-elevated shadow-card">
            <div className="flex h-16 shrink-0 items-center justify-between px-4">{brand}<button aria-label="Close" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-md text-fg hover:bg-inset"><X className="size-5" aria-hidden /></button></div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {footer}
          </div>
        </div>
      )}

      {/* Floating agent button (mobile) */}
      <button onClick={() => setAgentOpen(true)} aria-label="Ask Solink" className="fixed bottom-4 end-4 z-40 grid size-12 place-items-center rounded-[var(--radius-lg)] bg-[var(--brand)] text-[var(--brand-fg)] shadow-card sm:hidden"><Bot className="size-6" aria-hidden /></button>
      <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} />
    </div>
  );
}

/** One row: a link, or a dimmed not-built item. `top` rows carry the group-level icon size. */
function LeafItem({ l, pathname, top = false }: { l: NavLink; pathname: string; top?: boolean }) {
  const row = cn("relative flex items-center gap-2 rounded-[var(--radius)] px-2 text-[13px] transition-colors max-[1023px]:h-11", top ? "h-9" : "h-8");
  if (l.notBuilt) {
    return (
      <li className={top ? "list-none" : undefined}>
        <span aria-disabled="true" title={l.notBuilt} className={cn(row, "cursor-not-allowed text-fg-muted")}>
          <l.icon className={cn("shrink-0 text-fg-muted/70", top ? "size-4" : "size-3.5")} aria-hidden />
          <span className="truncate">{l.label}</span>
          <NotBuilt why={l.notBuilt} className="ms-auto" label="SOON" />
        </span>
      </li>
    );
  }
  const active = isLinkActive(pathname, l);
  const inner = (
    <Link href={l.href} aria-current={active ? "page" : undefined}
      className={cn(row, active ? "bg-brand-soft font-medium text-fg before:absolute before:inset-y-1 before:start-0 before:w-[2px] before:rounded-full before:bg-[var(--brand)]" : "text-fg-secondary hover:bg-inset hover:text-fg")}>
      <l.icon className={cn("shrink-0", top ? "size-4" : "size-3.5", active ? "text-[var(--brand)]" : "text-fg-muted")} aria-hidden />
      <span className="truncate">{l.label}</span>
    </Link>
  );
  return top ? <div>{inner}</div> : <li>{inner}</li>;
}

function breadcrumb(active: ReturnType<typeof findActive>) {
  if (!active) return "Solink";
  return active.group ? `Solink / ${active.group.label} / ${active.link.label}` : `Solink / ${active.link.label}`;
}

export type { NavEntry };
