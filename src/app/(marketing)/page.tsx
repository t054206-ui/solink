import Link from "next/link";
import { ArrowRight, Sun, Calculator, GitCompare, PencilRuler, ShoppingCart, Wrench, Activity, FileText, TrendingUp, Bot, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QUICK_START } from "@/lib/navigation";
import { DataBadge } from "@/components/ui/DataBadge";

const JOURNEY: { step: string; title: string; text: string; icon: LucideIcon; href: string }[] = [
  { step: "Analyze", title: "Solar Profile & Potential", text: "Describe your home and roof. Solink shows what your roof could do — and tells you exactly which data is still missing.", icon: Sun, href: "/profile" },
  { step: "Calculate", title: "Savings Calculator", text: "Transparent estimates with every assumption visible. No hidden tariffs or invented figures.", icon: Calculator, href: "/calculator" },
  { step: "Compare", title: "Marketplace & Comparison", text: "Side-by-side panel specs with source tracking and verification status on every field.", icon: GitCompare, href: "/compare" },
  { step: "Design", title: "Build-it-yourself Designer", text: "Drag real-size panels onto your roof. Let the AI suggest a placement.", icon: PencilRuler, href: "/designer" },
  { step: "Purchase & Install", title: "Request, schedule, install", text: "Choose a system, request installation, and schedule with a provider.", icon: ShoppingCart, href: "/purchase" },
  { step: "Monitor", title: "Live dashboard & weather intelligence", text: "Production, weather, air quality, cleaning signals and AI alerts — only when real data exists.", icon: Activity, href: "/monitoring" },
  { step: "Maintain", title: "Maintenance & incidents", text: "Book providers, track before/after, keep a permanent incident history.", icon: Wrench, href: "/maintenance" },
  { step: "Report", title: "Monthly reports", text: "Energy, financial, maintenance, environmental and AI observations in one place.", icon: FileText, href: "/reports" },
  { step: "Optimize", title: "Long-term performance", text: "Year-over-year tracking, degradation flags, and replacement planning tied to the marketplace.", icon: TrendingUp, href: "/performance" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 sun-glow" aria-hidden />
        <div className="absolute inset-0 solar-grid" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 text-[12.5px] font-medium text-fg-secondary"><Sparkles className="size-3.5 text-[var(--brand-strong)]" /> Solar platform for Kuwait &amp; the GCC</span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Your entire solar journey, <span className="text-[var(--brand-strong)]">connected.</span></h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fg-secondary">Solink links homeowners, solar products, installers, maintenance providers, system data and one AI Solar Agent into a single ecosystem — from the first roof measurement to the last panel replacement.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/dashboard" size="lg">Open Solink <ArrowRight className="size-4" /></Button>
              <Button href="/guide" size="lg" variant="outline">How Solink works</Button>
            </div>
          </div>
          <ol className="mt-14 flex flex-wrap items-center gap-2 text-[13px] font-medium" aria-label="Quick start roadmap">
            {QUICK_START.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-elevated px-3 py-1.5 text-fg">{s}</span>
                {i < QUICK_START.length - 1 && <ArrowRight className="size-3.5 text-fg-muted" aria-hidden />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Honesty principle */}
      <section className="border-y border-border bg-elevated">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Every number tells you where it came from.</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-fg-secondary">Solink never presents demo data as real, never invents prices or measurements, and never lets the AI guess. Source data, calculations, estimates and AI interpretation are always labeled — so you can trust what you see.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DataBadge cls="source" /><DataBadge cls="calculated" /><DataBadge cls="estimated" /><DataBadge cls="ai" /><DataBadge cls="demo" /><DataBadge cls="unavailable" />
          </div>
        </div>
      </section>

      {/* Journey */}
      <section id="journey" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--brand-strong)]">The journey</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {JOURNEY.map((j, i) => (
            <Link key={j.step} href={j.href} className="group rounded-[var(--radius-lg)] border border-border bg-elevated p-5 shadow-sm transition-colors hover:border-border-strong">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-[10px] bg-brand-soft text-[var(--brand-strong)]"><j.icon className="size-5" /></span>
                <span className="text-[12px] font-semibold text-fg-muted">{String(i + 1).padStart(2, "0")} · {j.step}</span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold">{j.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-secondary">{j.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-fg group-hover:text-[var(--brand-strong)]">Open <ArrowRight className="size-3.5" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-elevated">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Bot className="size-6 text-[var(--brand-strong)]" />
              <h3 className="mt-3 text-lg font-semibold">One AI Solar Agent</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-secondary">Ask “Why was my production low today?” or “Explain this warning.” The agent reads your actual data first and says “I don’t have enough information” when it doesn’t.</p>
            </div>
            <div>
              <ShieldCheck className="size-6 text-[var(--brand-strong)]" />
              <h3 className="mt-3 text-lg font-semibold">Solar System Digital Passport</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-secondary">A permanent, versioned identity for your installation: equipment snapshots, warranties, and the full maintenance, repair, cleaning and replacement history.</p>
            </div>
            <div>
              <TrendingUp className="size-6 text-[var(--brand-strong)]" />
              <h3 className="mt-3 text-lg font-semibold">Built for real data</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-secondary">Ready for verified manufacturer datasets, monitoring hardware, panel-level data, providers and payment — connected later without rebuilding.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Start with your Solar Profile.</h2>
        <p className="mx-auto mt-2 max-w-xl text-fg-secondary">Two minutes about your home and roof is enough to begin the journey.</p>
        <Button href="/profile" size="lg" className="mt-6">Create my Solar Profile <ArrowRight className="size-4" /></Button>
      </section>
    </>
  );
}
