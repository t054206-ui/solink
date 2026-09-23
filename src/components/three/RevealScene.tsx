"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";
import { SolarModule } from "./SolarModule";
import { Sky } from "./RoofScene";

/**
 * The Recommendation's reveal: the top match presented on an angled display
 * plinth under a spotlight, rising into place once when it appears. Drawn at
 * the length and width the product's record states; when the record does
 * not state them, a nominal size is used and the caller says so.
 */

const NOMINAL = { w: 1.134, h: 1.722 };
const TILT = (26 * Math.PI) / 180;

function Presentation({ w, h, still }: { w: number; h: number; still: boolean }) {
  const g = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  const cells = useMemo(() => { const t = makeCellTexture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }, []);
  useEffect(() => () => cells.dispose(), [cells]);
  useFrame((state) => {
    if (!g.current) return;
    if (still) { g.current.position.y = 0; g.current.rotation.y = 0.35; return; }
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - t0.current;
    const rise = Math.min(1, t / 1.4);
    const ease = 1 - Math.pow(1 - rise, 3);
    g.current.position.y = (1 - ease) * -0.25;
    g.current.rotation.y = 0.35 + Math.sin(t * 0.12) * 0.12;
  });
  const depth = Math.cos(TILT) * h;
  return (
    <group ref={g}>
      {/* Display plinth: a slab with a slanted top the module lies on. */}
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.5, 0.18, depth + 0.5]} />
        <meshStandardMaterial color="#ece7de" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.183, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 0.5, depth + 0.5]} />
        <meshStandardMaterial color="#e3ddd2" roughness={0.7} />
      </mesh>
      <group position={[0, 0.2 + (Math.sin(TILT) * h) / 2, 0]} rotation={[-(Math.PI / 2 - TILT), 0, 0]}>
        <SolarModule w={w} h={h} cells={cells} />
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.1), 0.2 + (Math.sin(TILT) * h) / 2 - 0.06, -depth / 2 + 0.12]} castShadow>
          <boxGeometry args={[0.04, Math.sin(TILT) * h, 0.04]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Camera({ size, parallax }: { size: number; parallax: boolean }) {
  const target = useMemo(() => new THREE.Vector3(0, 0.45, 0), []);
  const s = useRef({ px: 0, py: 0 });
  useFrame((state, dt) => {
    const k = Math.min(1, dt * 2);
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * k;
    s.current.py += ((parallax ? state.pointer.y : 0) - s.current.py) * k;
    const d = 2.3 + size * 1.2;
    state.camera.position.set(-d * 0.55 + s.current.px * 0.3, d * 0.62 + s.current.py * 0.15, d * 0.78);
    state.camera.lookAt(target);
  });
  return null;
}

export default function RevealScene({ w, h, paused = false, still = false, economy = false, parallax = true }: { w: number | null; h: number | null; paused?: boolean; still?: boolean; economy?: boolean; parallax?: boolean }) {
  const W = w ?? NOMINAL.w;
  const Hh = h ?? NOMINAL.h;
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: [-2, 2.4, 3], fov: 30, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      {/* The reveal: a low ambient and one warm spotlight from above, so the module is the lit thing in the room. */}
      <hemisphereLight args={["#f2efe9", "#cfc7b9", 0.45]} />
      <spotLight position={[0.6, 4.6, 1.4]} angle={0.42} penumbra={0.75} intensity={42} decay={1.6} color="#fff1dc" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <directionalLight position={[-3, 2, -2]} intensity={0.55} color="#dfe8f4" />
      <Sky />
      <Camera size={Math.max(W, Hh)} parallax={parallax && !still} />
      <Presentation w={W} h={Hh} still={still || paused} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={5} blur={2.8} far={1.6} resolution={economy ? 256 : 512} />
    </Canvas>
  );
}
