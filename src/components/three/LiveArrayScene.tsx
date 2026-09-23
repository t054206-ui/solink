"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SolarModule } from "./SolarModule";
import { Sky, makeRoofKit, type Kit } from "./RoofScene";

/**
 * Monitor's live view: the system's own array, seen from above at a
 * technical angle, with its string cable running to the inverter.
 *
 * Everything that looks like a reading follows data the page already has:
 * - `count` is the system record's panel count; that many modules are drawn.
 * - `health` is the system-level status the page derives from its
 *   production records, and it lights only the inverter's status lamp.
 *   There is no per-panel data source, so no module is coloured: per-panel
 *   state is unknown and every module looks the same.
 * - `producing` is true only when today's production has a recorded value;
 *   then, and only then, a slow amber pulse runs along the string cable.
 */

/** The same four states as the Monitor pages' health marks (`monitoring/_components/health.tsx`). */
export type Health = "good" | "attention" | "problem" | "unknown";
const LAMP: Record<Health, string> = { good: "#3fa46a", attention: "#e0a02a", problem: "#d0463b", unknown: "#9aa0ab" };

const W = 1.134;
const H = 1.722;
const GAP = 0.03;
const TILT = (10 * Math.PI) / 180;

function layout(count: number) {
  const cols = count <= 8 ? count : count <= 20 ? Math.ceil(count / 2) : Math.ceil(count / Math.ceil(count / 12));
  const rows = Math.ceil(count / cols);
  return { cols, rows, width: cols * W + (cols - 1) * GAP, pitch: H * Math.cos(TILT) + 0.9 };
}

function Array_({ count, kit, producing, still, health }: { count: number; kit: Kit; producing: boolean; still: boolean; health: Health }) {
  const { cols, rows, width, pitch } = layout(count);
  const depth = rows * pitch;
  const pulse = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!pulse.current) return;
    pulse.current.visible = producing && !still;
    const u = (state.clock.elapsedTime * 0.12) % 1;
    pulse.current.position.x = -width / 2 - 0.6 + u * (width + 1.8);
  });
  const slabW = width + 3.2, slabD = depth + 2.2;
  return (
    <group>
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[slabW, 0.3, slabD]} />
        <meshStandardMaterial map={kit.plaster} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[slabW - 0.3, slabD - 0.3]} />
        <meshStandardMaterial map={kit.pavers} roughness={0.95} />
      </mesh>
      {Array.from({ length: count }, (_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const x = -width / 2 + W / 2 + c * (W + GAP);
        const z = -depth / 2 + pitch / 2 + r * pitch;
        return (
          <group key={i} position={[x, 0.22 + (Math.sin(TILT) * H) / 2, z]} rotation={[-(Math.PI / 2 - TILT), 0, 0]}>
            <SolarModule w={W} h={H} cells={kit.cells} />
          </group>
        );
      })}
      {/* String cable along the front edge, to the inverter. */}
      <mesh position={[0.3, 0.05, depth / 2 + 0.45]} castShadow>
        <boxGeometry args={[width + 1.8, 0.05, 0.1]} />
        <meshStandardMaterial color="#a4a9b0" metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh ref={pulse} position={[0, 0.085, depth / 2 + 0.45]} visible={false}>
        <boxGeometry args={[0.5, 0.02, 0.06]} />
        <meshBasicMaterial color="#f0a02a" transparent opacity={0.85} />
      </mesh>
      {/* Inverter, with the one lamp that shows the system status. */}
      <group position={[width / 2 + 1.1, 0, depth / 2 + 0.45]}>
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.7, 0.25]} />
          <meshStandardMaterial color="#e9e7e2" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.52, 0.126]}>
          <circleGeometry args={[0.035, 24]} />
          <meshBasicMaterial color={LAMP[health]} />
        </mesh>
        <mesh position={[0, 0.35, 0.126]}>
          <planeGeometry args={[0.36, 0.14]} />
          <meshStandardMaterial color="#2a3441" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function Camera({ span, parallax, still }: { span: number; parallax: boolean; still: boolean }) {
  const target = useMemo(() => new THREE.Vector3(0.4, 0, 0.3), []);
  const s = useRef({ px: 0 });
  useFrame((state, dt) => {
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * Math.min(1, dt * 2);
    const d = span * 1.05 + 3;
    const drift = still ? 0 : Math.sin(state.clock.elapsedTime * 0.08) * 0.04;
    const a = -0.35 + drift + s.current.px * 0.05;
    state.camera.position.set(Math.sin(a) * d * 0.62, d * 0.85, Math.cos(a) * d * 0.62);
    state.camera.lookAt(target);
  });
  return null;
}

function Scene({ count, producing, health, still, parallax }: { count: number; producing: boolean; health: Health; still: boolean; parallax: boolean }) {
  const { width, rows, pitch } = layout(count);
  const kit = useMemo<Kit>(() => { const k = makeRoofKit([width + 2.9, rows * pitch + 1.9]); return k; }, [width, rows, pitch]);
  useEffect(() => () => Object.values(kit).forEach((t) => t.dispose()), [kit]);
  const span = Math.max(width, rows * pitch);
  return (
    <>
      <hemisphereLight args={["#eef2f6", "#c9bea8", 0.8]} />
      <directionalLight position={[span, span * 1.2 + 4, span * 0.4]} intensity={2.6} color="#ffe6c6" castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span} shadow-camera-right={span} shadow-camera-top={span} shadow-camera-bottom={-span} shadow-camera-far={span * 6} shadow-radius={3} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <Sky />
      <Camera span={span} parallax={parallax} still={still} />
      <Array_ count={count} kit={kit} producing={producing} still={still} health={health} />
    </>
  );
}

export default function LiveArrayScene({ count, producing, health, paused = false, still = false, economy = false, parallax = true }: {
  count: number; producing: boolean; health: Health; paused?: boolean; still?: boolean; economy?: boolean; parallax?: boolean;
}) {
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: [-4, 12, 10], fov: 30, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene count={count} producing={producing} health={health} still={still || paused} parallax={parallax && !still} />
    </Canvas>
  );
}
