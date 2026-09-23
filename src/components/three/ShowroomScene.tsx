"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";
import { SolarModule } from "./SolarModule";
import { Sky } from "./RoofScene";

/**
 * The Marketplace's showroom: one module standing on a turntable plinth, the
 * way an engineered product is shown, turning slowly under soft studio
 * light. Not a roof and not a person's system: an object to look at.
 * Generic 1134 x 1722 mm module; the caller captions it as illustrative.
 */

const W = 1.134;
const H = 1.722;
const LEAN = (12 * Math.PI) / 180;

function Turntable({ still }: { still: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!g.current) return;
    if (still) { g.current.rotation.y = -0.5; return; }
    // A slow half-swing rather than a full spin: the face stays mostly toward the viewer.
    g.current.rotation.y = -0.5 + Math.sin(state.clock.elapsedTime * 0.18) * 0.55;
  });
  const cells = useMemo(() => { const t = makeCellTexture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }, []);
  useEffect(() => () => cells.dispose(), [cells]);
  return (
    <group ref={g}>
      {/* Plinth: a low turned disc with a darker bevel ring. */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 1.0, 0.12, 64]} />
        <meshStandardMaterial color="#efebe3" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.86, 0.95, 64]} />
        <meshStandardMaterial color="#d9d3c8" roughness={0.7} />
      </mesh>
      {/* The module on a slim stand, leaning back a little. */}
      <group position={[0, 0.13 + (Math.cos(LEAN) * H) / 2 + 0.04, 0]} rotation={[-LEAN, 0, 0]}>
        <SolarModule w={W} h={H} cells={cells} />
      </group>
      <mesh position={[0, 0.34, -0.26]} rotation={[0.55, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.6, 0.04]} />
        <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.15, 0.02]} castShadow>
        <boxGeometry args={[W * 0.9, 0.04, 0.08]} />
        <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Camera({ parallax }: { parallax: boolean }) {
  const target = useMemo(() => new THREE.Vector3(0, 0.95, 0), []);
  const s = useRef({ px: 0, py: 0 });
  useFrame((state, dt) => {
    const k = Math.min(1, dt * 2);
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * k;
    s.current.py += ((parallax ? state.pointer.y : 0) - s.current.py) * k;
    state.camera.position.set(1.8 + s.current.px * 0.35, 1.35 + s.current.py * 0.2, 4.5);
    state.camera.lookAt(target);
  });
  return null;
}

export default function ShowroomScene({ paused = false, still = false, economy = false, parallax = true }: { paused?: boolean; still?: boolean; economy?: boolean; parallax?: boolean }) {
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: [1.6, 1.25, 3.9], fov: 32, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      {/* Studio: a broad soft key from the upper left, a cool rim behind, a warm fill in front. */}
      <hemisphereLight args={["#f6f3ee", "#d6cfc2", 0.7]} />
      <directionalLight position={[-3, 5, 3]} intensity={2.3} color="#fff4e6" castShadow shadow-mapSize={[1024, 1024]} shadow-radius={4} shadow-bias={-0.0004} />
      <directionalLight position={[2.5, 2.5, -3]} intensity={1.1} color="#d9e6f5" />
      <pointLight position={[1.5, 1.2, 2.5]} intensity={0.6} color="#ffe9cc" />
      <Sky />
      <Camera parallax={parallax && !still} />
      <Turntable still={still || paused} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.32} scale={4.5} blur={2.6} far={2} resolution={economy ? 256 : 512} />
    </Canvas>
  );
}
