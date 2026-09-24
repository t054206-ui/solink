"use client";

import { useEffect, useMemo } from "react";
import { logoTexture } from "./logoTexture";

/**
 * A small Solink mark printed on a surface in a scene: flat, matte, sized
 * like a maker's plate. `w` is its width in metres; the height follows the
 * label's proportions. Kept small on purpose: it signs the object, it does
 * not advertise.
 */
export function LogoDecal({ position, rotation = [0, 0, 0], w = 0.32, word = true, ink = "#1a3a63" }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  w?: number;
  word?: boolean;
  ink?: string;
}) {
  const tex = useMemo(() => logoTexture({ word, ink, width: word ? 512 : 160, height: 160 }), [word, ink]);
  useEffect(() => () => tex.dispose(), [tex]);
  const h = word ? w * (160 / 512) : w;
  return (
    <mesh position={position} rotation={rotation} renderOrder={3}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} transparent roughness={0.7} metalness={0.1} polygonOffset polygonOffsetFactor={-2} depthWrite={false} />
    </mesh>
  );
}
