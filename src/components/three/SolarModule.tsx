"use client";

import type * as THREE from "three";

/**
 * One module at any catalogue size, built the way the Home Overview rooftop
 * builds its modules: an anodised frame with depth and a lip, a white
 * backsheet, the landing module's cells set just below the lip, and a clear
 * glass coat that carries the sky reflection.
 *
 * Lies in its own XY plane facing +Z; the caller places and tilts it. `w` and
 * `h` are metres and come from the caller's data (the catalogue in the
 * Designer), never from here.
 */
const FRAME_D = 0.035;
const FRAME_W = 0.03;
const METAL = "#c3c8cf";

export function SolarModule({ w, h, cells, shadows = true }: { w: number; h: number; cells: THREE.Texture; shadows?: boolean }) {
  const lipW = w / 2 - FRAME_W / 2;
  const lipH = h / 2 - FRAME_W / 2;
  const innerW = w - FRAME_W * 2 + 0.004;
  const innerH = h - FRAME_W * 2 + 0.004;
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[s * lipW, 0, 0]} castShadow={shadows} receiveShadow>
          <boxGeometry args={[FRAME_W, h, FRAME_D]} />
          <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[0, s * lipH, 0]} castShadow={shadows} receiveShadow>
          <boxGeometry args={[w, FRAME_W, FRAME_D]} />
          <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0, -FRAME_D / 2 + 0.004]} castShadow={shadows}>
        <boxGeometry args={[w - 0.01, h - 0.01, 0.004]} />
        <meshStandardMaterial color="#e9e8e3" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, FRAME_D / 2 - 0.006]} receiveShadow>
        <boxGeometry args={[innerW, innerH, 0.003]} />
        <meshPhysicalMaterial map={cells} metalness={0.22} roughness={0.3} envMapIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0, FRAME_D / 2 - 0.002]}>
        <boxGeometry args={[innerW, innerH, 0.002]} />
        <meshPhysicalMaterial color="#e8eef6" transparent opacity={0.1} roughness={0.04} metalness={0} clearcoat={1} clearcoatRoughness={0.03} envMapIntensity={1.3} depthWrite={false} />
      </mesh>
    </group>
  );
}
