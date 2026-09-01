export interface ScoreEntry {
  name: string;
  score: number;
  fans: number;
  shows: number;
  year: number;
  victory: boolean;
  date: number;
}

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

/* ------------------------------------------------------------ save game */

const SAVE_KEY = "kirameki.save.v2";
const SAVE_VERSION = 2;

export interface SaveGame {
  v: number;
  savedAt: number;
  /** RunState — kept as unknown here so storage stays dependency-free */
  run: unknown;
  meta: { studio: string; showrunner: string };
  clock: { day: number; phase: number; acc: number; dayCount: number };
  /** headline info so the title screen can describe the save without parsing the run */
  summary: {
    studio: string;
    week: number;
    cash: number;
    fans: number;
    shows: number;
    officeLevel: number;
  };
}

export function saveGame(save: Omit<SaveGame, "v" | "savedAt">): void {
  try {
    const payload: SaveGame = { ...save, v: SAVE_VERSION, savedAt: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode — the game keeps running, just unsaved */
  }
}

export function loadGame(): SaveGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SaveGame;
    if (!s || s.v !== SAVE_VERSION || !s.run) return null;
    return s;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return loadGame() !== null;
}

export function clearGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
