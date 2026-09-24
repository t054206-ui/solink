import { clsx, type ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

const TIME_KEYS = ["timeStyle", "hour", "minute", "second", "timeZoneName", "dayPeriod"] as const;

/**
 * Formats an ISO timestamp. Falls back to "—" for missing or unparsable input.
 * Uses toLocaleString when the options include a time component, because
 * toLocaleDateString rejects time options such as timeStyle.
 */
export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hasTime = TIME_KEYS.some((k) => opts[k] !== undefined);
  return hasTime ? d.toLocaleString("en-GB", opts) : d.toLocaleDateString("en-GB", opts);
}

export function formatMoney(v: number | null | undefined, currency = "KWD", digits = 0) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${currency}`;
}

export function pct(v: number | null | undefined, digits = 0) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${(v * 100).toLocaleString("en-US", { maximumFractionDigits: digits })}%`;
}

export function specText(s: { value: unknown; unit?: string; status?: string } | undefined | null): string {
  // A value the manufacturer does not publish reads "Not stated" (owner, 2026-09-24): never a guess.
  if (!s) return "Not stated";
  if (s.value === null || s.value === undefined) {
    const st = (s as { status?: string }).status;
    return st === "not_applicable" ? "Not applicable" : st === "pending_verification" ? "Pending verification" : "Not stated";
  }
  return `${typeof s.value === "number" ? s.value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(s.value)}${s.unit ? ` ${s.unit}` : ""}`;
}

export function specNum(s: { value: unknown } | undefined | null): number | null {
  if (!s || typeof s.value !== "number") return null;
  return s.value;
}
