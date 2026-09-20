/**
 * Who is signed in, and therefore which dashboard they get.
 *
 * "Landlord" is not a separate role: the owner confirmed a landlord is a
 * homeowner with more than one property, so they share the homeowner
 * dashboard and its property switcher.
 *
 * A company is one account. Whether it sees the installation area, the
 * maintenance area, or both is decided by the services it actually offers,
 * not by a second role — a maintenance-only company never sees install jobs.
 *
 * Demo mode has no accounts, so the role is held per-browser under
 * solink:role and can be switched from the dashboard. When Supabase arrives
 * this is replaced by user_profiles.role and the switcher disappears.
 */
export const ROLES = ["homeowner", "manufacturer", "company", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "homeowner";

export interface CompanyServices {
  installation: boolean;
  maintenance: boolean;
  cleaning: boolean;
}

export interface RoleMeta {
  /** Dictionary key for the display name. */
  labelKey: "dash.homeowner" | "dash.manufacturer" | "dash.company" | "dash.admin";
  /** English fallback, used in places that are not translated (admin tooling). */
  label: string;
  description: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  homeowner: {
    labelKey: "dash.homeowner",
    label: "Homeowner",
    description: "Owns one or more homes. Plans, buys, monitors and maintains a system.",
  },
  manufacturer: {
    labelKey: "dash.manufacturer",
    label: "Manufacturer",
    description: "Publishes panels and keeps their specifications and datasheets current.",
  },
  company: {
    labelKey: "dash.company",
    label: "Installer and maintenance",
    description: "Installs systems, maintains them, or both, depending on the services offered.",
  },
  admin: {
    labelKey: "dash.admin",
    label: "Administrator",
    description: "Verifies products and data sources, and runs the platform.",
  },
};

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}
