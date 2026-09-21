"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Ends the Supabase session in this browser and returns to the landing page.
 * Rendered only for a real signed-in user; demo mode has nothing to sign out of.
 */
export function SignOutButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      aria-label="Sign out"
      title="Sign out"
      className={cn(
        compact
          ? "grid size-9 place-items-center rounded-[var(--radius)] text-fg-muted hover:bg-inset hover:text-fg disabled:opacity-60"
          : "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-border-strong bg-elevated px-2.5 text-[12.5px] font-medium text-fg hover:bg-inset disabled:opacity-60",
        className,
      )}
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" aria-hidden />}
      {!compact && <span>Sign out</span>}
    </button>
  );
}
