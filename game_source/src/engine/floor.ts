import type { PointType } from "./data";

/**
 * Production-floor pacing is deliberately independent from team size.
 * The studio receives a shared stream of work; staff skill determines how
 * quickly that work gets handled. This prevents a larger/better team from
 * creating extra manual input for the player.
 */
export const FLOOR_BASE_SPAWN_MS = 520;
export const FLOOR_CRUNCH_SPAWN_MULT = 1.45;
export const AUTO_POP_MAX_MS = 1900;
export const AUTO_POP_MIN_MS = 550;

const clampSkill = (skill: number) => Math.max(0, Math.min(100, skill));

/** Higher skill = shorter time between automatic actions. */
export function autoPopInterval(skill: number): number {
  const t = clampSkill(skill) / 100;
  return Math.round(AUTO_POP_MAX_MS - (AUTO_POP_MAX_MS - AUTO_POP_MIN_MS) * t);
}

/** Incoming workload depends on studio/process modifiers, never on staff skill. */
export function floorSpawnInterval(spawnMult: number, crunching = false): number {
  const mult = Math.max(0.25, spawnMult) * (crunching ? FLOOR_CRUNCH_SPAWN_MULT : 1);
  return Math.round(FLOOR_BASE_SPAWN_MS / mult);
}

/** Bubble values stay stable: staff progression comes from throughput, not spam. */
export function floorBubbleValue(kind: PointType | "bug" | "star", focus: PointType): number {
  if (kind === "bug") return 0;
  if (kind === "star") return 7;
  return kind === focus ? 3 : 2;
}

/** Automatic chains give a modest workflow bonus without recreating tap-speed exploits. */
export function floorChainMultiplier(chain: number): number {
  return 1 + Math.floor(Math.min(Math.max(0, chain), 15) / 5) * 0.1;
}

/** Approximate actions a worker can complete in a timed sprint. Useful for UI/tests. */
export function workerCapacity(skill: number, durationMs: number): number {
  return Math.floor(Math.max(0, durationMs) / autoPopInterval(skill));
}
