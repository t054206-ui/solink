"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeCellTexture } from "./panelTexture";
import { SolarModule } from "./SolarModule";
import { Sky } from "./RoofScene";
import { rng } from "./roofDetails";
import { solinkMarkSvg } from "@/components/brand/Logo";

/**
 * Reports' scene: the system's record as a printed technical sheet on a
 * stone desk, a second sheet under it, a steel rule, a pencil and the corner
 * of a module sample, with late sun through a window laying its mullions
 * across the paper.
 *
 * The sheet is drawn from the page's own data and nothing else: a plan of
 * the array with as many modules as the system record lists (none when the
 * count is unrecorded), a north arrow, and a title block with the real
 * Solink mark, the system's name and the page's counts of reports and
 * complete months. Dimension lines carry no numbers: nothing is measured.
 */

export interface ReportSheetData { systemName: string; panelCount: number | null; reportCount: number; monthCount: number }

const SHEET = { w: 1.6, h: 1.13 };

function sheetTexture(d: ReportSheetData) {
  const W = 1600, H = 1130;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  const ctx = c.getContext("2d");
  if (!ctx) return t;
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  const mono = "'JetBrains Mono', ui-monospace, monospace";
  const draw = (mark?: HTMLImageElement) => {
    ctx.fillStyle = "#fbfaf6"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1a3a63"; ctx.lineWidth = 3; ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.lineWidth = 1.2; ctx.strokeRect(56, 56, W - 112, H - 112);
    ctx.fillStyle = "#6b6e77"; ctx.font = `500 26px ${mono}`;
    ctx.fillText("PLAN · ARRAY AS RECORDED", 90, 110);
    // Plan frame, with unnumbered dimension lines.
    const P = { x: 110, y: 150, w: 950, h: 620 };
    ctx.setLineDash([12, 8]); ctx.strokeStyle = "#9aa0a8"; ctx.strokeRect(P.x, P.y, P.w, P.h); ctx.setLineDash([]);
    ctx.strokeStyle = "#1a3a63"; ctx.lineWidth = 1.5;
    const tick = (x1: number, y1: number, x2: number, y2: number) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    tick(P.x, P.y + P.h + 40, P.x + P.w, P.y + P.h + 40); tick(P.x, P.y + P.h + 28, P.x, P.y + P.h + 52); tick(P.x + P.w, P.y + P.h + 28, P.x + P.w, P.y + P.h + 52);
    tick(P.x - 40, P.y, P.x - 40, P.y + P.h); tick(P.x - 52, P.y, P.x - 28, P.y); tick(P.x - 52, P.y + P.h, P.x - 28, P.y + P.h);
    const n = d.panelCount ?? 0;
    if (n > 0) {
      const cols = n <= 8 ? n : n <= 20 ? Math.ceil(n / 2) : Math.ceil(n / Math.ceil(n / 10));
      const rows = Math.ceil(n / cols);
      const cell = Math.min((P.w - 80) / cols, (P.h - 80) / rows / 1.6);
      const gx = P.x + (P.w - cols * cell) / 2, gy = P.y + (P.h - rows * cell * 1.62) / 2;
      for (let i = 0; i < n; i++) {
        const cx = gx + (i % cols) * cell, cy = gy + Math.floor(i / cols) * cell * 1.62;
        ctx.fillStyle = "#1b3657"; ctx.fillRect(cx + cell * 0.04, cy, cell * 0.92, cell * 1.5);
        ctx.strokeStyle = "#aab2bb"; ctx.lineWidth = 2; ctx.strokeRect(cx + cell * 0.04, cy, cell * 0.92, cell * 1.5);
        ctx.strokeStyle = "rgba(11,26,46,0.9)"; ctx.lineWidth = 1;
        for (let k = 1; k < 3; k++) tick(cx + cell * 0.04 + (cell * 0.92 * k) / 3, cy, cx + cell * 0.04 + (cell * 0.92 * k) / 3, cy + cell * 1.5);
      }
    } else {
      ctx.fillStyle = "#6b6e77"; ctx.font = `500 30px ${family}`; ctx.textAlign = "center";
      ctx.fillText("Panel count not recorded", P.x + P.w / 2, P.y + P.h / 2); ctx.textAlign = "start";
    }
    // North arrow.
    ctx.save(); ctx.translate(1300, 260);
    ctx.strokeStyle = "#1a3a63"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#1a3a63"; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(18, 22); ctx.lineTo(0, 8); ctx.lineTo(-18, 22); ctx.closePath(); ctx.fill();
    ctx.font = `700 34px ${family}`; ctx.textAlign = "center"; ctx.fillText("N", 0, -72); ctx.restore(); ctx.textAlign = "start";
    // Title block.
    const T = { x: 1110, y: 820, w: 434, h: 254 };
    ctx.strokeStyle = "#1a3a63"; ctx.lineWidth = 2; ctx.strokeRect(T.x, T.y, T.w, T.h);
    tick(T.x, T.y + 86, T.x + T.w, T.y + 86); tick(T.x, T.y + 170, T.x + T.w, T.y + 170);
    if (mark) ctx.drawImage(mark, T.x + 18, T.y + 14, 58, 58);
    ctx.fillStyle = "#1a3a63"; ctx.font = `600 40px ${family}`; ctx.fillText("Solink", T.x + 90, T.y + 58);
    ctx.fillStyle = "#6b6e77"; ctx.font = `500 22px ${mono}`; ctx.fillText("SOLAR RECORD", T.x + 250, T.y + 56);
    ctx.fillStyle = "#0e1116"; ctx.font = `600 34px ${family}`;
    const name = d.systemName.length > 24 ? `${d.systemName.slice(0, 23)}…` : d.systemName;
    ctx.fillText(name, T.x + 20, T.y + 140);
    ctx.fillStyle = "#a25a00"; ctx.font = `500 26px ${mono}`;
    ctx.fillText(`${d.reportCount} ${d.reportCount === 1 ? "REPORT" : "REPORTS"} · ${d.monthCount} ${d.monthCount === 1 ? "MONTH" : "MONTHS"}`, T.x + 20, T.y + 220);
    // Notes lines, left of the title block.
    ctx.strokeStyle = "#d8d6cf"; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) tick(110, 880 + i * 44, 110 + 760 - i * 90, 880 + i * 44);
    t.needsUpdate = true;
  };
  draw();
  const img = new Image();
  img.onload = () => draw(img);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(solinkMarkSvg())}`;
  return t;
}

function stoneTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");
  if (ctx) {
    const r = rng(131);
    ctx.fillStyle = "#d9cfbf"; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const l = 70 + r() * 20;
      ctx.fillStyle = `hsla(35, 18%, ${l}%, ${0.25 + r() * 0.3})`;
      ctx.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3);
    }
    ctx.strokeStyle = "rgba(120,100,80,0.12)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(r() * 512, 0); ctx.bezierCurveTo(r() * 512, 170, r() * 512, 340, r() * 512, 512); ctx.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

function Desk({ data }: { data: ReportSheetData }) {
  const sheet = useMemo(() => sheetTexture(data), [data]);
  const stone = useMemo(() => stoneTexture(), []);
  const cells = useMemo(() => { const t = makeCellTexture(); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  useEffect(() => () => { sheet.dispose(); stone.dispose(); cells.dispose(); }, [sheet, stone, cells]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial map={stone} roughness={0.75} />
      </mesh>
      {/* The sheet beneath, turned a little. */}
      <mesh position={[0.12, 0.002, -0.06]} rotation={[-Math.PI / 2, 0, 0.07]} receiveShadow castShadow>
        <planeGeometry args={[SHEET.w, SHEET.h]} />
        <meshStandardMaterial color="#f3f0e8" roughness={0.9} />
      </mesh>
      {/* The record. */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, -0.035]} receiveShadow castShadow>
        <planeGeometry args={[SHEET.w, SHEET.h]} />
        <meshStandardMaterial map={sheet} roughness={0.85} />
      </mesh>
      {/* Steel rule and pencil. */}
      <mesh position={[-0.2, 0.008, 0.72]} rotation={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.006, 0.05]} />
        <meshStandardMaterial color="#c3c8cf" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0.95, 0.012, 0.52]} rotation={[0, -0.6, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.42, 6]} />
        <meshStandardMaterial color="#1a3a63" roughness={0.5} />
      </mesh>
      {/* A module sample's corner, off the sheet's edge. */}
      <group position={[1.25, 0.03, -0.55]} rotation={[-Math.PI / 2, 0, 0.5]}>
        <SolarModule w={0.7} h={0.5} cells={cells} />
      </group>
    </group>
  );
}

/** Window mullions above the desk, out of view: they only cast the long shadows. */
function Window() {
  return (
    <group position={[-2.4, 2.6, -1.2]} rotation={[0, 0.45, 0]}>
      {[-0.6, 0, 0.6].map((x) => (
        <mesh key={x} position={[x, 0, 0]} castShadow>
          <boxGeometry args={[0.06, 2.2, 0.06]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.4, 0.06, 0.06]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Camera({ still, parallax }: { still: boolean; parallax: boolean }) {
  const target = useMemo(() => new THREE.Vector3(0.15, 0, -0.05), []);
  const s = useRef({ px: 0, py: 0 });
  useFrame((state, dt) => {
    const k = Math.min(1, dt * 2);
    s.current.px += ((parallax ? state.pointer.x : 0) - s.current.px) * k;
    s.current.py += ((parallax ? state.pointer.y : 0) - s.current.py) * k;
    const drift = still ? 0 : Math.sin(state.clock.elapsedTime * 0.08) * 0.04;
    state.camera.position.set(0.9 + drift + s.current.px * 0.2, 2.35 + s.current.py * 0.1, 1.75);
    state.camera.lookAt(target);
  });
  return null;
}

export default function ReportDeskScene({ data, paused = false, still = false, economy = false, parallax = true }: { data: ReportSheetData; paused?: boolean; still?: boolean; economy?: boolean; parallax?: boolean }) {
  return (
    <Canvas
      shadows="percentage"
      frameloop={paused ? "never" : still ? "demand" : "always"}
      dpr={economy ? [1, 1.5] : [1, 2]}
      camera={{ position: [0.9, 2.35, 1.75], fov: 34, near: 0.05, far: 30 }}
      gl={{ antialias: true, alpha: true }}
    >
      {/* Late sun through a window: warm, low, from the upper left, raking across the paper. */}
      <hemisphereLight args={["#f3efe8", "#cbbfa9", 0.55]} />
      <directionalLight position={[-4.5, 4, -2]} intensity={2.9} color="#ffdcb0" castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-far={15} shadow-radius={5} shadow-bias={-0.0004} />
      <directionalLight position={[3, 3, 3]} intensity={0.45} color="#e2eaf5" />
      <Sky />
      <Camera still={still || paused} parallax={parallax && !still} />
      <Window />
      <Desk data={data} />
    </Canvas>
  );
}
