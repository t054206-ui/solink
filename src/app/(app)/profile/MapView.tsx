"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { UnavailableState, EmptyState, ErrorState } from "@/components/ui/States";
import { Placeholder } from "@/components/ui/Placeholder";
import { DataBadge } from "@/components/ui/DataBadge";

/* Minimal typings for the parts of the Maps JavaScript API we use (avoids a @types dependency). */
interface GLatLng { lat: number; lng: number }
interface GMap { setCenter(c: GLatLng): void }
interface GMarker { setMap(m: GMap | null): void; setPosition(p: GLatLng): void }
interface GMapsNs {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap;
  Marker: new (opts: Record<string, unknown>) => GMarker;
}
declare global {
  interface Window { google?: { maps?: GMapsNs }; __solinkMapsReady?: () => void }
}

// Inlined at build time by Next.js. This is the referrer-restricted BROWSER key; the server key never reaches the client.
const BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";

let loader: Promise<GMapsNs> | null = null;
function loadMaps(key: string): Promise<GMapsNs> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loader) return loader;
  loader = new Promise<GMapsNs>((resolve, reject) => {
    window.__solinkMapsReady = () => { if (window.google?.maps) resolve(window.google.maps); else reject(new Error("Maps API did not initialise.")); };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=__solinkMapsReady`;
    s.async = true;
    s.onerror = () => { loader = null; reject(new Error("Maps script failed to load.")); };
    document.head.appendChild(s);
  });
  return loader;
}

/**
 * Site map. Renders a Google map with a marker when the browser key is set and
 * coordinates exist; otherwise an honest unavailable / empty state.
 */
export function MapView({ lat, lng, address, className }: { lat: number | null | undefined; lng: number | null | undefined; address?: string | null; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  const markerRef = useRef<GMarker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCoords = typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    if (!BROWSER_KEY || !hasCoords || !el.current) return;
    let cancelled = false;
    const pos = { lat: lat as number, lng: lng as number };
    loadMaps(BROWSER_KEY).then((maps) => {
      if (cancelled || !el.current) return;
      if (!mapRef.current) {
        mapRef.current = new maps.Map(el.current, { center: pos, zoom: 18, mapTypeId: "satellite", disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative" });
      } else {
        mapRef.current.setCenter(pos);
      }
      if (!markerRef.current) markerRef.current = new maps.Marker({ position: pos, map: mapRef.current, title: address ?? "Selected location" });
      else markerRef.current.setPosition(pos);
    }).catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [lat, lng, address, hasCoords]);

  if (!BROWSER_KEY) {
    return (
      <UnavailableState title="Map not connected" className={className}>
        <Placeholder k="GOOGLE_MAPS_API_KEY" /> — set <code className="font-mono text-[12px]">NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code> (a referrer-restricted browser key) to show the site map. You can still type coordinates manually.
      </UnavailableState>
    );
  }
  if (!hasCoords) {
    return <EmptyState title="No location yet" className={className}>Find your address or enter coordinates to place a marker on the map.</EmptyState>;
  }
  if (error) return <ErrorState title="Map could not load" className={className}>{error}</ErrorState>;
  return (
    <div className={className}>
      <div ref={el} role="img" aria-label={`Map centred on ${address ?? `${lat}, ${lng}`}`} className="h-64 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-inset sm:h-80" />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
        <MapPin className="size-3.5" aria-hidden />
        <span className="tabular">{(lat as number).toFixed(6)}, {(lng as number).toFixed(6)}</span>
        <DataBadge cls="source" source="Google Maps Platform" />
      </div>
    </div>
  );
}
