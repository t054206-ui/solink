import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getDataMode } from "@/lib/data/mode";
import { getShellIdentity } from "@/lib/supabase/server";
import { listNotifications } from "@/lib/data/repositories";

/** Authenticated application shell. In demo mode (no Supabase) a demo homeowner is used and labeled. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const mode = getDataMode();
  const identity = mode === "supabase" ? await getShellIdentity() : null;
  const { data: notifications } = await listNotifications().catch(() => ({ data: [] }));
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <AppShell
      demoMode={mode === "demo"}
      unreadCount={unread}
      user={{ email: identity?.email ?? null, name: identity?.name ?? null, orgName: identity?.orgName ?? null, isDemo: mode === "demo", isAuthenticated: identity !== null, role: identity?.role ?? "homeowner" }}
    >
      {children}
    </AppShell>
  );
}
