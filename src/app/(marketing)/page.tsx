import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataBadge } from "@/components/ui/DataBadge";
import { Lattice, LatticeStar } from "@/components/brand/Lattice";
import { DATA_CLASS_DESCRIPTION, DATA_CLASS_LABEL, type DataClass } from "@/lib/classification";

export const metadata = {
  description:
    "Solink connects homeowners, solar products, installers, maintenance providers, system data and one AI Solar Agent into a single solar journey for Kuwait and the GCC.",
};

const JOURNEY: { step: string; title: string; text: string; href: string }[] = [
  { step: "Analyze", title: "Your home and your roof", text: "Describe the building, the roof area and what you pay for electricity. Solink tells you which figures it still needs rather than guessing them.", href: "/profile" },
  { step: "Calculate", title: "What solar would actually do", text: "Production, offset, savings and payback, with every assumption on screen and editable.", href: "/calculator" },
  { step: "Compare", title: "Panels side by side", text: "Specifications with their source, their date and their verification status. Fields a manufacturer never published stay empty.", href: "/compare" },
  { step: "Design", title: "Your roof, to scale", text: "Place real panels at their real dimensions, work around the water tank, and see capacity update as you go.", href: "/designer" },
  { step: "Purchase", title: "Choose and request", text: "Review the system and its costs, then ask an installer for the work.", href: "/purchase" },
  { step: "Install", title: "Scheduled and recorded", text: "The installation becomes a Solar Passport: equipment, warranties and history, frozen at the specification that was actually fitted.", href: "/passport" },
  { step: "Monitor", title: "Production, weather, air", text: "Output against conditions, with dust and humidity in view. When hardware is not connected, Solink says so instead of animating a number.", href: "/monitoring" },
  { step: "Maintain", title: "Cleaning and repairs", text: "Book a provider, keep before and after, and build a maintenance record that stays with the system.", href: "/maintenance" },
  { step: "Report", title: "Every month, in writing", text: "Energy, money, maintenance and environment, with the gaps named.", href: "/reports" },
  { step: "Optimize", title: "Year over year", text: "Long-term yield, degradation against the warranty, and when replacement is worth considering.", href: "/performance" },
];

const LABELS: DataClass[] = ["source", "calculated", "estimated", "ai", "user", "demo", "unavailable"];

const REFUSALS = [
  { no: "It will not invent a tariff.", yes: "Savings stay blank until you supply the real price per kWh, with its source." },
  { no: "It will not animate a live reading.", yes: "Without monitoring hardware the dashboard says live monitoring is not connected." },
  { no: "It will not fill an empty specification.", yes: "A field the manufacturer never published is marked unavailable, not estimated into existence." },
  { no: "It will not let the AI guess.", yes: "The agent reads your own records first, and says when it does not have enough to answer." },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="sun-screen relative overflow-hidden border-b border-[var(--brass)]">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
          <h1 className="max-w-4xl text-[40px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[64px]">
            Solar, from the first roof measurement to the last panel replacement.
          </h1>
          <p className="mt-7 max-w-xl text-[17px] leading-[1.65] text-fg-secondary">
            Solink joins homeowners, products, installers, maintenance providers, system data and one
            AI Solar Agent into a single record that follows your system for its whole life.
            Built for Kuwait and the GCC.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href="/dashboard" size="lg">
              Open Solink <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button href="/guide" size="lg" variant="outline">
              Read the guide
            </Button>
          </div>
        </div>
      </section>

      {/* ── Provenance: the thing that makes Solink different ────────────── */}
      <section className="border-b border-[var(--brass)] bg-elevated">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
            <div>
              <h2 className="text-[30px] leading-[1.1] tracking-[-0.025em] sm:text-[36px]">
                Every number says where it came from.
              </h2>
              <p className="mt-5 text-[15px] leading-[1.7] text-fg-secondary">
                A solar quote is easy to dress up. Solink takes the opposite position: each figure
                carries a stamp, and a figure with nothing behind it is shown as missing rather than
                filled in. You can always tell a measurement from an assumption.
              </p>
              <Link
                href="/guide#labels"
                className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--brand-strong)] underline-offset-4 hover:underline"
              >
                How to read the labels <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>

            <dl className="divide-y divide-[var(--brass)] border-y border-[var(--brass)]">
              {LABELS.map((cls) => (
                <div key={cls} className="grid gap-2 py-3.5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6 sm:py-4">
                  <dt className="flex items-start">
                    <DataBadge cls={cls} />
                  </dt>
                  <dd className="text-[13.5px] leading-[1.6] text-fg-secondary">
                    <span className="sr-only">{DATA_CLASS_LABEL[cls]}. </span>
                    {DATA_CLASS_DESCRIPTION[cls]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── The journey, as an index rather than a feature grid ──────────── */}
      <section id="journey" className="border-b border-[var(--brass)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-[30px] leading-[1.1] tracking-[-0.025em] sm:text-[36px]">
              Ten stages, one continuous record.
            </h2>
            <p className="max-w-sm text-[14px] leading-relaxed text-fg-muted">
              Nothing restarts between stages. What you measure in the first week is still attached to
              the system in year twelve.
            </p>
          </div>

          <ol className="mt-10 border-t border-[var(--brass)]">
            {JOURNEY.map((j, i) => (
              <li key={j.step}>
                <Link
                  href={j.href}
                  className="group grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5 border-b border-[var(--brass)] px-2 py-5 transition-colors hover:bg-brand-soft sm:grid-cols-[3.5rem_11rem_minmax(0,1fr)_1.5rem] sm:gap-x-8 sm:py-6"
                >
                  <span className="font-mono text-[13px] text-fg-muted tabular">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg sm:text-[18px]">
                    {j.step}
                  </span>
                  <span className="col-start-2 sm:col-start-3">
                    <span className="block text-[14.5px] font-medium text-fg">{j.title}</span>
                    <span className="mt-1 block max-w-2xl text-[13.5px] leading-[1.6] text-fg-secondary">
                      {j.text}
                    </span>
                  </span>
                  <ArrowRight
                    className="hidden size-4 self-center text-fg-muted transition-colors group-hover:text-[var(--brand-strong)] sm:block"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── What it refuses to do ────────────────────────────────────────── */}
      <section id="features" className="ink-light relative overflow-hidden border-b border-[var(--brass)] bg-[var(--indigo)] text-[#f6f1e8]">
        <Lattice size={88} />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f6f1e8] sm:text-[36px]">
              Four things Solink will not do.
            </h2>
            <p className="mt-5 text-[15px] leading-[1.7] text-[#c6bed6]">
              These are constraints in the code, not promises in a brochure. They are the reason the
              platform is worth trusting with a twenty-five year asset.
            </p>
          </div>

          <ul className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {REFUSALS.map((r) => (
              <li key={r.no} className="border-t border-[var(--brass)] pt-5">
                <p className="text-[16px] font-semibold leading-snug text-[#f6f1e8]">{r.no}</p>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[#c6bed6]">{r.yes}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-[30px] leading-[1.1] tracking-[-0.025em] sm:text-[36px]">
              Start with the roof.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.7] text-fg-secondary">
              A few minutes about your home and your electricity use is enough to see what your roof
              could carry, and exactly which numbers are still missing.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/profile" size="lg">
                Create your solar profile <ArrowRight className="size-4" aria-hidden />
              </Button>
              <Button href="/marketplace" size="lg" variant="outline">
                Browse the marketplace
              </Button>
            </div>
          </div>
          <LatticeStar className="hidden size-40 shrink-0 sm:block" />
        </div>
      </section>
    </>
  );
}
