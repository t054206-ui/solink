"use client";

import Link from "next/link";
import { ArrowRight, HardHat, Factory } from "lucide-react";
import { PanelStudio } from "@/components/three/PanelStudio";
import { Count } from "@/components/motion/Count";
import { useT } from "@/lib/i18n/provider";
import { DEMO_PRODUCT_BANNER } from "@/lib/demo/data";

/**
 * The landing page.
 *
 * One object in an empty room with its measurements hung off it, which is the
 * decision taken from all three reference sites. The object is a real 1722 ×
 * 1134 mm module you can turn with the mouse, and the numbers beside it are
 * the demo panel's actual specifications — except annual output, which nobody
 * can know without this visitor's roof, and which therefore says so rather
 * than showing a confident figure. That refusal is the product's whole
 * argument, so it belongs in the hero and not in a footnote.
 *
 * Motion: a clip wipe on the headline, a sticky takeover between the journey
 * and the honesty section, figures that count once. No fade-in on scroll.
 */
export default function LandingPage() {
  const t = useT();

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="grid-rule pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_35%,#000,transparent)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-24 lg:pt-20">
          <div>
            <p className="micro wipe">{t("hero.eyebrow")}</p>
            <h1
              className="display wipe mt-4 text-[clamp(2.4rem,6.4vw,4.35rem)] text-fg"
              style={{ animationDelay: "90ms" }}
            >
              {t("hero.title")}
            </h1>
            <p
              className="wipe mt-5 max-w-xl text-[16.5px] leading-relaxed text-fg-secondary"
              style={{ animationDelay: "180ms" }}
            >
              {t("hero.sub")}
            </p>
            <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "300ms" }}>
              <Link
                href="/profile"
                className="press inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-[14.5px] font-medium text-brand-fg hover:bg-brand-hover"
              >
                {t("hero.cta")}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link
                href="#journey"
                className="press inline-flex h-11 items-center rounded-full border border-border-strong px-5 text-[14.5px] font-medium text-fg hover:bg-inset"
              >
                {t("hero.ctaSecondary")}
              </Link>
            </div>
          </div>

          {/* The object, with its measurements. */}
          <div className="relative">
            {/* The labels are positioned against the stage the module sits in,
                and the studio shows them only while the module is closed and
                at rest. Session 4 had them on this container, where they
                drifted by the 18% the group shrinks during the sequence. */}
            <PanelStudio
              labels={
                <>
                  <SpecLabel className="start-[-8%] top-[14%]" align="start" value="400" unit="W" label={t("label.ratedPower")} />
                  <SpecLabel className="end-[-6%] top-[40%]" align="end" value="20.5" unit="%" label={t("label.efficiency")} />
                  <SpecLabel className="start-[-6%] top-[68%]" align="start" value="1.95" unit="m²" label={t("label.area")} />
                </>
              }
            />

            <div className="mt-5 flex flex-col items-center gap-2">
              <span className="demo-stripe micro rounded-full border border-[color:var(--cls-demo)] px-3 py-1 text-[color:var(--cls-demo)]">
                {DEMO_PRODUCT_BANNER}
              </span>
              <p className="max-w-xs text-center text-[12.5px] leading-snug text-fg-muted">{t("label.illustrative")}</p>
              <p className="max-w-xs text-center text-[13px] leading-snug text-fg-muted">
                <span className="micro text-[color:var(--cls-unavailable)]">{t("label.annualOutput")}</span>
                <br />
                {t("label.needsData")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Two doors for everyone who is not a homeowner ──────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-6 sm:p-8">
          <h2 className="text-[20px] font-semibold text-fg">{t("audience.title")}</h2>
          <p className="mt-1.5 text-[14.5px] text-fg-secondary">{t("audience.sub")}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <DoorLink
              href="/signup?role=company"
              icon={<HardHat className="size-5" aria-hidden="true" />}
              title={t("audience.installer")}
              sub={t("audience.installerSub")}
            />
            <DoorLink
              href="/signup?role=manufacturer"
              icon={<Factory className="size-5" aria-hidden="true" />}
              title={t("audience.manufacturer")}
              sub={t("audience.manufacturerSub")}
            />
          </div>
        </div>
      </section>

      {/* ── Journey. Sticky, so the next section slides over it. ───────── */}
      <section id="journey" className="sticky top-0 -z-0 scroll-mt-0 bg-bg py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <h2 className="display max-w-2xl text-[clamp(1.9rem,4vw,2.9rem)] text-fg">{t("journey.title")}</h2>
          <p className="mt-4 max-w-xl text-[15.5px] text-fg-secondary">{t("journey.sub")}</p>

          <ol className="mt-12 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-5">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) => (
              <li key={n} className="border-t border-border pt-3">
                <span className="micro text-[color:var(--sun-ink)]">
                  {String(n).padStart(2, "0")}
                </span>
                <h3 className="mt-1.5 text-[15.5px] font-semibold text-fg">
                  {t(`journey.${n}` as const)}
                </h3>
                <p className="mt-1 text-[13.5px] leading-snug text-fg-muted">
                  {t(`journey.${n}d` as const)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── The honesty system. This is the identity. ──────────────────── */}
      <section className="relative z-10 rounded-t-[28px] bg-brand py-20 text-white sm:rounded-t-[40px]">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <h2 className="display max-w-2xl text-[clamp(1.9rem,4vw,2.9rem)]">{t("honesty.title")}</h2>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-white/80">{t("honesty.sub")}</p>

          <dl className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            <ClassRow term={t("honesty.source")} desc={t("honesty.sourceD")} />
            <ClassRow term={t("honesty.calculated")} desc={t("honesty.calculatedD")} />
            <ClassRow term={t("honesty.estimated")} desc={t("honesty.estimatedD")} />
            <ClassRow term={t("honesty.ai")} desc={t("honesty.aiD")} />
            <ClassRow term={t("honesty.unavailable")} desc={t("honesty.unavailableD")} />
            <ClassRow term={t("honesty.demo")} desc={t("honesty.demoD")} highlight />
          </dl>

          <div className="mt-16 grid gap-8 border-t border-white/15 pt-10 sm:grid-cols-3">
            <Stat value={<Count to={58} />} label={t("stat.pages")} />
            <Stat value={<Count to={24} />} label={t("stat.decisions")} />
            <Stat value={<Count to={0} />} label={t("stat.invented")} />
          </div>
        </div>
      </section>

      {/* ── Close ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 bg-bg py-24">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
          <h2 className="display text-[clamp(1.9rem,4.4vw,3rem)] text-fg">{t("cta.title")}</h2>
          <p className="mt-4 text-[16px] text-fg-secondary">{t("cta.sub")}</p>
          <Link
            href="/profile"
            className="press mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-[15px] font-medium text-brand-fg hover:bg-brand-hover"
          >
            {t("cta.button")}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}

/** A measurement hanging off the object, with a hairline pointing at it. */
function SpecLabel({
  value,
  unit,
  label,
  className,
  align,
}: {
  value: string;
  unit: string;
  label: string;
  className: string;
  align: "start" | "end";
}) {
  return (
    <div className={`rise absolute ${className}`} style={{ animationDelay: "620ms" }}>
      <div className={`flex items-center gap-2 ${align === "end" ? "flex-row-reverse" : ""}`}>
        <div className={align === "end" ? "text-end" : "text-start"}>
          <span className="figure text-[19px] font-medium text-fg">{value}</span>
          <span className="ms-1 text-[12px] text-fg-muted">{unit}</span>
          <span className="micro block">{label}</span>
        </div>
        <span className="h-px w-10 bg-border-strong" />
        <span className="size-1.5 rounded-full bg-[color:var(--sun)]" />
      </div>
    </div>
  );
}

function DoorLink({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="press group flex items-start gap-3.5 rounded-[var(--radius-lg)] border border-border bg-bg p-4 hover:border-border-strong hover:bg-inset"
    >
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-fg">{title}</span>
        <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-muted">{sub}</span>
      </span>
      <ArrowRight
        className="ms-auto mt-1 size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

function ClassRow({ term, desc, highlight = false }: { term: string; desc: string; highlight?: boolean }) {
  return (
    <div className="border-t border-white/15 pt-3.5">
      <dt className="flex items-center gap-2 text-[15px] font-semibold">
        {highlight ? <span className="size-1.5 rounded-full bg-[color:var(--sun)]" aria-hidden="true" /> : null}
        {term}
      </dt>
      <dd className="mt-1.5 text-[13.5px] leading-snug text-white/70">{desc}</dd>
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="display text-[clamp(2.2rem,5vw,3.2rem)] text-[color:var(--sun)]">{value}</div>
      <p className="micro mt-1 text-white/60">{label}</p>
    </div>
  );
}
