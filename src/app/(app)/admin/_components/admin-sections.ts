/**
 * Admin section list. Kept in a plain module (not the "use client" AdminNav)
 * so server components can import the actual array rather than a client
 * reference proxy.
 */
export const ADMIN_SECTIONS: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/products", label: "Solar Products" },
  { href: "/admin/manufacturers", label: "Manufacturers" },
  { href: "/admin/products/import", label: "Product Imports" },
  { href: "/admin/datasheets", label: "Datasheets" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/maintenance", label: "Maintenance Requests" },
  { href: "/admin/systems", label: "Systems" },
  { href: "/admin/passports", label: "Solar Passports" },
  { href: "/admin/incidents", label: "Incidents" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/ai", label: "AI Configuration" },
  { href: "/admin/alerts", label: "AI Alerts" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/data-sources", label: "Data Sources" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/settings", label: "Settings" },
];
