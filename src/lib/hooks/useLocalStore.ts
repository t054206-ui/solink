"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Per-browser persistence used ONLY in demo mode (Supabase not connected) so
 * forms, designs and locally-created records survive reloads. Values never
 * leave the device. When Supabase is configured, features write through server
 * actions instead.
 *
 * Implemented with useSyncExternalStore so the server render and the first
 * client render agree (no hydration mismatch) and no state is set inside an
 * effect. `loaded` tells callers whether the stored value has been read yet.
 */
const PREFIX = "solink:";
const listeners = new Set<() => void>();

/** Cache keyed by storage key so getSnapshot returns a stable reference. */
const snapshots = new Map<string, { raw: string | null; parsed: unknown }>();
/** First-seen fallback per key, so an inline object literal default stays stable. */
const fallbacks = new Map<string, unknown>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function snapshot<T>(key: string, initial: T): T {
  if (!fallbacks.has(key)) fallbacks.set(key, initial);
  const fallback = fallbacks.get(key) as T;
  const raw = readRaw(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.parsed as T;
  let parsed: unknown = fallback;
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = fallback;
    }
  }
  snapshots.set(key, { raw, parsed });
  return parsed as T;
}

function writeRaw(key: string, value: unknown) {
  try {
    const raw = JSON.stringify(value);
    localStorage.setItem(PREFIX + key, raw);
    snapshots.set(key, { raw, parsed: value });
  } catch {
    // Storage unavailable (private mode, quota). Keep the value in the cache
    // so the current session still behaves, and report it as not persisted.
    snapshots.set(key, { raw: snapshots.get(key)?.raw ?? null, parsed: value });
  }
  emit();
}

const subscribeNever = () => () => {};

/** True once the component has hydrated on the client. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

export function useLocalStore<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, boolean] {
  if (!fallbacks.has(key)) fallbacks.set(key, initial);
  const fallback = fallbacks.get(key) as T;

  const value = useSyncExternalStore(
    subscribe,
    () => snapshot<T>(key, fallback),
    () => fallback,
  );
  const loaded = useHydrated();

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const prev = snapshot<T>(key, fallbacks.get(key) as T);
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      writeRaw(key, next);
    },
    [key],
  );

  return [value, set, loaded];
}

/** Reads a stored value outside React (e.g. in an event handler). */
export function readLocalStore<T>(key: string, initial: T): T {
  if (typeof window === "undefined") return initial;
  return snapshot<T>(key, initial);
}
