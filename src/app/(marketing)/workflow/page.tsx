import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight, CloudSun, Crosshair, Database, Home, LayoutDashboard, MapPin, ClipboardList,
  SlidersHorizontal, User,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ANALYSIS_ENGINE, SOLINK_ENVIRONMENT_THRESHOLDS as T } from "@/lib/solar/analysisEngine";

/**
 * How a site analysis works: the same pipeline `/analysis` runs, drawn out.
 *
 * This page explains; it does not analyse. It calls no provider and holds no
 * data of its own. Everything factual on it either names a step in
 * `src/app/api/analysis/site/route.ts` or is imported straight from
 * `analysisEngine.ts`, so the thresholds below cannot drift away from the ones
 * the engine actually applies: change a band in the code and this page changes
 * with it.
 */

export const metadata: Metadata = {
  title: "How a site analysis works",
  description:
    "The Solar Site Analysis pipeline, step by step: Google Maps resolves the address, WeatherAPI reports the conditions there, Solink's rules classify them, and the result is saved to your account. Google Solar is optional and no AI model is involved.",
};

interface Step {
  n: string;
  name: string;
  sub: string;
  icon: LucideIcon;
  /** Label, then what the step receives or produces. Both are optional. */
  input?: string[];
  output?: string[];
  rules?: string[];
  note: string;
}

const STEPS: Step[] = [
  {
    n: "01",
    name: "You",
    sub: "Enter an address",
    icon: User,
    input: ["A street address, block and area, or a building name", "Between 3 and 300 characters"],
    output: ["The address, sent to Solink's server"],
    note: "You have to be signed in, and the page limits how often a run can start. Nothing is sent anywhere else.",
  },
  {
    n: "02",
    name: "Google Maps",
    sub: "Turn the address into a place",
    icon: MapPin,
    input: ["The address you typed"],
    output: ["Latitude and longitude", "The address Google resolved it to", "How precise that point is, and whether it was a partial match"],
    note: "The only one of the three services that can stop the run: without coordinates there is nothing to ask the others about. When Google lands on a nearby street rather than your building, the result says so instead of claiming the building was found.",
  },
  {
    n: "03",
    name: "Location",
    sub: "Latitude and longitude",
    icon: Crosshair,
    output: ["Coordinates, used for the weather call", "The requested address, the resolved address and the precision, carried through to the result"],
    note: "Every later step works from these coordinates, never from the text you typed.",
  },
  {
    n: "04",
    name: "WeatherAPI",
    sub: "Read the conditions there",
    icon: CloudSun,
    input: ["Latitude and longitude"],
    output: [
      "Temperature, humidity, cloud cover, wind and the condition",
      "PM2.5, PM10 and the US EPA air-quality index",
      "A three-day forecast",
    ],
    note: "Called fresh on every run. No reading is stored in the site and reused, and if the service returns nothing the conditions are marked unavailable rather than filled in.",
  },
  {
    n: "05",
    name: "Solink analysis engine",
    sub: "Apply the rules below",
    icon: SlidersHorizontal,
    input: ["The readings above, and the resolved location"],
    rules: ["Solink's environmental thresholds", "One comparison per factor, recorded with the reading and the band it fell in"],
    output: [
      "Heat exposure, dust and soiling risk, air quality, wind exposure",
      "Forecast alerts, maintenance advice and an overall status",
    ],
    note: `Deterministic: no network call, no key and no AI model. The same readings always produce the same analysis. ${ANALYSIS_ENGINE.label} ${ANALYSIS_ENGINE.version}.`,
  },
  {
    n: "06",
    name: "The result",
    sub: "Heat, dust and soiling, air quality, wind, forecast",
    icon: ClipboardList,
    output: [
      "A level for each factor: low, moderate, high or extreme",
      "An overall status: low, moderate, high, or attention required",
      "Maintenance advice drawn from those conditions",
    ],
    note: "Each level names the reading it came from and the threshold applied, so you can check it. Nothing here says a panel is dirty, damaged or underperforming: no equipment is measured anywhere in this chain.",
  },
  {
    n: "07",
    name: "Saved to your account",
    sub: "Stored in Solink's database",
    icon: Database,
    input: ["The completed analysis"],
    output: ["One record, owned by you, holding what the providers returned and what the rules concluded"],
    note: "Only you can read it. Runs that failed are kept too, with the step they stopped at, because a run that went wrong is still something that happened.",
  },
  {
    n: "08",
    name: "Your dashboard",
    sub: "See the result on Solar Potential",
    icon: LayoutDashboard,
    output: [
      "The overall status and every factor",
      "Every reading the providers returned, and anything they did not",
      "Your last completed analysis, restored when you come back",
    ],
    note: "Refreshing the page or leaving and returning does not lose it.",
  },
];

/** Bands come from the engine itself, so this table is the engine's table. */
const BANDS: { factor: string; unit: string; low: string; moderate: string; high: string; extreme: string }[] = [
  {
    factor: "Heat exposure",
    unit: "current air temperature, °C",
    low: `under ${T.heatC.moderate}`,
    moderate: `${T.heatC.moderate} to ${T.heatC.high}`,
    high: `${T.heatC.high} to ${T.heatC.extreme}`,
    extreme: `${T.heatC.extreme} and above`,
  },
  {
    factor: "Dust and soiling",
    unit: "PM10, µg/m³",
    low: `under ${T.pm10.moderate}`,
    moderate: `${T.pm10.moderate} to ${T.pm10.high}`,
    high: `${T.pm10.high} to ${T.pm10.extreme}`,
    extreme: `${T.pm10.extreme} and above`,
  },
  {
    factor: "Air quality",
    unit: "US EPA index, from WeatherAPI",
    low: "1",
    moderate: "2",
    high: "3 to 4",
    extreme: "5 to 6",
  },
  {
    factor: "Wind exposure",
    unit: "km/h",
    low: `under ${T.windKph.moderate}`,
    moderate: `${T.windKph.moderate} to ${T.windKph.high}`,
    high: `${T.windKph.high} to ${T.windKph.extreme}`,
    extreme: `${T.windKph.extreme} and above`,
  },
];

function Lines({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="micro">{label}</div>
      <ul className="mt-1 space-y-1">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-[13.5px] leading-relaxed text-fg-secondary">
            <span aria-hidden="true" className="text-fg-muted">·</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="sun-screen relative overflow-hidden border-b border-border">
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <h1 className="max-w-3xl text-[36px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[56px]">
            How a site analysis works
          </h1>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-fg-secondary">
            Solar Potential can look up a specific address and tell you what the conditions there mean for panels:
            the heat they would work in, the dust that would settle on them, the air and the wind. This page shows
            what happens between typing the address and seeing the answer. Two live services, one set of
            written-down rules, one saved record.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/analysis" size="lg">
              Try Site Analysis <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button href="/guide#analyze-your-home" size="lg" variant="outline">
              User Guide
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            <Badge tone="brand">Google Maps · required</Badge>
            <Badge tone="brand">WeatherAPI · required</Badge>
            <Badge tone="warn">Google Solar · optional</Badge>
            <Badge tone="neutral">No AI model in this chain</Badge>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {/* ───────────── The chain ───────────── */}
        <section aria-labelledby="chain">
          <h2 id="chain" className="text-2xl font-semibold tracking-tight sm:text-3xl">The chain</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">
            Each step feeds the next with real values. Nothing on the way is invented or filled in: where a service
            returns no value, it stays unavailable rather than becoming a zero.
          </p>

          <ol className="mt-6 space-y-0">
            {STEPS.map((s, i) => (
              <li key={s.n}>
                <div className="rounded-[var(--radius-lg)] border border-border bg-elevated p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <span className="figure shrink-0 pt-1 text-[12px] text-fg-muted">{s.n}</span>
                    <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-[var(--brand-strong)]">
                      <s.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-semibold text-fg">{s.name}</h3>
                      <p className="text-[14px] text-fg-secondary">{s.sub}</p>

                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        {s.input && <Lines label="In" items={s.input} />}
                        {s.rules && <Lines label="Rules" items={s.rules} />}
                        {s.output && <Lines label="Out" items={s.output} />}
                      </div>

                      <p className="mt-3 border-t border-border/70 pt-3 text-[12.5px] leading-relaxed text-fg-muted">
                        {s.note}
                      </p>
                    </div>
                  </div>
                </div>

                {/* The optional branch hangs off step 03 and never interrupts the chain. */}
                {s.n === "03" && (
                  <div className="ms-6 border-s border-dashed border-border-strong ps-5 pt-4">
                    <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-inset p-5">
                      <div className="flex items-start gap-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-sunken text-fg-secondary">
                          <Home className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-fg">Google Solar</h3>
                            <Badge tone="warn">Optional</Badge>
                          </div>
                          <p className="text-[14px] text-fg-secondary">Roof measurements, when the service is connected</p>
                          <p className="mt-3 text-[13.5px] leading-relaxed text-fg-secondary">
                            When it is not connected, roof measurements are unavailable and the analysis carries on to
                            the weather step and completes as normal. Roof area, pitch, orientation, panel count and
                            annual production stay unavailable. A measurement nobody took is not a measurement of
                            zero, so the page says “Unavailable” rather than 0 m² or 0 kWh.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {i < STEPS.length - 1 && (
                  <div className="ms-6 h-6 border-s-2 border-border-strong" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ───────────── Thresholds ───────────── */}
        <section aria-labelledby="bands" className="mt-14 sm:mt-20">
          <h2 id="bands" className="text-2xl font-semibold tracking-tight sm:text-3xl">The thresholds</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">
            Solink’s own operating bands, chosen for Kuwait’s climate and kept in one place in the code. They are
            Solink’s, not published standards, and the analysis says so wherever it uses them. Air quality is the one
            exception: that is WeatherAPI’s US EPA index, reported as the provider gives it.
          </p>

          <div className="mt-6 overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-elevated">
            <table className="w-full min-w-[34rem] text-[13.5px]">
              <caption className="px-4 pt-4 text-start text-[12.5px] text-fg-muted">
                Each factor falls in exactly one band. A reading the provider did not return gives “unavailable”.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="micro px-4 py-3 text-start">Factor</th>
                  <th scope="col" className="micro px-4 py-3 text-start">Low</th>
                  <th scope="col" className="micro px-4 py-3 text-start">Moderate</th>
                  <th scope="col" className="micro px-4 py-3 text-start">High</th>
                  <th scope="col" className="micro px-4 py-3 text-start">Extreme</th>
                </tr>
              </thead>
              <tbody>
                {BANDS.map((b) => (
                  <tr key={b.factor} className="border-t border-border">
                    <th scope="row" className="px-4 py-3 text-start font-medium text-fg">
                      {b.factor}
                      <span className="figure block text-[11.5px] font-normal text-fg-muted">{b.unit}</span>
                    </th>
                    <td className="figure px-4 py-3 text-fg-secondary">{b.low}</td>
                    <td className="figure px-4 py-3 text-fg-secondary">{b.moderate}</td>
                    <td className="figure px-4 py-3 text-fg-secondary">{b.high}</td>
                    <td className="figure px-4 py-3 text-fg-secondary">{b.extreme}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-inset p-5">
            <h3 className="text-[14px] font-semibold">Two rules read the weather description, not a number</h3>
            <ul className="mt-2 space-y-1.5 text-[13.5px] leading-relaxed text-fg-secondary">
              <li>
                When the current condition names dust, sand or a sandstorm, soiling risk is raised to at least high,
                and to extreme when the condition is described as severe.
              </li>
              <li>
                Within the forecast days the provider returned, a dust or sandstorm day, a daytime high of{" "}
                {T.forecast.heatC} °C or more, or wind reaching {T.forecast.windKph} km/h each raise an alert naming
                that date. Nothing is claimed beyond those days.
              </li>
            </ul>
          </div>
        </section>

        {/* ───────────── What it is not ───────────── */}
        <section aria-labelledby="limits" className="mt-14 sm:mt-20">
          <h2 id="limits" className="text-2xl font-semibold tracking-tight sm:text-3xl">What it does not do</h2>
          <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-fg-secondary">
            <li>It does not measure your roof. Area, pitch, orientation, panel count and annual production come from
              a roof survey, and this chain does not carry one out.</li>
            <li>It does not measure your system. Nothing in the result describes the condition or output of any
              installed equipment.</li>
            <li>It does not use an AI model. The conclusions come from the thresholds above, applied to the readings
              above, and can be checked by hand.</li>
            <li>It is a short window of weather and a few forecast days, not a climate record for the site.</li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/analysis" size="lg">
              Try Site Analysis <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
