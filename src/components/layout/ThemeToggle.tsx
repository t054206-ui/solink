"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect } from "react";
import { useLocalStore } from "@/lib/hooks/useLocalStore";

type Mode = "light" | "dark" | "system";

const NEXT: Record<Mode, Mode> = { light: "dark", dark: "system", system: "light" };
const ICON: Record<Mode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/**
 * Theme switch. Light is the default: Solink is a daylight product and the
 * owner asked for a light interface, so a first-time visitor on a dark-mode
 * laptop still gets the bone-white studio. "System" is still reachable, it is
 * just no longer what you get without asking.
 *
 * The stored preference is applied to <html data-theme> by the inline script in
 * the root layout before paint, so there is no flash; this effect only keeps
 * the attribute in sync with later changes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode, loaded] = useLocalStore<Mode>("theme", "light");

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
      <Icon className="size-4"  aria-hidden />
    </button>
  );
}
