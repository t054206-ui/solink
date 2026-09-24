import "server-only";

/**
 * Reads the first bytes of a file and returns the MIME type its content
 * actually matches, or null if it matches none of the types below.
 *
 * Security fix (Yellow, 2026-09-24): every upload and AI-inspection endpoint
 * used to trust `file.type`, which is just whatever the browser claims and
 * costs nothing to fake. A file renamed to look like a photo could carry
 * anything. This checks the bytes themselves instead, so a mislabeled file
 * is rejected regardless of what it says it is.
 */
const SIGNATURES: { mime: string; matches: (head: Uint8Array) => boolean }[] = [
  { mime: "image/jpeg", matches: (h) => h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff },
  { mime: "image/png", matches: (h) => h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47 },
  { mime: "image/gif", matches: (h) => h[0] === 0x47 && h[1] === 0x49 && h[2] === 0x46 },
  {
    mime: "image/webp",
    matches: (h) => h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50,
  },
  { mime: "application/pdf", matches: (h) => h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46 },
];

export async function sniffFileType(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return SIGNATURES.find((s) => s.matches(head))?.mime ?? null;
}
