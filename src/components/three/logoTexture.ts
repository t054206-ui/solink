import * as THREE from "three";
import { solinkMarkSvg } from "@/components/brand/Logo";

/**
 * The Solink mark (and, optionally, the word "Solink") printed onto a small
 * canvas for use as a decal in a scene: a plinth, a bench, an inverter
 * label, a tool case, a report's title block. The mark is the real one from
 * `components/brand/Logo`, not a redraw. The canvas is drawn once the SVG
 * image has decoded; the texture updates itself then.
 */
export function logoTexture({ word = true, ink = "#1a3a63", paper = "rgba(0,0,0,0)", width = 512, height = 160 }: { word?: boolean; ink?: string; paper?: string; width?: number; height?: number } = {}) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const ctx = c.getContext("2d");
  if (!ctx) return t;
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, width, height);
    const s = height * 0.78;
    const x = word ? height * 0.15 : (width - s) / 2;
    ctx.drawImage(img, x, (height - s) / 2, s, s);
    if (word) {
      const family = getComputedStyle(document.body).fontFamily || "sans-serif";
      ctx.fillStyle = ink;
      ctx.font = `600 ${Math.round(height * 0.46)}px ${family}`;
      ctx.textBaseline = "middle";
      ctx.fillText("Solink", x + s + height * 0.12, height / 2 + height * 0.02);
    }
    t.needsUpdate = true;
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(solinkMarkSvg(ink))}`;
  return t;
}
