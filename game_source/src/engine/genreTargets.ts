import { GENRES, comboMult, type GenreId } from "./data";

/**
 * Every single genre and every two-genre pairing gets its own deterministic
 * production fingerprint. The visible genre definitions remain the starting
 * point, but pairings are deliberately NOT a simple average: a stable hash
 * adds small phase-specific offsets so two different pairs never collapse to
 * the same three slider targets by accident.
 */
export interface GenreProductionTarget {
  key: string;
  ideal: [number, number, number];
  ratio: [number, number, number];
  comboQualityMult: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function unit(seed: number, shift: number): number {
  const x = Math.imul((seed ^ (shift * 0x9e3779b9)) >>> 0, 2246822519) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) / 0xffffffff;
}

export function genreTargetFor(genres: GenreId[]): GenreProductionTarget {
  const ids = [...genres].sort();
  const key = ids.length ? ids.join("+") : "neutral";
  const defs = ids.map((id) => GENRES.find((g) => g.id === id)!).filter(Boolean);
  if (!defs.length) return { key, ideal: [50, 50, 50], ratio: [0.34, 0.33, 0.33], comboQualityMult: 1 };

  const n = defs.length;
  const baseIdeal = [0, 1, 2].map((i) => defs.reduce((sum, g) => sum + g.ideal[i], 0) / n);
  const baseRatio = [0, 1, 2].map((i) => defs.reduce((sum, g) => sum + g.ratio[i], 0) / n);
  const seed = hash32(key);

  /* Single genres get a smaller fingerprint; pairs are more idiosyncratic. */
  const idealJitter = ids.length === 1 ? 5 : 13;
  const ideal = baseIdeal.map((v, i) => {
    const jitter = (unit(seed, i + 1) * 2 - 1) * idealJitter;
    /* one-percent precision is intentional: the player can genuinely learn it */
    return Math.round(clamp(v + jitter, 8, 92));
  }) as [number, number, number];

  const ratioJitter = ids.length === 1 ? 0.035 : 0.09;
  const rawRatio = baseRatio.map((v, i) => clamp(v + (unit(seed, i + 11) * 2 - 1) * ratioJitter, 0.08, 0.78));
  const total = rawRatio.reduce((a, b) => a + b, 0) || 1;
  const ratio = rawRatio.map((v) => v / total) as [number, number, number];

  /* Existing canonical combo quality still matters, but risky pairs bite much
     harder now. Good pairs help, bad pairs can drag a technically strong show
     down. Hidden/experimental pairs use their true multiplier from release 1;
     the UI can still keep that knowledge secret until discovery. */
  const baseCombo = ids.length === 2 ? comboMult(ids as GenreId[], true) : 1;
  const comboQualityMult = baseCombo >= 1
    ? clamp(1 + (baseCombo - 1) * 0.9, 1, 1.24)
    : clamp(1 - (1 - baseCombo) * 1.8, 0.62, 1);

  return { key, ideal, ratio, comboQualityMult };
}
