import Link from "next/link";
import { CloudSun, Droplets, Wind, Sun, Thermometer, Cloud } from "lucide-react";
import { DataBadge } from "@/components/ui/DataBadge";
import { UnavailableState } from "@/components/ui/States";
import { InfoTip } from "@/components/help/InfoTip";
import { formatDate } from "@/lib/utils";
import { WEATHER_SOURCE, epaIndexLabel, fmtNum, type WeatherState } from "../weather";

/** Handles every non-OK weather state in one place. Returns null when weather is OK. */
export function WeatherFallback({ state, compact = false }: { state: WeatherState; compact?: boolean }) {
  if (state.status === "ok") return null;
  if (state.status === "no_location") {
    return (
      <UnavailableState title="Add your location for local weather" className={compact ? "py-6" : undefined}>
        Run a site analysis in <Link href="/analysis" className="underline underline-offset-2">Solar Potential</Link>, or find your place in the <Link href="/placement" className="underline underline-offset-2">Placement Guide</Link>. The location either one resolves is kept, and weather and air quality for your home appear here.
      </UnavailableState>
    );
  }
  if (state.status === "not_configured") {
    return (
      <UnavailableState title="Local weather appears here" className={compact ? "py-6" : undefined}>Conditions and air quality at your home, from {WEATHER_SOURCE}.</UnavailableState>
    );
  }
  return <UnavailableState title="Weather will be back shortly" className={compact ? "py-6" : undefined}>{state.message}</UnavailableState>;
}

/** Current conditions from WeatherAPI.com. Values are SOURCE data and labelled as such. */
export function CurrentConditions({ state, compact = false }: { state: WeatherState; compact?: boolean }) {
  if (state.status !== "ok") return <WeatherFallback state={state} compact={compact} />;
  const { current: c, location } = state.bundle;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] text-fg-secondary">{location.name}{location.region ? `, ${location.region}` : ""} · observed {formatDate(c.observed_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
        <DataBadge cls="source" source={WEATHER_SOURCE} compact={compact} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <CloudSun className="size-9 text-[var(--brand-strong)]" aria-hidden />
        <div>
          <div className="tabular text-3xl font-semibold leading-none text-fg">{fmtNum(c.temp_c, 0)}<span className="ml-0.5 text-base font-medium text-fg-muted">°C</span></div>
          {c.condition && <div className="mt-1 text-[13px] text-fg-secondary">{c.condition}</div>}
        </div>
      </div>
      <dl className={`mt-4 grid gap-x-4 gap-y-2 text-[13px] ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        <Row icon={Cloud} label="Cloud cover" value={fmtNum(c.cloud_pct, 0, "%")} />
        <Row icon={Droplets} label="Humidity" value={fmtNum(c.humidity_pct, 0, "%")} />
        <Row icon={Wind} label="Wind" value={fmtNum(c.wind_kph, 0, " km/h")} />
        <Row icon={Sun} label="UV index" value={fmtNum(c.uv, 1)} />
        <Row icon={Thermometer} label="Precipitation" value={fmtNum(c.precip_mm, 1, " mm")} />
      </dl>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Cloud; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
      <dt className="text-fg-muted truncate">{label}</dt>
      <dd className="tabular ml-auto font-medium text-fg">{value}</dd>
    </div>
  );
}

/** Air-quality indicators. These describe the air, not the dust on any panel. */
export function AirQuality({ state }: { state: WeatherState }) {
  if (state.status !== "ok") return null;
  const c = state.bundle.current;
  const items: { label: string; term: string; value: string }[] = [
    { label: "PM2.5", term: "pm25", value: fmtNum(c.pm2_5, 1, " µg/m³") },
    { label: "PM10", term: "pm10", value: fmtNum(c.pm10, 1, " µg/m³") },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-[var(--radius-md)] border border-border bg-inset p-3">
            <div className="flex items-center gap-1 text-[12.5px] font-medium text-fg-secondary">{it.label}<InfoTip term={it.term} /></div>
            <div className="tabular mt-1 text-lg font-semibold text-fg">{it.value}</div>
          </div>
        ))}
        {c.us_epa_index != null && (
          <div className="rounded-[var(--radius-md)] border border-border bg-inset p-3 col-span-2 sm:col-span-1">
            <div className="text-[12.5px] font-medium text-fg-secondary">US EPA index</div>
            <div className="mt-1 text-lg font-semibold text-fg">{c.us_epa_index}</div>
            <div className="text-[12px] text-fg-muted">{epaIndexLabel(c.us_epa_index)}</div>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2"><DataBadge cls="source" source={WEATHER_SOURCE} /></div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
        PM2.5 and PM10 are <strong className="text-fg-secondary">environmental air-quality indicators</strong> at your location. They are not a measurement of dust on your panels and cannot confirm soiling on their own.
      </p>
    </div>
  );
}
