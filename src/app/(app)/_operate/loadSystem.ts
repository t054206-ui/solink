import "server-only";
import { getPassport, getProfile, listSystems } from "@/lib/data/repositories";
import type { DataMode } from "@/lib/data/mode";
import { getPlatformSettings, type PlatformSettings } from "@/lib/data/settings";
import type { SolarPassport, SolarProfile, SolarSystem } from "@/lib/types";

export interface OperateContext {
  mode: DataMode;
  /** Request time (ISO). Read here, in a data function, so component render stays pure. */
  nowIso: string;
  profile: SolarProfile | null;
  settings: PlatformSettings;
  system: SolarSystem | null;
  passport: SolarPassport | null;
}

/** The homeowner's primary system plus everything the Operate pages share. */
export async function loadOperateContext(): Promise<OperateContext> {
  const [{ data: systems, mode }, { data: profile }, settings] = await Promise.all([listSystems(), getProfile(), getPlatformSettings()]);
  const system = systems[0] ?? null;
  const passport = system ? (await getPassport(system.id)).data : null;
  return { mode, nowIso: new Date().toISOString(), profile, settings, system, passport };
}

export function profileLocation(profile: SolarProfile | null): { lat: number; lng: number } | null {
  if (!profile || profile.lat == null || profile.lng == null) return null;
  return { lat: profile.lat, lng: profile.lng };
}

/** Request time as ISO. Read in a data function so component bodies stay pure. */
export async function requestNow(): Promise<string> {
  return new Date().toISOString();
}
