"use client";
import { useEffect, useState } from "react";
import { CloudSun } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { EmptyState, ErrorState, Skeleton, UnavailableState } from "@/components/ui/States";
import type { WeatherSnapshot } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type State =
  | { status: "no_coords" } | { status: "loading" } | { status: "ok"; current: WeatherSnapshot; location: string; fetched_at: string }
  | { status: "not_configured" } | { status: "error"; message: string };

/** Current conditions at the site from WeatherAPI.com via /api/weather (server key). Never falls back to another provider. */
export function WeatherCard({ lat, lng }: { lat: number | null | undefined; lng: number | null | undefined }) {
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const [state, setState] = useState<State>(hasCoords ? { status: "loading" } : { status: "no_coords" });

  useEffect(() => {
    if (!hasCoords) return;
    let cancelled = false;
    fetch(`/api/weather?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&days=1`)
      .then(async (r) => (await r.json()) as { ok: true; data: { current: WeatherSnapshot; location: { name: string; region: string } }; fetched_at: string } | { ok: false; reason: string; message?: string })
      .then((json) => {
        if (cancelled) return;
        if (json.ok) setState({ status: "ok", current: json.data.current, location: [json.data.location.name, json.data.location.region].filter(Boolean).join(", "), fetched_at: json.fetched_at });
        else if (json.reason === "not_configured") setState({ status: "not_configured" });
        else setState({ status: "error", message: json.message ?? "Weather lookup failed." });
      })
      .catch(() => { if (!cancelled) setState({ status: "error", message: "Could not reach the weather service." }); });
    return () => { cancelled = true; };
  }, [lat, lng, hasCoords]);

  return (
    <Card>
      <CardHeader title={<><CloudSun className="size-4 text-fg-muted" aria-hidden /> Weather at your site</>} subtitle="Current conditions from WeatherAPI.com. Context only — it does not change the estimates above." />
      <CardBody>
        {state.status === "no_coords" && <EmptyState title="No coordinates">Add your address or coordinates in the Solar Profile to see local conditions.</EmptyState>}
        {state.status === "loading" && <div className="grid grid-cols-3 gap-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>}
        {state.status === "not_configured" && <UnavailableState title="Weather not connected"><PlaceholderNote k="WEATHER_API_KEY" className="text-left" /></UnavailableState>}
        {state.status === "error" && <ErrorState title="Weather unavailable">{state.message}</ErrorState>}
        {state.status === "ok" && (
          <div>
            <div className="grid grid-cols-3 gap-3">
              <Reading label="Temperature" value={state.current.temp_c} unit="°C" />
              <Reading label="Cloud cover" value={state.current.cloud_pct} unit="%" />
              <Reading label="UV index" value={state.current.uv} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
              <DataBadge cls="source" source="WeatherAPI.com" />
              {state.current.condition && <span>{state.current.condition}</span>}
              {state.location && <span>· {state.location}</span>}
              <span>· observed {formatDate(state.current.observed_at, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Reading({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-inset p-3 min-w-0">
      <div className="text-[12px] text-fg-secondary truncate">{label}</div>
      <div className="mt-1 tabular text-xl font-semibold text-fg">{value === null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: 1 })}{unit && value !== null && <span className="ml-0.5 text-sm font-medium text-fg-muted">{unit}</span>}</div>
    </div>
  );
}
