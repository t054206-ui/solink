"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { useT } from "@/lib/i18n/provider";
import { ROLES, ROLE_META, type Role } from "@/lib/roles";

/**
 * Demo mode has no accounts, so there is nothing to read a role from. The role
 * travels in the query string (?as=…) so the dashboard stays a server
 * component, and the last choice is remembered per browser so a reload does
 * not throw you back to the homeowner view.
 *
 * This whole control disappears when Supabase arrives and user_profiles.role
 * becomes the source of truth.
 */
export function RoleSwitcher({ active }: { active: Role }) {
  const t = useT();
  const [, setStored] = useLocalStore<Role>("role", "homeowner");

  useEffect(() => {
    setStored(active);
  }, [active, setStored]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-inset p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="micro">{t("dash.switchRole")}</span>
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => {
            const on = r === active;
            return (
              <Link
                key={r}
                href={`/dashboard?as=${r}`}
                aria-current={on ? "page" : undefined}
                className={`press inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium ${
                  on
                    ? "bg-brand text-brand-fg"
                    : "border border-border bg-bg text-fg-secondary hover:border-border-strong hover:text-fg"
                }`}
              >
                {t(ROLE_META[r].labelKey)}
              </Link>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-fg-muted">{t("dash.switchRoleNote")}</p>
    </div>
  );
}
