"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Product images or an explicit "No image provided" state. Never a stock photo. */
export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-inset text-fg-muted">
        <div className="flex flex-col items-center gap-2 text-[13px]"><ImageOff className="size-6" aria-hidden /> No image provided by the source</div>
      </div>
    );
  }
  const src = images[Math.min(i, images.length - 1)];
  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="aspect-[4/3] w-full rounded-[var(--radius-lg)] border border-border bg-inset object-contain" />
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto" aria-label="Image thumbnails">
          {images.map((u, idx) => (
            <li key={u + idx}>
              <button type="button" onClick={() => setI(idx)} aria-label={`Show image ${idx + 1}`} aria-pressed={idx === i}
                className={cn("size-14 overflow-hidden rounded-md border", idx === i ? "border-brand ring-2 ring-[var(--ring)]" : "border-border")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
