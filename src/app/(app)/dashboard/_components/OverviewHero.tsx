import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Stage } from "@/components/layout/Stage";
import { RoofVisual } from "@/components/three/RoofVisual";

export interface HeroAction {
  href: string;
  label: string;
  icon?: ReactNode;
  primary?: boolean;
}

/**
 * The top of the Overview, in both of its states. The landing hero's
 * composition at app scale: words on the start side, the rooftop on the end
 * side bleeding to the edge, the plotted grid behind both, from tablet width
 * up. Phones get the words first and the rooftop under them at a fixed
 * aspect, so it can never push the journey off the first screen by more than
 * its own height.
 *
 * Buttons are the landing page's pills, not the app's compact buttons: this is
 * the one place inside the app that speaks at the landing's size.
 */
export function OverviewHero({ label, eyebrow, title, description, actions, caption, children }: {
  label: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions: HeroAction[];
  caption: string;
  /** Pinned under the hero, full width (the energy path, when there is a system). */
  children?: ReactNode;
}) {
  return (
    <Stage label={label} focus="72% 30%">
      <div className="grid items-center md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="relative z-10 px-5 pb-2 pt-8 sm:px-8 sm:pt-10 md:py-12 md:pe-0 lg:py-14 lg:ps-10 lg:pe-2">
          <p className="micro wipe">{eyebrow}</p>
          <h1 className="display wipe mt-4 text-[clamp(2.4rem,4.6vw,4rem)] text-fg" style={{ animationDelay: "90ms" }}>{title}</h1>
          <p className="wipe mt-5 max-w-md text-[16px] leading-relaxed text-fg-secondary" style={{ animationDelay: "180ms" }}>{description}</p>
          {actions.length > 0 && (
            <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "300ms" }}>
              {actions.map((a) => (
                <Link
                  key={a.href + a.label}
                  href={a.href}
                  className={a.primary
                    ? "press inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-[14.5px] font-medium text-brand-fg hover:bg-brand-hover"
                    : "press inline-flex h-11 items-center gap-2 rounded-full border border-border-strong bg-elevated px-5 text-[14.5px] font-medium text-fg hover:bg-inset"}
                >
                  {a.icon}
                  {a.label}
                  {a.primary && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />}
                </Link>
              ))}
            </div>
          )}
        </div>
        <RoofVisual caption={caption} className="px-3 pb-3 sm:px-6 md:ps-0 md:pe-3 md:pt-4 lg:-ms-10 lg:pe-4" />
      </div>
      {children}
    </Stage>
  );
}
