import * as THREE from "three";

/**
 * The cell pattern is drawn once into a canvas and used as the glass texture,
 * rather than built from thousands of little meshes. One textured quad costs a
 * single draw call and looks closer to a real module than instanced boxes do,
 * because the busbars and the gaps between cells are hairlines, and hairline
 * geometry aliases badly at this size.
 *
 * Dimensions follow a 108-half-cell module: 6 columns by 18 half rows.
 */
export function makeCellTexture(cols = 6, rows = 18): THREE.CanvasTexture {
  const cell = 96;
  const gap = 7;
  const pad = 10;
  const w = cols * cell + (cols - 1) * gap + pad * 2;
  const h = rows * cell + (rows - 1) * gap + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Backsheet showing through the gaps between cells.
  ctx.fillStyle = "#0b1a2e";
  ctx.fillRect(0, 0, w, h);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + c * (cell + gap);
      const y = pad + r * (cell + gap);

      // Monocrystalline cells are pseudo-square: the corners are chamfered
      // because the wafer is cut from a round ingot. That chamfer is the most
      // recognisable thing about a real panel, so it is worth drawing.
      const ch = 12;
      ctx.beginPath();
      ctx.moveTo(x + ch, y);
      ctx.lineTo(x + cell - ch, y);
      ctx.lineTo(x + cell, y + ch);
      ctx.lineTo(x + cell, y + cell - ch);
      ctx.lineTo(x + cell - ch, y + cell);
      ctx.lineTo(x + ch, y + cell);
      ctx.lineTo(x, y + cell - ch);
      ctx.lineTo(x, y + ch);
      ctx.closePath();
      ctx.fillStyle = "#13294a";
      ctx.fill();

      // Busbars and the finer finger lines that feed them.
      ctx.strokeStyle = "rgba(190, 205, 225, 0.55)";
      ctx.lineWidth = 2.5;
      for (const f of [0.28, 0.5, 0.72]) {
        ctx.beginPath();
        ctx.moveTo(x + cell * f, y + 2);
        ctx.lineTo(x + cell * f, y + cell - 2);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(160, 180, 205, 0.16)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 14; i++) {
        const fy = y + (cell / 14) * i;
        ctx.beginPath();
        ctx.moveTo(x + 2, fy);
        ctx.lineTo(x + cell - 2, fy);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
