import { LAYER_COUNT } from "./panelLayers";

/**
 * The take-apart sequence's clock, as numbers.
 *
 * The scene and the opening both need to know when the module enters, when
 * each part leaves, when the stack closes and when it is over: the scene to
 * move the geometry, the opening to change the caption and draw the rest of
 * the story around it. One schedule, derived from one timing object, so the
 * two cannot drift. Kept free of three.js so the opening can import it
 * without pulling the renderer into the initial bundle.
 *
 * Seconds. `delay` is silence before the module enters; the hero has none,
 * the opening spends it on the sun.
 */
export interface TourTiming {
  delay: number;
  enter: number;
  hold: number;
  /** One part every `step` seconds: a reading speed, not a movement speed. */
  step: number;
  travel: number;
  read: number;
  close: number;
}

/** The hero: Session 4's numbers, 10.6 s in total. */
export const HERO_TIMING: TourTiming = { delay: 0, enter: 0.8, hold: 0.6, step: 1.45, travel: 1.05, read: 1.0, close: 1.3 };

/** The opening: the owner's reference video's pace. 15.5 s from first frame to closed module. */
export const INTRO_TIMING: TourTiming = { delay: 1.4, enter: 0.8, hold: 0.8, step: 2.4, travel: 0.9, read: 0.8, close: 1.2 };

export interface TourSchedule {
  start: number;
  enter: number;
  enterAt: number;
  openAt: number;
  lastAt: number;
  closeAt: number;
  endAt: number;
  step: number;
  travel: number;
}

export function schedule(t: TourTiming): TourSchedule {
  const start = t.delay;
  const enterAt = start + t.enter;
  const openAt = enterAt + t.hold;
  const lastAt = openAt + (LAYER_COUNT - 1) * t.step + t.travel;
  const closeAt = lastAt + t.read;
  const endAt = closeAt + t.close;
  return { start, enter: t.enter, enterAt, openAt, lastAt, closeAt, endAt, step: t.step, travel: t.travel };
}

/**
 * How the module is held while it comes apart: the tilt it enters at and
 * turns to as it opens, and the azimuth it swings through. The hero turns the
 * module toward the viewer so the separation reads; the opening lays it
 * nearly flat, the way the owner's reference video does, so the layers lift
 * straight up and the tags can hang off them in a column.
 */
export interface TourPose {
  tiltFrom: number;
  tiltTo: number;
  azimuthFrom: number;
  azimuthTo: number;
}

export const HERO_POSE: TourPose = { tiltFrom: 20, tiltTo: 52, azimuthFrom: -34, azimuthTo: -6 };
export const INTRO_POSE: TourPose = { tiltFrom: 5, tiltTo: 14, azimuthFrom: -40, azimuthTo: -24 };
