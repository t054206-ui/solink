"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";
import { LAYER_COUNT, PANEL_LAYERS } from "./panelLayers";
import { HERO_POSE, HERO_TIMING, schedule, type TourPose, type TourSchedule, type TourTiming } from "./tourTiming";

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

/** Anodised rail: 28 mm wide, 35 mm deep, which is an ordinary residential frame. */
const RAIL = 0.028;
const FRAME_D = 0.035;

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
 *
 * The exploded assembly is a longer object than the closed one: the far corner
 * of the junction box sits at radius 1.175 m, which does not fit. That is why
 * the group scales to OPEN_SCALE while it is open — 1.175 × 0.82 = 0.96 m, back
 * inside the 1.052 the camera was placed for. Scale it, do not dolly in.
 */
const AZIMUTH_LIMIT = 95;
const TILT_LIMIT = 60;

const PANEL_Y = 0.1;
const CAMERA_FOV = 34;
const CAMERA_POS: [number, number, number] = [0, 0.55, 3.88];
const OPEN_SCALE = 0.82;

/** The front pane fades up as it leaves the stack. See the glass mesh. */
const GLASS_CLOSED = 0.06;
const GLASS_OPEN = 0.44;

/**
 * The take-apart sequence, in seconds from the moment the tour starts.
 *
 * Enter, hold, then one part every `step` seconds, a reading speed rather
 * than a movement speed, which is `travel`. Then a beat, then everything
 * closes at once. The numbers live in tourTiming.ts so the opening can read
 * the same schedule without importing three.js. Dragging the panel cancels
 * the tour at any point.
 */

/** Which part is being explained at time t, or -1 for none. */
function captionAt(t: number, s: TourSchedule): number {
  if (t < s.openAt || t >= s.closeAt) return -1;
  return Math.min(LAYER_COUNT - 1, Math.floor((t - s.openAt) / s.step));
}

/** How far part i has travelled, 0 to 1. */
const openAt = (t: number, i: number, s: TourSchedule) =>
  THREE.MathUtils.smootherstep(t, s.openAt + i * s.step, s.openAt + i * s.step + s.travel);

/** Everything closes together, which is what makes the reassembly read as one move. */
const closeAt = (t: number, s: TourSchedule) => 1 - THREE.MathUtils.smootherstep(t, s.closeAt, s.endAt);

interface RigProps {
  onTick: (a: AngleRef) => void;
  onStep: (i: number) => void;
  autoSpin: boolean;
  autoplay: boolean;
  timing: TourTiming;
  pose: TourPose;
  /** Each frame, the screen position (canvas px) of each part's near edge, in PANEL_LAYERS order: [x0, y0, x1, y1, …]. For tags on leader lines. */
  onProject?: (pts: Float32Array) => void;
  onInteract: () => void;
  initialTilt: number;
  draggable: boolean;
  /** Changing this number restarts the sequence. */
  tourKey: number;
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
function PanelRig({ onTick, onStep, autoSpin, autoplay, timing, pose, onProject, onInteract, initialTilt, draggable, tourKey }: RigProps) {
  const group = useRef<THREE.Group>(null);
  const s = useMemo(() => schedule(timing), [timing]);
  const angles = useRef<AngleRef>({ tilt: initialTilt, azimuth: -28 });
  const target = useRef<AngleRef>({ tilt: initialTilt, azimuth: -28 });
  const clock = useRef({ key: -1, t: 0, life: 0, cancelled: false });
  const shown = useRef(-1);
  const texture = useMemo(() => makeCellTexture(), []);
  const { gl, camera, size } = useThree();
  // Scratch space for the projection, allocated once: the frame loop must not.
  const scratch = useRef({ v: new THREE.Vector3(), pts: new Float32Array(LAYER_COUNT * 2) });

  const glass = useRef<THREE.Mesh>(null);
  const cells = useRef<THREE.Mesh>(null);
  const backsheet = useRef<THREE.Mesh>(null);
  const frame = useRef<THREE.Group>(null);
  const junction = useRef<THREE.Mesh>(null);
  // Same order as PANEL_LAYERS, which is the order they separate in.
  // Held in a ref: the frame loop reaches through this list every frame, and
  // react-hooks/immutability treats a render-local array as something the loop
  // could reassign. A ref is what that rule exempts.
  const parts = useRef<React.RefObject<THREE.Object3D | null>[]>([glass, cells, backsheet, frame, junction]);

  useEffect(() => () => texture.dispose(), [texture]);

  // Pointer drag turns the module: vertical changes tilt, horizontal changes
  // the direction it faces. Listeners only — the cursor is styled in CSS.
  //
  // Not attached on a touch screen. The canvas needs touch-action: none to read
  // a drag, and a hero-sized element that swallows vertical swipes is a page
  // nobody can scroll. Phones get the sequence and the readouts, not the grab.
  useEffect(() => {
    if (!draggable) return;
    const el = gl.domElement;
    const t = target.current;
    const c = clock.current;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      // The visitor taking hold of the object outranks the sequence.
      c.cancelled = true;
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
  }, [gl, onInteract, draggable]);

  useFrame((_state, dt) => {
    const g = group.current;
    if (!g) return;
    const a = angles.current;
    const tg = target.current;
    const c = clock.current;

    // The sequence keeps its own clock rather than reading the renderer's.
    // r3f resets clock.elapsedTime whenever frameloop changes, and this scene
    // parks itself when it scrolls out of view, so an absolute time would jump
    // backwards mid-sequence. The step is capped because a tab that was in the
    // background hands back one enormous delta on its first frame.
    const delta = Math.min(dt, 0.05);
    c.life += delta;

    // Restarting is a prop change rather than an effect, so the replay button
    // never has to reach into the scene.
    if (c.key !== tourKey) {
      c.key = tourKey;
      c.t = 0;
      // The first tour can be declined (the opening has just shown the same
      // sequence full bleed); a replay, which is any later key, always runs.
      c.cancelled = tourKey === 1 && !autoplay;
    } else {
      c.t += delta;
    }

    // Declining the first tour also stops one already under way: the opening
    // can be replayed from the footer while the hero is mid-sequence, and when
    // it lifts the hero must be closed and at rest, not halfway open under
    // labels that assume a closed module. A replay (any later key) is exempt.
    if (!autoplay && c.key === 1) c.cancelled = true;

    const t = c.t;
    const running = !c.cancelled && t < s.endAt;
    const spread = running ? closeAt(t, s) : 0;
    // Silence before the entrance is spent by the opening on the sun. Nothing
    // of the module shows until its cue.
    g.visible = !running || t >= s.start;

    // Parts. Damped toward the timeline rather than set from it, so a cancel
    // mid-flight glides home instead of snapping.
    for (let i = 0; i < PANEL_LAYERS.length; i++) {
      const part = parts.current[i]?.current;
      if (!part) continue;
      const layer = PANEL_LAYERS[i];
      const want = layer.base + layer.explode * openAt(t, i, s) * spread;
      part.position.z = THREE.MathUtils.damp(part.position.z, running ? want : layer.base, 7, delta);
    }

    // The object arrives: up from below, and a little short of full size, so
    // the first thing it does on screen is settle rather than appear.
    const entered = running ? THREE.MathUtils.smootherstep(t, s.start, s.enterAt) : 1;
    const open = running ? openAt(t, 0, s) * spread : 0;
    g.position.y = PANEL_Y - (1 - entered) * 0.3;
    const scale = (0.9 + 0.1 * entered) * (1 - (1 - OPEN_SCALE) * open);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, scale, 7, delta));

    // The pane becomes glass only while it is out of the stack.
    const pane = glass.current?.material;
    if (pane instanceof THREE.MeshPhysicalMaterial) {
      pane.opacity = THREE.MathUtils.damp(
        pane.opacity,
        GLASS_CLOSED + (GLASS_OPEN - GLASS_CLOSED) * open,
        7,
        delta,
      );
    }

    if (running) {
      // Turning toward the viewer as it opens: at 52° the separation between
      // the parts is visible, at 20° they overlap into one line.
      tg.tilt = pose.tiltFrom + (pose.tiltTo - pose.tiltFrom) * THREE.MathUtils.smootherstep(t, s.start + s.enter * 0.5, s.openAt);
      tg.azimuth = pose.azimuthFrom + (pose.azimuthTo - pose.azimuthFrom) * THREE.MathUtils.smootherstep(t, s.openAt, s.closeAt);
    } else if (autoSpin) {
      // Idle motion is a slow sway rather than a spin. A full rotation would
      // keep turning the panel away from the viewer, and the owner asked for
      // animated without being distracting on first sight.
      tg.azimuth = -18 + Math.sin(c.life * 0.32) * 34;
      tg.tilt = initialTilt;
    }

    a.tilt = THREE.MathUtils.damp(a.tilt, tg.tilt, 4, delta);
    a.azimuth = THREE.MathUtils.damp(a.azimuth, tg.azimuth, 4, delta);
    // Tilt is measured from horizontal, the way an installer measures it, so a
    // panel lying flat on the roof reads 0 and not 90.
    g.rotation.x = -Math.PI / 2 + a.tilt / DEG;
    g.rotation.y = a.azimuth / DEG;
    onTick(a);

    // Where each part's near edge is on screen, for tags that follow the
    // parts. The matrices are last frame's, which nobody can see.
    if (onProject) {
      const { v, pts } = scratch.current;
      for (let i = 0; i < LAYER_COUNT; i++) {
        const part = parts.current[i]?.current;
        if (!part) continue;
        v.set(PANEL_W / 2 + 0.06, 0, 0);
        part.localToWorld(v).project(camera);
        pts[i * 2] = ((v.x + 1) / 2) * size.width;
        pts[i * 2 + 1] = ((1 - v.y) / 2) * size.height;
      }
      onProject(pts);
    }

    // React hears about the caption only when it changes, which is five times
    // in ten seconds rather than sixty times a second.
    const caption = running ? captionAt(t, s) : -1;
    if (caption !== shown.current) {
      shown.current = caption;
      onStep(caption);
    }
  });

  return (
    <group ref={group} position={[0, PANEL_Y, 0]}>
      {/* Front glass, 3.2 mm. Almost invisible while the module is closed, on
          purpose: the sheen that makes the object read as glass belongs to the
          laminate below, which is where it was before this pane existed, and a
          36% white sheet over the cells turns the only dark mass on the page
          pale. Its opacity is raised in the frame loop as it separates, so it
          is a real pane when it is being talked about and a hairline the rest
          of the time. No castShadow: a transparent mesh still casts an opaque
          shadow in three, and an opaque rectangle landing on the cells 300 mm
          below it is exactly what glass does not do. */}
      <mesh ref={glass} position={[0, 0, PANEL_LAYERS[0].base]}>
        <boxGeometry args={[PANEL_W, PANEL_H, 0.0032]} />
        <meshPhysicalMaterial
          color="#dde7f4"
          transparent
          opacity={GLASS_CLOSED}
          metalness={0}
          roughness={0.04}
          clearcoat={1}
          clearcoatRoughness={0.02}
          reflectivity={0.85}
          envMapIntensity={1.4}
          depthWrite={false}
        />
      </mesh>

      {/* The cells, drawn once into a canvas. Physical rather than standard so
          the sun leaves a specular streak across the laminate as it turns. */}
      <mesh ref={cells} castShadow receiveShadow position={[0, 0, PANEL_LAYERS[1].base]}>
        <boxGeometry args={[PANEL_W - 0.024, PANEL_H - 0.024, 0.0026]} />
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

      {/* Backsheet. White, matte, and the reason a module reads as a sandwich
          and not as a slab once it comes apart. */}
      <mesh ref={backsheet} castShadow receiveShadow position={[0, 0, PANEL_LAYERS[2].base]}>
        <boxGeometry args={[PANEL_W - 0.004, PANEL_H - 0.004, 0.0018]} />
        <meshStandardMaterial color="#f2f1ec" metalness={0.02} roughness={0.86} />
      </mesh>

      {/* Frame: four rails, not a box. A solid box would have to sit behind the
          laminate to avoid hiding it, and then it is not a frame. */}
      <group ref={frame} position={[0, 0, PANEL_LAYERS[3].base]}>
        {([1, -1] as const).map((s) => (
          <mesh key={`rail-y${s}`} castShadow receiveShadow position={[0, (s * (PANEL_H + RAIL)) / 2, 0]}>
            <boxGeometry args={[PANEL_W + 2 * RAIL, RAIL, FRAME_D]} />
            <meshStandardMaterial color="#c3c8d0" metalness={0.9} roughness={0.28} envMapIntensity={1} />
          </mesh>
        ))}
        {([1, -1] as const).map((s) => (
          <mesh key={`rail-x${s}`} castShadow receiveShadow position={[(s * (PANEL_W + RAIL)) / 2, 0, 0]}>
            <boxGeometry args={[RAIL, PANEL_H, FRAME_D]} />
            <meshStandardMaterial color="#c3c8d0" metalness={0.9} roughness={0.28} envMapIntensity={1} />
          </mesh>
        ))}
      </group>

      {/* Junction box on the back */}
      <mesh ref={junction} castShadow position={[0, -0.42, PANEL_LAYERS[4].base]}>
        <boxGeometry args={[0.18, 0.11, 0.028]} />
        <meshStandardMaterial color="#20242b" metalness={0.1} roughness={0.7} />
      </mesh>
    </group>
  );
}

/**
 * The room the object reflects.
 *
 * Built from a 64 × 32 gradient rather than fetched: an HDRI from a CDN is a
 * network request in the hero's critical path, and this scene only needs to
 * know that there is a bright ceiling, a bone floor and one window. Without it
 * the glass has nothing to reflect and reads as flat plastic.
 */
function StudioEnv() {
  const gl = useThree((s) => s.gl);

  // Built once per renderer. Assigning scene.environment ourselves trips
  // react-hooks/immutability (the scene is a hook's return value); attaching
  // through the reconciler is the r3f idiom for the same thing.
  const env = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const sky = ctx.createLinearGradient(0, 0, 0, 32);
    sky.addColorStop(0, "#ffffff");
    sky.addColorStop(0.46, "#e4eaf3");
    sky.addColorStop(0.54, "#c9c6bd");
    sky.addColorStop(1, "#6e6a61");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 64, 32);

    // One window, warm, to the left. This is the streak that crosses the glass.
    ctx.fillStyle = "#fff4e2";
    ctx.fillRect(7, 3, 17, 9);

    const equirect = new THREE.CanvasTexture(canvas);
    equirect.mapping = THREE.EquirectangularReflectionMapping;
    equirect.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromEquirectangular(equirect);
    equirect.dispose();
    pmrem.dispose();
    return target;
  }, [gl]);

  useEffect(() => () => env?.dispose(), [env]);

  return env ? <primitive object={env.texture} attach="environment" /> : null;
}

export default function PanelScene({
  onTick,
  onStep,
  autoSpin,
  onInteract,
  initialTilt = 22,
  draggable = true,
  economy = false,
  paused = false,
  tourKey = 1,
  autoplay = true,
  stage = "light",
  timing = HERO_TIMING,
  pose = HERO_POSE,
  cameraPosition = CAMERA_POS,
  onProject,
}: {
  onTick: (a: AngleRef) => void;
  onStep: (i: number) => void;
  autoSpin: boolean;
  onInteract: () => void;
  initialTilt?: number;
  draggable?: boolean;
  /** False: the first tour does not run and the module simply sits at rest.
      Set by the hero when the opening has just played the same sequence. */
  autoplay?: boolean;
  /** "dark" is the opening's ink stage: no contact shadow (there is no floor
      to catch it), a cooler rim so the frame separates from the black, and
      a little less ambient so the glass keeps its contrast. */
  stage?: "light" | "dark";
  /** The tour's clock. The hero uses the default; the opening runs a faster one with a delay for the sun. */
  timing?: TourTiming;
  /** How the module is held while it comes apart. The hero turns it to the viewer; the opening lays it flat. */
  pose?: TourPose;
  /** The opening looks down on the flat module from a little higher. See the note on CAMERA_POS before moving it closer. */
  cameraPosition?: [number, number, number];
  /** Screen positions of the parts each frame, for tags. See RigProps. */
  onProject?: (pts: Float32Array) => void;
  /** Phones: half the shadow map, half the pixels, same sequence. */
  economy?: boolean;
  /** Scrolled past. A hero that keeps drawing sixty frames a second into a
      screen nobody is looking at is a battery bill, not a feature. */
  paused?: boolean;
  tourKey?: number;
}) {
  return (
    <Canvas
      shadows
      frameloop={paused ? "never" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: cameraPosition, fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: true }}
      className="panel-canvas"
      style={draggable ? { touchAction: "none" } : undefined}
    >
      {/* Studio lighting: one hard key standing in for the sun, a broad fill so
          the frame does not go black, and a warm bounce off the front. */}
      <ambientLight intensity={stage === "dark" ? 0.42 : 0.7} />
      <directionalLight
        position={[2.6, 4.2, 2.2]}
        intensity={stage === "dark" ? 3 : 2.6}
        castShadow
        shadow-mapSize={economy ? [512, 512] : [1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-3, 1.6, -2]} intensity={stage === "dark" ? 1.2 : 0.55} color="#cddcf0" />
      <pointLight position={[0, 0.4, 2.4]} intensity={stage === "dark" ? 0.8 : 1.1} color="#fff3dd" />

      <StudioEnv />
      <PanelRig
        onTick={onTick}
        onStep={onStep}
        autoSpin={autoSpin}
        autoplay={autoplay}
        timing={timing}
        pose={pose}
        onProject={onProject}
        onInteract={onInteract}
        initialTilt={initialTilt}
        draggable={draggable}
        tourKey={tourKey}
      />
      {stage === "light" && (
        <ContactShadows
          position={[0, -1.05, 0]}
          opacity={0.24}
          scale={5}
          blur={3}
          far={3}
          resolution={economy ? 256 : 512}
        />
      )}
    </Canvas>
  );
}
