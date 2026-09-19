import { Sunrise, Sunset, Droplets, Wind, Sun } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { InfoTip } from "@/components/help/InfoTip";
import { UnavailableState } from "@/components/ui/States";
import { listProduction } from "@/lib/data/repositories";
import { formatDate } from "@/lib/utils";
import { DailyProductionChart } from "../../_operate/components/DailyProductionChart";
import { NoSystemState } from "../../_operate/components/NoSystemState";
import { AirQuality, CurrentConditions, WeatherFallback } from "../../_operate/components/WeatherSummary";
import { loadOperateContext } from "../../_operate/loadSystem";
import { loadWeatherForProfile } from "../../_operate/loadWeather";
import { lastDays, productionCls } from "../../_operate/production";
import { WEATHER_SOURCE, fmtNum } from "../../_operate/weather";

export const metadata = { title: "Weather · Monitoring" };

export default async function WeatherPage() {
  const ctx = await loadOperateContext();
  if (!ctx.system) return <NoSystemState feature="Weather intelligence" />;
  const [weather, { data: production }] = await Promise.all([loadWeatherForProfile(ctx.profile, 3), listProduction(ctx.system.id, 60)]);
  const days30 = lastDays(production, 30);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-5" aria-label="Current weather">
        <Card className="lg:col-span-2">
          <CardHeader title="Current conditions" subtitle={`Source: ${WEATHER_SOURCE}. The only weather provider Solink uses.`} />
          <CardBody><CurrentConditions state={weather} /></CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="3-day forecast" />
          <CardBody>
            {weather.status !== "ok" ? <WeatherFallback state={weather} compact /> : (
              <>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {weather.bundle.forecast.map((d) => (
                    <li key={d.date} className="rounded-[var(--radius-md)] border border-border bg-inset p-3">
                      <div className="text-[12.5px] font-medium text-fg-secondary">{formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })}</div>
                      <div className="mt-1 text-[13px] text-fg">{d.condition}</div>
                      <div className="tabular mt-1 text-lg font-semibold text-fg">{fmtNum(d.maxtemp_c, 0)}° <span className="text-[13px] font-medium text-fg-muted">/ {fmtNum(d.mintemp_c, 0)}°</span></div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[12px] text-fg-muted">
                        <div className="inline-flex items-center gap-1"><Sun className="size-3" aria-hidden /><dt className="sr-only">UV</dt><dd>UV {fmtNum(d.uv, 0)}</dd></div>
                        <div className="inline-flex items-center gap-1"><Droplets className="size-3" aria-hidden /><dt className="sr-only">Rain chance</dt><dd>{fmtNum(d.daily_chance_of_rain, 0)}% rain</dd></div>
                        <div className="inline-flex items-center gap-1"><Wind className="size-3" aria-hidden /><dt className="sr-only">Max wind</dt><dd>{fmtNum(d.maxwind_kph, 0)} km/h</dd></div>
                        <div className="inline-flex items-center gap-1"><Droplets className="size-3" aria-hidden /><dt className="sr-only">Humidity</dt><dd>{fmtNum(d.avghumidity, 0)}% hum.</dd></div>
                        <div className="inline-flex items-center gap-1"><Sunrise className="size-3" aria-hidden /><dt className="sr-only">Sunrise</dt><dd>{d.sunrise}</dd></div>
                        <div className="inline-flex items-center gap-1"><Sunset className="size-3" aria-hidden /><dt className="sr-only">Sunset</dt><dd>{d.sunset}</dd></div>
                      </dl>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2 text-[12px] text-fg-muted"><DataBadge cls="source" source={WEATHER_SOURCE} /> Forecasts are the provider&apos;s predictions and can change.</div>
              </>
            )}
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader title={<>Air quality <InfoTip term="soiling" /></>} subtitle="Environmental indicators at your location. Dusty air raises the chance of soiling over time; it does not measure what is on your panels." />
        <CardBody>{weather.status === "ok" ? <AirQuality state={weather} /> : <WeatherFallback state={weather} compact />}</CardBody>
      </Card>

      <Card>
        <CardHeader title="Weather ↔ production" subtitle="Your recorded production alongside what weather data Solink actually has." />
        <CardBody className="space-y-4">
          <DailyProductionChart points={days30} cls={productionCls(production)} source={production[0]?.source} caption="Daily production, last 30 days · kWh" />
          <UnavailableState title="Historical weather is not available for this chart">
            Overlaying cloud cover, dust or temperature on past production days requires the {WEATHER_SOURCE} <em>history</em> endpoint, which Solink has not fetched. Only current conditions and the forecast are available{weather.status === "ok" ? "" : ", and weather is not connected at all right now"}. Nothing is estimated in its place.
          </UnavailableState>
          <div className="rounded-[var(--radius-md)] border border-border bg-inset p-3 text-[13px] leading-relaxed text-fg-secondary">
            <p className="font-medium text-fg">Correlation is not causation</p>
            <p className="mt-1">Even with both series on one chart, a dusty day that coincides with lower output does not prove soiling caused the drop. Cloud, heat, shading, an inverter issue or a measurement gap can produce the same picture. Use this view to decide whether an inspection or cleaning <em>may</em> be worth booking, not as a diagnosis.</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
