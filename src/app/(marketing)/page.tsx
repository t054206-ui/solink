import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataBadge } from "@/components/ui/DataBadge";
import { DATA_CLASS_DESCRIPTION, DATA_CLASS_LABEL, type DataClass } from "@/lib/classification";

export const metadata = {
  description:
    "Solink connects homeowners, solar products, installers, maintenance providers, system data and one AI Solar Agent into a single record for Kuwait and the GCC.",
};

/* Pattern: Real-Time / Operations landing. Hero with status, then indicators,
   then how it works, then the action. Status is labelled live only where a
   current source actually backs it. */

const INDICATORS: { label: string; value: string; note: string; cls: DataClass }[] = [
  { label: "Journey stages", value: "10", note: "Analyze through Optimize, one record", cls: "source" },
  { label: "Pages in the platform", value: "58", note: "Homeowner, provider and admin", cls: "source" },
  { label: "Live hardware feeds", value: "0", note: "No monitoring hardware connected yet", cls: "unavailable" },
  { label: "Figures Solink will invent", value: "0", note: "A missing input stays missing", cls: "source" },
];

const STATUS: [string, string, boolean][] = [
  ["Application", "Running", true],
  ["Database", "Not connected", false],
  ["AI Solar Agent", "Not connected", false],
  ["Weather feed", "Not connected", false],
  ["Monitoring hardware", "Not connected", false],
];

const STAGES: { step: string; title: string; text: string; href: string }[] = [
  { step: "Analyze", title: "Home and roof", text: "Building, roof area and electricity use. Solink names the figures it still needs instead of guessing them.", href: "/profile" },
  { step: "Calculate", title: "What solar would do", text: "Production, offset, savings and payback, with every assumption on screen and editable.", href: "/calculator" },
  { step: "Compare", title: "Panels side by side", text: "Specifications with their source and date. A field the manufacturer never published stays empty.", href: "/compare" },
  { step: "Design", title: "Roof, to scale", text: "Real panels at real dimensions, placed around the water tank, capacity updating as you go.", href: "/designer" },
  { step: "Purchase", title: "Choose and request", text: "Review the system and its costs, then ask an installer for the work.", href: "/purchase" },
  { step: "Install", title: "Recorded permanently", text: "The installation becomes a passport: equipment, warranties and history, frozen at what was fitted.", href: "/passport" },
  { step: "Monitor", title: "Output and conditions", text: "Production against weather and air quality. With no hardware connected, Solink says so.", href: "/monitoring" },
  { step: "Maintain", title: "Cleaning and repairs", text: "Book a provider, keep before and after, and build a record that stays with the system.", href: "/maintenance" },
  { step: "Report", title: "Monthly, in writing", text: "Energy, money, maintenance and environment, with the gaps named rather than filled.", href: "/reports" },
  { step: "Optimize", title: "Year over year", text: "Long-term yield, degradation against the warranty, and when replacement is worth considering.", href: "/performance" },
];

const LABELS: DataClass[] = ["source", "calculated", "estimated", "ai", "user", "demo", "unavailable"];

export default function HomePage() {
  return (
    <>
      {/* ── Hero with status ─────────────────────────────────────────── */}
      <section className="border-b border-border bg-elevated">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
            <div>
              <h1 className="max-w-2xl text-[30px] font-semibold leading-[1.12] tracking-[-0.018em] sm:text-[40px]">
                One record for a solar system, from the first roof measurement to the last panel replacement.
              </h1>
              <p className="mt-5 max-w-xl text-[14px] leading-[1.65] text-fg-secondary">
                Solink connects homeowners, products, installers, maintenance providers and system data,
                with one AI Solar Agent on top. Built for Kuwait and the GCC.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button href="/dashboard" size="lg">
                  Open Solink <ArrowRight className="size-3.5" aria-hidden />
                </Button>
                <Button href="/guide" size="lg" variant="outline">Read the guide</Button>
              </div>
            </div>

            <aside className="rounded-[var(--radius-lg)] border border-border bg-bg">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
                  Platform status
                </span>
                <DataBadge cls="source" compact />
              </div>
              <dl className="divide-y divide-border text-[12.5px]">
                {STATUS.map(([k, v, ok]) => (
                  <div key={k} className="flex items-center justify-between gap-3 px-3 py-2">
                    <dt className="text-fg-secondary">{k}</dt>
                    <dd className={ok ? "font-medium text-good-fg" : "text-fg-muted"}>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-border px-3 py-2 text-[11.5px] leading-snug text-fg-muted">
                Solink reports what is actually wired up, and shows a placeholder everywhere a real value
                is still missing.
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Indicators ───────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-4 py-6 sm:px-6 lg:grid-cols-4">
          {INDICATORS.map((i) => (
            <div key={i.label} className="rounded-[var(--radius-lg)] border border-border bg-elevated p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11.5px] leading-tight text-fg-secondary">{i.label}</span>
                <DataBadge cls={i.cls} compact />
              </div>
              <div className="tabular mt-2 font-mono text-[26px] font-medium leading-none text-fg">{i.value}</div>
              <p className="mt-1.5 text-[11.5px] leading-snug text-fg-muted">{i.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="journey" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-[22px] tracking-[-0.012em] sm:text-[26px]">Ten stages, one continuous record</h2>
            <p className="max-w-sm text-[12.5px] leading-snug text-fg-muted">
              Nothing restarts between stages. What you measure in the first week is still attached to the
              system in year twelve.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-elevated">
            <table className="table-dense min-w-[46rem]">
              <caption className="sr-only">The ten stages of the Solink journey</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-12">#</th>
                  <th scope="col" className="w-32">Stage</th>
                  <th scope="col" className="w-52">What happens</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map((s, i) => (
                  <tr key={s.step}>
                    <td className="font-mono text-[12px] text-fg-muted">{String(i + 1).padStart(2, "0")}</td>
                    <td>
                      <Link
                        href={s.href}
                        className="font-medium text-fg underline-offset-2 hover:text-[var(--brand-strong)] hover:underline"
                      >
                        {s.step}
                      </Link>
                    </td>
                    <td className="text-fg-secondary">{s.title}</td>
                    <td className="py-2 text-[12.5px] leading-snug text-fg-muted">{s.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Provenance ───────────────────────────────────────────────── */}
      <section id="features" className="border-b border-border bg-elevated">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
            <div>
              <h2 className="text-[22px] tracking-[-0.012em] sm:text-[26px]">Every number says where it came from</h2>
              <p className="mt-4 text-[13px] leading-[1.65] text-fg-secondary">
                A solar quote is easy to dress up. Solink takes the opposite position. Each figure carries a
                stamp, and a figure with nothing behind it is shown as missing rather than filled in, so you
                can always tell a measurement from an assumption.
              </p>
              <Link
                href="/guide#labels"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--brand-strong)] underline-offset-4 hover:underline"
              >
                How to read the labels <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>

            <dl className="divide-y divide-border border-y border-border">
              {LABELS.map((cls) => (
                <div key={cls} className="grid gap-1 py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
                  <dt><DataBadge cls={cls} /></dt>
                  <dd className="text-[12.5px] leading-[1.55] text-fg-secondary">
                    <span className="sr-only">{DATA_CLASS_LABEL[cls]}. </span>
                    {DATA_CLASS_DESCRIPTION[cls]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Action ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <h2 className="text-[22px] tracking-[-0.012em] sm:text-[26px]">Start with the roof</h2>
          <p className="mt-3 text-[13px] leading-[1.65] text-fg-secondary">
            A few minutes about your home and your electricity use is enough to see what your roof could
            carry, and exactly which numbers are still missing.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button href="/profile" size="lg">
              Create your solar profile <ArrowRight className="size-3.5" aria-hidden />
            </Button>
            <Button href="/marketplace" size="lg" variant="outline">Browse the marketplace</Button>
          </div>
        </div>
      </section>
    </>
  );
}
