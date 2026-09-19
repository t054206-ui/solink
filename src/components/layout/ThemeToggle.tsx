"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect } from "react";
import { useLocalStore } from "@/lib/hooks/useLocalStore";

type Mode = "light" | "dark" | "system";

const NEXT: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
const ICON: Record<Mode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/**
 * Theme switch. The stored preference is applied to <html data-theme> by the
 * inline script in the root layout before paint, so there is no flash; this
 * effect only keeps the attribute in sync with later changes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode, loaded] = useLocalStore<Mode>("theme", "system");

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
  }, [mode, loaded]);

  const Icon = ICON[mode];
  return (
    <button
      type="button"
      onClick={() => setMode(NEXT[mode])}
      aria-label={`Theme: ${mode}. Click to change.`}
      title={`Theme: ${mode}`}
      className={`grid size-9 place-items-center rounded-[var(--radius)] text-fg-muted hover:bg-inset hover:text-fg ${className ?? ""}`}
    >
      <Icon className="size-4" />
    </button>
  );
}
