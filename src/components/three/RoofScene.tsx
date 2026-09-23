"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";
import { buildAgave, buildGrass, buildPalm, buildShrub, contactTexture, gravelTexture, paverTexture, plasterTexture } from "./roofDetails";

/**
 * A flat Kuwaiti roof with an array on it, for the inside of the app.
 *
 * Built in code at 1 unit = 1 metre, like the landing module, and using that
 * module's own cell texture, so the glass here is the glass there. Everything
 * on the roof is what a roof in Kuwait actually carries: a rendered parapet
 * with a coping, 600 mm pavers, a stair bulkhead with a satellite dish, a
 * ribbed water tank on a stand with its pipe run, AC condensers on feet with
 * their line sets, and planters of dry-climate planting in gravel (a
 * date-style palm, agave, grass, clipped shrubs). The modules are 1134 x 1722
 * mm, portrait, in anodised frames with mid and end clamps on braced ballast
 * racks, tilted 22 degrees (inside the Placement Guide's 20-25 degree band
 * for Kuwait), with the rows spaced so the front row does not shade the back
 * one at that tilt.
 *
 * It is an illustration and is captioned as one by the caller: the number of
 * modules, the roof and the layout are nobody's installation.
 *
 * Motion is a slow camera drift and, on a pointer device, a few degrees of
 * parallax while the pointer is over it. `still` renders one frame and stops.
 */

const PANEL_W = 1.134;
const PANEL_H = 1.722;
const TILT = (22 * Math.PI) / 180;
const GAP = 0.022;
const FRAME_D = 0.035; // frame depth
const FRAME_W = 0.03; // visible frame lip

export const B = { w: 10.4, d: 7.2, h: 3.4 };
export const PARAPET_T = 0.2;

const METAL = "#c3c8cf";
const RACK = "#b4b9c0";

const TARGET = new THREE.Vector3(-0.4, -0.6, 0.3);
const CAMERA: [number, number, number] = [-8.6, 6.6, 14.6];

/* The array: two rows of five, centred a little left of the roof. */
const ROWS = [1.15, -1.75];
const PER_ROW = 5;
const ARRAY_X = -1.05;
const FRONT_Y = 0.36; // underside of the front edge, on short legs

export interface Kit {
  cells: THREE.Texture;
  plaster: THREE.Texture;
  pavers: THREE.Texture;
  gravel: THREE.Texture;
  contact: THREE.Texture;
}

/* ─────────────────────────── modules ─────────────────────────── */

/** One module: an anodised frame with depth, cells set just below its lip, glass over them. */
function Module({ position, kit }: { position: [number, number, number]; kit: Kit }) {
  const lipW = PANEL_W / 2 - FRAME_W / 2;
  const lipH = PANEL_H / 2 - FRAME_W / 2;
  return (
    <group position={position} rotation={[-(Math.PI / 2 - TILT), 0, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[s * lipW, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[FRAME_W, PANEL_H, FRAME_D]} />
          <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[0, s * lipH, 0]} castShadow receiveShadow>
          <boxGeometry args={[PANEL_W, FRAME_W, FRAME_D]} />
          <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* White backsheet: what shows through the gaps from a low angle. */}
      <mesh position={[0, 0, -FRAME_D / 2 + 0.004]} castShadow>
        <boxGeometry args={[PANEL_W - 0.01, PANEL_H - 0.01, 0.004]} />
        <meshStandardMaterial color="#e9e8e3" roughness={0.8} />
      </mesh>
      {/* Cells, 4 mm below the frame's top edge. */}
      <mesh position={[0, 0, FRAME_D / 2 - 0.006]} receiveShadow>
        <boxGeometry args={[PANEL_W - FRAME_W * 2 + 0.004, PANEL_H - FRAME_W * 2 + 0.004, 0.003]} />
        <meshPhysicalMaterial map={kit.cells} metalness={0.22} roughness={0.3} envMapIntensity={0.25} />
      </mesh>
      {/* Front glass: a clear coat over the cells, which is where the sky reflection
          belongs. Transparent, so it casts no shadow of its own. */}
      <mesh position={[0, 0, FRAME_D / 2 - 0.002]}>
        <boxGeometry args={[PANEL_W - FRAME_W * 2 + 0.004, PANEL_H - FRAME_W * 2 + 0.004, 0.002]} />
        <meshPhysicalMaterial color="#e8eef6" transparent opacity={0.1} roughness={0.04} metalness={0} clearcoat={1} clearcoatRoughness={0.03} envMapIntensity={1.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Mid and end clamps along the top and bottom rails of a row, in the plane of the glass. */
function Clamps({ width, centreY, z }: { width: number; centreY: number; z: number }) {
  // End clamps at both ends, a mid clamp over each gap between modules.
  const xs = [-width / 2 + 0.02, ...Array.from({ length: PER_ROW - 1 }, (_, i) => -width / 2 + (i + 1) * (PANEL_W + GAP) - GAP / 2), width / 2 - 0.02];
  return (
    <group position={[0, centreY, z]} rotation={[-(Math.PI / 2 - TILT), 0, 0]}>
      {xs.flatMap((x) => [-1, 1].map((s) => (
        <mesh key={`${x}${s}`} position={[x, s * (PANEL_H / 2 - 0.35), FRAME_D / 2 + 0.006]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.014]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.35} />
        </mesh>
      )))}
    </group>
  );
}

function Row({ z, kit }: { z: number; kit: Kit }) {
  const rise = Math.sin(TILT) * PANEL_H;
  const run = Math.cos(TILT) * PANEL_H;
  const centreY = FRONT_Y + rise / 2;
  const width = PER_ROW * PANEL_W + (PER_ROW - 1) * GAP;
  const legXs = [-width / 2 + 0.3, -width / 4, 0, width / 4, width / 2 - 0.3];
  const frontZ = z + run / 2 - 0.12;
  const backZ = z - run / 2 + 0.12;
  const frontH = FRONT_Y - 0.03;
  const backH = FRONT_Y + rise - 0.14;
  const braceLen = Math.hypot(frontZ - backZ, backH - 0.12);
  const braceAngle = Math.atan2(backH - 0.12, frontZ - backZ);

  return (
    <group position={[ARRAY_X, 0, 0]}>
      {Array.from({ length: PER_ROW }, (_, i) => (
        <Module key={i} kit={kit} position={[-width / 2 + PANEL_W / 2 + i * (PANEL_W + GAP), centreY, z]} />
      ))}
      <Clamps width={width} centreY={centreY} z={z} />
      {/* Two purlins under the modules, then braced triangular frames on ballast trays. */}
      {[frontZ, backZ].map((rz, k) => (
        <mesh key={`rail${k}`} position={[0, k === 0 ? frontH : backH, rz]} castShadow>
          <boxGeometry args={[width + 0.1, 0.045, 0.045]} />
          <meshStandardMaterial color={RACK} metalness={0.7} roughness={0.38} />
        </mesh>
      ))}
      {legXs.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, frontH / 2 + 0.06, frontZ]} castShadow>
            <boxGeometry args={[0.04, frontH - 0.1, 0.04]} />
            <meshStandardMaterial color={RACK} metalness={0.7} roughness={0.38} />
          </mesh>
          <mesh position={[0, backH / 2 + 0.06, backZ]} castShadow>
            <boxGeometry args={[0.04, backH - 0.1, 0.04]} />
            <meshStandardMaterial color={RACK} metalness={0.7} roughness={0.38} />
          </mesh>
          <mesh position={[0, (backH + 0.12) / 2, (frontZ + backZ) / 2]} rotation={[braceAngle, 0, 0]} castShadow>
            <boxGeometry args={[0.03, 0.03, braceLen]} />
            <meshStandardMaterial color={RACK} metalness={0.7} roughness={0.4} />
          </mesh>
          {/* Ballast tray with its concrete block, as on a flat roof that is not drilled. */}
          <mesh position={[0, 0.03, (frontZ + backZ) / 2]} receiveShadow castShadow>
            <boxGeometry args={[0.07, 0.04, frontZ - backZ + 0.3]} />
            <meshStandardMaterial color={RACK} metalness={0.6} roughness={0.45} />
          </mesh>
          {[frontZ, backZ].map((bz) => (
            <mesh key={bz} position={[0, 0.07, bz]} castShadow receiveShadow>
              <boxGeometry args={[0.3, 0.1, 0.2]} />
              <meshStandardMaterial map={kit.plaster} color="#d8d0c1" roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Cable tray along the back row, where the strings run to the inverter. */}
      {z < 0 && (
        <mesh position={[0, 0.05, backZ - 0.28]} castShadow receiveShadow>
          <boxGeometry args={[width, 0.06, 0.12]} />
          <meshStandardMaterial color="#a9aeb5" metalness={0.6} roughness={0.45} />
        </mesh>
      )}
    </group>
  );
}

/* ─────────────────────────── the building ─────────────────────────── */

/** Contact shading: a soft dark footprint under an object, on the roof. */
function Contact({ kit, x, z, w, d, opacity = 0.32 }: { kit: Kit; x: number; z: number; w: number; d: number; opacity?: number }) {
  return (
    <mesh position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial color="#3a3226" alphaMap={kit.contact} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function Window({ position, size, axis = "z" }: { position: [number, number, number]; size: [number, number]; axis?: "z" | "x" }) {
  const [w, h] = size;
  const rot: [number, number, number] = axis === "x" ? [0, Math.PI / 2, 0] : [0, 0, 0];
  return (
    <group position={position} rotation={rot}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[w + 0.16, h + 0.16, 0.04]} />
        <meshStandardMaterial color="#d9d4ca" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[w, h, 0.02]} />
        <meshPhysicalMaterial color="#3d5064" metalness={0.15} roughness={0.08} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.04, h, 0.02]} />
        <meshStandardMaterial color="#8d949c" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Sill, casting a thin shadow down the render. */}
      <mesh position={[0, -h / 2 - 0.1, 0.03]} castShadow>
        <boxGeometry args={[w + 0.3, 0.05, 0.12]} />
        <meshStandardMaterial color="#e8e3da" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Building({ kit }: { kit: Kit }) {
  const wall = <meshStandardMaterial map={kit.plaster} roughness={0.92} />;
  const coping = <meshStandardMaterial map={kit.plaster} color="#faf7f1" roughness={0.85} />;
  const halfW = B.w / 2;
  const halfD = B.d / 2;
  const tank = { x: halfW - 1.15, z: 0.75 };
  const bulk = { x: halfW - 1.55, z: -halfD + 1.4 };

  return (
    <group>
      {/* The house below the roof, cropped by the caller's fade. */}
      <mesh position={[0, -B.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[B.w, B.h, B.d]} />
        {wall}
      </mesh>
      {/* Slab edge and a shadow line under it. */}
      <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[B.w + 0.2, 0.2, B.d + 0.2]} />
        {coping}
      </mesh>
      {/* Pavers. */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[B.w - PARAPET_T * 2, B.d - PARAPET_T * 2]} />
        <meshStandardMaterial map={kit.pavers} roughness={0.96} />
      </mesh>

      {/* Parapets with a coping: full height at the back and sides, low at the front. */}
      {[
        { p: [0, 0.45, -halfD + PARAPET_T / 2], s: [B.w, 0.9, PARAPET_T] },
        { p: [-(halfW - PARAPET_T / 2), 0.45, 0], s: [PARAPET_T, 0.9, B.d] },
        { p: [halfW - PARAPET_T / 2, 0.45, 0], s: [PARAPET_T, 0.9, B.d] },
        { p: [0, 0.2, halfD - PARAPET_T / 2], s: [B.w, 0.4, PARAPET_T] },
      ].map(({ p, s }, i) => (
        <group key={i}>
          <mesh position={p as [number, number, number]} castShadow receiveShadow>
            <boxGeometry args={s as [number, number, number]} />
            {wall}
          </mesh>
          <mesh position={[p[0], p[1] + s[1] / 2 + 0.025, p[2]]} castShadow receiveShadow>
            <boxGeometry args={[s[0] + 0.08, 0.05, s[2] + 0.08]} />
            {coping}
          </mesh>
        </group>
      ))}

      {/* Windows on the floor below. */}
      {[-3.4, -1.55, 0.3, 2.15].map((x) => (
        <Window key={x} position={[x, -1.45, halfD + 0.02]} size={[1.25, 1.05]} />
      ))}
      {[-1.6, 0.8].map((z) => (
        <Window key={z} position={[halfW + 0.02, -1.45, z]} size={[1.4, 1.05]} axis="x" />
      ))}

      {/* Stair bulkhead: rendered, with a coping, a framed door, a louvred vent and a dish. */}
      <group position={[bulk.x, 0, bulk.z]}>
        <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.3, 2.5, 2.1]} />
          {wall}
        </mesh>
        <mesh position={[0, 2.54, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.42, 0.08, 2.22]} />
          {coping}
        </mesh>
        <mesh position={[-0.35, 1.04, 1.06]}>
          <boxGeometry args={[1.04, 2.14, 0.03]} />
          <meshStandardMaterial color="#d9d4ca" roughness={0.7} />
        </mesh>
        <mesh position={[-0.35, 1.02, 1.08]} castShadow>
          <boxGeometry args={[0.9, 2.02, 0.03]} />
          <meshStandardMaterial color="#1a3a63" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[-0.02, 1.0, 1.1]}>
          <boxGeometry args={[0.03, 0.14, 0.03]} />
          <meshStandardMaterial color="#c9cdd2" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0.62, 1.9, 1.06]}>
          <boxGeometry args={[0.46, 0.3, 0.03]} />
          <meshStandardMaterial color="#b9b4aa" roughness={0.75} />
        </mesh>
        {/* Satellite dish on a short arm, the way almost every roof here has one. */}
        <group position={[0.55, 2.58, 0.45]} rotation={[0, -0.6, 0]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
            <meshStandardMaterial color="#bfc3c8" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.48, 0.05]} rotation={[-1.15, 0, 0]} castShadow>
            <sphereGeometry args={[0.36, 28, 10, 0, Math.PI * 2, 0, 0.55]} />
            <meshStandardMaterial color="#eeede9" roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
      <Contact kit={kit} x={bulk.x} z={bulk.z} w={3.0} d={2.8} opacity={0.28} />

      {/* Ribbed water tank on a concrete stand, its pipe running to the bulkhead. */}
      <group position={[tank.x, 0, tank.z]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.35, 0.4, 1.35]} />
          <meshStandardMaterial map={kit.plaster} color="#ddd6c9" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.98, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.58, 0.6, 1.16, 48]} />
          <meshStandardMaterial color="#f6f4ef" roughness={0.4} />
        </mesh>
        {[0.62, 0.98, 1.34].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.595, 0.018, 8, 48]} />
            <meshStandardMaterial color="#e9e6df" roughness={0.45} />
          </mesh>
        ))}
        <mesh position={[0, 1.58, 0]} castShadow>
          <cylinderGeometry args={[0.46, 0.58, 0.06, 48]} />
          <meshStandardMaterial color="#f1eee8" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.64, 0]} castShadow>
          <cylinderGeometry args={[0.19, 0.19, 0.08, 24]} />
          <meshStandardMaterial color="#e3dfd7" roughness={0.5} />
        </mesh>
      </group>
      <Contact kit={kit} x={tank.x} z={tank.z} w={1.9} d={1.9} />
      <mesh position={[tank.x - 0.3, 0.09, (tank.z + bulk.z + 1.05) / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, tank.z - bulk.z - 1.05, 10]} />
        <meshStandardMaterial color="#d7d9dc" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Two AC condensers on feet, fan guards and fins, line sets to the parapet. */}
      {[0, 1].map((i) => {
        const x = halfW - 1.0 - i * 1.05;
        const z = halfD - 1.1;
        return (
          <group key={i}>
            <group position={[x, 0, z]}>
              {[-0.36, 0.36].map((fx) => (
                <mesh key={fx} position={[fx, 0.05, 0]} castShadow>
                  <boxGeometry args={[0.08, 0.1, 0.5]} />
                  <meshStandardMaterial color="#8f949b" metalness={0.5} roughness={0.5} />
                </mesh>
              ))}
              <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.92, 0.72, 0.42]} />
                <meshStandardMaterial color="#e4e2dd" roughness={0.55} metalness={0.1} />
              </mesh>
              <mesh position={[0.12, 0.46, 0.212]}>
                <circleGeometry args={[0.25, 40]} />
                <meshStandardMaterial color="#3f444c" roughness={0.85} />
              </mesh>
              <mesh position={[0.12, 0.46, 0.22]}>
                <torusGeometry args={[0.25, 0.012, 6, 40]} />
                <meshStandardMaterial color="#c8ccd1" metalness={0.7} roughness={0.35} />
              </mesh>
              {[0, Math.PI / 2].map((a) => (
                <mesh key={a} position={[0.12, 0.46, 0.222]} rotation={[0, 0, a]}>
                  <boxGeometry args={[0.5, 0.012, 0.008]} />
                  <meshStandardMaterial color="#c8ccd1" metalness={0.7} roughness={0.35} />
                </mesh>
              ))}
              <mesh position={[-0.32, 0.46, 0.213]}>
                <planeGeometry args={[0.18, 0.56]} />
                <meshStandardMaterial color="#b8b9b8" roughness={0.7} />
              </mesh>
              <mesh position={[0.3, 0.2, -0.22]} castShadow>
                <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
                <meshStandardMaterial color="#f2f2ef" roughness={0.6} />
              </mesh>
            </group>
            <mesh position={[x + 0.3, 0.06, (z - 0.22 + halfD - PARAPET_T) / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
              <meshStandardMaterial color="#f2f2ef" roughness={0.6} />
            </mesh>
            <Contact kit={kit} x={x} z={z} w={1.25} d={0.8} opacity={0.36} />
          </group>
        );
      })}
    </group>
  );
}

/* ─────────────────────────── planting ─────────────────────────── */

function Planter({ kit, position, size }: { kit: Kit; position: [number, number, number]; size: [number, number] }) {
  const [w, d] = size;
  return (
    <group position={position}>
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.48, d]} />
        <meshStandardMaterial map={kit.plaster} color="#ddd5c6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.06, 0.04, d + 0.06]} />
        <meshStandardMaterial map={kit.plaster} color="#f3efe7" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.465, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w - 0.08, d - 0.08]} />
        <meshStandardMaterial map={kit.gravel} roughness={1} />
      </mesh>
    </group>
  );
}

export function Planting({ kit }: { kit: Kit }) {
  const halfW = B.w / 2;
  const halfD = B.d / 2;
  const plants = useMemo(() => {
    const top = 0.47;
    const out: { object: THREE.Object3D; dispose: () => void }[] = [];
    const add = (p: { object: THREE.Object3D; dispose: () => void }, x: number, z: number, ry = 0, scale = 1) => {
      p.object.position.set(x, top, z);
      p.object.rotation.y = ry;
      p.object.scale.multiplyScalar(scale);
      out.push(p);
    };
    // Back-left corner planter: a young palm, kept inside the frame of the view.
    add(buildPalm(7, 3.0), -halfW + 0.75, -halfD + 0.8, 0.3, 0.72);
    add(buildGrass(8, 50), -halfW + 0.5, -halfD + 1.15);
    // Long planter along the left parapet: agave, grasses and two clipped shrubs.
    const lx = -halfW + 0.62;
    add(buildShrub(12, [0.36, 0.3, 0.42]), lx, 0.15);
    add(buildGrass(13, 60), lx + 0.05, 0.85);
    add(buildAgave(14, 0.9), lx, 1.5, 0.4);
    add(buildGrass(15, 55), lx - 0.06, 2.1);
    add(buildShrub(16, [0.34, 0.28, 0.36], 360), lx, 2.6);
    return out;
  }, [halfW, halfD]);
  useEffect(() => () => plants.forEach((p) => p.dispose()), [plants]);

  return (
    <>
      <Planter kit={kit} position={[-halfW + 0.75, 0, -halfD + 0.8]} size={[1.1, 1.1]} />
      <Planter kit={kit} position={[-halfW + 0.62, 0, 1.35]} size={[0.7, 3.0]} />
      <Contact kit={kit} x={-halfW + 0.75} z={-halfD + 0.8} w={1.5} d={1.5} opacity={0.26} />
      <Contact kit={kit} x={-halfW + 0.62} z={1.35} w={1.0} d={3.4} opacity={0.24} />
      {plants.map((p, i) => <primitive key={i} object={p.object} />)}
    </>
  );
}

/* ─────────────────────────── light and camera ─────────────────────────── */

/**
 * The sky the glass reflects: a pale, hazy blue overhead, as a Kuwaiti sky
 * is most afternoons, warming to the horizon, with a bright patch where the
 * sun is. Drawn into a canvas, like the landing's StudioEnv, so there is no
 * HDRI request.
 */
export function Sky() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const sky = ctx.createLinearGradient(0, 0, 0, 128);
    sky.addColorStop(0, "#dbe3ec");
    sky.addColorStop(0.3, "#e9ebea");
    sky.addColorStop(0.47, "#f3e6d2");
    sky.addColorStop(0.53, "#cfc5b4");
    sky.addColorStop(1, "#857c6e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 128);
    const sun = ctx.createRadialGradient(200, 34, 0, 200, 34, 34);
    sun.addColorStop(0, "rgba(255,250,238,1)");
    sun.addColorStop(1, "rgba(255,240,215,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, 256, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromEquirectangular(tex);
    tex.dispose();
    pmrem.dispose();
    return target;
  }, [gl]);
  useEffect(() => () => env?.dispose(), [env]);
  return env ? <primitive object={env.texture} attach="environment" /> : null;
}

/** Slow drift, plus a little parallax from the pointer while it is over the canvas. */
function Drift({ still, parallax }: { still: boolean; parallax: boolean }) {
  const base = useMemo(() => new THREE.Spherical().setFromVector3(new THREE.Vector3(...CAMERA).sub(TARGET)), []);
  const scratch = useRef({ v: new THREE.Vector3(), px: 0, py: 0 });

  useFrame((state, dt) => {
    const s = scratch.current;
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 2.2);
    s.px += ((parallax ? state.pointer.x : 0) - s.px) * k;
    s.py += ((parallax ? state.pointer.y : 0) - s.py) * k;
    const drift = still ? 0 : 1;
    const theta = base.theta + drift * Math.sin(t * 0.11) * 0.04 + s.px * 0.06;
    const phi = base.phi + drift * Math.sin(t * 0.08) * 0.012 - s.py * 0.025;
    s.v.setFromSphericalCoords(base.radius, phi, theta).add(TARGET);
    state.camera.position.copy(s.v);
    state.camera.lookAt(TARGET);
  });
  return null;
}

/** The textures a rooftop needs, for a roof of the given paved size. Shared with the other rooftop scenes. */
export function makeRoofKit(paved: [number, number] = [B.w - PARAPET_T * 2, B.d - PARAPET_T * 2]): Kit {
  const cells = makeCellTexture();
  cells.colorSpace = THREE.SRGBColorSpace;
  cells.anisotropy = 8;
  return {
    cells,
    plaster: plasterTexture(),
    pavers: paverTexture([paved[0] / 2.4, paved[1] / 2.4]),
    gravel: gravelTexture(),
    contact: contactTexture(),
  };
}

function Scene({ still, parallax }: { still: boolean; parallax: boolean }) {
  const kit = useMemo<Kit>(() => makeRoofKit(), []);
  useEffect(() => () => Object.values(kit).forEach((t) => t.dispose()), [kit]);

  return (
    <>
      <Sky />
      <Drift still={still} parallax={parallax} />
      <Building kit={kit} />
      <Planting kit={kit} />
      {ROWS.map((z) => <Row key={z} z={z} kit={kit} />)}
    </>
  );
}

export default function RoofScene({ paused = false, still = false, economy = false, parallax = true }: {
  /** Off screen: stop drawing. */
  paused?: boolean;
  /** prefers-reduced-motion: render once, no drift, no parallax. */
  still?: boolean;
  /** Phones: fewer pixels and a smaller shadow map. */
  economy?: boolean;
  parallax?: boolean;
}) {
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: CAMERA, fov: 30, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true }}
    >
      {/* Late-afternoon sun from the right: warm but not orange, low enough to
          throw long shadows across the pavers and off the glass rather than into
          the camera. A hazy sky fill and a cool bounce from the viewer's side,
          so the shaded faces read as shade and not as black. */}
      <hemisphereLight args={["#eef2f6", "#c9bea8", 0.78]} />
      <directionalLight
        position={[11, 8.5, 1.5]}
        intensity={2.75}
        color="#ffe6c6"
        castShadow
        shadow-mapSize={economy ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-radius={3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-6, 4, 9]} intensity={0.5} color="#dfe8f4" />
      <Scene still={still || paused} parallax={parallax && !still} />
    </Canvas>
  );
}
