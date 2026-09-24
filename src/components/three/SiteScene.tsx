"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Building, Planting, Sky, makeRoofKit, type Kit } from "./RoofScene";
import { rng } from "./roofDetails";

/**
 * Solar Potential's scene: the site before anything is installed.
 *
 * The Home Overview's rooftop (its building, fixtures and planting, reused
 * as they are) with no array on it, and a dashed panel-ready area where one
 * could go. The sun sweeps slowly across the afternoon and the shadows move
 * with it.
 *
 * The atmosphere follows the analysis the page already shows, and nothing
 * else: `atmosphere` carries the rule engine's own levels (0 low ... 3
 * extreme; null when there is no analysis or the level is unavailable). Dust
 * thickens the haze and the airborne dust, wind speeds the dust along, heat
 * warms the light. None of it is a measurement, and the caller says so.
 */

export interface Atmosphere { dust: number | null; heat: number | null; wind: number | null }

const TARGET = new THREE.Vector3(0.2, -0.4, -0.2);
const CAMERA: [number, number, number] = [9.8, 8.4, 13.2];

const HEAT_LIGHT = [
  { color: "#fff0e0", intensity: 2.55 },
  { color: "#ffe6c6", intensity: 2.75 },
  { color: "#ffdcb2", intensity: 2.9 },
  { color: "#ffd4a0", intensity: 3.0 },
];
const FOG = [null, [26, 70], [16, 48], [10, 34]] as const;
const DUST_COUNT = [0, 90, 220, 380];
const WIND_SPEED = [0.12, 0.35, 0.8, 1.4];

/** The area a first array could take, drawn as a dashed outline with a faint fill. */
function ReadyArea() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 400;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(26,58,99,0.07)";
      ctx.fillRect(0, 0, 512, 400);
      ctx.strokeStyle = "rgba(26,58,99,0.75)";
      ctx.lineWidth = 6;
      ctx.setLineDash([22, 16]);
      ctx.strokeRect(6, 6, 500, 388);
      ctx.setLineDash([]);
      ctx.lineWidth = 3;
      for (const [x, y, dx, dy] of [[6, 6, 1, 1], [506, 6, -1, 1], [6, 394, 1, -1], [506, 394, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(x + dx * 34, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * 34); ctx.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={[-1.05, 0.012, -0.3]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[5.9, 4.6]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/** Airborne dust: a few hundred specks drifting downwind over the roof, wrapping round. */
function Dust({ count, speed, still }: { count: number; speed: number; still: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const r = rng(71);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = -8 + r() * 16;
      pos[i * 3 + 1] = 0.3 + r() * 4.5;
      pos[i * 3 + 2] = -5 + r() * 10;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((_, dt) => {
    if (still || !points.current) return;
    const p = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const step = Math.min(dt, 0.05) * speed;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) + step;
      if (x > 8) x -= 16;
      p.setX(i, x);
      p.setY(i, p.getY(i) + Math.sin((x + i) * 0.7) * step * 0.05);
    }
    p.needsUpdate = true;
  });

  if (count === 0) return null;
  return (
    <points ref={points} geometry={geo}>
      <pointsMaterial color="#cdb996" size={0.045} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

/** The sun sweeping across the afternoon, and the camera's slow drift and parallax. */
function Motion({ still, parallax, light }: { still: boolean; parallax: boolean; light: React.RefObject<THREE.DirectionalLight | null> }) {
  const base = useMemo(() => new THREE.Spherical().setFromVector3(new THREE.Vector3(...CAMERA).sub(TARGET)), []);
  const s = useRef({ v: new THREE.Vector3(), px: 0, py: 0 });
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 2.2);
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * k;
    s.current.py += ((parallax ? state.pointer.y : 0) - s.current.py) * k;
    const drift = still ? 0 : 1;
    s.current.v.setFromSphericalCoords(base.radius, base.phi + drift * Math.sin(t * 0.07) * 0.01 - s.current.py * 0.02, base.theta + drift * Math.sin(t * 0.09) * 0.035 + s.current.px * 0.05).add(TARGET);
    state.camera.position.copy(s.current.v);
    state.camera.lookAt(TARGET);
    if (light.current) {
      // Early to late afternoon and back, over about a minute and a half.
      const u = still ? 0.35 : 0.2 + 0.3 * (0.5 - 0.5 * Math.cos(t * 0.07));
      const az = Math.PI * (0.15 + u);
      light.current.position.set(Math.cos(az) * 12, 7 + Math.sin(u * Math.PI) * 4, Math.sin(az) * 5 - 2);
    }
  });
  return null;
}

function Scene({ atmosphere, still, parallax }: { atmosphere: Atmosphere | null; still: boolean; parallax: boolean }) {
  const kit = useMemo<Kit>(() => makeRoofKit(), []);
  useEffect(() => () => Object.values(kit).forEach((t) => t.dispose()), [kit]);
  const light = useRef<THREE.DirectionalLight>(null);
  const heat = HEAT_LIGHT[atmosphere?.heat ?? 1];
  const fog = FOG[atmosphere?.dust ?? 0];
  const dust = DUST_COUNT[atmosphere?.dust ?? 0] || ((atmosphere?.wind ?? 0) >= 1 ? 40 : 0);

  return (
    <>
      {fog && <fog attach="fog" args={["#eadfcb", fog[0], fog[1]]} />}
      <hemisphereLight args={["#eef2f6", "#c9bea8", 0.78]} />
      <directionalLight
        ref={light}
        position={[11, 8.5, 1.5]}
        intensity={heat.intensity}
        color={heat.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-radius={3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-6, 4, 9]} intensity={0.5} color="#dfe8f4" />
      <Sky />
      <Motion still={still} parallax={parallax} light={light} />
      <Building kit={kit} />
      <Planting kit={kit} />
      <ReadyArea />
      <Dust count={dust} speed={WIND_SPEED[atmosphere?.wind ?? 0]} still={still} />
    </>
  );
}

export default function SiteScene({ atmosphere, paused = false, still = false, economy = false, parallax = true }: {
  atmosphere: Atmosphere | null;
  paused?: boolean;
  still?: boolean;
  economy?: boolean;
  parallax?: boolean;
}) {
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: CAMERA, fov: 30, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene atmosphere={atmosphere} still={still || paused} parallax={parallax && !still} />
    </Canvas>
  );
}
