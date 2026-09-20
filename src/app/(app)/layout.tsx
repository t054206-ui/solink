import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getDataMode } from "@/lib/data/mode";
import { getCurrentRole, getCurrentUser } from "@/lib/supabase/server";
import { listNotifications } from "@/lib/data/repositories";

/** Authenticated application shell. In demo mode (no Supabase) a demo homeowner is used and labeled. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const mode = getDataMode();
  const user = mode === "supabase" ? await getCurrentUser() : null;
  const role = mode === "supabase" ? ((await getCurrentRole()) ?? "homeowner") : "homeowner";
  const { data: notifications } = await listNotifications().catch(() => ({ data: [] }));
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <AppShell demoMode={mode === "demo"} unreadCount={unread} user={{ email: user?.email ?? null, isDemo: mode === "demo", role }}>
      {children}
    </AppShell>
  );
}
