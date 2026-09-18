"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Per-browser persistence used ONLY in demo mode (Supabase not connected) so
 * forms and designs survive reloads. Values never leave the device. When
 * Supabase is configured, features write through server actions instead.
 */
export function useLocalStore<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`solink:${key}`);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {}
    setLoaded(true);
  }, [key]);
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(`solink:${key}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [value, set, loaded];
}
