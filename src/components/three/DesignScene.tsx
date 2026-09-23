"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Sky, makeRoofKit, type Kit } from "./RoofScene";
import { SolarModule } from "./SolarModule";
import { buildShrub } from "./roofDetails";

/**
 * The Solar Designer's plan, in perspective.
 *
 * Everything here comes from the Designer's own state, passed in as plan
 * rectangles in metres (origin top-left, x right, y down, which becomes world
 * x and z): the roof at the size the person typed, each panel at the
 * catalogue size and position the plan gives it, and every obstacle and
 * block where it was placed. Nothing is added to the plan.
 *
 * What the plan does not say, the scene does not claim: panels are drawn flat
 * on low rails (the plan is a footprint), obstacles and blocks stand at fixed
 * nominal heights, and the parapet is a visual edge. The caller's caption
 * says so.
 */

export interface PlanRect { x: number; y: number; w: number; h: number }
export interface PlanBlock extends PlanRect { kind: "walkway" | "planter" | "seating" | "pergola" | "custom" }
export interface Plan { length: number; width: number; panels: PlanRect[]; obstacles: PlanRect[]; blocks: PlanBlock[] }

/** Nominal heights for things the plan gives only a footprint for. */
const OBSTACLE_H = 0.9;
const RAIL_H = 0.12;

function Roof({ plan, kit }: { plan: Plan; kit: Kit }) {
  const { length: L, width: W } = plan;
  const wall = <meshStandardMaterial map={kit.plaster} roughness={0.92} />;
  const coping = <meshStandardMaterial map={kit.plaster} color="#faf7f1" roughness={0.85} />;
  const P = 0.18, H = 0.5;
  return (
    <group>
      <mesh position={[0, -1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[L + P * 2, 2.2, W + P * 2]} />
        {wall}
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial map={kit.pavers} roughness={0.96} />
      </mesh>
      {[
        { p: [0, H / 2, -W / 2 - P / 2], s: [L + P * 2, H, P] },
        { p: [0, H / 2, W / 2 + P / 2], s: [L + P * 2, H * 0.6, P] },
        { p: [-L / 2 - P / 2, H / 2, 0], s: [P, H, W] },
        { p: [L / 2 + P / 2, H / 2, 0], s: [P, H, W] },
      ].map(({ p, s }, i) => (
        <group key={i}>
          <mesh position={[p[0], s[1] / 2, p[2]]} castShadow receiveShadow>
            <boxGeometry args={s as [number, number, number]} />
            {wall}
          </mesh>
          <mesh position={[p[0], s[1] + 0.025, p[2]]} castShadow>
            <boxGeometry args={[s[0] + 0.06, 0.05, s[2] + 0.06]} />
            {coping}
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Plan rectangle to world centre. */
function centre(r: PlanRect, plan: Plan): [number, number] {
  return [r.x + r.w / 2 - plan.length / 2, r.y + r.h / 2 - plan.width / 2];
}

function Panels({ plan, kit }: { plan: Plan; kit: Kit }) {
  return (
    <>
      {plan.panels.map((r, i) => {
        const [x, z] = centre(r, plan);
        return (
          <group key={i} position={[x, 0, z]}>
            <group position={[0, RAIL_H + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <SolarModule w={r.w} h={r.h} cells={kit.cells} />
            </group>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0, RAIL_H / 2, s * r.h * 0.3]} castShadow receiveShadow>
                <boxGeometry args={[r.w * 0.96, RAIL_H, 0.04]} />
                <meshStandardMaterial color="#b4b9c0" metalness={0.7} roughness={0.4} />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
}

function Obstacles({ plan, kit }: { plan: Plan; kit: Kit }) {
  return (
    <>
      {plan.obstacles.map((r, i) => {
        const [x, z] = centre(r, plan);
        return (
          <mesh key={i} position={[x, OBSTACLE_H / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[r.w, OBSTACLE_H, r.h]} />
            <meshStandardMaterial map={kit.plaster} color="#e2dccf" roughness={0.85} />
          </mesh>
        );
      })}
    </>
  );
}

function Planter({ r, plan, kit, index }: { r: PlanRect; plan: Plan; kit: Kit; index: number }) {
  const [x, z] = centre(r, plan);
  const shrubs = useMemo(() => {
    const n = Math.max(1, Math.min(6, Math.round(Math.max(r.w, r.h) / 0.9)));
    const along = r.w >= r.h;
    return Array.from({ length: n }, (_, k) => {
      const t = (k + 0.5) / n - 0.5;
      const s = buildShrub(90 + index * 7 + k, [Math.min(r.w, r.h) * 0.42, 0.3, Math.min(r.w, r.h) * 0.42], 260);
      s.object.position.set(along ? t * r.w : 0, 0.47, along ? 0 : t * r.h);
      return s;
    });
  }, [r.w, r.h, index]);
  useEffect(() => () => shrubs.forEach((s) => s.dispose()), [shrubs]);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
        <boxGeometry args={[r.w, 0.46, r.h]} />
        <meshStandardMaterial map={kit.plaster} color="#ddd5c6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.462, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Math.max(0.05, r.w - 0.08), Math.max(0.05, r.h - 0.08)]} />
        <meshStandardMaterial map={kit.gravel} roughness={1} />
      </mesh>
      {shrubs.map((s, k) => <primitive key={k} object={s.object} />)}
    </group>
  );
}

function Pergola({ r, plan }: { r: PlanRect; plan: Plan }) {
  const [x, z] = centre(r, plan);
  const posts: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const slats = Math.max(2, Math.round(r.w / 0.35));
  const wood = <meshStandardMaterial color="#b89a74" roughness={0.8} />;
  return (
    <group position={[x, 0, z]}>
      {posts.map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * (r.w / 2 - 0.06), 1.2, sz * (r.h / 2 - 0.06)]} castShadow>
          <boxGeometry args={[0.1, 2.4, 0.1]} />
          {wood}
        </mesh>
      ))}
      {[-1, 1].map((sz) => (
        <mesh key={sz} position={[0, 2.35, sz * (r.h / 2 - 0.06)]} castShadow>
          <boxGeometry args={[r.w, 0.12, 0.08]} />
          {wood}
        </mesh>
      ))}
      {Array.from({ length: slats }, (_, k) => (
        <mesh key={k} position={[-r.w / 2 + (k + 0.5) * (r.w / slats), 2.45, 0]} castShadow>
          <boxGeometry args={[0.05, 0.08, r.h + 0.1]} />
          {wood}
        </mesh>
      ))}
    </group>
  );
}

function Blocks({ plan, kit }: { plan: Plan; kit: Kit }) {
  return (
    <>
      {plan.blocks.map((b, i) => {
        if (b.kind === "planter") return <Planter key={i} r={b} plan={plan} kit={kit} index={i} />;
        if (b.kind === "pergola") return <Pergola key={i} r={b} plan={plan} />;
        const [x, z] = centre(b, plan);
        const h = b.kind === "walkway" ? 0.025 : b.kind === "seating" ? 0.44 : 0.3;
        const color = b.kind === "walkway" ? "#ece6da" : b.kind === "seating" ? "#b89a74" : "#cfd6df";
        return (
          <mesh key={i} position={[x, h / 2, z]} castShadow={b.kind !== "walkway"} receiveShadow>
            <boxGeometry args={[b.w, h, b.h]} />
            <meshStandardMaterial map={b.kind === "walkway" ? kit.plaster : null} color={color} roughness={0.85} />
          </mesh>
        );
      })}
    </>
  );
}

function Motion({ plan, still, parallax }: { plan: Plan; still: boolean; parallax: boolean }) {
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const base = useMemo(() => {
    const span = Math.max(plan.length, plan.width);
    const d = span * 1.05 + 3.5;
    const ac = -34 * (Math.PI / 180), e = 38 * (Math.PI / 180);
    return new THREE.Spherical().setFromVector3(new THREE.Vector3(Math.sin(ac) * Math.cos(e) * d, Math.sin(e) * d, Math.cos(ac) * Math.cos(e) * d));
  }, [plan.length, plan.width]);
  const s = useRef({ v: new THREE.Vector3(), px: 0, py: 0 });
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 2.2);
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * k;
    s.current.py += ((parallax ? state.pointer.y : 0) - s.current.py) * k;
    const drift = still ? 0 : 1;
    s.current.v.setFromSphericalCoords(base.radius, base.phi + drift * Math.sin(t * 0.08) * 0.01 - s.current.py * 0.03, base.theta + drift * Math.sin(t * 0.1) * 0.04 + s.current.px * 0.08).add(target);
    state.camera.position.copy(s.current.v);
    state.camera.lookAt(target);
  });
  return null;
}

function Scene({ plan, still, parallax }: { plan: Plan; still: boolean; parallax: boolean }) {
  const kit = useMemo<Kit>(() => makeRoofKit([plan.length, plan.width]), [plan.length, plan.width]);
  useEffect(() => () => Object.values(kit).forEach((t) => t.dispose()), [kit]);
  const span = Math.max(plan.length, plan.width) / 2 + 2;
  return (
    <>
      <hemisphereLight args={["#eef2f6", "#c9bea8", 0.8]} />
      <directionalLight
        position={[span * 1.2, span * 1.1 + 4, span * 0.3]}
        intensity={2.7}
        color="#ffe6c6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={1}
        shadow-camera-far={span * 6}
        shadow-radius={3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-6, 4, 9]} intensity={0.45} color="#dfe8f4" />
      <Sky />
      <Motion plan={plan} still={still} parallax={parallax} />
      <Roof plan={plan} kit={kit} />
      <Obstacles plan={plan} kit={kit} />
      <Blocks plan={plan} kit={kit} />
      <Panels plan={plan} kit={kit} />
    </>
  );
}

export default function DesignScene({ plan, paused = false, still = false, economy = false, parallax = true }: {
  plan: Plan;
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
      camera={{ position: [-8, 10, 14], fov: 32, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene plan={plan} still={still || paused} parallax={parallax && !still} />
    </Canvas>
  );
}
