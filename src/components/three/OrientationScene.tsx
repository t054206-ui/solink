"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Sky, makeRoofKit, type Kit } from "./RoofScene";
import { SolarModule } from "./SolarModule";

/**
 * The Placement Guide's scene: one module on a roof deck, a compass under it,
 * and the sun's path over it.
 *
 * World axes are geographic: +x east, -z north, +y up. Everything shown is
 * the recommendation the page already made (`placement.ts`), drawn rather
 * than recomputed: the module faces `azimuthDeg`, it is set at the middle of
 * the recommended band (the same midpoint the page's side-view drawing uses),
 * and the band itself is the translucent wedge beside it. The sun path is the
 * equinox path for the resolved latitude, which is geometry, not a forecast.
 *
 * Before a location is resolved there is no recommendation: no direction is
 * marked and no sun path is drawn, and the module turns slowly on its mount
 * at an illustrative angle, which is plainly not a direction and is captioned
 * as such. Under reduced motion it lies flat instead.
 */

export interface Orientation { azimuthDeg: number; tiltMinDeg: number; tiltMaxDeg: number; latitude: number }

const DEG = Math.PI / 180;
const PANEL_W = 1.134;
const PANEL_H = 1.722;
const FRONT_Y = 0.42;
const NAVY = "#1a3a63";
const SUN = "#f0a02a";
/** Radius of the drawn sun path: a diagram of the sky over the deck, sized to stay in frame. */
const SUN_R = 4.4;

/** The compass rose, drawn once into a canvas and laid on the deck. North at the top of the texture = -z. */
function compassTexture() {
  const s = 1024, c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  if (ctx) {
    const m = s / 2;
    ctx.translate(m, m);
    ctx.strokeStyle = "rgba(26,58,99,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, m - 8, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, m - 70, 0, Math.PI * 2); ctx.stroke();
    for (let d = 0; d < 360; d += 5) {
      const major = d % 90 === 0, mid = d % 30 === 0;
      const len = major ? 44 : mid ? 30 : 14;
      ctx.lineWidth = major ? 5 : mid ? 3 : 1.5;
      const a = d * DEG;
      ctx.beginPath();
      ctx.moveTo(Math.sin(a) * (m - 10), -Math.cos(a) * (m - 10));
      ctx.lineTo(Math.sin(a) * (m - 10 - len), -Math.cos(a) * (m - 10 - len));
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [label, d] of [["N", 0], ["E", 90], ["S", 180], ["W", 270]] as const) {
      const a = d * DEG, r = m - 118;
      ctx.fillStyle = label === "N" ? NAVY : "rgba(26,58,99,0.7)";
      ctx.font = `600 ${label === "N" ? 84 : 66}px Archivo, ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(label, Math.sin(a) * r, -Math.cos(a) * r);
    }
    ctx.font = "500 30px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = "rgba(26,58,99,0.55)";
    for (let d = 30; d < 360; d += 30) {
      if (d % 90 === 0) continue;
      const a = d * DEG, r = m - 100;
      ctx.fillText(`${d}°`, Math.sin(a) * r, -Math.cos(a) * r);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Equinox sun direction at hour angle `h` (radians, 0 = solar noon) for latitude `phi`, in world axes. */
function sunDir(h: number, phi: number, out = new THREE.Vector3()) {
  return out.set(-Math.sin(h), Math.cos(h) * Math.cos(phi), Math.cos(h) * Math.sin(phi));
}

function Deck({ kit }: { kit: Kit }) {
  return (
    <group>
      <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.2, 0.4, 7.2]} />
        <meshStandardMaterial map={kit.plaster} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial map={kit.pavers} roughness={0.96} />
      </mesh>
    </group>
  );
}

/** A module on a triangular frame. Local +z is the direction it faces. */
function Mount({ tiltDeg, cells }: { tiltDeg: number; cells: THREE.Texture }) {
  const t = tiltDeg * DEG;
  const rise = Math.sin(t) * PANEL_H, run = Math.cos(t) * PANEL_H;
  const frontZ = run / 2 - 0.1, backZ = -run / 2 + 0.1;
  const backH = FRONT_Y + rise - 0.12;
  return (
    <group>
      <group position={[0, FRONT_Y + rise / 2, 0]} rotation={[-(Math.PI / 2 - t), 0, 0]}>
        <SolarModule w={PANEL_W} h={PANEL_H} cells={cells} />
      </group>
      {[-0.42, 0.42].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, (FRONT_Y - 0.02) / 2, frontZ]} castShadow>
            <boxGeometry args={[0.04, FRONT_Y - 0.02, 0.04]} />
            <meshStandardMaterial color="#b4b9c0" metalness={0.7} roughness={0.38} />
          </mesh>
          <mesh position={[0, backH / 2, backZ]} castShadow>
            <boxGeometry args={[0.04, backH, 0.04]} />
            <meshStandardMaterial color="#b4b9c0" metalness={0.7} roughness={0.38} />
          </mesh>
          <mesh position={[0, 0.03, (frontZ + backZ) / 2]} castShadow receiveShadow>
            <boxGeometry args={[0.07, 0.05, frontZ - backZ + 0.3]} />
            <meshStandardMaterial color="#b4b9c0" metalness={0.6} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The recommended band, as a wedge in the vertical plane beside the module
 * (on the side the camera looks from), hinged at its lower edge. In the wedge's frame +x runs back along the roof
 * (the way the module rises) and +y is up, so an angle here is the same
 * angle-from-horizontal the page states.
 */
function TiltBand({ minDeg, maxDeg }: { minDeg: number; maxDeg: number }) {
  const hingeZ = (Math.cos(((minDeg + maxDeg) / 2) * DEG) * PANEL_H) / 2;
  return (
    <group position={[-(PANEL_W / 2 + 0.28), FRONT_Y, hingeZ]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <circleGeometry args={[1.25, 32, minDeg * DEG, (maxDeg - minDeg) * DEG]} />
        <meshBasicMaterial color={NAVY} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[minDeg, maxDeg].map((d) => (
        <mesh key={d} position={[Math.cos(d * DEG) * 0.7, Math.sin(d * DEG) * 0.7, 0]} rotation={[0, 0, d * DEG]}>
          <boxGeometry args={[1.4, 0.012, 0.012]} />
          <meshBasicMaterial color={NAVY} transparent opacity={0.8} />
        </mesh>
      ))}
      {/* The horizontal the angle is measured from. */}
      <mesh position={[0.75, 0, 0]}>
        <boxGeometry args={[1.5, 0.008, 0.008]} />
        <meshBasicMaterial color={NAVY} transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function Arrow({ azimuthDeg }: { azimuthDeg: number }) {
  return (
    <group rotation={[0, Math.PI - azimuthDeg * DEG, 0]} position={[0, 0.02, 0]}>
      <mesh position={[0, 0, 1.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 1.9]} />
        <meshBasicMaterial color={NAVY} />
      </mesh>
      <mesh position={[0, 0.005, 2.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 3, -Math.PI / 2]} />
        <meshBasicMaterial color={NAVY} />
      </mesh>
    </group>
  );
}

/** Turns its children slowly while `active`; otherwise holds them at `yaw`. */
function Turntable({ active, yaw, children }: { active: boolean; yaw: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    if (active) g.current.rotation.y += Math.min(dt, 0.05) * 0.35;
    else g.current.rotation.y = yaw;
  });
  return <group ref={g} rotation={[0, yaw, 0]}>{children}</group>;
}

function Motion({ o, still, parallax, light, sun }: { o: Orientation | null; still: boolean; parallax: boolean; light: React.RefObject<THREE.DirectionalLight | null>; sun: React.RefObject<THREE.Mesh | null> }) {
  const target = useMemo(() => new THREE.Vector3(0, 1.3, 0), []);
  const base = useMemo(() => {
    const ac = ((o?.azimuthDeg ?? 180) + 38) * DEG;
    const e = 22 * DEG, d = 10.4;
    return new THREE.Spherical().setFromVector3(new THREE.Vector3(Math.sin(ac) * Math.cos(e) * d, Math.sin(e) * d, -Math.cos(ac) * Math.cos(e) * d));
  }, [o?.azimuthDeg]);
  const s = useRef({ v: new THREE.Vector3(), d: new THREE.Vector3(), px: 0, py: 0 });
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 2.2);
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * k;
    s.current.py += ((parallax ? state.pointer.y : 0) - s.current.py) * k;
    const drift = still ? 0 : 1;
    s.current.v.setFromSphericalCoords(base.radius, base.phi + drift * Math.sin(t * 0.08) * 0.01 - s.current.py * 0.02, base.theta + drift * Math.sin(t * 0.1) * 0.05 + s.current.px * 0.06).add(target);
    state.camera.position.copy(s.current.v);
    state.camera.lookAt(target);

    // The sun travels its path from morning to evening and back, slowly; the
    // light follows it so the shadows move. Held near noon under reduced motion.
    const phi = (o?.latitude ?? 0) * DEG;
    const h = o ? (still ? -0.35 : Math.sin(t * 0.09) * 1.2) : 0;
    const dir = sunDir(h, phi, s.current.d);
    if (!o) dir.set(0.35, 0.9, 0.3).normalize();
    if (sun.current) sun.current.position.copy(dir).multiplyScalar(SUN_R);
    if (light.current) light.current.position.set(dir.x * 12, Math.max(dir.y, 0.35) * 12, dir.z * 12);
  });
  return null;
}

function SunPath({ latitude }: { latitude: number }) {
  const geo = useMemo(() => {
    const phi = latitude * DEG;
    const pts: THREE.Vector3[] = [];
    for (let h = -95; h <= 95; h += 5) {
      const d = sunDir(h * DEG, phi);
      if (d.y > -0.05) pts.push(d.multiplyScalar(SUN_R));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.018, 6, false);
  }, [latitude]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={SUN} transparent opacity={0.65} />
    </mesh>
  );
}

function Scene({ o, still, parallax }: { o: Orientation | null; still: boolean; parallax: boolean }) {
  const kit = useMemo<Kit>(() => makeRoofKit([7, 7]), []);
  const compass = useMemo(() => compassTexture(), []);
  useEffect(() => () => { Object.values(kit).forEach((t) => t.dispose()); compass.dispose(); }, [kit, compass]);
  const light = useRef<THREE.DirectionalLight>(null);
  const sun = useRef<THREE.Mesh>(null);
  // The recommendation's own midpoint; before one exists, an illustrative mounting angle while turning.
  const tiltMid = o ? (o.tiltMinDeg + o.tiltMaxDeg) / 2 : still ? 0 : 18;

  return (
    <>
      <hemisphereLight args={["#eef2f6", "#c9bea8", 0.8]} />
      <directionalLight
        ref={light}
        position={[6, 10, 4]}
        intensity={2.7}
        color="#ffe6c6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-radius={3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-6, 4, 9]} intensity={0.45} color="#dfe8f4" />
      <Sky />
      <Motion o={o} still={still} parallax={parallax} light={light} sun={sun} />
      <Deck kit={kit} />
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <circleGeometry args={[3.1, 96]} />
        <meshBasicMaterial map={compass} transparent depthWrite={false} />
      </mesh>
      {o && <Arrow azimuthDeg={o.azimuthDeg} />}
      <Turntable active={!o && !still} yaw={Math.PI - (o?.azimuthDeg ?? 180) * DEG}>
        <Mount tiltDeg={tiltMid} cells={kit.cells} />
        {o && <TiltBand minDeg={o.tiltMinDeg} maxDeg={o.tiltMaxDeg} />}
      </Turntable>
      {o && <SunPath latitude={o.latitude} />}
      <mesh ref={sun} visible={Boolean(o)}>
        <sphereGeometry args={[0.15, 32, 16]} />
        <meshBasicMaterial color="#ffc766" />
      </mesh>
    </>
  );
}

export default function OrientationScene({ orientation, paused = false, still = false, economy = false, parallax = true }: {
  orientation: Orientation | null;
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
      camera={{ position: [7, 7, 10], fov: 34, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene o={orientation} still={still || paused} parallax={parallax && !still} />
    </Canvas>
  );
}
