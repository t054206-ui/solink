"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  Bot,
  CloudSun,
  Database,
  Languages,
  MapPin,
  Network,
  Sun,
  Tags,
  Workflow,
  ExternalLink,
} from "lucide-react";
import { DataBadge } from "@/components/ui/DataBadge";
import { useT } from "@/lib/i18n/provider";
import type { DictKey } from "@/lib/i18n/dictionary";
import { TEAM, isPlaceholderMember, isPlaceholderText, type TeamMember } from "@/lib/content/team";

/**
 * About Solink.
 *
 * Everything on this page is one of three things: a fact already recorded in
 * the project (README, HANDOFF, the glossary), the intended architecture as the
 * owner described it, or a visible [PLACEHOLDER: …]. Nothing about the team, the
 * founding, the vision statement or the mission is invented — those are
 * placeholders until the owner supplies them, and they are rendered in the same
 * dashed style the rest of the product uses for undecided values so nobody can
 * mistake them for copy.
 *
 * Motion follows the landing page: a clip wipe on load and a sticky takeover
 * where the Solution slides over the Problem. Fade-in-on-scroll is on the
 * owner's banned list, so it is not used here even though generic About-page
 * briefs tend to ask for it.
 */
export function AboutPage() {
  const t = useT();

  return (
    <>
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="grid-rule pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_40%,#000,transparent)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <p className="micro wipe">{t("about.eyebrow")}</p>
            <h1 className="display wipe mt-4 text-[clamp(2.4rem,6vw,4.2rem)] text-fg" style={{ animationDelay: "90ms" }}>
              {t("about.title")}
            </h1>
            <p className="wipe mt-5 max-w-xl text-[16.5px] leading-relaxed text-fg-secondary" style={{ animationDelay: "180ms" }}>
              {t("about.sub")}
            </p>
          </div>
          <div className="rise mx-auto w-full max-w-[460px]" style={{ animationDelay: "320ms" }}>
            <ConnectedVisual
              labels={{
                location: t("about.visual.location"),
                potential: t("about.visual.potential"),
                weather: t("about.visual.weather"),
                ai: t("about.visual.ai"),
                center: t("about.visual.center"),
              }}
            />
          </div>
        </div>
      </section>

      {/* ── 2. The problem. Sticky, so the solution slides over it. ──────── */}
      <section className="sticky top-0 -z-0 bg-bg py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionHead title={t("about.problem.title")} sub={t("about.problem.sub")} />

          <ol className="mt-10 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const).map((n) => (
              <li key={n} className="flex items-baseline gap-3 border-t border-border pt-3">
                <span className="micro text-[color:var(--sun-ink)]">{String(n).padStart(2, "0")}</span>
                <span className="text-[14.5px] text-fg">{t(`about.problem.${n}` as DictKey)}</span>
              </li>
            ))}
          </ol>

          <p className="mt-10 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">{t("about.problem.close")}</p>

          {/* Disconnected steps, then the same steps joined. */}
          <div className="mt-12 space-y-8">
            <div>
              <p className="micro">{t("about.problem.before")}</p>
              <ul className="mt-3 flex flex-wrap items-center gap-3">
                {(["about.stage.1", "about.stage.3", "about.stage.6", "about.stage.7", "about.stage.8"] as const).map((k, i, arr) => (
                  <li key={k} className="flex items-center gap-3">
                    <span className="rounded-[var(--radius)] border border-dashed border-border-strong px-3 py-1.5 text-[13.5px] text-fg-secondary">
                      {t(k)}
                    </span>
                    {i < arr.length - 1 && <span aria-hidden="true" className="text-fg-muted">×</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="micro">{t("about.problem.after")}</p>
              <div className="relative mt-3 overflow-x-auto pb-1">
                <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-[color:var(--brand)]" />
                <ol className="relative flex min-w-max items-center gap-2">
                  {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) => (
                    <li key={n} className="rounded-full border border-[color:var(--brand)] bg-bg px-3 py-1.5 text-[13px] font-medium text-[color:var(--brand-strong)]">
                      {t(`about.stage.${n}` as DictKey)}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Everything from here down sits in one stacking layer above the sticky
          Problem section. Without this, any later section lacking its own
          background and z-index lets the Problem show through as you scroll —
          the landing page gets away with it because each of its sections
          carries z-10; here the wrapper makes it impossible to forget. */}
      <div className="relative z-10 bg-bg">
      {/* ── 3. Our solution. Slides over the problem. ────────────────────── */}
      <section className="rounded-t-[28px] bg-brand py-20 text-white sm:rounded-t-[40px]">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <h2 className="display max-w-2xl text-[clamp(1.9rem,4vw,2.9rem)]">{t("about.solution.title")}</h2>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-white/80">{t("about.solution.sub")}</p>
          <ol className="mt-12 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-5">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) => (
              <li key={n} className="border-t border-white/15 pt-3">
                <span className="micro text-[color:var(--sun)]">{String(n).padStart(2, "0")}</span>
                <h3 className="mt-1.5 text-[15.5px] font-semibold">{t(`about.stage.${n}` as DictKey)}</h3>
                <p className="mt-1 text-[13.5px] leading-snug text-white/70">{t(`about.stage.${n}d` as DictKey)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 4. Ecosystem ────────────────────────────────────────────────── */}
      <section className="bg-bg py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionHead title={t("about.eco.title")} sub={t("about.eco.sub")} />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <EcoCard icon={<MapPin className="size-5" aria-hidden="true" />} name={t("about.eco.maps")} role={t("about.eco.mapsRole")} desc={t("about.eco.mapsD")} />
            <EcoCard icon={<Sun className="size-5" aria-hidden="true" />} name={t("about.eco.solar")} role={t("about.eco.solarRole")} desc={t("about.eco.solarD")} />
            <EcoCard icon={<CloudSun className="size-5" aria-hidden="true" />} name={t("about.eco.weather")} role={t("about.eco.weatherRole")} desc={t("about.eco.weatherD")} />
            <EcoCard icon={<Bot className="size-5" aria-hidden="true" />} name={t("about.eco.claude")} role={t("about.eco.claudeRole")} desc={t("about.eco.claudeD")} />
            <EcoCard icon={<Workflow className="size-5" aria-hidden="true" />} name={t("about.eco.n8n")} role={t("about.eco.n8nRole")} desc={t("about.eco.n8nD")} />
          </div>

          <div className="mt-16">
            <h3 className="text-[20px] font-semibold text-fg">{t("about.flow.title")}</h3>
            <p className="mt-1.5 max-w-2xl text-[14px] text-fg-muted">{t("about.flow.note")}</p>
            <ol className="relative mt-8 space-y-3 border-s border-border ps-6">
              <FlowRow service={t("about.eco.maps")} produces={t("about.flow.location")} />
              <FlowRow service={t("about.eco.solar")} produces={t("about.flow.roof")} />
              <FlowRow service={t("about.eco.weather")} produces={t("about.flow.env")} />
              <FlowRow service={t("about.eco.n8n")} produces={t("about.flow.workflow")} />
              <FlowRow service={t("about.eco.claude")} produces={t("about.flow.analysis")} />
              <FlowRow service="Solink" produces={t("about.flow.dashboard")} last />
            </ol>
          </div>
        </div>
      </section>

      {/* ── 5. How Solink works ─────────────────────────────────────────── */}
      <section className="border-t border-border bg-elevated py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionHead title={t("about.how.title")} sub={t("about.how.sub")} />
          <ol className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) => (
              <li key={n} className="border-t border-border pt-3">
                <span className="micro text-[color:var(--sun-ink)]">{String(n).padStart(2, "0")}</span>
                <h3 className="mt-1.5 text-[15.5px] font-semibold text-fg">{t(`about.how.${n}` as DictKey)}</h3>
                <p className="mt-1 text-[13.5px] leading-snug text-fg-muted">{t(`about.how.${n}d` as DictKey)}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-2xl rounded-[var(--radius)] border border-dashed border-border-strong bg-bg p-3.5 text-[13.5px] leading-snug text-fg-secondary">
            {t("about.how.caveat")}
          </p>

          {/* Data transparency: reuses the product's own label component. */}
          <div className="mt-16">
            <h3 className="text-[20px] font-semibold text-fg">{t("about.data.title")}</h3>
            <p className="mt-1.5 max-w-2xl text-[14px] text-fg-muted">{t("about.data.sub")}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DataRow cls="source" term={t("about.data.source")} desc={t("about.data.sourceD")} />
              <DataRow cls="calculated" term={t("about.data.calculated")} desc={t("about.data.calculatedD")} />
              <DataRow cls="estimated" term={t("about.data.estimated")} desc={t("about.data.estimatedD")} />
              <DataRow cls="ai" term={t("about.data.ai")} desc={t("about.data.aiD")} />
            </dl>
          </div>
        </div>
      </section>

      {/* ── 6. Meet the team ────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionHead title={t("about.team.title")} sub={t("about.team.sub")} />
          {TEAM.some(isPlaceholderMember) && (
            <p className="mt-4 inline-block rounded-[var(--radius)] border border-dashed border-[var(--cls-estimated)] bg-[var(--cls-estimated-soft)] px-3 py-2 font-mono text-[11.5px] text-[var(--cls-estimated)]">
              {t("about.team.note")}
            </p>
          )}
          <TeamGrid members={TEAM} labels={{ linkedin: t("about.team.linkedin"), github: t("about.team.github") }} />
        </div>
      </section>

      {/* ── 7. Built together ───────────────────────────────────────────── */}
      <section className="border-t border-border bg-elevated py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="display text-[clamp(1.9rem,4vw,2.9rem)] text-fg">{t("about.built.title")}</h2>
            <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-fg-secondary">{t("about.built.concept")}</p>
          </div>
          <div className="space-y-5">
            <div className="rounded-[var(--radius-lg)] border border-border bg-bg p-5">
              <p className="micro mb-3">{t("about.built.count")}</p>
              <p className="text-[17px] font-semibold leading-snug text-fg">{t("about.built.why")}</p>
            </div>
            <Draft label="[PLACEHOLDER: TEAM DESCRIPTION]" />
          </div>
        </div>
      </section>

      {/* ── 8. Our vision ───────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <p className="micro">{t("about.vision.title")}</p>
          <h2 className="display mt-3 max-w-2xl text-[clamp(1.9rem,4vw,2.9rem)] text-fg">{t("about.vision.heading")}</h2>
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <div className="space-y-5 text-[15.5px] leading-relaxed text-fg-secondary">
              <p>{t("about.vision.body")}</p>
              <p>{t("about.vision.region")}</p>
              {/* Pillar names per Kuwait's Ministry of Foreign Affairs,
                  mofa.gov.kw/en/pages/kuwait-vision-2035, and the UN ESCWA
                  development-planning portal, andp.unescwa.org/plans/1166.
                  No targets or percentages are quoted: the brief allows only
                  verified figures, and those live in secondary sources. */}
              <div className="border-s-2 border-[color:var(--sun)] ps-4">
                <p className="micro mb-1.5">{t("about.vision.kw2035Label")}</p>
                <p>{t("about.vision.kw2035")}</p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-5">
                <p className="micro mb-3">{t("about.vision.statement")}</p>
                <p className="text-[17px] font-semibold leading-snug text-fg">{t("about.vision.lead")}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-fg-secondary">{t("about.vision.para")}</p>
                <p className="mt-3 text-[15px] font-semibold leading-snug text-fg">{t("about.vision.close")}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-5">
                <p className="micro mb-3">{t("about.vision.mission")}</p>
                <p className="text-[15px] leading-relaxed text-fg">{t("about.mission.body")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Our principles ───────────────────────────────────────────── */}
      <section className="border-t border-border bg-elevated py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionHead title={t("about.principles.title")} sub={t("about.principles.sub")} />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PrincipleCard icon={<Database className="size-5" aria-hidden="true" />} name={t("about.principle.data")} desc={t("about.principle.dataD")} />
            <PrincipleCard icon={<Tags className="size-5" aria-hidden="true" />} name={t("about.principle.transparent")} desc={t("about.principle.transparentD")} />
            <PrincipleCard icon={<Network className="size-5" aria-hidden="true" />} name={t("about.principle.connected")} desc={t("about.principle.connectedD")} />
            <PrincipleCard icon={<Languages className="size-5" aria-hidden="true" />} name={t("about.principle.accessible")} desc={t("about.principle.accessibleD")} />
          </div>
        </div>
      </section>

      {/* ── 10. The future of Solink ────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionHead title={t("about.future.title")} sub={t("about.future.sub")} />
          <ul className="mt-10 flex flex-wrap gap-2">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const).map((n) => (
              <li key={n} className="rounded-full border border-dashed border-border-strong px-3.5 py-1.5 text-[13.5px] text-fg-secondary">
                {t(`about.future.${n}` as DictKey)}
              </li>
            ))}
          </ul>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h3 className="text-[20px] font-semibold text-fg">{t("about.future.dataTitle")}</h3>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">{t("about.future.dataBody")}</p>
            </div>
            <div>
              <p className="micro">{t("about.future.expansion")}</p>
              <ol className="mt-4 flex flex-wrap items-center gap-3">
                <li className="rounded-full bg-brand px-4 py-2 text-[14px] font-medium text-brand-fg">{t("about.future.kw")}</li>
                <ArrowRight className="size-4 text-fg-muted rtl:rotate-180" aria-hidden="true" />
                <li className="rounded-full border border-[color:var(--brand)] px-4 py-2 text-[14px] font-medium text-[color:var(--brand-strong)]">{t("about.future.gcc")}</li>
                <ArrowRight className="size-4 text-fg-muted rtl:rotate-180" aria-hidden="true" />
                <li className="rounded-full border border-dashed border-border-strong px-4 py-2 text-[14px] text-fg-secondary">{t("about.future.beyond")}</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. Call to action ──────────────────────────────────────────── */}
      <section className="border-t border-border bg-elevated py-24">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
          <h2 className="display text-[clamp(1.9rem,4.4vw,3rem)] text-fg">{t("about.cta.title")}</h2>
          <p className="mt-4 text-[16px] text-fg-secondary">{t("about.cta.sub")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/profile" className="press inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-[15px] font-medium text-brand-fg hover:bg-brand-hover">
              {t("about.cta.primary")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link href="/marketplace" className="press inline-flex h-12 items-center rounded-full border border-border-strong px-6 text-[15px] font-medium text-fg hover:bg-inset">
              {t("about.cta.secondary")}
            </Link>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h2 className="display max-w-2xl text-[clamp(1.9rem,4vw,2.9rem)] text-fg">{title}</h2>
      <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-fg-secondary">{sub}</p>
    </>
  );
}

/** An undecided piece of copy, in the same dashed style the product uses for undecided values. */
function Draft({ label }: { label: string }) {
  return (
    <p className="rounded-[var(--radius)] border border-dashed border-[var(--cls-estimated)] bg-[var(--cls-estimated-soft)] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-[var(--cls-estimated)]">
      {label}
    </p>
  );
}

function EcoCard({ icon, name, role, desc }: { icon: React.ReactNode; name: string; role: string; desc: string }) {
  return (
    <div className="press rounded-[var(--radius-lg)] border border-border bg-elevated p-5 hover:border-border-strong">
      <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-[color:var(--brand-strong)]">{icon}</span>
      <p className="micro mt-4">{role}</p>
      <h3 className="mt-1 text-[15.5px] font-semibold text-fg">{name}</h3>
      <p className="mt-2 text-[13.5px] leading-snug text-fg-muted">{desc}</p>
    </div>
  );
}

function FlowRow({ service, produces, last = false }: { service: string; produces: string; last?: boolean }) {
  return (
    <li className="relative">
      <span aria-hidden="true" className="absolute -start-[calc(1.5rem+4.5px)] top-3 size-2 rounded-full bg-[color:var(--sun)]" />
      <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)]">
        <span className={`rounded-[var(--radius)] px-3 py-2 text-[14px] font-medium ${last ? "bg-brand text-brand-fg" : "border border-border bg-elevated text-fg"}`}>
          {service}
        </span>
        <ArrowDown className="size-4 text-fg-muted sm:hidden" aria-hidden="true" />
        <ArrowRight className="hidden size-4 text-fg-muted sm:block rtl:rotate-180" aria-hidden="true" />
        <span className="text-[14px] text-fg-secondary">{produces}</span>
      </div>
    </li>
  );
}

function DataRow({ cls, term, desc }: { cls: "source" | "calculated" | "estimated" | "ai"; term: string; desc: string }) {
  return (
    <div className="border-t border-border pt-3">
      <dt className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-fg">
        <DataBadge cls={cls} compact />
        {term}
      </dt>
      <dd className="mt-1.5 text-[13.5px] leading-snug text-fg-muted">{desc}</dd>
    </div>
  );
}

function PrincipleCard({ icon, name, desc }: { icon: React.ReactNode; name: string; desc: string }) {
  return (
    <div className="press rounded-[var(--radius-lg)] border border-border bg-bg p-5 hover:border-border-strong">
      <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-[color:var(--brand-strong)]">{icon}</span>
      <h3 className="mt-4 text-[15.5px] font-semibold text-fg">{name}</h3>
      <p className="mt-1.5 text-[13.5px] leading-snug text-fg-muted">{desc}</p>
    </div>
  );
}

/** Grid that follows the head-count: one centred, two paired, three in a row, more as a grid. */
function TeamGrid({ members, labels }: { members: TeamMember[]; labels: { linkedin: string; github: string } }) {
  const n = members.length;
  const cols =
    n === 1
      ? "max-w-sm mx-auto"
      : n === 2
        ? "sm:grid-cols-2 max-w-3xl mx-auto"
        : n === 3
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : n === 4
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  return (
    <ul className={`mt-10 grid gap-5 ${cols}`}>
      {members.map((m, i) => (
        <li key={`${m.name}-${i}`}>
          <TeamCard m={m} labels={labels} />
        </li>
      ))}
    </ul>
  );
}

function TeamCard({ m, labels }: { m: TeamMember; labels: { linkedin: string; github: string } }) {
  // Each field is judged on its own, so a real name can sit above a role that
  // has not been supplied yet without either one borrowing the other's style.
  const ph = "font-mono text-[11.5px] text-[var(--cls-estimated)]";
  const isUrl = (v: string | null): v is string => !!v && /^https?:\/\//.test(v);
  return (
    <article className="press group h-full rounded-[var(--radius-lg)] border border-border bg-elevated p-4 hover:border-border-strong">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius)] bg-sunken">
        {m.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.photo} alt={isPlaceholderText(m.name) ? "" : m.name} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center border border-dashed border-border-strong font-mono text-[11.5px] text-fg-muted">
            [TEAM MEMBER PHOTO]
          </div>
        )}
        <span aria-hidden="true" className="absolute end-3 top-3 size-2 rounded-full bg-[color:var(--sun)]" />
      </div>
      <h3 className={`mt-4 ${isPlaceholderText(m.name) ? ph : "text-[16px] font-semibold text-fg"}`}>{m.name}</h3>
      <p className={`mt-0.5 ${isPlaceholderText(m.role) ? ph : "micro"}`}>{m.role}</p>
      <p className={`mt-2 leading-snug ${isPlaceholderText(m.bio) ? ph : "text-[13.5px] text-fg-muted"}`}>{m.bio}</p>
      {(isUrl(m.linkedin) || isUrl(m.github)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {isUrl(m.linkedin) && <SocialPill href={m.linkedin} label={labels.linkedin} name={m.name} />}
          {isUrl(m.github) && <SocialPill href={m.github} label={labels.github} name={m.name} />}
        </div>
      )}
    </article>
  );
}

function SocialPill({ href, label, name }: { href: string; label: string; name: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`${name}: ${label}`}
      className="press inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-medium text-fg-secondary hover:border-border-strong hover:text-fg"
    >
      {label}
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

/**
 * The hero object: a module in plan view, the way the logo mark draws it, with
 * four sources hung off it on hairlines. Solar + data + AI, one platform.
 */
function ConnectedVisual({ labels }: { labels: { location: string; potential: string; weather: string; ai: string; center: string } }) {
  return (
    <svg viewBox="0 0 460 400" className="w-full" role="img" aria-label={`${labels.center}: ${labels.location}, ${labels.potential}, ${labels.weather}, ${labels.ai}`}>
      {/* module */}
      <g transform="translate(160 100)">
        <rect x="0" y="0" width="140" height="200" rx="4" fill="var(--brand)" />
        <rect x="6" y="6" width="128" height="188" rx="2" fill="none" stroke="rgba(255,255,255,.25)" />
        {Array.from({ length: 3 }).map((_, c) =>
          Array.from({ length: 6 }).map((_, r) => (
            <rect key={`${c}-${r}`} x={10 + c * 41} y={10 + r * 30.5} width="38" height="27.5" rx="1" fill="rgba(255,255,255,.07)" />
          )),
        )}
        {[29, 70, 111].map((x) => (
          <line key={x} x1={x} y1="8" x2={x} y2="192" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
        ))}
        <rect x="10" y="10" width="38" height="27.5" rx="1" fill="var(--sun)" />
      </g>

      {/* leaders + nodes */}
      <Leader x1="160" y1="140" x2="70" y2="80" label={labels.location} lx="70" ly="66" anchor="middle" />
      <Leader x1="300" y1="140" x2="390" y2="80" label={labels.potential} lx="390" ly="66" anchor="middle" />
      <Leader x1="160" y1="270" x2="70" y2="330" label={labels.weather} lx="70" ly="356" anchor="middle" />
      <Leader x1="300" y1="270" x2="390" y2="330" label={labels.ai} lx="390" ly="356" anchor="middle" />

      <text x="230" y="330" textAnchor="middle" className="micro" fill="var(--fg-muted)" style={{ fontSize: 10, letterSpacing: ".14em", fontFamily: "var(--font-mono-jet), monospace" }}>
        {labels.center.toUpperCase()}
      </text>
    </svg>
  );
}

function Leader({ x1, y1, x2, y2, label, lx, ly, anchor }: { x1: string; y1: string; x2: string; y2: string; label: string; lx: string; ly: string; anchor: "start" | "middle" | "end" }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-strong)" strokeWidth="1" />
      <circle cx={x2} cy={y2} r="3.5" fill="var(--sun)" />
      <text x={lx} y={ly} textAnchor={anchor} fill="var(--fg-secondary)" style={{ fontSize: 11, letterSpacing: ".12em", fontFamily: "var(--font-mono-jet), monospace", textTransform: "uppercase" }}>
        {label}
      </text>
    </g>
  );
}
