"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";
import { SolarModule } from "./SolarModule";
import { Sky } from "./RoofScene";

/**
 * Compare's test bench: the selected panels standing side by side on a rack,
 * each at the length and width its own record states, so a bigger module
 * really is bigger. A panel whose record does not state its size is drawn as
 * an empty outline at a nominal size instead: its size is unknown, and the
 * caller says so. Order is the comparison's column order (A, B, C, D).
 */

export interface BenchPanel { w: number | null; h: number | null }

const NOMINAL = { w: 1.134, h: 1.722 };
const LEAN = (14 * Math.PI) / 180;
const YAW = [-0.1, -0.035, 0.035, 0.1];

function Ghost({ w, h }: { w: number; h: number }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, 0.035)), [w, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#8d949c" transparent opacity={0.8} />
    </lineSegments>
  );
}

function Bench({ panels, cells }: { panels: BenchPanel[]; cells: THREE.Texture }) {
  const sized = panels.map((p) => ({ known: p.w !== null && p.h !== null, w: p.w ?? NOMINAL.w, h: p.h ?? NOMINAL.h }));
  const gap = 0.45;
  const total = sized.reduce((s, p) => s + p.w, 0) + gap * (sized.length - 1);
  // Each panel's centre along the rack, worked out before rendering.
  const centres = sized.map((p, i) => -total / 2 + sized.slice(0, i).reduce((s, q) => s + q.w + gap, 0) + p.w / 2);
  return (
    <group>
      {/* The rack: a low steel beam the modules stand on. */}
      <mesh position={[0, 0.05, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[total + 0.6, 0.06, 0.12]} />
        <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.02, 0.05]} receiveShadow>
        <boxGeometry args={[total + 0.9, 0.04, 0.5]} />
        <meshStandardMaterial color="#e6e1d8" roughness={0.8} />
      </mesh>
      {sized.map((p, i) => {
        const cx = centres[i];
        const y = 0.08 + (Math.cos(LEAN) * p.h) / 2;
        return (
          <group key={i} position={[cx, 0, 0]} rotation={[0, YAW[i] ?? 0, 0]}>
            <group position={[0, y, -(Math.sin(LEAN) * p.h) / 2 + 0.05]} rotation={[-LEAN, 0, 0]}>
              {p.known ? <SolarModule w={p.w} h={p.h} cells={cells} /> : <Ghost w={p.w} h={p.h} />}
            </group>
            {/* A single back strut. */}
            <mesh position={[0, 0.45, -0.34]} rotation={[0.42, 0, 0]} castShadow>
              <boxGeometry args={[0.04, 0.9, 0.03]} />
              <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.35} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Camera({ span, parallax }: { span: number; parallax: boolean }) {
  const target = useMemo(() => new THREE.Vector3(0, 0.9, 0), []);
  const s = useRef({ px: 0 });
  useFrame((state, dt) => {
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * Math.min(1, dt * 2);
    const d = Math.max(4.8, span * 1.3 + 2.6);
    state.camera.position.set(s.current.px * 0.5, 1.35, d);
    state.camera.lookAt(target);
  });
  return null;
}

export default function BenchScene({ panels, paused = false, still = false, economy = false, parallax = true }: { panels: BenchPanel[]; paused?: boolean; still?: boolean; economy?: boolean; parallax?: boolean }) {
  const cells = useMemo(() => { const t = makeCellTexture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }, []);
  useEffect(() => () => cells.dispose(), [cells]);
  const span = panels.reduce((s, p) => s + (p.w ?? NOMINAL.w), 0) + 0.45 * Math.max(0, panels.length - 1);
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 1.15, 4], fov: 30, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      {/* Even, technical light: two soft keys from either side so no panel is favoured. */}
      <hemisphereLight args={["#f3f5f7", "#d3cdc2", 0.75]} />
      <directionalLight position={[-4, 5, 4]} intensity={1.6} color="#fff6ea" castShadow shadow-mapSize={[1024, 1024]} shadow-radius={4} shadow-bias={-0.0004} />
      <directionalLight position={[4, 5, 4]} intensity={1.3} color="#eef3fa" />
      <Sky />
      <Camera span={span} parallax={parallax && !still} />
      <Bench panels={panels} cells={cells} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.28} scale={Math.max(6, span + 2)} blur={2.4} far={2.2} resolution={economy ? 256 : 512} />
    </Canvas>
  );
}
