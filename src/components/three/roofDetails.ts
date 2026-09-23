import * as THREE from "three";

/**
 * Materials and planting for RoofScene, drawn in code.
 *
 * Every texture is a small canvas and every plant is built from primitives
 * and instanced leaves, so the rooftop costs no image requests and no model
 * files. Randomness is seeded: the roof looks the same on every load and on
 * the server's idea of it, which matters for a page that must not flicker.
 *
 * The planting is what a roof in Kuwait can keep alive: a date-style palm,
 * agave, ornamental grass and clipped evergreen shrubs in gravel. Nothing
 * tropical, nothing lush.
 */

/** mulberry32: small, fast, deterministic. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")] as const;
}

function toTexture(c: HTMLCanvasElement, repeat: [number, number] = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Render plaster: warm off-white with fine grain and a few soft weathering patches. */
export function plasterTexture() {
  const [c, ctx] = canvas(256, 256);
  if (!ctx) return toTexture(c);
  const r = rng(11);
  ctx.fillStyle = "#f1ece3";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14; i++) {
    const x = r() * 256, y = r() * 256, rad = 20 + r() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(120,100,70,${0.02 + r() * 0.03})`);
    g.addColorStop(1, "rgba(120,100,70,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = r() > 0.5 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.06)";
    ctx.fillRect(r() * 256, r() * 256, 1 + r(), 1 + r());
  }
  return toTexture(c, [3, 2]);
}

/** 600 mm concrete pavers, four by four per repeat (2.4 m), each a slightly different tone. */
export function paverTexture(repeat: [number, number]) {
  const [c, ctx] = canvas(512, 512);
  if (!ctx) return toTexture(c, repeat);
  const r = rng(23);
  const s = 128;
  ctx.fillStyle = "#c9c0ae";
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const l = 86 + r() * 5;
      ctx.fillStyle = `hsl(38 ${16 + r() * 6}% ${l}%)`;
      ctx.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
    }
  }
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = r() > 0.55 ? "rgba(60,45,25,0.06)" : "rgba(255,255,255,0.07)";
    ctx.fillRect(r() * 512, r() * 512, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  // A little dust gathered along the joints.
  ctx.strokeStyle = "rgba(150,130,100,0.18)";
  ctx.lineWidth = 3;
  for (let k = 0; k <= 4; k++) {
    ctx.beginPath(); ctx.moveTo(k * s, 0); ctx.lineTo(k * s, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, k * s); ctx.lineTo(512, k * s); ctx.stroke();
  }
  return toTexture(c, repeat);
}

/** Beige river gravel for the planters. */
export function gravelTexture() {
  const [c, ctx] = canvas(256, 256);
  if (!ctx) return toTexture(c);
  const r = rng(37);
  ctx.fillStyle = "#b9ad97";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const l = 60 + r() * 30;
    ctx.fillStyle = `hsl(${30 + r() * 15} ${10 + r() * 12}% ${l}%)`;
    ctx.beginPath();
    ctx.ellipse(r() * 256, r() * 256, 1.5 + r() * 3, 1 + r() * 2.2, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c, [1, 4]);
}

/** Palm bark: the stubs of old fronds as irregular horizontal rings. */
export function barkTexture() {
  const [c, ctx] = canvas(64, 256);
  if (!ctx) return toTexture(c);
  const r = rng(41);
  ctx.fillStyle = "#8a7457";
  ctx.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 9 + r() * 4) {
    ctx.fillStyle = `rgba(60,45,30,${0.35 + r() * 0.25})`;
    ctx.fillRect(0, y, 64, 2 + r() * 2);
    ctx.fillStyle = `rgba(190,165,130,${0.2 + r() * 0.2})`;
    ctx.fillRect(0, y + 3, 64, 2);
  }
  return toTexture(c, [2, 3]);
}

/** A soft dark blob, laid under objects as contact shading where the shadow map is too coarse. */
export function contactTexture() {
  // Opaque white-to-black: an alphaMap is read from the green channel, so a
  // transparent canvas would upload as a hard white disc.
  const [c, ctx] = canvas(128, 128);
  if (!ctx) return toTexture(c, [1, 1], false);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.55, "#8c8c8c");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = toTexture(c, [1, 1], false);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Alpha mask for a pinnate palm frond: a rib and paired leaflets narrowing to the tip. */
function frondMask() {
  const [c, ctx] = canvas(512, 128);
  if (!ctx) return toTexture(c, [1, 1], false);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 64); ctx.lineTo(505, 64); ctx.stroke();
  const r = rng(53);
  for (let x = 30; x < 500; x += 7) {
    const t = x / 512;
    const len = 58 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7) * (0.85 + r() * 0.3);
    ctx.lineWidth = 3.2 - t * 1.6;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + len * 0.55, 64 + s * len);
      ctx.stroke();
    }
  }
  const t = toTexture(c, [1, 1], false);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Alpha mask for a single broadleaf, for the clipped shrubs. */
function leafMask() {
  const [c, ctx] = canvas(64, 64);
  if (!ctx) return toTexture(c, [1, 1], false);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(32, 32, 29, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  const t = toTexture(c, [1, 1], false);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Bend a flat frond plane: droop along its length, fold into a shallow V across it. */
function frondGeometry(droop: number) {
  const g = new THREE.PlaneGeometry(1.8, 0.62, 18, 2);
  g.translate(0.9, 0, 0);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const t = x / 1.8;
    p.setY(i, -droop * t * t * 1.8 + Math.abs(z) * 0.32);
  }
  g.computeVertexNormals();
  return g;
}

export interface Disposable { dispose(): void }

/**
 * A date-style palm, about 3.2 m: a slightly leaning ringed trunk and a crown
 * of eighteen fronds at varied angles. Returns the group and what to dispose.
 */
export function buildPalm(seed: number, height = 3.2) {
  const r = rng(seed);
  const group = new THREE.Group();
  const trash: Disposable[] = [];

  const bark = barkTexture();
  const trunkMat = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95 });
  trash.push(bark, trunkMat);
  const segs = 4;
  let x = 0, z = 0, y = 0;
  const lean = 0.05 + r() * 0.05;
  for (let i = 0; i < segs; i++) {
    const h = height / segs;
    const rb = 0.16 - i * 0.012, rt = 0.16 - (i + 1) * 0.012;
    const geo = new THREE.CylinderGeometry(rt, rb, h, 14, 1);
    trash.push(geo);
    const m = new THREE.Mesh(geo, trunkMat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    group.add(m);
    y += h; x += lean * h * 0.5; z += lean * h * 0.2;
  }

  const mask = frondMask();
  trash.push(mask);
  const greens = ["#5f7043", "#6d7d4c", "#56663e"].map((c) => {
    const m = new THREE.MeshStandardMaterial({ color: c, alphaMap: mask, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 });
    trash.push(m);
    return m;
  });
  const geos = [0.25, 0.55, 0.9].map((d) => { const g = frondGeometry(d); trash.push(g); return g; });
  const crown = new THREE.Group();
  crown.position.set(x, y - 0.05, z);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const az = (i / n) * Math.PI * 2 + r() * 0.3;
    const up = i % 3 === 0 ? 0.55 + r() * 0.25 : i % 3 === 1 ? 0.15 + r() * 0.2 : -0.2 + r() * 0.2;
    const pivot = new THREE.Group();
    pivot.rotation.y = az;
    const frond = new THREE.Mesh(geos[i % 3], greens[(i + 1) % 3]);
    frond.rotation.z = up;
    frond.scale.setScalar(0.85 + r() * 0.3);
    frond.castShadow = true;
    pivot.add(frond);
    crown.add(pivot);
  }
  group.add(crown);
  return { object: group, dispose: () => trash.forEach((t) => t.dispose()) };
}

/** An agave: thick grey-green blades from one rosette. */
export function buildAgave(seed: number, size = 1) {
  const r = rng(seed);
  const group = new THREE.Group();
  const geo = new THREE.ConeGeometry(0.055, 0.7, 5);
  geo.translate(0, 0.35, 0);
  const mat = new THREE.MeshStandardMaterial({ color: "#7c9488", roughness: 0.55 });
  const n = 20;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, mat);
    const inner = i < 6;
    m.rotation.order = "YXZ";
    m.rotation.y = (i / n) * Math.PI * 2 * (inner ? 3 : 1) + r() * 0.4;
    m.rotation.x = inner ? 0.25 + r() * 0.2 : 0.7 + r() * 0.45;
    m.scale.set(1, (inner ? 0.75 : 1) * (0.85 + r() * 0.3), 1);
    m.castShadow = true;
    group.add(m);
  }
  group.scale.setScalar(size);
  return { object: group, dispose: () => { geo.dispose(); mat.dispose(); } };
}

/** A tuft of ornamental grass: sixty thin tapered blades, straw to sage. */
export function buildGrass(seed: number, count = 60) {
  const r = rng(seed);
  const geo = new THREE.PlaneGeometry(0.03, 0.62, 1, 5);
  geo.translate(0, 0.31, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / 0.62;
    p.setX(i, p.getX(i) * (1 - t * 0.9));
    p.setZ(i, t * t * 0.16);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const col = new THREE.Color();
  const palette = ["#a9a27a", "#8f9a6e", "#b8ad83", "#9aa27d"];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.12;
    v.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    e.set((r() - 0.5) * 0.7, a, (r() - 0.5) * 0.7);
    q.setFromEuler(e);
    s.set(1, 0.7 + r() * 0.6, 1);
    m.compose(v, q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(palette[i % palette.length]).offsetHSL(0, 0, (r() - 0.5) * 0.08));
  }
  mesh.castShadow = true;
  return { object: mesh, dispose: () => { geo.dispose(); mat.dispose(); mesh.dispose(); } };
}

/** A clipped evergreen shrub: a few hundred small leaves on an ellipsoid, darker inside. */
export function buildShrub(seed: number, radius: [number, number, number] = [0.42, 0.34, 0.42], count = 420) {
  const r = rng(seed);
  const mask = leafMask();
  const geo = new THREE.PlaneGeometry(0.15, 0.09);
  const mat = new THREE.MeshStandardMaterial({ alphaMap: mask, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const col = new THREE.Color();
  const palette = ["#56693f", "#63774a", "#4b5d37", "#6f8254"];
  for (let i = 0; i < count; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2;
    const k = Math.sqrt(1 - u * u);
    const shell = 0.72 + r() * 0.28;
    v.set(Math.cos(th) * k * radius[0] * shell, (u * 0.5 + 0.5) * radius[1] * 2 * shell + 0.02, Math.sin(th) * k * radius[2] * shell);
    e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
    q.setFromEuler(e);
    m.compose(v, q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(palette[i % palette.length]).offsetHSL(0, 0, (shell - 0.86) * 0.25 + (r() - 0.5) * 0.05));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { object: mesh, dispose: () => { geo.dispose(); mat.dispose(); mask.dispose(); mesh.dispose(); } };
}
