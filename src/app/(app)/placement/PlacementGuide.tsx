"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, LoaderCircle, MapPin, ShieldCheck, Sun, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { ErrorState } from "@/components/ui/States";
import {
  formatCoarseCoordinates,
  formatTilt,
  recommendPlacement,
  type PlacementRecommendation,
} from "@/lib/solar/placement";

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

type State =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ready"; rec: PlacementRecommendation }
  | { status: "error"; kind: "denied" | "unavailable" | "timeout" | "unsupported" | "unusable" };

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
};

export function PlacementGuide() {
  const [state, setState] = useState<State>({ status: "idle" });

  function locate() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "error", kind: "unsupported" });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rec = recommendPlacement(pos.coords.latitude, pos.coords.longitude);
        setState(rec ? { status: "ready", rec } : { status: "error", kind: "unusable" });
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
            <p className="text-[13px] text-fg-muted">
              Your browser will ask first. Prefer not to? <ByAddressLink />
            </p>
          </div>

          <p className="mt-3 flex items-start gap-2 border-t border-border/70 pt-3 text-[12.5px] leading-relaxed text-fg-muted">
            <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden="true" />
            <span>
              Solink does not receive your coordinates from this guide, does not store them, and does not need an
              account for it. They stay in the browser and are shown rounded to about a kilometre.
            </span>
          </p>
        </CardBody>
      </Card>

      {state.status === "error" && (
        <ErrorState title={ERROR_COPY[state.kind].title}>
          <span className="block">{ERROR_COPY[state.kind].body}</span>
          <span className="mt-2 flex flex-wrap items-center gap-3">
            {state.kind !== "unsupported" && (
              <Button onClick={locate} size="sm" variant="outline">
                Try again
              </Button>
            )}
            <Button href="/analysis" size="sm">
              Enter your address instead <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </span>
        </ErrorState>
      )}

      {state.status === "ready" && <Result rec={state.rec} />}
    </div>
  );
}

/** One link, used wherever the answer is "use an address instead". */
function ByAddressLink() {
  return (
    <Link href="/analysis" className="font-medium text-data underline underline-offset-2 hover:opacity-80">
      use your address instead
    </Link>
  );
}

/* ------------------------------------------------------------------ result */

function Result({ rec }: { rec: PlacementRecommendation }) {
  const tilt = formatTilt(rec.tilt);
  const tiltMid = (rec.tilt.minDeg + rec.tilt.maxDeg) / 2;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={
            <>
              <Sun className="size-4 text-[var(--sun-ink)]" aria-hidden="true" /> Your solar placement guide
            </>
          }
          subtitle={`Worked out from ${formatCoarseCoordinates(rec.latitude, rec.longitude)}${rec.inKuwait ? ", inside Kuwait" : ""}.`}
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
