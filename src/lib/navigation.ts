import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Home, Sun, Calculator, Store, GitCompare, Sparkles, PencilRuler, ShoppingCart, FileBadge,
  Activity, Wrench, AlertOctagon, FileText, TrendingUp, Recycle, Bot, ShieldCheck, HelpCircle,
  Inbox, CalendarDays, Hammer, Settings, BarChart3, Users, Package, Building2, Plug, Database, SprayCan, Search,
  ClipboardList, Coins, CalendarClock, Upload, FileSpreadsheet, Factory, Bell, Import, PackagePlus,
} from "lucide-react";
import type { Role } from "@/lib/roles";

/**
 * One sidebar per role, from one model.
 *
 * A link points at a route that exists. A link with `notBuilt` is a place the
 * owner wants in the structure for which no page exists yet: it renders
 * dimmed, not clickable, with the placeholder marker, and never invents a
 * route. A group folds several links under one label so the sidebar reads as
 * a journey (homeowner) or a workload (provider, admin, manufacturer) rather
 * than as a list of every feature.
 *
 * `match` decides the active state when the default (exact path, or the
 * path under it) would light the wrong item, for example /monitoring/cleaning
 * belongs to Maintenance, not to Monitoring.
 */
export interface NavLink {
  kind: "link";
  href: string;
  label: string;
  icon: LucideIcon;
  /** Why the item is not clickable yet. Present means: no page exists for it. */
  notBuilt?: string;
  match?: (pathname: string) => boolean;
}
export interface NavGroup { kind: "group"; id: string; label: string; icon: LucideIcon; items: NavLink[] }
export type NavEntry = NavLink | NavGroup;

const exact = (href: string) => (p: string) => p === href;
const under = (href: string) => (p: string) => p === href || p.startsWith(href + "/");
const any = (...fns: ((p: string) => boolean)[]) => (p: string) => fns.some((f) => f(p));

const link = (href: string, label: string, icon: LucideIcon, extra: Partial<Pick<NavLink, "match" | "notBuilt">> = {}): NavLink => ({ kind: "link", href, label, icon, ...extra });
const group = (id: string, label: string, icon: LucideIcon, items: NavLink[]): NavGroup => ({ kind: "group", id, label, icon, items });
const soon = (href: string, label: string, icon: LucideIcon, why: string): NavLink => ({ kind: "link", href, label, icon, notBuilt: why, match: () => false });

/* ---------------- Homeowner: a guided journey ---------------- */
const HOMEOWNER_NAV: NavEntry[] = [
  link("/dashboard", "Home", Home, { match: exact("/dashboard") }),
  group("go-solar", "Go Solar", Sun, [
    link("/profile", "Solar Profile", Home),
    link("/analysis", "Solar Potential", Sun),
    link("/calculator", "Savings Calculator", Calculator),
    link("/marketplace", "Marketplace", Store),
    link("/compare", "Compare Panels", GitCompare),
    link("/recommend", "AI Recommendation", Sparkles),
    link("/designer", "Solar Designer", PencilRuler),
    link("/purchase", "Purchase & Install", ShoppingCart),
  ]),
  group("my-system", "My Solar System", Activity, [
    link("/passport", "Solar Passport", FileBadge),
    link("/monitoring", "Monitoring", Activity, { match: any(exact("/monitoring"), under("/monitoring/panels"), under("/monitoring/nearby"), under("/monitoring/weather")) }),
    link("/performance", "Performance", TrendingUp),
    link("/replacement", "Replacement", Recycle),
  ]),
  group("maintenance", "Maintenance", Wrench, [
    link("/monitoring/cleaning", "Cleaning", SprayCan),
    link("/monitoring/inspection", "Inspection", Search),
    link("/maintenance", "Maintenance History", ClipboardList, { match: any(exact("/maintenance"), (p) => p.startsWith("/maintenance/") && !p.startsWith("/maintenance/book")) }),
    link("/incidents", "Incidents", AlertOctagon),
    soon("/maintenance/costs", "Maintenance Costs", Coins, "Costs appear inside each maintenance case and on Long-term Performance; a dedicated page is not built yet."),
    link("/maintenance/book", "Maintenance Booking", CalendarClock),
  ]),
  link("/reports", "Reports", FileText),
  link("/agent", "Ask Solink", Bot),
  link("/guide", "Help", HelpCircle),
];

/* ---------------- Provider (role `company`): a workload ---------------- */
const PROVIDER_NAV: NavEntry[] = [
  link("/dashboard", "Dashboard", LayoutDashboard, { match: exact("/dashboard") }),
  link("/provider/requests", "Requests", Inbox),
  link("/provider/appointments", "Appointments", CalendarDays),
  link("/provider/systems", "Systems", Home),
  link("/provider", "Maintenance", Wrench, { match: any(exact("/provider"), under("/provider/cases")) }),
  link("/provider/services", "Services", Hammer),
  soon("/provider/reports", "Reports", BarChart3, "Provider reports are not built yet."),
  soon("/provider/settings", "Settings", Settings, "Company settings are not built yet; services and prices are under Services."),
];

/* ---------------- Admin: the platform ---------------- */
const ADMIN_NAV: NavEntry[] = [
  link("/dashboard", "Dashboard", LayoutDashboard, { match: any(exact("/dashboard"), exact("/admin")) }),
  link("/admin/users", "Users", Users),
  group("products", "Products & Manufacturers", Package, [
    link("/admin/products", "Solar Products", Package, { match: (p) => p.startsWith("/admin/products") && !p.startsWith("/admin/products/import") }),
    link("/admin/manufacturers", "Manufacturers", Factory),
    link("/admin/products/import", "Product Imports", Import),
    soon("/admin/specifications", "Product Specifications", FileSpreadsheet, "Specifications are edited on each product's page; a cross-product view is not built yet."),
    link("/admin/datasheets", "Datasheets", FileText),
  ]),
  link("/admin/verification", "Verification", ShieldCheck),
  link("/admin/providers", "Providers", Building2),
  group("systems", "Solar Systems", Sun, [
    link("/admin/systems", "Systems", Sun),
    link("/admin/passports", "Solar Passports", FileBadge),
  ]),
  group("maintenance", "Maintenance & Incidents", Wrench, [
    link("/admin/maintenance", "Maintenance Requests", ClipboardList),
    link("/admin/incidents", "Incidents", AlertOctagon),
    soon("/admin/repairs", "Repairs", Hammer, "Repairs are recorded inside maintenance cases; a separate Repairs page is not built yet."),
  ]),
  link("/admin/reports", "Reports", FileText),
  group("ai", "AI", Bot, [
    link("/admin/ai", "AI Configuration", Bot),
    link("/admin/alerts", "AI Alerts", Bell),
  ]),
  link("/admin/integrations", "Integrations", Plug),
  link("/admin/data-sources", "Data Sources", Database),
  link("/admin/settings", "Settings", Settings),
];

/* ---------------- Manufacturer: a product portal ---------------- */
const MANUFACTURER_NAV: NavEntry[] = [
  link("/dashboard", "Dashboard", LayoutDashboard, { match: exact("/dashboard") }),
  group("products", "Products", Package, [
    link("/manufacturer/products", "My Products", Package, { match: (p) => p.startsWith("/manufacturer/products") && p !== "/manufacturer/products/new" }),
    link("/manufacturer/products/new", "Add Product", PackagePlus, { match: exact("/manufacturer/products/new") }),
    link("/manufacturer/datasheets", "Datasheets", Upload),
  ]),
  link("/manufacturer/performance", "Product Performance", BarChart3),
  link("/manufacturer/requests", "Requests", Inbox),
  link("/manufacturer/orders", "Orders", ClipboardList),
  link("/manufacturer/reports", "Reports", TrendingUp),
  link("/manufacturer/company", "Company Profile", Building2),
  link("/manufacturer/settings", "Settings", Settings),
];

export function navFor(role: Role): NavEntry[] {
  switch (role) {
    case "admin": return ADMIN_NAV;
    case "company": return PROVIDER_NAV;
    case "manufacturer": return MANUFACTURER_NAV;
    default: return HOMEOWNER_NAV;
  }
}

/** Small word under the logo so the person knows which Solink they are in. */
export const ROLE_TAG: Record<Role, string | null> = { homeowner: null, company: "Provider", manufacturer: "Manufacturer", admin: "Admin" };

export function isLinkActive(pathname: string, l: NavLink): boolean {
  if (l.notBuilt) return false;
  return l.match ? l.match(pathname) : pathname === l.href || pathname.startsWith(l.href + "/");
}

/** The active link and, when it sits in a group, that group. */
export function findActive(pathname: string, entries: NavEntry[]): { link: NavLink; group: NavGroup | null } | null {
  for (const e of entries) {
    if (e.kind === "link") { if (isLinkActive(pathname, e)) return { link: e, group: null }; }
    else for (const l of e.items) if (isLinkActive(pathname, l)) return { link: l, group: e };
  }
  return null;
}

export const QUICK_START = ["Analyze Home", "Calculate Needs", "Choose System", "Design", "Purchase / Install", "Monitor", "Maintain", "Optimize"];
