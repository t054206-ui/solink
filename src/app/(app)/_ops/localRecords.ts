"use client";
/**
 * Demo-mode persistence for records the homeowner creates in the operations
 * features. Used ONLY when Supabase is not connected: cases, incidents,
 * appointments and generated reports are stored on this device (see
 * useLocalStore) and merged with the labeled demo records at render time.
 * A local copy of a record with the same id wins over the server/demo copy so
 * edits (notes, cancellation) survive reloads.
 */
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import type { Appointment, Incident, MaintenanceCase, MonthlyReport } from "@/lib/types";

export const LOCAL_KEYS = { maintenance: "maintenance", incidents: "incidents", appointments: "maintenance_appointments", reports: "reports" } as const;

export function useLocalMaintenance() { return useLocalStore<MaintenanceCase[]>(LOCAL_KEYS.maintenance, []); }
export function useLocalIncidents() { return useLocalStore<Incident[]>(LOCAL_KEYS.incidents, []); }
export function useLocalAppointments() { return useLocalStore<Appointment[]>(LOCAL_KEYS.appointments, []); }
export function useLocalReports() { return useLocalStore<MonthlyReport[]>(LOCAL_KEYS.reports, []); }

/** Merge server records with local ones. Local wins on id collision. */
export function mergeRecords<T extends { id: string }>(server: T[], local: T[]): T[] {
  const byId = new Map<string, T>();
  for (const r of server) byId.set(r.id, r);
  for (const r of local) byId.set(r.id, r);
  return [...byId.values()];
}

/** Upsert a record into a local list (by id). */
export function upsertRecord<T extends { id: string }>(list: T[], record: T): T[] {
  const i = list.findIndex((r) => r.id === record.id);
  if (i === -1) return [...list, record];
  const next = list.slice(); next[i] = record; return next;
}

/** Local-only id. Prefixed so it is obviously not a database id. */
export function newLocalId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-local-${Date.now().toString(36)}-${rnd}`;
}

export function isLocalId(id: string): boolean { return id.includes("-local-"); }
