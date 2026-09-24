"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";
import { SolarModule } from "./SolarModule";
import { Sky } from "./RoofScene";
import { plasterTexture, rng } from "./roofDetails";
import { LogoDecal } from "./LogoDecal";

/**
 * Maintenance's scene: close up on one corner of a module, the way a
 * technician sees it. Fine desert dust lies over most of the glass, a brush
 * has cleared a swath through it, a few water beads sit on the clean glass,
 * and the mounting rail shows underneath. An illustration of what cleaning
 * is, not a picture of anyone's panel; it measures nothing.
 */

const W = 1.134;
const H = 1.722;
const TILT = (22 * Math.PI) / 180;

/** Opaque white-to-black mask (alphaMap reads green): dust everywhere except a soft-edged cleaned swath. */
function dustMask() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 768;
  const ctx = c.getContext("2d");
  if (ctx) {
    const r = rng(83);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 512, 768);
    // Dust: fine grain, denser towards the lower edge where it collects.
    // A soft even film first, so the cleaned swath reads as clearly cleaner.
    ctx.fillStyle = "#3a3a3a"; ctx.fillRect(0, 0, 512, 768);
    for (let i = 0; i < 60000; i++) {
      const y = r() * 768;
      const density = 0.35 + (y / 768) * 0.55;
      if (r() > density) continue;
      const g = 150 + Math.floor(r() * 105);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(r() * 512, y, 1 + r() * 2, 1 + r() * 2);
    }
    // A few streaks where dew dried.
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const x = r() * 512; ctx.beginPath(); ctx.moveTo(x, 420 + r() * 200); ctx.lineTo(x + (r() - 0.5) * 20, 768); ctx.stroke(); }
    // The cleaned swath: a soft diagonal band wiped back to black.
    ctx.save();
    ctx.translate(256, 384); ctx.rotate(-0.5);
    const grad = ctx.createLinearGradient(-150, 0, 150, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(0.18, "rgba(0,0,0,1)"); grad.addColorStop(0.82, "rgba(0,0,0,1)"); grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad; ctx.fillRect(-150, -700, 300, 1400);
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

function Beads() {
  const pts = useMemo(() => {
    const r = rng(97);
    return Array.from({ length: 26 }, () => ({ x: (r() - 0.5) * 0.5, y: (r() - 0.5) * 0.9, s: 0.006 + r() * 0.012 }));
  }, []);
  return (
    <group rotation={[0, 0, 0.5]}>
      {pts.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0.022]} scale={[1, 1, 0.45]}>
          <sphereGeometry args={[p.s, 16, 10]} />
          <meshPhysicalMaterial color="#ffffff" transmission={0.9} roughness={0.05} thickness={0.01} ior={1.33} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Brush() {
  return (
    <group position={[0.34, 0.38, 0.05]} rotation={[0, 0, -0.95]}>
      <mesh position={[0, 0.55, 0.02]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 1.1, 16]} />
        <meshStandardMaterial color="#c9ced5" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.03]} castShadow>
        <boxGeometry args={[0.34, 0.07, 0.05]} />
        <meshStandardMaterial color="#1a3a63" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.004]} castShadow>
        <boxGeometry args={[0.32, 0.06, 0.02]} />
        <meshStandardMaterial color="#e8e3d8" roughness={0.95} />
      </mesh>
    </group>
  );
}

/** The roof around the close-up: a parapet and a second row, softened by distance haze for depth. */
function Context({ cells }: { cells: THREE.Texture }) {
  const plaster = useMemo(() => plasterTexture(), []);
  useEffect(() => () => plaster.dispose(), [plaster]);
  return (
    <group>
      <mesh position={[0, -0.002, -1.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial map={plaster} color="#e2dccf" roughness={0.95} />
      </mesh>
      <mesh position={[-0.6, 0.45, -3.6]} castShadow receiveShadow>
        <boxGeometry args={[7, 0.9, 0.22]} />
        <meshStandardMaterial map={plaster} roughness={0.9} />
      </mesh>
      {[-1.9, -0.75, 0.4].map((x) => (
        <group key={x} position={[x, 0.25 + (Math.sin(TILT) * H) / 2, -2.2]} rotation={[-(Math.PI / 2 - TILT), 0, 0]}>
          <SolarModule w={W} h={H} cells={cells} />
        </group>
      ))}
    </group>
  );
}

/** A maintenance case standing on the roof by the module, the Solink plate on its lid. */
function ToolCase() {
  return (
    <group position={[-0.95, 0, 0.55]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.26, 0.34]} />
        <meshStandardMaterial color="#e9e6df" roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.265, 0]} castShadow>
        <boxGeometry args={[0.54, 0.02, 0.36]} />
        <meshStandardMaterial color="#1a3a63" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.2, 0.03, 0.03]} />
        <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.3} />
      </mesh>
      <LogoDecal position={[0, 0.13, 0.172]} w={0.28} />
    </group>
  );
}

function Close({ still }: { still: boolean }) {
  const cells = useMemo(() => { const t = makeCellTexture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; }, []);
  const mask = useMemo(() => dustMask(), []);
  useEffect(() => () => { cells.dispose(); mask.dispose(); }, [cells, mask]);
  const target = useMemo(() => new THREE.Vector3(0.25, 0.55, 0.1), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const drift = still ? 0 : Math.sin(t * 0.1) * 0.06;
    state.camera.position.set(1.35 + drift, 1.05, 1.25 - drift * 0.5);
    state.camera.lookAt(target);
  });
  return (
    <group>
      <Context cells={cells} />
      <ToolCase />
      <group position={[0, 0.25 + (Math.sin(TILT) * H) / 2, 0]} rotation={[-(Math.PI / 2 - TILT), 0, 0]}>
        <SolarModule w={W} h={H} cells={cells} />
        {/* Dust, just above the glass. */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[W - 0.06, H - 0.06]} />
          <meshStandardMaterial color="#cdb996" alphaMap={mask} transparent opacity={0.95} roughness={1} depthWrite={false} />
        </mesh>
        <Beads />
        <Brush />
      </group>
      {/* Mounting rail and a clamp foot, visible under the lower edge. */}
      <mesh position={[0, 0.16, (Math.cos(TILT) * H) / 2 - 0.15]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.4, 0.05, 0.05]} />
        <meshStandardMaterial color="#b4b9c0" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh position={[0.45, 0.08, (Math.cos(TILT) * H) / 2 - 0.15]} castShadow>
        <boxGeometry args={[0.05, 0.16, 0.05]} />
        <meshStandardMaterial color="#b4b9c0" metalness={0.75} roughness={0.35} />
      </mesh>
    </group>
  );
}

export default function CareScene({ paused = false, still = false, economy = false }: { paused?: boolean; still?: boolean; economy?: boolean }) {
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: [1.35, 1.05, 1.25], fov: 34, near: 0.05, far: 30 }}
      gl={{ antialias: true, alpha: true }}
    >
      {/* Distance haze: the roof behind softens, so the close-up reads with depth. */}
      <fog attach="fog" args={["#eee7da", 3.2, 9]} />
      {/* Low morning sun raking across the glass, which is when dust shows. */}
      <hemisphereLight args={["#eef2f6", "#cdbfa6", 0.6]} />
      <directionalLight position={[3, 1.6, -1.2]} intensity={2.8} color="#ffe2bc" castShadow shadow-mapSize={[1024, 1024]} shadow-radius={3} shadow-bias={-0.0004} />
      <directionalLight position={[-2, 3, 3]} intensity={0.5} color="#e2eaf5" />
      <Sky />
      <Close still={still || paused} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.3} scale={4} blur={2.4} far={1.2} resolution={economy ? 256 : 512} />
    </Canvas>
  );
}
