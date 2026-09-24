"use client";
import { useState } from "react";
import { ArrowRight, Compass, LoaderCircle, MapPin, Search, ShieldCheck, Sun, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Field, Input } from "@/components/ui/Form";
import { ErrorState } from "@/components/ui/States";
import { Stage } from "@/components/layout/Stage";
import { OrientationVisual } from "@/components/three/OrientationVisual";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import {
  formatCoarseCoordinates,
  formatTilt,
  recommendPlacement,
  type PlacementRecommendation,
} from "@/lib/solar/placement";
import { rememberPlacementLocation } from "@/lib/solar/placementHandoff";
import { saveProfileLocation } from "../profile/actions";

/**
 * Which way to face a panel, from where the person is standing.
 *
 * The browser is asked for a location through the normal permission prompt,
 * and the answer never leaves the device: `recommendPlacement` is arithmetic
 * on a latitude, so there is no request to make and nothing to store. The
 * coordinates are shown rounded to two decimals, about a kilometre, which is
 * enough to prove the guide used the right place.
 *
 * Every state the permission prompt can end in has a screen here, and each of
 * them offers the address route instead, because /analysis asks for a typed
 * address and needs no permission at all.
 */

/**
 * Where a pair of coordinates came from. It is shown with the result, because
 * "your browser put you here" and "Google resolved the address you typed to
 * this street" are different claims and the reader is entitled to both.
 */
type Source =
  | { kind: "browser" }
  | { kind: "address"; typed: string; resolved: string | null; precision: string | null; approximate: boolean };

type State =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "geocoding" }
  | { status: "ready"; rec: PlacementRecommendation; source: Source }
  | {
      status: "error";
      kind: "denied" | "unavailable" | "timeout" | "unsupported" | "unusable" | "address_not_found" | "address_failed" | "address_not_configured";
    };

const ERROR_COPY: Record<Extract<State, { status: "error" }>["kind"], { title: string; body: string }> = {
  denied: {
    title: "Location access was denied",
    body: "Your browser did not share a location. Nothing was sent anywhere. You can allow it in your browser's site settings and try again, or use your address instead.",
  },
  unavailable: {
    title: "Your location could not be determined",
    body: "The browser could not work out where you are. This happens indoors, on some desktop machines, and when location services are switched off for the whole device.",
  },
  timeout: {
    title: "Finding your location took too long",
    body: "The browser did not answer in time. Trying again often works, particularly outdoors or on a phone.",
  },
  unsupported: {
    title: "This browser cannot share a location",
    body: "The browser does not offer the location feature this guide uses. Your address works just as well for the site analysis.",
  },
  unusable: {
    title: "The location did not make sense",
    body: "The coordinates the browser returned were not a usable point on Earth, so no recommendation was made rather than a wrong one.",
  },
  address_not_found: {
    title: "That address could not be found",
    body: "Google Maps matched nothing for what you typed. Adding the area or the governorate usually helps, and so does a nearby landmark.",
  },
  address_failed: {
    title: "The address lookup did not answer",
    body: "Solink could not reach the address service, so no location was resolved and no recommendation was made.",
  },
  address_not_configured: {
    title: "Address lookup is not connected",
    body: "The Google Maps key this site uses for addresses is not configured, so an address cannot be turned into coordinates here. Your browser's own location still works.",
  },
};

/**
 * One hit from /api/geocode, which is the same Google Maps lookup the Solar
 * Potential analysis runs on the server. Only the fields this page reads.
 */
interface GeoHit {
  formatted_address?: string;
  lat: number;
  lng: number;
  location_type?: string | null;
  partial_match?: boolean;
}

/**
 * Whether Google landed on the building or near it.
 *
 * The same rule `collectSiteData` applies in the site analysis: anything less
 * precise than a rooftop, or a partial match, describes an area rather than a
 * building, and the page says so instead of implying otherwise. It is
 * repeated here rather than imported because that module is server-only.
 */
function isApproximate(hit: GeoHit): boolean {
  return hit.partial_match === true || (hit.location_type ? hit.location_type !== "ROOFTOP" : true);
}

export function PlacementGuide({ heading }: { heading: { eyebrow: string; title: string; description: string } }) {
  const [state, setState] = useState<State>({ status: "idle" });
  // Tablet and up: the scene sits in the hero. Phones: after the location
  // card, so "Use my location" is never below the picture.
  const wide = useMediaQuery("(min-width: 768px)");
  const [address, setAddress] = useState("");

  /**
   * The address route, which is how Solar Potential asks for a location: the
   * text goes to Solink's server, Google Maps resolves it there, and only
   * coordinates come back. No key and no provider call exists in the browser.
   */
  async function findAddress(e: React.FormEvent) {
    e.preventDefault();
    const q = address.trim();
    if (q.length < 3 || state.status === "geocoding") return;
    setState({ status: "geocoding" });
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(q)}`);
      const json = (await res.json()) as { ok: true; data: GeoHit[] } | { ok: false; reason: string; message?: string };
      if (!json.ok) {
        setState({
          status: "error",
          kind:
            json.reason === "not_configured"
              ? "address_not_configured"
              : json.reason === "zero_results"
                ? "address_not_found"
                : "address_failed",
        });
        return;
      }
      const hit = json.data[0];
      if (!hit) {
        setState({ status: "error", kind: "address_not_found" });
        return;
      }
      const rec = recommendPlacement(hit.lat, hit.lng);
      if (!rec) {
        setState({ status: "error", kind: "unusable" });
        return;
      }
      const source: Source = {
        kind: "address",
        typed: q,
        resolved: hit.formatted_address ?? null,
        precision: hit.location_type ?? null,
        approximate: isApproximate(hit),
      };
      // Carried to Solar Potential so the same place does not have to be found
      // twice. Stays in this browser; see placementHandoff.ts.
      rememberPlacementLocation({
        address: hit.formatted_address ?? null,
        typed: q,
        latitude: hit.lat,
        longitude: hit.lng,
        precision: hit.location_type ?? null,
        approximate: isApproximate(hit),
        source: "address",
        at: new Date().toISOString(),
      });
      // The address route already sent this address to Solink's server to be
      // resolved, so recording where it landed tells the profile nothing it has
      // not already seen. The browser route below does not do this: nothing
      // from it leaves the device, as this page promises.
      void saveProfileLocation({ address: hit.formatted_address ?? q, lat: hit.lat, lng: hit.lng });
      setState({ status: "ready", rec, source });
    } catch {
      setState({ status: "error", kind: "address_failed" });
    }
  }

  function locate() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "error", kind: "unsupported" });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rec = recommendPlacement(pos.coords.latitude, pos.coords.longitude);
        if (!rec) {
          setState({ status: "error", kind: "unusable" });
          return;
        }
        rememberPlacementLocation({
          address: null,
          typed: null,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precision: null,
          approximate: false,
          source: "browser",
          at: new Date().toISOString(),
        });
        setState({ status: "ready", rec, source: { kind: "browser" } });
      },
      (err) => {
        const kind =
          err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable";
        setState({ status: "error", kind });
      },
      {
        // A hemisphere and a latitude do not need street-level accuracy, and
        // the coarse fix is faster and less intrusive. A cached fix up to ten
        // minutes old is just as good for this.
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 600000,
      },
    );
  }

  const locating = state.status === "locating";
  const geocoding = state.status === "geocoding";

  // The scene draws the recommendation the page already made; nothing is recomputed.
  const rec = state.status === "ready" ? state.rec : null;
  const visual = (
    <OrientationVisual
      orientation={rec ? { azimuthDeg: rec.azimuthDeg, tiltMinDeg: rec.tilt.minDeg, tiltMaxDeg: rec.tilt.maxDeg, latitude: rec.latitude } : null}
      facing={rec ? `${rec.compassLabel} · ${rec.azimuthDeg}°` : null}
      tilt={rec ? formatTilt(rec.tilt) : null}
    />
  );

  return (
    <div className="space-y-5">
      <Stage label="Solar Placement Guide" focus="70% 45%">
        <div className="grid items-center md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative z-10 px-5 py-8 sm:px-8 md:py-12 lg:ps-10">
            <p className="micro wipe">{heading.eyebrow}</p>
            <h1 className="display wipe mt-4 text-[clamp(2.3rem,4.6vw,3.8rem)] text-fg-heading" style={{ animationDelay: "90ms" }}>{heading.title}</h1>
            <p className="wipe mt-4 max-w-md text-[15.5px] leading-relaxed text-fg-secondary" style={{ animationDelay: "180ms" }}>{heading.description}</p>
          </div>
          <div className="hidden px-3 pb-3 md:block md:pe-4 md:ps-0 md:pt-4">{wide ? visual : <div className="aspect-[5/4]" />}</div>
        </div>
      </Stage>

      <Card>
        <CardHeader
          title={
            <>
              <Compass className="size-4 text-[var(--brand-strong)]" aria-hidden="true" /> Find your best solar direction
            </>
          }
          subtitle="Your browser asks you for a location, and Solink turns it into the direction and angle a fixed panel is usually set to there. The answer is worked out in this browser: no coordinates are sent to Solink or stored."
          action={<DataBadge cls="calculated" compact />}
        />
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={locate} disabled={locating} size="lg">
              {locating ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <MapPin className="size-4" aria-hidden="true" />
              )}
              {locating ? "Finding your location…" : "Use my location"}
            </Button>
            <p className="text-[13px] text-fg-muted">Your browser will ask first, and you can refuse.</p>
          </div>

          {/* The address route: the same lookup Solar Potential uses, on the same server. */}
          <form onSubmit={findAddress} className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-end" aria-busy={geocoding}>
            <Field label="Or enter an address" className="flex-1" help="A street address, block and area, or a building name. Google Maps resolves it on Solink's server, as it does for Solar Potential.">
              <Input
                id="placement-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Block 4, Salmiya, Kuwait"
                autoComplete="street-address"
                maxLength={300}
                minLength={3}
              />
            </Field>
            <Button type="submit" variant="outline" disabled={geocoding || address.trim().length < 3}>
              {geocoding ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
              {geocoding ? "Finding the address…" : "Use this address"}
            </Button>
          </form>

          <p className="mt-3 flex items-start gap-2 border-t border-border/70 pt-3 text-[12.5px] leading-relaxed text-fg-muted">
            <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden="true" />
            <span>
              Your browser&apos;s own location stays in this browser: Solink never receives it, and it is shown
              rounded to about a kilometre. An address you type is different. It goes to Solink&apos;s server to be
              resolved, and where it lands is saved to your Solar Profile so the rest of Solink knows where the roof
              is.
            </span>
          </p>
        </CardBody>
      </Card>

      {!wide && <div className="md:hidden">{visual}</div>}

      {state.status === "error" && (
        <ErrorState title={ERROR_COPY[state.kind].title}>
          <span className="block">{ERROR_COPY[state.kind].body}</span>
          <span className="mt-2 flex flex-wrap items-center gap-3">
            {state.kind !== "unsupported" && !state.kind.startsWith("address_") && (
              <Button onClick={locate} size="sm" variant="outline">
                Try again
              </Button>
            )}
            <Button href="/analysis" size="sm">
              Go to Solar Potential <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </span>
        </ErrorState>
      )}

      {state.status === "ready" && <Result rec={state.rec} source={state.source} />}
    </div>
  );
}

/* ------------------------------------------------------------------ result */

function Result({ rec, source }: { rec: PlacementRecommendation; source: Source }) {
  const tilt = formatTilt(rec.tilt);
  const tiltMid = (rec.tilt.minDeg + rec.tilt.maxDeg) / 2;
  const coords = formatCoarseCoordinates(rec.latitude, rec.longitude);
  const subtitle =
    source.kind === "browser"
      ? `Worked out from the location your browser gave, ${coords}${rec.inKuwait ? ", inside Kuwait" : ""}.`
      : `Worked out from ${source.resolved ?? source.typed}, ${coords}${rec.inKuwait ? ", inside Kuwait" : ""}.`;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={
            <>
              <Sun className="size-4 text-[var(--sun-ink)]" aria-hidden="true" /> Your solar placement guide
            </>
          }
          subtitle={subtitle}
          action={<DataBadge cls={rec.cls} compact />}
        />
        <CardBody className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* ── direction ── */}
            <section className="lift flex flex-col rounded-[var(--radius-lg)] border border-border bg-elevated p-5 shadow-[var(--shadow)]">
              <h3 className="micro">Best direction</h3>
              <p className="display mt-2 text-[40px] text-fg">{rec.compassLabel}</p>
              <p className="figure mt-1 text-[15px] text-fg-secondary">Azimuth {rec.azimuthDeg}°</p>
              <div className="mt-4 flex flex-1 items-center justify-center">
                <CompassDial azimuthDeg={rec.azimuthDeg} label={rec.compassLabel} />
              </div>
              <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-relaxed text-fg-muted">{rec.azimuthReason}</p>
            </section>

            {/* ── tilt ── */}
            <section className="lift flex flex-col rounded-[var(--radius-lg)] border border-border bg-elevated p-5 shadow-[var(--shadow)]">
              <h3 className="micro flex items-center gap-2">
                Recommended fixed tilt <DataBadge cls={rec.cls} compact />
              </h3>
              <p className="figure display mt-2 text-[40px] text-fg">{tilt}</p>
              <p className="mt-1 text-[15px] text-fg-secondary">from horizontal</p>
              <div className="mt-4 flex flex-1 items-center justify-center">
                <TiltDiagram degrees={tiltMid} minDeg={rec.tilt.minDeg} maxDeg={rec.tilt.maxDeg} label={tilt} />
              </div>
              <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-relaxed text-fg-muted">{rec.tilt.source}</p>
            </section>
          </div>

          {source.kind === "address" && (
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              You entered &ldquo;{source.typed}&rdquo;. Google Maps resolved it to{" "}
              <span className="text-fg-secondary">{source.resolved ?? "a point it did not name"}</span>
              {source.precision ? ` (${source.precision})` : ""}
              {source.approximate
                ? ", which is a nearby street or area rather than the building itself. The direction and angle below are for that area."
                : "."}
            </p>
          )}

          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-fg-muted">
            <li className="flex items-center gap-2">
              <Tick /> Faces the half of the sky the sun crosses here
            </li>
            <li className="flex items-center gap-2">
              <Tick /> Angle set for this latitude, not a single figure for everywhere
            </li>
            <li className="flex items-center gap-2">
              <Tick /> For a panel fixed in place, not one that tracks the sun
            </li>
          </ul>

          {/* ── the limitation, stated plainly and not tucked away ── */}
          <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-sunken p-4">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--warn-fg)]" aria-hidden="true" />
            <div>
              <h3 className="text-[14px] font-semibold text-fg-heading">This is a direction, not a spot on your roof</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-fg-secondary">
                Location alone cannot determine the exact best spot on your roof. Buildings, trees, walls, roof
                structures, and shading can change the final placement. This is a recommended direction based on your
                location, and an installer still has to look at the roof itself.
              </p>
            </div>
          </div>

          <details className="group rounded-[var(--radius-lg)] border border-border bg-elevated">
            <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-lg)] px-4 py-3 text-[14px] font-medium text-fg marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">
              Why this direction and this angle?
              <span aria-hidden="true" className="text-[12px] text-fg-muted group-open:hidden">Show</span>
              <span aria-hidden="true" className="hidden text-[12px] text-fg-muted group-open:inline">Hide</span>
            </summary>
            <div className="space-y-2.5 border-t border-border px-4 py-3 text-[13.5px] leading-relaxed text-fg-secondary">
              <p>
                <span className="font-medium text-fg">Where you are changes the sun&apos;s path.</span> The further you
                are from the equator, the lower the sun sits, and the more it stays on one side of the sky through the
                year.
              </p>
              <p>
                <span className="font-medium text-fg">Azimuth is the direction a panel faces</span>, measured in degrees
                clockwise from north: 180° is due south. Facing the side of the sky the sun crosses keeps the panel
                pointed at it for more of the day.
              </p>
              <p>
                <span className="font-medium text-fg">Tilt is the angle from horizontal.</span> It trades summer output
                against winter output; the figures above are the usual compromise for year-round output at a latitude
                like yours.
              </p>
              <p>
                <span className="font-medium text-fg">This is for a fixed panel.</span> A mounting that follows the sun
                through the day is a different decision, with different costs.
              </p>
              <p>
                <span className="font-medium text-fg">A real roof decides the rest.</span> Its shape, its obstacles and
                what shades it in the afternoon can all outweigh a few degrees of direction.
              </p>
            </div>
          </details>

          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button href="/analysis">
              Analyse my site <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button href="/workflow" variant="outline">
              View solar workflow <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            Roof measurements are not part of this guide. Solink reads a roof only when the optional Google Solar
            service is connected, and it is not required for anything here or in the site analysis.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Tick() {
  return (
    <span
      aria-hidden="true"
      className="grid size-4 shrink-0 place-items-center rounded-full bg-good-soft text-[10px] font-bold text-good-fg"
    >
      ✓
    </span>
  );
}

/* --------------------------------------------------------------- drawings */

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * A compass with the recommended direction marked.
 *
 * The mark is a filled needle and a highlighted ring segment, and the
 * direction is written out under the dial as well, so nothing here depends
 * on telling two colours apart. The azimuth is the recommendation's own.
 */
function CompassDial({ azimuthDeg, label }: { azimuthDeg: number; label: string }) {
  const cx = 110;
  const cy = 110;
  const r = 86;
  // Rounded, so the server and the browser draw the same numbers (no hydration mismatch).
  const at = (deg: number, rad: number) => {
    const t = (deg * Math.PI) / 180;
    return { x: round2(cx + Math.sin(t) * rad), y: round2(cy - Math.cos(t) * rad) };
  };
  const tip = at(azimuthDeg, r - 42);
  const tail = at(azimuthDeg + 180, 22);
  // The ring segment either side of the recommended direction.
  const a0 = at(azimuthDeg - 22, r - 4);
  const a1 = at(azimuthDeg + 22, r - 4);

  return (
    <svg
      viewBox="0 0 220 244"
      width="220"
      height="244"
      role="img"
      aria-label={`Compass. Recommended direction: ${label}, ${azimuthDeg} degrees.`}
      className="h-auto w-full max-w-[240px]"
    >
      <circle cx={cx} cy={cy} r={r + 6} fill="var(--bg-elevated)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r - 30} fill="none" stroke="var(--border)" strokeWidth="1" />
      <path d={`M ${a0.x} ${a0.y} A ${r - 4} ${r - 4} 0 0 1 ${a1.x} ${a1.y}`} fill="none" stroke="var(--brand)" strokeOpacity="0.28" strokeWidth="10" strokeLinecap="round" />
      {Array.from({ length: 36 }, (_, i) => i * 10).map((d) => {
        const major = d % 90 === 0;
        const mid = d % 30 === 0;
        const o = at(d, r + 2);
        const n = at(d, r + 2 - (major ? 14 : mid ? 9 : 5));
        return <line key={d} x1={o.x} y1={o.y} x2={n.x} y2={n.y} stroke={major ? "var(--fg-secondary)" : "var(--border-strong)"} strokeWidth={major ? 2 : 1} />;
      })}
      {[30, 60, 120, 150, 210, 240, 300, 330].map((d) => {
        const p = at(d, r - 22);
        return <text key={d} x={p.x} y={p.y + 3} textAnchor="middle" fontSize="8.5" fontFamily="var(--font-mono-jet), ui-monospace, monospace" fill="var(--fg-muted)">{d}°</text>;
      })}
      {([["N", 0], ["E", 90], ["S", 180], ["W", 270]] as const).map(([d, deg]) => {
        const p = at(deg, r - 22);
        return (
          <text key={d} x={p.x} y={p.y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill={d === label[0] ? "var(--brand)" : "var(--fg-secondary)"}>
            {d}
          </text>
        );
      })}
      <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" />
      <circle cx={tip.x} cy={tip.y} r="7" fill="var(--brand)" />
      <circle cx={cx} cy={cy} r="5" fill="var(--bg-elevated)" stroke="var(--fg-secondary)" strokeWidth="2" />
      <text x={cx} y={236} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--fg)" fontFamily="var(--font-mono-jet), ui-monospace, monospace">
        {label} · {azimuthDeg}°
      </text>
    </svg>
  );
}

/**
 * A panel seen from the side above the roof line: drawn at the middle of the
 * recommended band, with the whole band shaded as a wedge. Every angle comes
 * from the recommendation.
 */
function TiltDiagram({ degrees, minDeg, maxDeg, label }: { degrees: number; minDeg: number; maxDeg: number; label: string }) {
  const groundY = 128;
  const hingeX = 50;
  const len = 150;
  const R = 62;
  const pt = (deg: number, rad: number) => {
    const t = (deg * Math.PI) / 180;
    return { x: round2(hingeX + Math.cos(t) * rad), y: round2(groundY - Math.sin(t) * rad) };
  };
  const end = pt(degrees, len);
  const lo = pt(minDeg, R);
  const hi = pt(maxDeg, R);
  const mid = pt(degrees, len / 2);
  // Unit normal to the panel, for its thickness and its frame.
  const nx = round2(-Math.sin((degrees * Math.PI) / 180));
  const ny = round2(-Math.cos((degrees * Math.PI) / 180));

  return (
    <svg
      viewBox="0 0 260 176"
      width="260"
      height="176"
      role="img"
      aria-label={`Side view of a panel set at ${label} above the roof line.`}
      className="h-auto w-full max-w-[300px]"
    >
      <defs>
        <pattern id="tilt-roof" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--border-strong)" strokeWidth="1.5" />
        </pattern>
      </defs>
      {/* the sun, arriving from above */}
      <circle cx="222" cy="30" r="11" fill="var(--sun-soft)" stroke="var(--sun)" strokeWidth="1.5" />
      {[0, 1, 2].map((i) => (
        <line key={i} x1={210 - i * 7} y1={44 + i * 3} x2={192 - i * 9} y2={64 + i * 5} stroke="var(--sun)" strokeWidth="1.3" strokeLinecap="round" />
      ))}

      {/* roof */}
      <rect x="12" y={groundY} width="236" height="14" fill="url(#tilt-roof)" />
      <line x1="12" y1={groundY} x2="248" y2={groundY} stroke="var(--fg-secondary)" strokeWidth="2" />
      <text x="16" y={groundY + 30} fontSize="10.5" fill="var(--fg-muted)" fontFamily="var(--font-mono-jet), ui-monospace, monospace">ROOF</text>

      {/* the recommended band */}
      <path d={`M ${hingeX} ${groundY} L ${lo.x} ${lo.y} A ${R} ${R} 0 0 0 ${hi.x} ${hi.y} Z`} fill="var(--brand)" fillOpacity="0.16" stroke="var(--brand)" strokeOpacity="0.55" strokeWidth="1" />
      <line x1={hingeX} y1={groundY} x2={hingeX + R + 26} y2={groundY} stroke="var(--fg-muted)" strokeDasharray="3 3" strokeWidth="1" />

      {/* the panel: frame, glass, and the leg holding it */}
      <line x1={end.x} y1={end.y} x2={end.x} y2={groundY} stroke="var(--border-strong)" strokeWidth="3" />
      <polygon
        points={`${hingeX},${groundY} ${end.x},${end.y} ${end.x + nx * 7},${end.y + ny * 7} ${hingeX + nx * 7},${groundY + ny * 7}`}
        fill="#1b3657"
        stroke="#aab2bb"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx={hingeX} cy={groundY} r="3.5" fill="var(--fg-secondary)" />

      <text x={hingeX + R + 10} y={groundY - 12} fontSize="15" fontWeight="600" fill="var(--fg)" fontFamily="var(--font-mono-jet), ui-monospace, monospace">
        {label}
      </text>
      <text x={mid.x + nx * 20} y={mid.y + ny * 20} fontSize="10.5" fill="var(--fg-secondary)" fontFamily="var(--font-mono-jet), ui-monospace, monospace" textAnchor="middle">PANEL</text>
    </svg>
  );
}
