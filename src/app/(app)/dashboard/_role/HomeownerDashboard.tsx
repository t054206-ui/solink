/**
 * The homeowner dashboard, which is also the landlord dashboard — the owner
 * confirmed those are the same person, so a landlord with three buildings uses
 * this screen with the property switcher rather than a separate role.
 *
 * Carried over from the previous build unchanged apart from its name and its
 * imports. Its data handling was never what got rejected: every figure here
 * already runs through Classified, DataBadge and Metric, and the visual change
 * arrives through the design tokens it already uses.
 */
import Link from "next/link";
import { Activity, FileBadge, Wrench, AlertOctagon, FileText, ArrowRight, Sparkles, CalendarClock, SprayCan, Bot, UserRound, SunMedium, LayoutGrid, PencilRuler, ClipboardList } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Metric } from "@/components/ui/Metric";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { EmptyState } from "@/components/ui/States";
import { InfoTip } from "@/components/help/InfoTip";
import { classified, unavailable, type Classified } from "@/lib/classification";
import { getPassport, getProfile, listAlerts, listMaintenance, listProduction, listSystems } from "@/lib/data/repositories";
import { getPlatformSettings, settingsToAssumptions } from "@/lib/data/settings";
import { tariffFor } from "@/lib/solar/tariff";
import { DEMO_BANNER, DEMO_PRODUCTION_BANNER } from "@/lib/demo/data";
import { annualSavings, co2AvoidedKg, formatNumber } from "@/lib/solar/calculations";
import type { MaintenanceCase, SolarPassport, SolarProfile, SolarSystem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { AskSolink } from "../../_operate/components/AskSolink";
import { DailyProductionChart } from "../../_operate/components/DailyProductionChart";
import { MonthlyTotalsChart } from "../../_operate/components/MonthlyTotalsChart";
import { StatusPill } from "../../_operate/components/StatusPill";
import { CurrentConditions } from "../../_operate/components/WeatherSummary";
import { loadWeatherForProfile } from "../../_operate/loadWeather";
import { WEATHER_SOURCE, type WeatherState } from "../../_operate/weather";
import { deriveStatus, inheritCls, lastCleaning, lastDays, monthToDateKwh, monthlyTotals, productionCls, sevenVsThirty, todayKwh, trailingKwh } from "../../_operate/production";
import { JourneyProgress, type JourneyStep } from "../_components/JourneyProgress";
import { OverviewHero } from "../_components/OverviewHero";
import { SystemStage, type FlowNode } from "../_components/SystemStage";

export default async function HomeownerDashboard() {
  const [{ data: systems, mode }, { data: profile }, settings] = await Promise.all([listSystems(), getProfile(), getPlatformSettings()]);
  const system = systems[0] ?? null;
  if (!system) return <Onboarding profile={profile} />;

  const [{ data: production }, { data: alerts }, { data: maintenance }, { data: passport }, weather] = await Promise.all([
    listProduction(system.id, 400), listAlerts(system.id), listMaintenance(system.id), getPassport(system.id), loadWeatherForProfile(profile, 1),
  ]);

  const prodCls = productionCls(production);
  const isDemo = mode === "demo" || system.is_demo;
  const tariff = tariffFor(settings.electricity_tariff_per_kwh, profile?.tariff_category);
  const assumptions = settingsToAssumptions(settings, profile?.tariff_category);

  const today = todayKwh(production);
  const month = monthToDateKwh(production);
  const annual = trailingKwh(production, 365);
  const savings = inheritCls(annualSavings(annual.value, assumptions), prodCls);
  const co2 = inheritCls(co2AvoidedKg(annual.value, assumptions), prodCls);
  const capacityValue = passport?.capacity_kwp ?? system.capacity_kwp;
  const capacity: Classified = capacityValue === null
    ? unavailable("System capacity has not been recorded.")
    : classified(capacityValue, isDemo ? "demo" : "source", passport?.capacity_kwp != null ? "Solar Passport" : "System record");
  const signal = sevenVsThirty(production);
  const derived = deriveStatus(signal, settings, production);
  const cleaning = lastCleaning(maintenance);
  const openCases = maintenance.filter((m) => !["resolved", "closed"].includes(m.status));
  const nextAppointment = nextAppointmentOf(maintenance);
  const unacked = alerts.filter((a) => !a.acknowledged);

  const days30 = lastDays(production, 30);
  const months12 = monthlyTotals(production, 12);

  return (
    <div className="space-y-6">
      <SystemStage eyebrow="Overview" title={`Hello${isDemo ? ", demo homeowner" : ""}`} description={<>Your system <span className="font-medium text-fg">{system.name}</span> at a glance. Every figure says where it comes from.</>}
        actions={[{ href: "/monitoring", label: "Monitoring", icon: <Activity className="size-4" aria-hidden /> }, { href: "/agent", label: "Ask Solink", icon: <Sparkles className="size-4" aria-hidden />, primary: true }]}
        sun={sunNode(weather)} array={arrayNode(capacity, system.panel_count)} home={homeNode(today, system.monitoring_source)}
        live={today.value !== null} idleLabel={system.monitoring_source === null ? "No monitoring connected" : "No reading today"}
        caption="An illustrative rooftop, not your installation." />

      {isDemo && <DemoBanner text={DEMO_BANNER} detail="This dashboard is built from a demo system and a simulated production series so you can see how Solink works." />}

      <section aria-label="Journey progress">
        <JourneyProgress steps={journeySteps(profile, system, passport)} />
      </section>

      {prodCls === "demo" && <DemoBanner text={DEMO_PRODUCTION_BANNER} detail="Today, this month, performance and cleaning status below are computed from that series." />}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key figures">
        <Metric label="Today's production" term="energy_production" data={today} unit="kWh" format={(v) => formatNumber(v, 1)} footnote={today.value === null ? undefined : `Record for ${formatDate(new Date().toISOString())}`} />
        <Metric label="This month" term="kwh" data={month} unit="kWh" format={(v) => formatNumber(v, 0)} footnote={month.notes?.[0]} />
        <Metric label="Estimated savings (annual)" term="payback_period" data={savings} unit={assumptions.currency} format={(v) => formatNumber(v, 0)} footnote={savings.value === null ? (tariff.note ?? <Placeholder k="ELECTRICITY_TARIFF" />) : savings.notes?.[0]} />
        <Metric label="CO₂ reduction (annual)" term="co2_reduction" data={co2} unit="kg" format={(v) => formatNumber(v, 0)} footnote={co2.value === null ? <Placeholder k="GRID_CO2_EMISSION_FACTOR" /> : co2.notes?.[0]} />
        <Metric label="System capacity" term="system_capacity" data={capacity} unit="kWp" format={(v) => formatNumber(v, 1)} footnote={system.panel_count ? `${system.panel_count} panels · ${capacity.source}` : capacity.source} />
        <Metric label="Performance (7d vs prev. 30d)" term="performance_ratio" data={signal.deviation} format={(v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`}
          footnote={<span className="inline-flex items-center gap-1">Thresholds: <Placeholder k="PRODUCTION_ALERT_THRESHOLDS" /></span>} />
        <StatusCard title="Cleaning status" icon={SprayCan} href="/monitoring/cleaning" status={derived.status} cls={derived.cls}
          lines={[derived.headline, cleaning ? `Last cleaning: ${formatDate(cleaning.appointment_at ?? cleaning.updated_at)}` : "No completed cleaning on record."]} />
        <StatusCard title="Maintenance status" icon={Wrench} href="/maintenance" status={openCases.length ? "monitor" : "normal"} cls={isDemo ? "demo" : "source"} statusLabelOverride={openCases.length ? `${openCases.length} open case${openCases.length === 1 ? "" : "s"}` : "No open cases"}
          lines={[nextAppointment ? `Next appointment: ${formatDate(nextAppointment.appointment_at!, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} (${nextAppointment.kind.replace("_", " ")})` : "No upcoming appointment."]} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Weather and alerts">
        <Card className="lg:col-span-1">
          <CardHeader title="Weather" subtitle="Current conditions at your home." action={<Link href="/monitoring/weather" className="text-[12.5px] font-medium text-fg-secondary hover:text-fg">Details</Link>} />
          <CardBody><CurrentConditions state={weather} compact /></CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={<><Sparkles className="size-4 text-[var(--cls-ai)]" aria-hidden /> AI alerts</>} subtitle={unacked.length ? `${unacked.length} unacknowledged` : "No unacknowledged alerts."} action={<Link href="/monitoring" className="text-[12.5px] font-medium text-fg-secondary hover:text-fg">Run assessment</Link>} />
          <CardBody>
            {alerts.length === 0 ? (
              <EmptyState title="No alerts" className="py-6">Alerts appear when the AI Energy Monitoring assessment finds something worth your attention.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {alerts.slice(0, 4).map((a) => (
                  <li key={a.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2"><StatusPill status={a.status} /><DataBadge cls={a.cls} compact /><span className="ml-auto text-[12px] text-fg-muted">{formatDate(a.created_at)}</span></div>
                    <p className="text-[13.5px] font-medium text-fg">{a.title}</p>
                    <p className="text-[13px] leading-relaxed text-fg-secondary">{a.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Production charts">
        <Card><CardHeader title={<>Daily production <InfoTip term="energy_production" /></>} subtitle="Last 30 days." /><CardBody><DailyProductionChart points={days30} cls={prodCls} source={production[0]?.source} /></CardBody></Card>
        <Card><CardHeader title="Monthly totals" subtitle="Last 12 months." /><CardBody><MonthlyTotalsChart data={months12} cls={prodCls} source={production[0]?.source} /></CardBody></Card>
      </section>

      {system.monitoring_source === null && (
        <section className="grid gap-4 lg:grid-cols-[1fr_auto]" aria-label="Live monitoring">
          <PlaceholderNote k="SOLAR_MONITORING_HARDWARE_API" />
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Quick links">
        <div className="lg:col-span-2 grid gap-2 sm:grid-cols-2">
          <QuickLink href="/monitoring" icon={Activity} title="Monitoring" text="Charts, AI assessment, weather, cleaning, inspection." />
          <QuickLink href={`/passport/${system.id}`} icon={FileBadge} title="Solar Passport" text="Equipment, warranties and full history." />
          <QuickLink href="/maintenance" icon={Wrench} title="Maintenance" text="Book cleaning or an inspection; track cases." />
          <QuickLink href="/incidents" icon={AlertOctagon} title="Incidents" text="Report and follow a problem." />
          <QuickLink href="/reports" icon={FileText} title="Reports" text="Monthly energy and maintenance summaries." />
          <QuickLink href="/monitoring/cleaning" icon={CalendarClock} title="Cleaning status" text="Trend, last cleaning and environmental indicators." />
        </div>
        <AskSolink topic="e.g. “Why was my production lower this week?”" className="h-full" />
      </section>
    </div>
  );
}

/* ---------------- pieces ---------------- */

/* The three stops on the Overview's energy path. Each reads a value the page
   already loaded and nothing else; a missing value stays missing. */

function sunNode(weather: WeatherState): FlowNode {
  if (weather.status !== "ok") {
    const text = weather.status === "no_location" ? "No location on record" : weather.status === "not_configured" ? "Weather is not connected" : "Weather could not be loaded";
    return { label: "Sun", cls: "unavailable", text };
  }
  const { current: c, location } = weather.bundle;
  return {
    label: "Sun",
    cls: "source",
    figure: c.temp_c === null ? undefined : { value: c.temp_c, decimals: 0, unit: "°C" },
    text: c.condition ?? (c.temp_c === null ? "No reading" : undefined),
    detail: `${location.name} · ${WEATHER_SOURCE}`,
  };
}

function arrayNode(capacity: Classified, panelCount: number | null): FlowNode {
  const panels = panelCount ? `${panelCount} panels` : null;
  if (capacity.value === null) return { label: "Panels", cls: capacity.cls, text: "Capacity not recorded", detail: panels ?? undefined };
  return { label: "Panels", cls: capacity.cls, figure: { value: capacity.value, decimals: 1, unit: "kWp" }, detail: [panels, capacity.source].filter(Boolean).join(" · ") };
}

function homeNode(today: Classified, monitoringSource: string | null): FlowNode {
  if (today.value === null) {
    return { label: "Home, today", cls: today.cls, text: "No reading today", detail: monitoringSource === null ? "No monitoring hardware is connected." : "Nothing has been recorded for today yet." };
  }
  return { label: "Home, today", cls: today.cls, figure: { value: today.value, decimals: 1, unit: "kWh" }, energy: true, detail: "Production recorded today" };
}

function StatusCard({ title, icon: Icon, href, status, cls, lines, statusLabelOverride }: { title: string; icon: typeof Wrench; href: string; status: Parameters<typeof StatusPill>[0]["status"]; cls: Parameters<typeof DataBadge>[0]["cls"]; lines: string[]; statusLabelOverride?: string }) {
  return (
    <Link href={href} className="lift flex min-w-0 flex-col gap-2 rounded-[var(--radius-lg)] border border-border bg-elevated p-4 shadow-sm hover:bg-inset">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg-secondary truncate"><Icon className="size-3.5 text-fg-muted" aria-hidden />{title}</div>
        <DataBadge cls={cls} compact />
      </div>
      <div>{statusLabelOverride ? <span className="text-[15px] font-semibold text-fg">{statusLabelOverride}</span> : <StatusPill status={status} />}</div>
      <ul className="space-y-0.5 text-[12.5px] leading-snug text-fg-muted">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
    </Link>
  );
}

function QuickLink({ href, icon: Icon, title, text }: { href: string; icon: typeof Wrench; title: string; text: string }) {
  return (
    <Link href={href} className="lift group flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-elevated px-3.5 py-3 hover:bg-inset">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[8px] bg-inset text-fg-secondary group-hover:bg-elevated"><Icon className="size-4" aria-hidden /></span>
      <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium text-fg">{title}</span><span className="block text-[12.5px] text-fg-muted">{text}</span></span>
      <ArrowRight className="mt-1 size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function nextAppointmentOf(maintenance: MaintenanceCase[]): MaintenanceCase | null {
  const now = Date.now();
  return maintenance
    .filter((m) => m.appointment_at && new Date(m.appointment_at).getTime() >= now && !["resolved", "closed"].includes(m.status))
    .sort((a, b) => a.appointment_at!.localeCompare(b.appointment_at!))[0] ?? null;
}

function journeySteps(profile: SolarProfile | null, system: SolarSystem | null, passport: SolarPassport | null): JourneyStep[] {
  const hasProfile = Boolean(profile);
  const analysisInputs = Boolean(profile?.available_roof_area_m2 != null && profile?.monthly_consumption_kwh != null);
  const st = system?.status ?? null;
  const designed = st !== null;
  const purchased = st === "purchased" || st === "installation_scheduled" || st === "installed";
  const installed = st === "installed";
  const first = <T,>(...xs: [boolean, T][]) => xs.find(([ok]) => ok)?.[1];
  const cur = first(
    [!hasProfile, "profile"], [!analysisInputs, "analysis"], [!designed, "design"], [!purchased, "purchase"], [!installed, "install"], [!passport, "passport"], [true, "monitoring"],
  );
  const s = (id: string, done: boolean, unavailable = false): JourneyStep["state"] => unavailable ? "unavailable" : done ? "done" : cur === id ? "current" : "todo";
  return [
    { id: "profile", label: "Solar Profile", href: "/profile", state: s("profile", hasProfile) },
    { id: "analysis", label: "Analysis", href: "/analysis", state: s("analysis", analysisInputs), hint: analysisInputs ? undefined : "Roof area and consumption needed" },
    { id: "design", label: "Design", href: "/designer", state: s("design", designed) },
    { id: "purchase", label: "Purchase", href: "/purchase", state: s("purchase", purchased) },
    { id: "install", label: "Install", href: "/purchase", state: s("install", installed), hint: system?.installation_date ? formatDate(system.installation_date) : undefined },
    { id: "passport", label: "Passport", href: system ? `/passport/${system.id}` : "/passport", state: s("passport", Boolean(passport)) },
    { id: "monitoring", label: "Monitoring", href: "/monitoring", state: s("monitoring", Boolean(system?.monitoring_source), !system?.monitoring_source), hint: system?.monitoring_source ? undefined : "Hardware not connected" },
  ];
}

function Onboarding({ profile }: { profile: SolarProfile | null }) {
  // The pre-installation journey, one real page per step. The owner chose five
  // steps (2026-09-22) so that no two steps point at the same page.
  const steps = [
    { href: "/profile", icon: UserRound, title: "1. Complete Profile", text: profile ? "Your home details are saved. Review or update them." : "Tell Solink about your home, roof and electricity use.", done: Boolean(profile) },
    { href: "/analysis", icon: SunMedium, title: "2. Solar Potential", text: "See what your roof could produce, save and avoid, and what each figure rests on.", done: false },
    { href: "/marketplace", icon: LayoutGrid, title: "3. Explore Systems", text: "Browse real panels with source-labelled specifications, and compare them.", done: false },
    { href: "/designer", icon: PencilRuler, title: "4. Design System", text: "Lay panels on a drawing of your roof and save your first design.", done: false },
    { href: "/purchase", icon: ClipboardList, title: "5. Request Installation", text: "Turn a saved design into a quote request and pick an installer.", done: false },
  ];
  // "Get started" is the first step not yet done: a shortcut to a card below, not a new destination.
  const next = steps.find((s) => !s.done) ?? steps[0];
  return (
    <div className="space-y-6">
      <OverviewHero
        label="Welcome"
        eyebrow="Overview"
        title={<>Welcome to <span className="text-[color:var(--sun-ink)]">Solink</span></>}
        description="You don't have a solar system on record yet. Follow the journey below; your dashboard fills in as you go."
        actions={[{ href: next.href, label: "Get started", icon: <SunMedium className="size-4" aria-hidden />, primary: true }, { href: "/agent", label: "Ask Solink", icon: <Bot className="size-4" aria-hidden /> }]}
        caption="An illustrative rooftop, not your home."
      />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Your solar journey">
        {steps.map((s) => {
          const [, n, label] = s.title.match(/^(\d+)\.\s*(.*)$/) ?? [null, "", s.title];
          const Icon = s.icon;
          return (
            <li key={s.href}>
              <Link href={s.href} className="lift group relative flex h-full items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-elevated p-5 shadow-[var(--shadow)] hover:bg-inset">
                <span className={`figure mt-2 grid size-7 shrink-0 place-items-center rounded-full border text-[12px] font-medium ${s.done ? "border-transparent bg-good text-white" : "border-border bg-inset text-fg-secondary"}`}>{s.done ? "✓" : n}<span className="sr-only">{s.done ? " (done)" : ""}</span></span>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-[var(--brand-strong)]"><Icon className="size-5" aria-hidden /></span>
                <span className="min-w-0 flex-1 pe-5 pt-0.5">
                  <span className="block text-[16px] font-semibold tracking-[-0.01em] text-fg">{label}</span>
                  <span className="mt-1.5 block text-[13.5px] leading-relaxed text-fg-secondary">{s.text}</span>
                </span>
                <ArrowRight className="absolute end-5 top-5 size-4 text-fg-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ol>
      <Link href="/agent" className="lift group flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-brand-soft px-5 py-4 hover:border-border-strong sm:px-6 sm:py-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-elevated text-[var(--brand-strong)] shadow-[var(--shadow)]"><Bot className="size-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] font-semibold text-fg">Ask Solink about this</span>
          <span className="mt-0.5 block text-[13.5px] text-fg-secondary">Not sure where to start? Ask the AI Solar Agent.</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}
