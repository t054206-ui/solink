"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";

/**
 * A flat Kuwaiti roof with an array on it, for the inside of the app.
 *
 * Built in code at 1 unit = 1 metre, like the landing module, and using that
 * module's own cell texture, so the glass here is the glass there. Everything
 * on the roof is what a roof in Kuwait actually carries: a parapet, a stair
 * bulkhead, a water tank on a stand, AC condensers, a planter. The modules
 * are 1134 x 1722 mm, portrait, tilted 22 degrees, which is inside the 20-25
 * degree band the Placement Guide gives for Kuwait, with the rows spaced so
 * the front row does not shade the back one at that tilt.
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
const FRAME_D = 0.035;

const B = { w: 10.4, d: 7.2, h: 3.4 };
const PARAPET_T = 0.2;

const WALL = "#f2eee6";
const ROOF = "#e6e0d4";
const METAL = "#c3c8cf";
const SAGE = ["#7f9677", "#6d8667", "#8ea486"];

const TARGET = new THREE.Vector3(-0.4, -0.6, 0.3);
const CAMERA: [number, number, number] = [-8.6, 6.6, 14.6];

/* The array: two rows of five, centred a little left of the roof. */
const ROWS = [1.15, -1.75];
const PER_ROW = 5;
const ARRAY_X = -1.05;
const FRONT_Y = 0.36; // underside of the front edge, on short legs

function Module({ position, texture, geo }: { position: [number, number, number]; texture: THREE.Texture; geo: Geometries }) {
  return (
    <group position={position} rotation={[-(Math.PI / 2 - TILT), 0, 0]}>
      <mesh geometry={geo.frame} castShadow receiveShadow>
        <meshStandardMaterial color={METAL} metalness={0.75} roughness={0.32} />
      </mesh>
      <mesh geometry={geo.cells} position={[0, 0, FRAME_D / 2 + 0.002]} receiveShadow>
        <meshPhysicalMaterial map={texture} metalness={0.2} roughness={0.24} clearcoat={0.7} clearcoatRoughness={0.1} reflectivity={0.4} envMapIntensity={0.32} />
      </mesh>
    </group>
  );
}

interface Geometries { frame: THREE.BoxGeometry; cells: THREE.BoxGeometry }

function Row({ z, texture, geo }: { z: number; texture: THREE.Texture; geo: Geometries }) {
  const rise = Math.sin(TILT) * PANEL_H;
  const run = Math.cos(TILT) * PANEL_H;
  const centreY = FRONT_Y + rise / 2;
  const width = PER_ROW * PANEL_W + (PER_ROW - 1) * GAP;
  const legXs = [-width / 2 + 0.3, -width / 4, 0, width / 4, width / 2 - 0.3];
  const frontZ = z + run / 2 - 0.08;
  const backZ = z - run / 2 + 0.08;
  const backH = FRONT_Y + rise - 0.1;

  return (
    <group position={[ARRAY_X, 0, 0]}>
      {Array.from({ length: PER_ROW }, (_, i) => (
        <Module key={i} texture={texture} geo={geo} position={[-width / 2 + PANEL_W / 2 + i * (PANEL_W + GAP), centreY, z]} />
      ))}
      {/* Rails and legs: aluminium, thin, so the array reads as racked rather than floating. */}
      {[frontZ, backZ].map((rz, k) => (
        <mesh key={`rail${k}`} position={[0, k === 0 ? FRONT_Y - 0.04 : backH - 0.02, rz]} castShadow>
          <boxGeometry args={[width, 0.04, 0.05]} />
          <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {legXs.map((x) => (
        <group key={x}>
          <mesh position={[x, (FRONT_Y - 0.04) / 2, frontZ]} castShadow>
            <boxGeometry args={[0.04, FRONT_Y - 0.04, 0.04]} />
            <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[x, backH / 2, backZ]} castShadow>
            <boxGeometry args={[0.04, backH, 0.04]} />
            <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.35} />
          </mesh>
          {/* Ballast block under each foot, as on a flat roof that is not drilled. */}
          <mesh position={[x, 0.05, frontZ]} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.1, 0.22]} />
            <meshStandardMaterial color="#cfc9bd" roughness={0.95} />
          </mesh>
          <mesh position={[x, 0.05, backZ]} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.1, 0.22]} />
            <meshStandardMaterial color="#cfc9bd" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Building() {
  const wall = <meshStandardMaterial color={WALL} roughness={0.9} />;
  const halfW = B.w / 2;
  const halfD = B.d / 2;
  return (
    <group>
      {/* The house below the roof, cropped by the caller's fade. */}
      <mesh position={[0, -B.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[B.w, B.h, B.d]} />
        {wall}
      </mesh>
      {/* Slab edge: a cornice line that reads as architecture, not a box. */}
      <mesh position={[0, -0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[B.w + 0.18, 0.18, B.d + 0.18]} />
        {wall}
      </mesh>
      {/* Roof finish. */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[B.w - PARAPET_T * 2, B.d - PARAPET_T * 2]} />
        <meshStandardMaterial color={ROOF} roughness={0.97} />
      </mesh>
      {/* Parapets: full height at the back and sides, low at the front so the array shows. */}
      <mesh position={[0, 0.45, -halfD + PARAPET_T / 2]} castShadow receiveShadow>
        <boxGeometry args={[B.w, 0.9, PARAPET_T]} />
        {wall}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (halfW - PARAPET_T / 2), 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[PARAPET_T, 0.9, B.d]} />
          {wall}
        </mesh>
      ))}
      <mesh position={[0, 0.2, halfD - PARAPET_T / 2]} castShadow receiveShadow>
        <boxGeometry args={[B.w, 0.4, PARAPET_T]} />
        {wall}
      </mesh>
      {/* A band of glazing on the floor below, set just proud of the facade. */}
      <mesh position={[-0.6, -1.3, halfD + 0.006]}>
        <boxGeometry args={[6.6, 0.85, 0.02]} />
        <meshPhysicalMaterial color="#3a4d63" metalness={0.2} roughness={0.1} clearcoat={1} envMapIntensity={1} />
      </mesh>
      <mesh position={[halfW + 0.006, -1.3, -0.4]}>
        <boxGeometry args={[0.02, 0.85, 4.2]} />
        <meshPhysicalMaterial color="#3a4d63" metalness={0.2} roughness={0.1} clearcoat={1} envMapIntensity={1} />
      </mesh>

      {/* Stair bulkhead with its door. */}
      <group position={[halfW - 1.55, 0, -halfD + 1.4]}>
        <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.3, 2.5, 2.1]} />
          {wall}
        </mesh>
        <mesh position={[0, 2.55, 0]} castShadow>
          <boxGeometry args={[2.46, 0.1, 2.26]} />
          {wall}
        </mesh>
        <mesh position={[-0.35, 1.02, 1.056]}>
          <planeGeometry args={[0.9, 2.02]} />
          <meshStandardMaterial color="#1a3a63" roughness={0.55} />
        </mesh>
      </group>

      {/* Water tank on its stand. */}
      <group position={[halfW - 1.15, 0, 0.75]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.35, 0.4, 1.35]} />
          <meshStandardMaterial color="#d9d3c7" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.98, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.58, 0.58, 1.16, 40]} />
          <meshStandardMaterial color="#f7f5f0" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.08, 24]} />
          <meshStandardMaterial color="#e6e2da" roughness={0.5} />
        </mesh>
      </group>

      {/* Two AC condensers. */}
      {[0, 1].map((i) => (
        <group key={i} position={[halfW - 1.0 - i * 1.05, 0, halfD - 1.1]}>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.72, 0.42]} />
            <meshStandardMaterial color="#e3e1dc" roughness={0.6} metalness={0.1} />
          </mesh>
          <mesh position={[0.12, 0.4, 0.212]}>
            <circleGeometry args={[0.24, 32]} />
            <meshStandardMaterial color="#5a5f68" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Planter along the left parapet. Muted greens, soft forms, no cartoon trees. */}
      <group position={[-halfW + 0.62, 0, 0.9]}>
        <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.48, 3.6]} />
          <meshStandardMaterial color="#dcd5c8" roughness={0.92} />
        </mesh>
        {[-1.35, -0.7, -0.05, 0.6, 1.3].map((z, i) => (
          <mesh key={z} position={[((i % 2) - 0.5) * 0.14, 0.62 + (i % 3) * 0.05, z]} scale={[1, 0.8 + (i % 2) * 0.2, 1]} castShadow>
            <icosahedronGeometry args={[0.36 + (i % 3) * 0.05, 2]} />
            <meshStandardMaterial color={SAGE[i % 3]} roughness={0.95} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * The sky the glass reflects: warm at the horizon, a bright patch where the
 * sun is. Drawn into a canvas, like the landing's StudioEnv, so there is no
 * HDRI request.
 */
function WarmSky() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const sky = ctx.createLinearGradient(0, 0, 0, 64);
    sky.addColorStop(0, "#fbf7f0");
    sky.addColorStop(0.45, "#f6e7d1");
    sky.addColorStop(0.52, "#d8cfc0");
    sky.addColorStop(1, "#8a8377");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 128, 64);
    const sun = ctx.createRadialGradient(92, 16, 0, 92, 16, 22);
    sun.addColorStop(0, "rgba(255,248,232,1)");
    sun.addColorStop(1, "rgba(255,236,205,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, 128, 64);
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

function Scene({ still, parallax }: { still: boolean; parallax: boolean }) {
  const texture = useMemo(() => {
    const t = makeCellTexture();
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const geo = useMemo<Geometries>(() => ({
    frame: new THREE.BoxGeometry(PANEL_W, PANEL_H, FRAME_D),
    cells: new THREE.BoxGeometry(PANEL_W - 0.03, PANEL_H - 0.03, 0.004),
  }), []);
  useEffect(() => () => { texture.dispose(); geo.frame.dispose(); geo.cells.dispose(); }, [texture, geo]);

  return (
    <>
      <WarmSky />
      <Drift still={still} parallax={parallax} />
      <Building />
      {ROWS.map((z) => <Row key={z} z={z} texture={texture} geo={geo} />)}
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
      shadows
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: CAMERA, fov: 30, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true }}
    >
      {/* Late-afternoon sun from the right, warm, low enough to throw long shadows
          across the roof and off the glass rather than into the camera; a sky fill; a cool
          bounce from the viewer's side so the faces of the modules are not black. */}
      <hemisphereLight args={["#fff6ea", "#cfc6b6", 0.85]} />
      <directionalLight
        position={[11, 8.5, 1.5]}
        intensity={2.6}
        color="#ffd9a6"
        castShadow
        shadow-mapSize={economy ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-6, 4, 9]} intensity={0.55} color="#dfe8f4" />
      <Scene still={still || paused} parallax={parallax && !still} />
    </Canvas>
  );
}
