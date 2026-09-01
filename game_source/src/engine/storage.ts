import type { RunState } from "./state";

export interface ScoreEntry {
  name: string;
  score: number;
  fans: number;
  shows: number;
  year: number;
  victory: boolean;
  date: number;
}

/* =================================================================== */
/*  high scores                                                        */
/* =================================================================== */

const KEY = "kirameki.scores.v1";
const MAX = 8;

export function getScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(arr) ? arr.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addScore(entry: ScoreEntry): { scores: ScoreEntry[]; rank: number } {
  const scores = [...getScores(), entry].sort((a, b) => b.score - a.score).slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {
    /* ignore */
  }
  const rank = scores.findIndex((s) => s.date === entry.date && s.name === entry.name);
  return { scores, rank };
}

export function clearScores() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/* =================================================================== */
/*  save slots                                                         */
/* =================================================================== */

/**
 * Three hand-managed save slots. A slot keeps a full snapshot of the run plus
 * a small summary so the title screen can show what is in each one without
 * parsing the whole save.
 *
 * Saves are JSON in localStorage. Everything in RunState is plain data, so a
 * straight round-trip is safe; `v` lets us refuse saves from older builds
 * instead of crashing on a missing field.
 */
export const SAVE_KEY = "kirameki.saves.v1";
export const SAVE_VERSION = 2;
export const SLOT_COUNT = 3;

export interface SaveSummary {
  studio: string;
  showrunner: string;
  /** in-game week (0-based) */
  week: number;
  /** 1-based calendar year */
  year: number;
  cash: number;
  fans: number;
  awards: number;
  showsMade: number;
  officeName: string;
  score: number;
  rankName: string;
  rankTier: number;
  rankColor: string;
  staff: number;
}

export interface SaveSlot {
  v: number;
  run: RunState;
  meta: { studio: string; showrunner: string };
  savedAt: number;
  /** seconds of play accumulated on this slot */
  playtime: number;
  /** true when written by the autosaver rather than by hand */
  auto: boolean;
  summary: SaveSummary;
}

export type SaveSlots = (SaveSlot | null)[];

function emptySlots(): SaveSlots {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

export function listSaves(): SaveSlots {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return emptySlots();
    const parsed = JSON.parse(raw) as SaveSlots | { slots: SaveSlots };
    const slots = Array.isArray(parsed) ? parsed : parsed.slots;
    if (!Array.isArray(slots)) return emptySlots();
    /* tolerate a shorter/longer array from an older build */
    return Array.from({ length: SLOT_COUNT }, (_, i) => {
      const s = slots[i];
      if (!s || s.v !== SAVE_VERSION) return null;
      return s;
    });
  } catch {
    return emptySlots();
  }
}

function writeSlots(slots: SaveSlots) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;
  }
}

export function saveGame(
  slot: number,
  run: RunState,
  meta: { studio: string; showrunner: string },
  summary: SaveSummary,
  opts: { auto?: boolean; playtime?: number } = {}
): SaveSlots {
  const slots = listSaves();
  const prev = slots[slot];
  const slots2 = [...slots];
  slots2[slot] = {
    v: SAVE_VERSION,
    run,
    meta,
    savedAt: Date.now(),
    playtime: opts.playtime ?? prev?.playtime ?? 0,
    auto: opts.auto ?? false,
    summary,
  };
  writeSlots(slots2);
  return slots2;
}

export function loadGame(slot: number): SaveSlot | null {
  const s = listSaves()[slot];
  if (!s || s.v !== SAVE_VERSION) return null;
  return s;
}

export function deleteSave(slot: number): SaveSlots {
  const slots = [...listSaves()];
  slots[slot] = null;
  writeSlots(slots);
  return slots;
}

/** Bump the playtime counter on a slot in place (cheap, called often). */
export function touchPlaytime(slot: number, seconds: number): void {
  const slots = listSaves();
  const s = slots[slot];
  if (!s) return;
  slots[slot] = { ...s, playtime: s.playtime + seconds };
  writeSlots(slots);
}

/* ---------------------------------------------------------------- helpers */

export function formatPlaytime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function formatWhen(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
