"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";

/** Live angles, written every frame and read by the HTML readout, not by React. */
export interface AngleRef {
  tilt: number;
  azimuth: number;
}

const DEG = 180 / Math.PI;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A 1722 × 1134 mm module at 1 unit = 1 metre, so the object on screen is the
 * real size of the panel the marketplace is describing.
 */
const PANEL_W = 1.134;
const PANEL_H = 1.722;
const FRAME = 0.03;

/**
 * Framing, derived rather than eyeballed.
 *
 * The module turns on two axes, so the only shape guaranteed to contain it at
 * every reachable angle is its bounding sphere: radius = half the diagonal of
 * the framed box, 1.052 m. A sphere of radius R fits a frustum of vertical
 * field of view F only when the camera sits at least R / sin(F / 2) away.
 *
 * At fov 34 that is 3.60 m. An earlier version put the camera at 3.18 m, which
 * looked right at the default tilt and clipped the top of the panel as soon as
 * anyone dragged it downward. CAMERA_DISTANCE keeps an 8% margin on top.
 *
 * If you want the panel bigger in frame, raise the field of view — do not move
 * the camera closer without re-checking this number.
 */
/**
 * Azimuth is clamped to ±95° of due south. Not an arbitrary limit: a
 * roof-mounted panel in Kuwait that faces north produces almost nothing, so
 * the range the control offers is the range a real installation occupies. It
 * also means the hero never presents its blank backsheet to the visitor.
 */
const AZIMUTH_LIMIT = 95;
const TILT_LIMIT = 60;

const PANEL_Y = 0.1;
const CAMERA_FOV = 34;
const CAMERA_POS: [number, number, number] = [0, 0.55, 3.88];

interface RigProps {
  onTick: (a: AngleRef) => void;
  autoSpin: boolean;
  onInteract: () => void;
  initialTilt: number;
}

/**
 * Everything that moves lives here, and it owns its own refs.
 *
 * An earlier version passed the angle refs in as props and let the child write
 * to them, which react-hooks/immutability rejects — modifying a prop is exactly
 * the sort of hidden coupling the React Compiler needs to rule out. Keeping the
 * mutable state local to the component that mutates it is both legal and
 * simpler to follow.
 */
function PanelRig({ onTick, autoSpin, onInteract, initialTilt }: RigProps) {
  const group = useRef<THREE.Group>(null);
  const angles = useRef<AngleRef>({ tilt: initialTilt, azimuth: -28 });
  const target = useRef<AngleRef>({ tilt: initialTilt, azimuth: -28 });
  const texture = useMemo(() => makeCellTexture(), []);
  const { gl } = useThree();

  useEffect(() => () => texture.dispose(), [texture]);

  // Pointer drag turns the module: vertical changes tilt, horizontal changes
  // the direction it faces. Listeners only — the cursor is styled in CSS.
  useEffect(() => {
    const el = gl.domElement;
    const t = target.current;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      onInteract();
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      t.azimuth = clamp(t.azimuth + dx * 0.4, -AZIMUTH_LIMIT, AZIMUTH_LIMIT);
      t.tilt = clamp(t.tilt + dy * 0.3, 0, TILT_LIMIT);
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl, onInteract]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const a = angles.current;
    const t = target.current;
    // Idle motion is a slow sway rather than a spin. A full rotation would
    // keep turning the panel away from the viewer, and the owner asked for
    // animated without being distracting on first sight.
    if (autoSpin) t.azimuth = -18 + Math.sin(state.clock.elapsedTime * 0.32) * 34;
    a.tilt = THREE.MathUtils.damp(a.tilt, t.tilt, 4, dt);
    a.azimuth = THREE.MathUtils.damp(a.azimuth, t.azimuth, 4, dt);
    // Tilt is measured from horizontal, the way an installer measures it, so a
    // panel lying flat on the roof reads 0 and not 90.
    g.rotation.x = -Math.PI / 2 + a.tilt / DEG;
    g.rotation.y = a.azimuth / DEG;
    onTick(a);
  });

  return (
    <group ref={group} position={[0, PANEL_Y, 0]}>
      {/* Anodised frame and backsheet in one box. It sits wholly behind the
          glass plane — an earlier version straddled z=0 and its front face hid
          every cell. */}
      <mesh castShadow receiveShadow position={[0, 0, -0.021]}>
        <boxGeometry args={[PANEL_W + FRAME, PANEL_H + FRAME, 0.032]} />
        <meshStandardMaterial color="#b9bec6" metalness={0.85} roughness={0.34} />
      </mesh>

      {/* Glass over the cells. Physical material so the sun leaves a specular
          streak across it as the panel turns — that streak is the whole reason
          the object reads as glass rather than as a blue rectangle. */}
      <mesh castShadow receiveShadow>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshPhysicalMaterial
          map={texture}
          metalness={0.28}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.06}
          reflectivity={0.6}
          envMapIntensity={0.7}
        />
      </mesh>

      {/* Junction box on the back */}
      <mesh position={[0, -0.42, -0.05]}>
        <boxGeometry args={[0.18, 0.11, 0.028]} />
        <meshStandardMaterial color="#20242b" roughness={0.7} />
      </mesh>
    </group>
  );
}

export default function PanelScene({
  onTick,
  autoSpin,
  onInteract,
  initialTilt = 22,
}: {
  onTick: (a: AngleRef) => void;
  autoSpin: boolean;
  onInteract: () => void;
  initialTilt?: number;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: CAMERA_POS, fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: true }}
      className="panel-canvas"
      style={{ touchAction: "none" }}
    >
      {/* Studio lighting: one hard key standing in for the sun, a broad fill so
          the frame does not go black, and a warm bounce off the front. */}
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[2.6, 4.2, 2.2]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-3, 1.6, -2]} intensity={0.55} color="#cddcf0" />
      <pointLight position={[0, 0.4, 2.4]} intensity={1.1} color="#fff3dd" />

      <PanelRig onTick={onTick} autoSpin={autoSpin} onInteract={onInteract} initialTilt={initialTilt} />
      <ContactShadows position={[0, -1.05, 0]} opacity={0.24} scale={5} blur={3} far={3} resolution={512} />
    </Canvas>
  );
}
