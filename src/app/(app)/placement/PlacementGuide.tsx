"use client";
import { useState } from "react";
import { ArrowRight, Compass, LoaderCircle, MapPin, Search, ShieldCheck, Sun, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { Field, Input } from "@/components/ui/Form";
import { ErrorState } from "@/components/ui/States";
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

export function PlacementGuide() {
  const [state, setState] = useState<State>({ status: "idle" });
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

  return (
    <div className="space-y-5">
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
          <div className="grid gap-5 sm:grid-cols-2">
            {/* ── direction ── */}
            <section className="rounded-[var(--radius-lg)] border border-border bg-inset p-4">
              <h3 className="micro">Best direction</h3>
              <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-fg">
                {rec.compassLabel}
              </p>
              <p className="figure mt-1 text-[14px] text-fg-secondary">Azimuth {rec.azimuthDeg}°</p>
              <div className="mt-4 flex justify-center">
                <CompassDial azimuthDeg={rec.azimuthDeg} label={rec.compassLabel} />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-fg-secondary">{rec.azimuthReason}</p>
            </section>

            {/* ── tilt ── */}
            <section className="rounded-[var(--radius-lg)] border border-border bg-inset p-4">
              <h3 className="micro flex items-center gap-2">
                Recommended fixed tilt <DataBadge cls={rec.cls} compact />
              </h3>
              <p className="figure mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-fg">{tilt}</p>
              <p className="mt-1 text-[14px] text-fg-secondary">from horizontal</p>
              <div className="mt-4 flex justify-center">
                <TiltDiagram degrees={tiltMid} label={tilt} />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-fg-secondary">{rec.tilt.source}</p>
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

          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13.5px] text-fg-secondary">
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
              <h3 className="text-[14px] font-semibold text-fg">This is a direction, not a spot on your roof</h3>
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

/**
 * A compass with the recommended direction marked.
 *
 * The mark is a filled needle and a labelled ring segment, and the direction
 * is written out beside the dial as well, so nothing here depends on telling
 * two colours apart.
 */
function CompassDial({ azimuthDeg, label }: { azimuthDeg: number; label: string }) {
  const cx = 70;
  const cy = 70;
  const r = 52;
  const rad = (azimuthDeg * Math.PI) / 180;
  // Screen angle: 0° points up (north) and increases clockwise.
  const tipX = cx + Math.sin(rad) * (r - 10);
  const tipY = cy - Math.cos(rad) * (r - 10);
  const tailX = cx - Math.sin(rad) * 14;
  const tailY = cy + Math.cos(rad) * 14;

  const points: { d: string; x: number; y: number }[] = [
    { d: "N", x: cx, y: cy - r - 4 },
    { d: "E", x: cx + r + 6, y: cy + 4 },
    { d: "S", x: cx, y: cy + r + 13 },
    { d: "W", x: cx - r - 6, y: cy + 4 },
  ];

  return (
    <svg
      viewBox="0 0 140 152"
      width="140"
      height="152"
      role="img"
      aria-label={`Compass. Recommended direction: ${label}, ${azimuthDeg} degrees.`}
      className="max-w-full"
    >
      <circle cx={cx} cy={cy} r={r} fill="var(--bg-elevated)" stroke="var(--border-strong)" strokeWidth="1.5" />
      {[45, 135, 225, 315].map((a) => {
        const t = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={cx + Math.sin(t) * (r - 7)}
            y1={cy - Math.cos(t) * (r - 7)}
            x2={cx + Math.sin(t) * r}
            y2={cy - Math.cos(t) * r}
            stroke="var(--border-strong)"
            strokeWidth="1"
          />
        );
      })}
      {points.map((p) => (
        <text
          key={p.d}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill={p.d === label[0] ? "var(--brand)" : "var(--fg-muted)"}
        >
          {p.d}
        </text>
      ))}
      <line x1={tailX} y1={tailY} x2={tipX} y2={tipY} stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={tipX} cy={tipY} r="5.5" fill="var(--brand)" />
      <circle cx={cx} cy={cy} r="3" fill="var(--fg-muted)" />
      <text x={cx} y={146} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--fg)">
        {label} · {azimuthDeg}°
      </text>
    </svg>
  );
}

/** A panel seen from the side, at the recommended angle above the roof line. */
function TiltDiagram({ degrees, label }: { degrees: number; label: string }) {
  const groundY = 96;
  const hingeX = 40;
  const len = 92;
  const rad = (degrees * Math.PI) / 180;
  const endX = hingeX + Math.cos(rad) * len;
  const endY = groundY - Math.sin(rad) * len;

  return (
    <svg
      viewBox="0 0 180 130"
      width="180"
      height="130"
      role="img"
      aria-label={`Side view of a panel set at ${label} above the roof line.`}
      className="max-w-full"
    >
      {/* sun and its rays, arriving from above */}
      <circle cx="146" cy="24" r="10" fill="var(--sun-soft)" stroke="var(--sun)" strokeWidth="1.5" />
      <line x1="138" y1="38" x2="120" y2="56" stroke="var(--sun)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="150" y1="40" x2="140" y2="58" stroke="var(--sun)" strokeWidth="1.5" strokeLinecap="round" />

      {/* roof line */}
      <line x1="14" y1={groundY} x2="168" y2={groundY} stroke="var(--border-strong)" strokeWidth="2" />
      <text x="14" y={groundY + 16} fontSize="11" fill="var(--fg-muted)">roof</text>

      {/* the angle */}
      <path
        d={`M ${hingeX + 34} ${groundY} A 34 34 0 0 0 ${hingeX + Math.cos(rad) * 34} ${groundY - Math.sin(rad) * 34}`}
        fill="none"
        stroke="var(--fg-muted)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <text x={hingeX + 44} y={groundY - 10} fontSize="12" fontWeight="600" fill="var(--fg)">
        {label}
      </text>

      {/* the panel */}
      <line x1={hingeX} y1={groundY} x2={endX} y2={endY} stroke="var(--brand)" strokeWidth="6" strokeLinecap="round" />
      <circle cx={hingeX} cy={groundY} r="3" fill="var(--fg-muted)" />
      <text x={endX - 6} y={endY - 10} fontSize="11" fill="var(--fg-secondary)">panel</text>
    </svg>
  );
}
