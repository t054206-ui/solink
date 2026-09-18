"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try { const m = localStorage.getItem("solink-theme") as Mode | null; if (m) setMode(m); } catch {}
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", mode);
    try { localStorage.setItem("solink-theme", mode); } catch {}
  }, [mode]);
  const next: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <button type="button" onClick={() => setMode(next[mode])} aria-label={`Theme: ${mode}. Click to change.`} title={`Theme: ${mode}`}
      className={`grid size-9 place-items-center rounded-[10px] text-fg-muted hover:bg-inset hover:text-fg ${className ?? ""}`}>
      <Icon className="size-4" />
    </button>
  );
}
