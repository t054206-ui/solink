"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Sky } from "./RoofScene";
import { buildGrass, buildPalm, buildShrub, contactTexture, paverTexture, plasterTexture } from "./roofDetails";

/**
 * The Solar Profile's scene: a whole Kuwaiti home, not a roof. A two-storey
 * villa on its plot behind a boundary wall with a gate, a courtyard with a
 * date palm and planting, the street in front, and on the roof the things a
 * roof here carries (parapet, stair bulkhead, water tanks, AC units) with a
 * dashed solar-ready area. Seen from an elevated three-quarter angle in
 * afternoon sun. It is an illustration of "your home", captioned as such; the
 * profile's own values are laid over it by the caller, never drawn into it.
 */

const PLOT = { w: 24, d: 20 };
const HOUSE = { w: 12, d: 9, h: 7, x: 1.5, z: -2.2 };
const WALL_H = 1.9;
const GATE_X = -3;

function readyTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 384;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(240,160,42,0.10)";
    ctx.fillRect(0, 0, 512, 384);
    ctx.strokeStyle = "rgba(162,90,0,0.85)";
    ctx.lineWidth = 7;
    ctx.setLineDash([24, 16]);
    ctx.strokeRect(8, 8, 496, 368);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Windows({ face, count, y, span, depth }: { face: "front" | "side"; count: number; y: number; span: number; depth: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count - 0.5;
        const pos: [number, number, number] = face === "front" ? [t * span, y, depth / 2 + 0.02] : [depth / 2 + 0.02, y, t * span];
        const rot: [number, number, number] = face === "front" ? [0, 0, 0] : [0, Math.PI / 2, 0];
        return (
          <group key={i} position={pos} rotation={rot}>
            <mesh position={[0, 0, -0.02]}>
              <boxGeometry args={[1.5, 1.35, 0.04]} />
              <meshStandardMaterial color="#d8d2c7" roughness={0.7} />
            </mesh>
            <mesh>
              <boxGeometry args={[1.3, 1.15, 0.02]} />
              <meshPhysicalMaterial color="#3d5064" metalness={0.15} roughness={0.08} clearcoat={1} envMapIntensity={1.1} />
            </mesh>
            <mesh position={[0, -0.72, 0.06]} castShadow>
              <boxGeometry args={[1.7, 0.06, 0.14]} />
              <meshStandardMaterial color="#efe9df" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function House({ plaster, ready }: { plaster: THREE.Texture; ready: THREE.Texture }) {
  const wall = <meshStandardMaterial map={plaster} roughness={0.9} />;
  const trim = <meshStandardMaterial map={plaster} color="#faf6ef" roughness={0.85} />;
  const { w, d, h } = HOUSE;
  return (
    <group position={[HOUSE.x, 0, HOUSE.z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {wall}
      </mesh>
      {/* Floor band between the storeys, and the roof slab edge. */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <boxGeometry args={[w + 0.14, 0.22, d + 0.14]} />
        {trim}
      </mesh>
      <mesh position={[0, h + 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.3, 0.16, d + 0.3]} />
        {trim}
      </mesh>
      {/* Parapet. */}
      {[
        { p: [0, h + 0.55, -d / 2 + 0.1], s: [w + 0.3, 0.8, 0.2] },
        { p: [0, h + 0.55, d / 2 - 0.1], s: [w + 0.3, 0.8, 0.2] },
        { p: [-w / 2 + 0.1, h + 0.55, 0], s: [0.2, 0.8, d + 0.3] },
        { p: [w / 2 - 0.1, h + 0.55, 0], s: [0.2, 0.8, d + 0.3] },
      ].map(({ p, s }, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={s as [number, number, number]} />
          {trim}
        </mesh>
      ))}
      {/* Entrance: a deep canopy over the door, in panel navy. */}
      <mesh position={[-2.6, 1.3, d / 2 + 0.02]}>
        <boxGeometry args={[1.4, 2.6, 0.05]} />
        <meshStandardMaterial color="#1a3a63" roughness={0.5} />
      </mesh>
      <mesh position={[-2.6, 2.85, d / 2 + 0.55]} castShadow>
        <boxGeometry args={[2.6, 0.14, 1.2]} />
        {trim}
      </mesh>
      <Windows face="front" count={3} y={1.8} span={6} depth={d} />
      <Windows face="front" count={4} y={5.3} span={10} depth={d} />
      <Windows face="side" count={3} y={1.8} span={7} depth={w} />
      <Windows face="side" count={3} y={5.3} span={7} depth={w} />
      {/* Roof: bulkhead, tanks, AC units, and the solar-ready area. */}
      <mesh position={[w / 2 - 2, h + 1.25, -d / 2 + 1.6]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 2.4, 2.4]} />
        {wall}
      </mesh>
      {[0, 1].map((i) => (
        <group key={i} position={[w / 2 - 1.3 - i * 1.4, h + 0.16, 1.6]}>
          <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[1.2, 0.4, 1.2]} /><meshStandardMaterial color="#d9d3c7" roughness={0.9} /></mesh>
          <mesh position={[0, 0.95, 0]} castShadow><cylinderGeometry args={[0.52, 0.54, 1.1, 36]} /><meshStandardMaterial color="#f5f3ee" roughness={0.45} /></mesh>
        </group>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-w / 2 + 1 + i * 1.05, h + 0.52, d / 2 - 0.9]} castShadow>
          <boxGeometry args={[0.9, 0.7, 0.4]} />
          <meshStandardMaterial color="#e3e1dc" roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[-1.4, h + 0.18, -0.6]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[6.4, 4.6]} />
        <meshBasicMaterial map={ready} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

function Plot({ plaster, pavers, contact }: { plaster: THREE.Texture; pavers: THREE.Texture; contact: THREE.Texture }) {
  const { w, d } = PLOT;
  const wall = <meshStandardMaterial map={plaster} color="#ece6db" roughness={0.9} />;
  const gateW = 3.4;
  return (
    <group>
      {/* Street and pavement in front. */}
      <mesh position={[0, -0.01, d / 2 + 3.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 6, 7]} />
        <meshStandardMaterial color="#a19d95" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.05, d / 2 + 0.9]} receiveShadow>
        <boxGeometry args={[w + 6, 0.1, 1.8]} />
        <meshStandardMaterial map={plaster} color="#d9d2c4" roughness={0.95} />
      </mesh>
      {/* The plot, paved. */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={pavers} roughness={0.95} />
      </mesh>
      <mesh position={[HOUSE.x, 0.012, HOUSE.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HOUSE.w + 3, HOUSE.d + 3]} />
        <meshBasicMaterial color="#3a3226" alphaMap={contact} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {/* Boundary wall, with the gate opening at the front. */}
      <mesh position={[0, WALL_H / 2, -d / 2]} castShadow receiveShadow><boxGeometry args={[w, WALL_H, 0.25]} />{wall}</mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w / 2, WALL_H / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.25, WALL_H, d]} />{wall}</mesh>
      ))}
      {/* Front wall either side of the gate opening. */}
      {[[-w / 2, GATE_X - gateW / 2], [GATE_X + gateW / 2, w / 2]].map(([a, b]) => (
        <mesh key={a} position={[(a + b) / 2, WALL_H / 2, d / 2]} castShadow receiveShadow>
          <boxGeometry args={[b - a, WALL_H, 0.25]} />
          {wall}
        </mesh>
      ))}
      {/* The gate: navy slats. */}
      <group position={[GATE_X, 0, d / 2]}>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[-gateW / 2 + 0.14 + i * ((gateW - 0.28) / 11), WALL_H / 2, 0]} castShadow>
            <boxGeometry args={[0.1, WALL_H - 0.1, 0.06]} />
            <meshStandardMaterial color="#1a3a63" metalness={0.4} roughness={0.45} />
          </mesh>
        ))}
      </group>
      {/* Courtyard planter along the front wall. */}
      <mesh position={[5.5, 0.25, d / 2 - 1.1]} castShadow receiveShadow>
        <boxGeometry args={[8, 0.5, 1.2]} />
        <meshStandardMaterial map={plaster} color="#ddd5c6" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Planting() {
  const items = useMemo(() => {
    const out: { object: THREE.Object3D; dispose: () => void }[] = [];
    const put = (p: { object: THREE.Object3D; dispose: () => void }, x: number, y: number, z: number, s = 1) => {
      p.object.position.set(x, y, z);
      p.object.scale.multiplyScalar(s);
      out.push(p);
    };
    put(buildPalm(21, 4.2), -7.5, 0, 5.2, 1.1);
    put(buildPalm(22, 3.6), 9.8, 0, -6.8, 0.95);
    put(buildShrub(23, [0.6, 0.45, 0.6], 420), 3.2, 0.5, PLOT.d / 2 - 1.1);
    put(buildShrub(24, [0.55, 0.42, 0.55], 380), 7.6, 0.5, PLOT.d / 2 - 1.1);
    put(buildGrass(25, 70), 5.4, 0.5, PLOT.d / 2 - 1.1);
    put(buildShrub(26, [0.7, 0.5, 0.7], 460), -9.8, 0, -7.8);
    return out;
  }, []);
  useEffect(() => () => items.forEach((p) => p.dispose()), [items]);
  return <>{items.map((p, i) => <primitive key={i} object={p.object} />)}</>;
}

function Camera({ still, parallax }: { still: boolean; parallax: boolean }) {
  const target = useMemo(() => new THREE.Vector3(-0.5, 0.6, 2.6), []);
  const base = useMemo(() => new THREE.Spherical().setFromVector3(new THREE.Vector3(35, 27, 43.5)), []);
  const s = useRef({ v: new THREE.Vector3(), px: 0, py: 0 });
  useFrame((state, dt) => {
    const k = Math.min(1, dt * 2);
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * k;
    s.current.py += ((parallax ? state.pointer.y : 0) - s.current.py) * k;
    const t = state.clock.elapsedTime;
    const drift = still ? 0 : Math.sin(t * 0.07) * 0.035;
    s.current.v.setFromSphericalCoords(base.radius, base.phi - s.current.py * 0.02, base.theta + drift + s.current.px * 0.05).add(target);
    state.camera.position.copy(s.current.v);
    state.camera.lookAt(target);
  });
  return null;
}

function Scene({ still, parallax }: { still: boolean; parallax: boolean }) {
  const tex = useMemo(() => ({ plaster: plasterTexture(), pavers: paverTexture([PLOT.w / 2.4, PLOT.d / 2.4]), contact: contactTexture(), ready: readyTexture() }), []);
  useEffect(() => () => Object.values(tex).forEach((t) => t.dispose()), [tex]);
  return (
    <>
      <hemisphereLight args={["#eef2f6", "#cbbfa9", 0.8]} />
      <directionalLight position={[-14, 18, 12]} intensity={2.7} color="#ffe4c0" castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-camera-far={70} shadow-radius={3} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[10, 6, 14]} intensity={0.5} color="#dfe8f4" />
      <fog attach="fog" args={["#efe8dc", 60, 120]} />
      <Sky />
      <Camera still={still} parallax={parallax} />
      <Plot plaster={tex.plaster} pavers={tex.pavers} contact={tex.contact} />
      <House plaster={tex.plaster} ready={tex.ready} />
      <Planting />
    </>
  );
}

export default function ProfileScene({ paused = false, still = false, economy = false, parallax = true }: { paused?: boolean; still?: boolean; economy?: boolean; parallax?: boolean }) {
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: [34.5, 27.6, 46.1], fov: 30, near: 0.5, far: 180 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene still={still || paused} parallax={parallax && !still} />
    </Canvas>
  );
}
