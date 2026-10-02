export interface ScoreEntry {
  name: string;
  score: number;
  fans: number;
  shows: number;
  year: number;
  victory: boolean;
  /** the studio continued into the post-career sandbox before folding */
  dynasty?: boolean;
  date: number;
}

const KEY = "kirameki.scores.v1";
const CONTEXT_TUTORIAL_KEY = "kirameki.context-tutorials.v1";
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
 * One rolling autosave plus three manual slots and a protected career archive.
 * Saves are transactional and keep two rotating recovery snapshots. Storage
 * stays dependency-free; RunState validation/migration remains in state.ts. */

export const SAVE_VERSION = 6;
export const MIN_MIGRATABLE_SAVE_VERSION = 3;
export type SlotId = "auto" | "1" | "2" | "3" | "legacy";
export const ACTIVE_SLOT_IDS: SlotId[] = ["auto", "1", "2", "3"];
export const SLOT_IDS: SlotId[] = [...ACTIVE_SLOT_IDS, "legacy"];

export function slotLabel(id: SlotId): string {
  if (id === "auto") return "AUTOSAVE";
  if (id === "legacy") return "CAREER ARCHIVE";
  return `SLOT ${id}`;
}

const slotKey = (id: SlotId, version = SAVE_VERSION) => `kirameki.save.v${version}.${id}`;
const backupKey = (id: SlotId, n: 1 | 2, version = SAVE_VERSION) => `${slotKey(id, version)}.bak${n}`;
const tempKey = (id: SlotId) => `${slotKey(id)}.tmp`;

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
  /** lightweight corruption detection; absent on migratable legacy saves */
  integrity?: string;
  /** set only on returned objects when the primary copy had to be recovered */
  recoveredFrom?: "backup1" | "backup2" | "legacy-version";
}

export type SaveData = Omit<SaveGame, "v" | "savedAt" | "integrity" | "recoveredFrom">;

export interface SaveWriteResult {
  ok: boolean;
  error?: "quota" | "storage" | "validation";
}

const objectLike = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function coreForIntegrity(s: Omit<SaveGame, "integrity" | "recoveredFrom">) {
  return {
    v: s.v,
    savedAt: s.savedAt,
    run: s.run,
    meta: s.meta,
    clock: s.clock,
    summary: s.summary,
  };
}

function checksum(value: unknown): string {
  const source = JSON.stringify(value);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < source.length; i += 1) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function validateShape(value: unknown): value is SaveGame {
  if (!objectLike(value)) return false;
  if (!finite(value.v) || value.v < MIN_MIGRATABLE_SAVE_VERSION || value.v > SAVE_VERSION) return false;
  if (!finite(value.savedAt) || !objectLike(value.run) || !objectLike(value.meta) || !objectLike(value.clock) || !objectLike(value.summary)) return false;
  const meta = value.meta as Record<string, unknown>;
  const clock = value.clock as Record<string, unknown>;
  const summary = value.summary as Record<string, unknown>;
  if (typeof meta.studio !== "string" || typeof meta.showrunner !== "string") return false;
  if (![clock.day, clock.phase, clock.acc, clock.dayCount].every(finite)) return false;
  if (typeof summary.studio !== "string") return false;
  if (![summary.week, summary.cash, summary.fans, summary.shows, summary.officeLevel].every(finite)) return false;
  if (typeof value.integrity === "string") {
    const parsed = value as unknown as SaveGame;
    const actual = checksum(coreForIntegrity(parsed));
    if (actual !== value.integrity) return false;
  }
  return true;
}

function parseSave(raw: string | null): SaveGame | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    return validateShape(value) ? value : null;
  } catch {
    return null;
  }
}

function payload(save: SaveData): SaveGame {
  const base: Omit<SaveGame, "integrity" | "recoveredFrom"> = {
    ...save,
    v: SAVE_VERSION,
    savedAt: Date.now(),
  };
  return { ...base, integrity: checksum(coreForIntegrity(base)) };
}

function classifyStorageError(error: unknown): SaveWriteResult["error"] {
  const name = objectLike(error) && typeof error.name === "string" ? error.name : "";
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" ? "quota" : "storage";
}

/** Transactional write. The old primary becomes backup 1 and backup 1 becomes
 * backup 2 only after the new payload has serialised and validated. */
export function saveSlotDetailed(id: SlotId, save: SaveData): SaveWriteResult {
  let encoded = "";
  try {
    const next = payload(save);
    encoded = JSON.stringify(next);
    if (!parseSave(encoded)) return { ok: false, error: "validation" };

    localStorage.setItem(tempKey(id), encoded);
    const temp = localStorage.getItem(tempKey(id));
    if (!temp || !parseSave(temp)) {
      localStorage.removeItem(tempKey(id));
      return { ok: false, error: "validation" };
    }

    const primary = localStorage.getItem(slotKey(id));
    const bak1 = localStorage.getItem(backupKey(id, 1));
    if (bak1 && parseSave(bak1)) localStorage.setItem(backupKey(id, 2), bak1);
    if (primary && parseSave(primary)) localStorage.setItem(backupKey(id, 1), primary);
    localStorage.setItem(slotKey(id), temp);
    localStorage.removeItem(tempKey(id));
    return { ok: true };
  } catch (error) {
    try { localStorage.removeItem(tempKey(id)); } catch { /* ignore */ }
    return { ok: false, error: classifyStorageError(error) };
  }
}

/** Compatibility wrapper retained for existing call sites. */
export function saveSlot(id: SlotId, save: SaveData): boolean {
  return saveSlotDetailed(id, save).ok;
}

interface Candidate {
  key: string;
  recoveredFrom?: SaveGame["recoveredFrom"];
}

/** A corrupt current primary automatically falls back to the newest valid
 * recovery copy. Older v3–v5 careers are allowed through so migrateRun can
 * perform the additive schema migration already maintained by the engine. */
export function loadSlot(id: SlotId): SaveGame | null {
  try {
    const candidates: Candidate[] = [
      { key: slotKey(id) },
      { key: backupKey(id, 1), recoveredFrom: "backup1" },
      { key: backupKey(id, 2), recoveredFrom: "backup2" },
    ];
    for (let version = SAVE_VERSION - 1; version >= MIN_MIGRATABLE_SAVE_VERSION; version -= 1) {
      candidates.push({ key: slotKey(id, version), recoveredFrom: "legacy-version" });
    }
    for (const candidate of candidates) {
      const save = parseSave(localStorage.getItem(candidate.key));
      if (!save) continue;
      return candidate.recoveredFrom ? { ...save, recoveredFrom: candidate.recoveredFrom } : save;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveRecoveryCount(id: SlotId): number {
  try {
    return ([1, 2] as const).filter((n) => !!parseSave(localStorage.getItem(backupKey(id, n)))).length;
  } catch {
    return 0;
  }
}

export function clearSlot(id: SlotId): void {
  try {
    for (let version = SAVE_VERSION; version >= MIN_MIGRATABLE_SAVE_VERSION; version -= 1) {
      localStorage.removeItem(slotKey(id, version));
      localStorage.removeItem(backupKey(id, 1, version));
      localStorage.removeItem(backupKey(id, 2, version));
    }
    localStorage.removeItem(tempKey(id));
  } catch {
    /* ignore */
  }
}

/** Export is deliberately plain JSON so a player can keep a career outside
 * browser storage. Import rewrites it as the current schema envelope; RunState
 * migration happens at normal load time. */
export function exportSlot(id: SlotId): string | null {
  const save = loadSlot(id);
  if (!save) return null;
  const { recoveredFrom: _recoveredFrom, ...portable } = save;
  return JSON.stringify(portable, null, 2);
}

export function importSlot(id: Exclude<SlotId, "auto" | "legacy">, raw: string): SaveWriteResult {
  const parsed = parseSave(raw);
  if (!parsed) return { ok: false, error: "validation" };
  const data: SaveData = {
    run: parsed.run,
    meta: parsed.meta,
    clock: parsed.clock,
    summary: parsed.summary,
  };
  return saveSlotDetailed(id, data);
}

/** every slot in menu order, null where empty */
export function listSlots(): { id: SlotId; save: SaveGame | null; recoveries: number }[] {
  return SLOT_IDS.map((id) => ({ id, save: loadSlot(id), recoveries: saveRecoveryCount(id) }));
}

export function hasAnySave(): boolean {
  return SLOT_IDS.some((id) => loadSlot(id) !== null);
}

/** the save CONTINUE should resume: the most recently written slot */
export function newestSave(): { id: SlotId; save: SaveGame } | null {
  let best: { id: SlotId; save: SaveGame } | null = null;
  for (const id of ACTIVE_SLOT_IDS) {
    const save = loadSlot(id);
    if (save && (!best || save.savedAt > best.save.savedAt)) best = { id, save };
  }
  return best;
}

/** Wipe active-career slots while preserving a completed NG+ archive.
 * The archive can still be deleted explicitly from LOAD GAME. */
export function clearAllSaves(): void {
  ACTIVE_SLOT_IDS.forEach(clearSlot);
  try {
    localStorage.removeItem(CONTEXT_TUTORIAL_KEY);
  } catch {
    /* ignore */
  }
}

export function saveAgeLabel(savedAt: number): string {
  const mins = Math.max(0, Math.round((Date.now() - savedAt) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
