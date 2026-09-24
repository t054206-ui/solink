import type { ReactNode } from "react";
import { Stage } from "./Stage";

/**
 * A page's opening, in the landing page's room, with one of three
 * compositions so pages do not all open the same way:
 *
 * - "split": words on the start side, the visual on the end side.
 * - "reverse": the visual first, words after (on phones the words still
 *   come first, so the page's purpose is read before the picture).
 * - "stacked": words across the top, a wide visual under them.
 *
 * The heading, description and actions are the page's own, passed in
 * unchanged. `children` sits under the description (facts, status).
 */
export function PageHero({ label, eyebrow, title, description, actions, visual, layout = "split", focus = "72% 30%", children }: {
  label: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  visual?: ReactNode;
  layout?: "split" | "reverse" | "stacked";
  focus?: string;
  children?: ReactNode;
}) {
  const words = (
    <div className="relative z-10 min-w-0 px-5 pb-2 pt-7 sm:px-8 sm:pt-9 md:py-10 lg:px-10">
      <p className="micro wipe" style={{ color: "var(--fg-mustard)" }}>{eyebrow}</p>
      <h1 className="display wipe mt-4 text-[clamp(2.2rem,4.4vw,3.6rem)] text-[color:var(--brand-strong)]" style={{ animationDelay: "90ms" }}>{title}</h1>
      <p className="wipe mt-4 max-w-xl text-[15px] leading-relaxed text-fg-secondary" style={{ animationDelay: "180ms" }}>{description}</p>
      {actions && <div className="rise mt-6 flex flex-wrap gap-2" style={{ animationDelay: "280ms" }}>{actions}</div>}
      {children && <div className="rise mt-6" style={{ animationDelay: "340ms" }}>{children}</div>}
    </div>
  );

  if (!visual) return <Stage label={label} focus={focus} className="mb-6">{words}</Stage>;

  if (layout === "stacked") {
    return (
      <Stage label={label} focus={focus} className="mb-6">
        {words}
        <div className="px-3 pb-3 sm:px-6">{visual}</div>
      </Stage>
    );
  }

  return (
    <Stage label={label} focus={focus} className="mb-6">
      <div className={`grid items-center md:grid-cols-2 ${layout === "reverse" ? "md:[&>*:first-child]:order-2" : ""}`}>
        {words}
        <div className="px-3 pb-3 sm:px-6 md:py-6">{visual}</div>
      </div>
    </Stage>
  );
}
