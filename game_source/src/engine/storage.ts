export interface ScoreEntry {
  name: string;
  score: number;
  fans: number;
  shows: number;
  year: number;
  victory: boolean;
  /** the studio made it into Dynasty Mode before folding */
  dynasty?: boolean;
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

/* ------------------------------------------------------------ save slots
 * Four slots: one rolling autosave plus three manual slots the player picks
 * from a LOAD GAME / SAVE GAME menu. Every slot is an independent key so a
 * corrupt or version-stale slot can never take the others down with it.   */

export const SAVE_VERSION = 3;
export type SlotId = "auto" | "1" | "2" | "3";
export const SLOT_IDS: SlotId[] = ["auto", "1", "2", "3"];

export function slotLabel(id: SlotId): string {
  return id === "auto" ? "AUTOSAVE" : `SLOT ${id}`;
}

const slotKey = (id: SlotId) => `kirameki.save.v3.${id}`;

export interface SaveGame {
  v: number;
  savedAt: number;
  /** RunState — kept as unknown here so storage stays dependency-free */
  run: unknown;
  meta: { studio: string; showrunner: string };
  clock: { day: number; phase: number; acc: number; dayCount: number };
  /** headline info so the menus can describe a save without parsing the run */
  summary: {
    studio: string;
    week: number;
    cash: number;
    fans: number;
    shows: number;
    officeLevel: number;
  };
}

export type SaveData = Omit<SaveGame, "v" | "savedAt">;

export function saveSlot(id: SlotId, save: SaveData): boolean {
  try {
    const payload: SaveGame = { ...save, v: SAVE_VERSION, savedAt: Date.now() };
    localStorage.setItem(slotKey(id), JSON.stringify(payload));
    return true;
  } catch {
    /* quota or private mode — the game keeps running, just unsaved */
    return false;
  }
}

export function loadSlot(id: SlotId): SaveGame | null {
  try {
    const raw = localStorage.getItem(slotKey(id));
    if (!raw) return null;
    const s = JSON.parse(raw) as SaveGame;
    if (!s || s.v !== SAVE_VERSION || !s.run || !s.summary) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearSlot(id: SlotId): void {
  try {
    localStorage.removeItem(slotKey(id));
  } catch {
    /* ignore */
  }
}

/** every slot in menu order, null where empty */
export function listSlots(): { id: SlotId; save: SaveGame | null }[] {
  return SLOT_IDS.map((id) => ({ id, save: loadSlot(id) }));
}

export function hasAnySave(): boolean {
  return SLOT_IDS.some((id) => loadSlot(id) !== null);
}

/** the save CONTINUE should resume: the most recently written slot */
export function newestSave(): { id: SlotId; save: SaveGame } | null {
  let best: { id: SlotId; save: SaveGame } | null = null;
  for (const id of SLOT_IDS) {
    const save = loadSlot(id);
    if (save && (!best || save.savedAt > best.save.savedAt)) best = { id, save };
  }
  return best;
}

/** wipe every slot — used when a career ends or a new one begins */
export function clearAllSaves(): void {
  SLOT_IDS.forEach(clearSlot);
}

export function saveAgeLabel(savedAt: number): string {
  const mins = Math.max(0, Math.round((Date.now() - savedAt) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
