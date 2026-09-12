import { STAFF_EFFECTIVE_SKILL_CAP, SHOWRUNNERS, type PointType } from "./data";

export interface ShowrunnerLevelUpRecord {
  id: string;
  beforeLevel: number;
  afterLevel: number;
  title: string;
  before: Record<PointType, number>;
  after: Record<PointType, number>;
  gains: Record<PointType, number>;
}

export interface ShowrunnerCareer {
  xp: number;
  level: number;
  story: number;
  art: number;
  sound: number;
  pendingLevelUps: ShowrunnerLevelUpRecord[];
}

export const SHOWRUNNER_MAX_LEVEL = 100;
export const SHOWRUNNER_XP_LEVELS: number[] = Array.from({ length: SHOWRUNNER_MAX_LEVEL }, (_, i) => {
  if (i === 0) return 0;
  let total = 0;
  for (let lv = 2; lv <= i + 1; lv += 1) total += Math.round(110 + (lv - 2) * 22 + Math.sqrt(lv) * 18);
  return total;
});

export const SHOWRUNNER_BASE_CRAFT: Record<string, Record<PointType, number>> = {
  steady: { story: 62, art: 88, sound: 58 },
  vision: { story: 90, art: 68, sound: 64 },
  producer: { story: 70, art: 68, sound: 66 },
  marketer: { story: 60, art: 64, sound: 82 },
  operations: { story: 72, art: 80, sound: 68 },
  franchise: { story: 82, art: 70, sound: 66 },
  mentor: { story: 76, art: 74, sound: 72 },
  research: { story: 84, art: 66, sound: 72 },
  casting: { story: 78, art: 76, sound: 68 },
  festival: { story: 86, art: 76, sound: 76 },
  dealmaker: { story: 68, art: 70, sound: 80 },
  genre: { story: 88, art: 72, sound: 70 },
};

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const rngFor = (id: string, level: number) => {
  let x = hash(`${id}|showrunner|${level}`) || 0x6d2b79f5;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4_294_967_296; };
};

export function showrunnerLevelFromXp(xp: number): number {
  const value = Math.max(0, xp);
  let lo = 0, hi = SHOWRUNNER_XP_LEVELS.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (SHOWRUNNER_XP_LEVELS[mid] <= value) lo = mid;
    else hi = mid - 1;
  }
  return Math.min(SHOWRUNNER_MAX_LEVEL, lo + 1);
}

export function showrunnerLevelTitle(level: number): string {
  if (level >= 100) return "Industry Legend";
  if (level >= 75) return "Master Showrunner";
  if (level >= 50) return "Auteur";
  if (level >= 30) return "Executive Director";
  if (level >= 20) return "Veteran Showrunner";
  if (level >= 12) return "Series Director";
  if (level >= 7) return "Lead Director";
  if (level >= 4) return "Rising Director";
  return "Founding Showrunner";
}

export function initialShowrunnerCareer(id: string): ShowrunnerCareer {
  const base = SHOWRUNNER_BASE_CRAFT[id] ?? { story: 68, art: 68, sound: 68 };
  return { xp: 0, level: 1, ...base, pendingLevelUps: [] };
}

/** Old saves used +2.2 to every craft stat for every shipped show. Preserve that
 * exact effective strength on migration, then move onto the visible career. */
export function migrateShowrunnerCareer(id: string, raw: unknown, showsMade = 0): ShowrunnerCareer {
  const r = raw as Partial<ShowrunnerCareer> | null | undefined;
  if (r && typeof r.xp === "number" && typeof r.story === "number" && typeof r.art === "number" && typeof r.sound === "number") {
    return {
      xp: Math.max(0, r.xp),
      level: showrunnerLevelFromXp(r.xp),
      story: Math.min(STAFF_EFFECTIVE_SKILL_CAP, Math.max(0, r.story)),
      art: Math.min(STAFF_EFFECTIVE_SKILL_CAP, Math.max(0, r.art)),
      sound: Math.min(STAFF_EFFECTIVE_SKILL_CAP, Math.max(0, r.sound)),
      pendingLevelUps: Array.isArray(r.pendingLevelUps) ? r.pendingLevelUps : [],
    };
  }
  const base = SHOWRUNNER_BASE_CRAFT[id] ?? { story: 68, art: 68, sound: 68 };
  const legacyGrowth = Math.min(110, Math.round(Math.max(0, showsMade) * 2.2));
  const legacyLevel = Math.min(SHOWRUNNER_MAX_LEVEL, Math.max(1, 1 + Math.max(0, Math.floor(showsMade))));
  return {
    xp: SHOWRUNNER_XP_LEVELS[legacyLevel - 1],
    level: legacyLevel,
    story: Math.min(STAFF_EFFECTIVE_SKILL_CAP, base.story + legacyGrowth),
    art: Math.min(STAFF_EFFECTIVE_SKILL_CAP, base.art + legacyGrowth),
    sound: Math.min(STAFF_EFFECTIVE_SKILL_CAP, base.sound + legacyGrowth),
    pendingLevelUps: [],
  };
}

function growthForShowrunner(id: string, level: number): Record<PointType, number> {
  const r = rngFor(id, level);
  let total = 5 + Math.floor(r() * 6); // 5..10, close to the old +6.6 total/show career pace
  if (r() < 0.12) total += 3 + Math.floor(r() * 5); // occasional visible breakthrough
  const base = SHOWRUNNER_BASE_CRAFT[id] ?? { story: 68, art: 68, sound: 68 };
  const ordered = (["story", "art", "sound"] as PointType[]).sort((a, b) => base[b] - base[a]);
  const out: Record<PointType, number> = { story: 0, art: 0, sound: 0 };
  for (let i = 0; i < total; i += 1) {
    const roll = r();
    const t = roll < 0.55 ? ordered[0] : roll < 0.82 ? ordered[1] : ordered[2];
    out[t] += 1;
  }
  return out;
}

export function gainShowrunnerXp(id: string, career: ShowrunnerCareer, amount: number): { career: ShowrunnerCareer; levelsGained: number; records: ShowrunnerLevelUpRecord[] } {
  const before = career.level;
  const xp = career.xp + Math.max(0, Math.round(amount));
  const after = showrunnerLevelFromXp(xp);
  let next: ShowrunnerCareer = { ...career, xp, level: after, pendingLevelUps: [...career.pendingLevelUps] };
  const records: ShowrunnerLevelUpRecord[] = [];
  for (let level = before + 1; level <= after; level += 1) {
    const beforeStats = { story: next.story, art: next.art, sound: next.sound };
    const gains = growthForShowrunner(id, level);
    const afterStats = {
      story: Math.min(STAFF_EFFECTIVE_SKILL_CAP, beforeStats.story + gains.story),
      art: Math.min(STAFF_EFFECTIVE_SKILL_CAP, beforeStats.art + gains.art),
      sound: Math.min(STAFF_EFFECTIVE_SKILL_CAP, beforeStats.sound + gains.sound),
    };
    const record: ShowrunnerLevelUpRecord = {
      id: `${id}:showrunner:lv${level}`,
      beforeLevel: level - 1,
      afterLevel: level,
      title: showrunnerLevelTitle(level),
      before: beforeStats,
      after: afterStats,
      gains: { story: afterStats.story - beforeStats.story, art: afterStats.art - beforeStats.art, sound: afterStats.sound - beforeStats.sound },
    };
    records.push(record);
    next = { ...next, ...afterStats, pendingLevelUps: [...next.pendingLevelUps, record] };
  }
  return { career: next, levelsGained: after - before, records };
}

export const showrunnerDefaultName = (id: string) => SHOWRUNNERS.find((x) => x.id === id)?.name ?? "Showrunner";
export const SHOWRUNNER_RELEASE_XP = (score: number, hit = false) => 90 + Math.max(0, score) * 2 + (hit ? 30 : 0);
export const SHOWRUNNER_CONTRACT_XP = 35;
export const SHOWRUNNER_AWARD_XP = 50;
