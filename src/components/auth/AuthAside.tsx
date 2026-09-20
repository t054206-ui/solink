"use client";
import { Logo } from "@/components/brand/Logo";
import { Lattice } from "@/components/brand/Lattice";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { ReplayIntroButton } from "@/components/intro/ReplayIntroButton";
import { StaticPanel } from "@/components/three/PanelStudio";
import { PANEL_LAYERS } from "@/components/three/panelLayers";
import { useT } from "@/lib/i18n/provider";

/**
 * The left half of the sign-in pages: the same room as the landing page, one
 * object in it, its parts named on leader lines. Still, because a form is
 * where attention belongs; the moving version is one click away in the replay
 * button. Desktop only; phones get the form with a compact header.
 */
export function AuthAside() {
  const t = useT();
  const named = [PANEL_LAYERS[0], PANEL_LAYERS[1], PANEL_LAYERS[3], PANEL_LAYERS[4]];
  const spots: { className: string; align: "start" | "end" }[] = [
    { className: "start-[7%] top-[14%]", align: "start" },
    { className: "end-[6%] top-[36%]", align: "end" },
    { className: "start-[6%] top-[58%]", align: "start" },
    { className: "end-[7%] top-[78%]", align: "end" },
  ];
  return (
    <aside className="auth-aside relative hidden lg:flex flex-col justify-between overflow-hidden p-10">
      <Lattice size={32} />
      <div className="relative flex items-center justify-between">
        <Logo />
        <LocaleToggle />
      </div>

      <div className="relative mx-auto w-full max-w-[420px]">
        <div className="wipe mx-auto aspect-[4/5] w-[62%]">
          <StaticPanel />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {named.map((l, i) => (
            <div key={l.id} className={`rise absolute ${spots[i].className}`} style={{ animationDelay: `${420 + i * 90}ms` }}>
              <div className={`flex items-center gap-2 ${spots[i].align === "end" ? "flex-row-reverse" : ""}`}>
                <span className="micro text-fg-secondary">{t(l.nameKey)}</span>
                <span className="h-px w-8 bg-border-strong" />
                <span className="size-1.5 rounded-full bg-[color:var(--sun)]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <h2 className="display max-w-md text-[34px] text-fg">{t("hero.title")}</h2>
        <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-fg-secondary">{t("auth.asideSub")}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ReplayIntroButton />
          <span className="text-[11.5px] text-fg-muted">{t("auth.asideNote")}</span>
        </div>
      </div>
    </aside>
  );
}
