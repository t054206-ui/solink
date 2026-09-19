import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Bot, Info, Tags, TriangleAlert } from "lucide-react";
import { QUICK_START } from "@/lib/navigation";
import { DATA_CLASS_DESCRIPTION, type DataClass } from "@/lib/classification";
import { DataBadge } from "@/components/ui/DataBadge";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { InfoTip } from "@/components/help/InfoTip";
import { Button } from "@/components/ui/Button";
import { GuideToc, type TocEntry } from "./_components/GuideToc";
import { SECTIONS } from "./sections";

export const metadata: Metadata = {
  title: "User Guide",
  description:
    "A plain-language guide to using Solink: analyze your home, size and choose a solar system, design it, arrange installation, then monitor, maintain and report on it.",
};

/** Order used in the labels explainer — most trustworthy first. */
const DATA_CLASSES: DataClass[] = ["source", "calculated", "estimated", "user", "ai", "demo", "unavailable"];

/** Where each QUICK_START step is explained in this guide. Same order as QUICK_START. */
const QUICK_START_ANCHORS = [
  "#analyze-your-home",
  "#calculate-your-needs",
  "#choose-your-system",
  "#design-your-system",
  "#purchase-and-installation",
  "#monitor-your-system",
  "#maintenance",
  "#reports",
];

const TOC: TocEntry[] = [
  { href: "#quick-start", label: "Quick start" },
  { href: "#three-layers", label: "Three layers of help" },
  { href: "#labels", label: "How to read Solink’s labels" },
  ...SECTIONS.map((s, i) => ({ href: `#${s.id}`, label: s.title, n: i + 1 })),
];

const HELP_LAYERS = [
  {
    icon: BookOpen,
    name: "This User Guide",
    question: "How does the website work?",
    body: "One page, written for people who are new to solar. It explains what each part of Solink is for, the order to use it in, and. Just as important. What Solink cannot do yet.",
  },
  {
    icon: Info,
    name: "Information icons",
    question: "What does this word mean?",
    body: "A small ⓘ sits next to technical terms throughout the app. Select it and a short definition appears, in the place where the term is used. It explains vocabulary, nothing more.",
  },
  {
    icon: Bot,
    name: "AI Solar Agent",
    question: "What does this mean for my system?",
    body: "A conversation about your own data. Ask why yesterday looked low or what a warning means. It reads what Solink holds about you, and says so when that is not enough to answer. It explains things; it never does them for you.",
  },
];

export default function GuidePage() {
  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="sun-screen relative overflow-hidden border-b border-border">
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <h1 className="max-w-3xl text-[36px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[56px]">
            How to use Solink
          </h1>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-fg-secondary">
            Solink takes you from “I am thinking about solar” to looking after panels that are already on your roof.
            This guide walks through that path one step at a time, in everyday language. You do not need any technical
            background, and you do not need to read it in order. Jump to the part you are on. Where something in
            Solink is not finished, this guide says so plainly instead of pretending otherwise.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="#quick-start" size="lg">
              Start with the roadmap <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button href="/dashboard" size="lg" variant="outline">
              Open Solink
            </Button>
          </div>
        </div>
      </section>

      {/* ───────────── Body: TOC + content ───────────── */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <GuideToc entries={TOC} />

          <div className="min-w-0">
            {/* ── Quick start ── */}
            <section id="quick-start" className="scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Quick start: the roadmap</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">
                This is the whole journey, in order. Most people spend days or weeks between steps, and that is fine —
                Solink keeps your place. Select a step to read about it.
              </p>
              <ol className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {QUICK_START.map((step, i) => (
                  <li key={step}>
                    <Link
                      href={QUICK_START_ANCHORS[i] ?? "#quick-start"}
                      className="flex h-full items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-elevated p-4 shadow-sm transition-colors hover:border-border-strong hover:bg-inset"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[11.5px] font-semibold text-[var(--brand-strong)]">
                        {i + 1}
                      </span>
                      <span className="min-w-0 text-[14px] font-medium leading-snug text-fg">{step}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>

            {/* ── Three layers of help ── */}
            <section id="three-layers" className="mt-14 scroll-mt-24 sm:mt-20">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Three layers of help</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">
                Help in Solink comes in three separate forms. They answer three different questions, so it is worth
                knowing which one you need.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {HELP_LAYERS.map((l) => (
                  <div key={l.name} className="rounded-[var(--radius-lg)] border border-border bg-elevated p-5 shadow-sm">
                    <span className="grid size-10 place-items-center rounded-[10px] bg-brand-soft text-[var(--brand-strong)]">
                      <l.icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-[15px] font-semibold">{l.name}</h3>
                    <p className="mt-1 text-[13px] font-medium text-[var(--brand-strong)]">{l.question}</p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-fg-secondary">{l.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-inset p-5">
                <h3 className="text-[14px] font-semibold">Try an information icon</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-fg-secondary">
                  This is a real one, the same as the icons inside Solink. Select the ⓘ after a term to see what it
                  means:{" "}
                  <span className="font-medium text-fg">
                    peak sun hours <InfoTip term="peak_sun_hours" label="peak sun hours" />
                  </span>
                  ,{" "}
                  <span className="font-medium text-fg">
                    temperature coefficient <InfoTip term="temperature_coefficient" label="temperature coefficient" />
                  </span>
                  ,{" "}
                  <span className="font-medium text-fg">
                    payback period <InfoTip term="payback_period" label="payback period" />
                  </span>
                  .
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                  They work with a keyboard too: tab to the icon and press Enter. Press Escape to close.
                </p>
              </div>
            </section>

            {/* ── Labels ── */}
            <section id="labels" className="mt-14 scroll-mt-24 sm:mt-20">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How to read Solink’s labels</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">
                Every number in Solink carries a small label saying where it came from. A measurement, a calculation, an
                assumption and a guess by an AI are very different things, and mixing them up is how people end up
                disappointed. Here is what each label means.
              </p>

              <ul className="mt-6 divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] border border-border bg-elevated shadow-sm">
                {DATA_CLASSES.map((cls) => (
                  <li key={cls} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                    <div className="sm:w-52 sm:shrink-0">
                      <DataBadge cls={cls} />
                    </div>
                    <p className="min-w-0 text-[14px] leading-relaxed text-fg-secondary">
                      {DATA_CLASS_DESCRIPTION[cls]}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-[var(--radius-lg)] border border-border bg-inset p-5">
                <div className="flex items-center gap-2">
                  <Tags className="size-4 text-[var(--brand-strong)]" aria-hidden />
                  <h3 className="text-[15px] font-semibold">Values in square brackets</h3>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-fg-secondary">
                  Sometimes you will see something like <Placeholder k="ELECTRICITY_TARIFF" /> where a number should be.
                  That is not an error. It means a decision has not been made yet, and Solink refuses to invent a value
                  in its place. Hover or tap the marker to read what it is waiting for.
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-fg-secondary">
                  Anything depending on that decision stays empty until it is made. That is deliberate: an invented
                  electricity price would produce an invented saving, and you might make a real decision on it.
                </p>
                <PlaceholderNote k="ELECTRICITY_TARIFF" className="mt-4" />
              </div>
            </section>

            {/* ── The 13 numbered sections ── */}
            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="mt-14 scroll-mt-24 sm:mt-20">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-[var(--brand-strong)]">
                    <s.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">
                    Section {i + 1} of {SECTIONS.length}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {i + 1}. {s.title}
                </h2>
                <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-fg">{s.lead}</p>
                {s.body.map((p, bi) => (
                  <p key={`${s.id}-p${bi}`} className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">
                    {p}
                  </p>
                ))}

                <div className="mt-5 flex flex-wrap gap-2">
                  {s.links.map((l) => (
                    <Link
                      key={l.href + l.label}
                      href={l.href}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-border-strong bg-elevated px-3 py-2 text-[13.5px] font-medium text-fg transition-colors hover:bg-inset"
                    >
                      {l.label} <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  ))}
                </div>

                {s.note && (
                  <div className="mt-5 max-w-2xl rounded-[var(--radius-lg)] border border-dashed border-[var(--cls-estimated)]/60 bg-[var(--cls-estimated-soft)]/60 p-4">
                    <div className="flex items-center gap-2">
                      <TriangleAlert className="size-4 text-[var(--cls-estimated)]" aria-hidden />
                      <h3 className="text-[13.5px] font-semibold text-fg">What is not connected yet</h3>
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-fg-secondary">{s.note.text}</p>
                    {s.note.keys && s.note.keys.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {s.note.keys.map((k) => (
                          <Placeholder key={k} k={k} className="max-w-full break-words" />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            ))}

            {/* ── Closing ── */}
            <section className="mt-14 scroll-mt-24 rounded-[var(--radius-lg)] border border-border bg-elevated p-6 shadow-sm sm:mt-20">
              <h2 className="text-xl font-semibold tracking-tight">Still not sure about something?</h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">
                If the question is about a word, use the information icon next to it. If it is about your own home, your
                own roof or your own readings, ask the AI Solar Agent from inside Solink. And if a number is missing,
                read the marker next to it. It will name exactly what Solink is waiting for.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button href="/profile">
                  Create my Solar Profile <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button href="/agent" variant="outline">
                  Ask the AI Solar Agent
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
