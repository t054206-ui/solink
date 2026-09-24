"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";
import { SolarModule } from "./SolarModule";
import { Sky } from "./RoofScene";
import { LogoDecal } from "./LogoDecal";

/**
 * The Savings Calculator's own scene: panel → energy → calculation → savings.
 *
 * A module on a low stand feeds a thin energy line into a precision desk
 * calculator; beside it, a row of year slabs traces the savings the
 * calculator has worked out. Nothing here invents a figure:
 *
 * - `display` is the calculator's own annual-savings result, drawn on the
 *   screen as text, or null for a neutral "ready" screen.
 * - `trajectory` is the calculator's own cumulative-savings series,
 *   normalised to 0–1, one value per year; null draws flat, neutral slabs.
 * - `paybackYear` (from the calculator) colours the slabs from that year on.
 * - `flowing` is true only when the calculator has an annual production figure.
 */

export interface CalcSceneData {
  display: { value: string; unit: string } | null;
  trajectory: number[] | null;
  paybackYear: number | null;
  flowing: boolean;
}

const TILT = (24 * Math.PI) / 180;
const MODULE = { w: 1.0, h: 1.6 };
const NEUTRAL_SLABS = 20;

/** The calculator's screen, painted from the result it is given. */
function useScreenTexture(display: CalcSceneData["display"]) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 200;
    const g = c.getContext("2d")!;
    g.fillStyle = "#1b2a22"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#c9dcc9"; g.font = "600 26px ui-monospace, monospace"; g.textBaseline = "top";
    g.fillText("ANNUAL SAVINGS", 28, 22);
    g.textAlign = "right";
    if (display) {
      g.fillStyle = "#e8f2e4"; g.font = "600 84px ui-monospace, monospace"; g.textBaseline = "alphabetic";
      g.fillText(display.value, c.width - 28, 150);
      g.font = "500 26px ui-monospace, monospace"; g.fillStyle = "#c9dcc9";
      g.fillText(display.unit, c.width - 30, 184);
    } else {
      g.fillStyle = "#8fa894"; g.font = "600 64px ui-monospace, monospace"; g.textBaseline = "alphabetic";
      g.fillText("READY", c.width - 28, 150);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }, [display]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Calculator({ display }: { display: CalcSceneData["display"] }) {
  const screen = useScreenTexture(display);
  const keys = useMemo(() => {
    const out: { x: number; z: number; accent: boolean }[] = [];
    for (let r = 0; r < 5; r++) for (let col = 0; col < 4; col++) out.push({ x: -0.21 + col * 0.14, z: -0.02 + r * 0.115, accent: r === 4 && col === 3 });
    return out;
  }, []);
  return (
    <group rotation={[0.14, 0, 0]}>
      <RoundedBox args={[0.66, 0.07, 0.98]} radius={0.03} smoothness={4} position={[0, 0.035, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1a3a63" roughness={0.45} metalness={0.15} />
      </RoundedBox>
      {/* Screen, recessed into the upper third. */}
      <mesh position={[0, 0.073, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.56, 0.22]} />
        <meshStandardMaterial map={screen} roughness={0.35} emissive="#ffffff" emissiveMap={screen} emissiveIntensity={0.35} />
      </mesh>
      {keys.map((k, i) => (
        <RoundedBox key={i} args={[0.11, 0.025, 0.085]} radius={0.012} smoothness={3} position={[k.x, 0.08, k.z]} castShadow>
          <meshStandardMaterial color={k.accent ? "#f0a02a" : "#ece7de"} roughness={0.5} />
        </RoundedBox>
      ))}
      <LogoDecal position={[0, 0.035, 0.492]} w={0.2} ink="#f4f3ef" />
    </group>
  );
}

function ModuleOnStand({ cells }: { cells: THREE.Texture }) {
  const lift = 0.14;
  const depth = Math.cos(TILT) * MODULE.h;
  return (
    <group>
      <group position={[0, lift + (Math.sin(TILT) * MODULE.h) / 2, 0]} rotation={[-(Math.PI / 2 - TILT), 0, 0]}>
        <SolarModule w={MODULE.w} h={MODULE.h} cells={cells} />
      </group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (MODULE.w / 2 - 0.08), lift / 2, depth / 2 - 0.08]} castShadow>
            <boxGeometry args={[0.035, lift, 0.035]} />
            <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[s * (MODULE.w / 2 - 0.08), (lift + Math.sin(TILT) * MODULE.h) / 2, -depth / 2 + 0.1]} castShadow>
            <boxGeometry args={[0.035, lift + Math.sin(TILT) * MODULE.h, 0.035]} />
            <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The line from the module to the calculator. Pulses run along it only while there is production to carry. */
function EnergyLine({ from, to, flowing, still }: { from: THREE.Vector3; to: THREE.Vector3; flowing: boolean; still: boolean }) {
  const curve = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5); mid.y = 0.02;
    return new THREE.CatmullRomCurve3([from, new THREE.Vector3(from.x + 0.15, 0.03, from.z), mid, new THREE.Vector3(to.x - 0.2, 0.03, to.z), to]);
  }, [from, to]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.012, 8, false), [curve]);
  useEffect(() => () => tube.dispose(), [tube]);
  const pulses = useRef<THREE.Mesh[]>([]);
  useFrame((state) => {
    if (!flowing) return;
    const t = still ? 0 : state.clock.elapsedTime;
    pulses.current.forEach((m, i) => {
      if (!m) return;
      const u = ((t * 0.22 + i / 3) % 1 + 1) % 1;
      m.position.copy(curve.getPointAt(u));
    });
  });
  return (
    <group>
      <mesh geometry={tube}>
        <meshStandardMaterial color={flowing ? "#d9a24a" : "#bdbab1"} roughness={0.6} />
      </mesh>
      {flowing && [0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { if (m) pulses.current[i] = m; }} position={curve.getPointAt(i / 3)}>
          <sphereGeometry args={[0.028, 16, 16]} />
          <meshStandardMaterial color="#f0a02a" emissive="#f0a02a" emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** One slab per year of the calculator's own cumulative-savings series; flat and neutral without it. */
function YearSlabs({ trajectory, paybackYear }: { trajectory: number[] | null; paybackYear: number | null }) {
  const values = trajectory ?? Array.from({ length: NEUTRAL_SLABS }, () => 0);
  const n = values.length;
  const span = 1.6;
  const step = span / Math.max(n, 1);
  return (
    <group>
      {values.map((v, i) => {
        const h = 0.03 + v * 0.62;
        const year = i + 1;
        const color = trajectory === null ? "#e3ddd2" : paybackYear !== null && year >= paybackYear ? "#3f7d59" : "#9fb3cc";
        return (
          <mesh key={i} position={[-span / 2 + step * (i + 0.5), h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[step * 0.72, h, 0.16]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
        );
      })}
    </group>
  );
}

function Camera({ parallax }: { parallax: boolean }) {
  const target = useMemo(() => new THREE.Vector3(0.1, 0.32, 0), []);
  const s = useRef({ px: 0, py: 0 });
  useFrame((state, dt) => {
    const k = Math.min(1, dt * 2);
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * k;
    s.current.py += ((parallax ? state.pointer.y : 0) - s.current.py) * k;
    state.camera.position.set(0.55 + s.current.px * 0.25, 2.35 + s.current.py * 0.12, 3.9);
    state.camera.lookAt(target);
  });
  return null;
}

export default function CalculatorScene({ data, paused = false, still = false, economy = false, parallax = true }: { data: CalcSceneData; paused?: boolean; still?: boolean; economy?: boolean; parallax?: boolean }) {
  const cells = useMemo(() => { const t = makeCellTexture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }, []);
  useEffect(() => () => cells.dispose(), [cells]);
  const from = useMemo(() => new THREE.Vector3(-0.72, 0.06, 0.62), []);
  const to = useMemo(() => new THREE.Vector3(0.18, 0.04, 0.55), []);
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: [0.55, 2.35, 3.9], fov: 30, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      {/* Dry midday light: a warm sun from the side, a cool fill, soft contact shadows. */}
      <hemisphereLight args={["#f2efe9", "#cfc7b9", 0.7]} />
      <directionalLight position={[-3.5, 5, 2.5]} intensity={2.3} color="#ffe6c4" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} />
      <directionalLight position={[3, 2, -2]} intensity={0.45} color="#dfe8f4" />
      <Sky />
      <Camera parallax={parallax && !still} />
      <group position={[-1.15, 0, -0.15]}>
        <ModuleOnStand cells={cells} />
      </group>
      <group position={[0.55, 0, 0.35]} rotation={[0, -0.28, 0]}>
        <Calculator display={data.display} />
      </group>
      <group position={[0.75, 0, -0.75]} rotation={[0, -0.18, 0]}>
        <YearSlabs trajectory={data.trajectory} paybackYear={data.paybackYear} />
      </group>
      <EnergyLine from={from} to={to} flowing={data.flowing} still={still || paused} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.32} scale={7} blur={2.6} far={1.8} resolution={economy ? 256 : 512} />
    </Canvas>
  );
}
