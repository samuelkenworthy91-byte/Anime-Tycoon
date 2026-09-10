import { GENRES, comboMult, type GenreId } from "./data";

export interface GenreProductionTarget {
  key: string;
  ideal: [number, number, number];
  ratio: [number, number, number];
  comboQualityMult: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Authored single-genre production directions. This is intentionally keyed by
 * string rather than GenreId so content packs can land before the legacy union
 * is retired. genreDirection() falls back to the generated genre ideal, making
 * future genre packs safe even if they do not need bespoke direction tuning.
 */
export const SINGLE_GENRE_DIRECTION: Record<string, [number, number, number]> = {
  mecha: [66, 84, 58], isekai: [72, 57, 42], slice: [24, 32, 40],
  horror: [74, 48, 82], romance: [18, 38, 28], sports: [58, 90, 68],
  cyber: [68, 76, 88], fantasy: [64, 68, 60], idol: [45, 62, 94],
  mystery: [90, 34, 44], comedy: [36, 48, 34], cooking: [44, 74, 42],
  military: [82, 66, 56], supernatural: [60, 54, 72], space: [78, 86, 80],
  magical: [38, 72, 86], survival: [84, 54, 50], pirate: [70, 80, 66],
  martial: [62, 94, 44], mythology: [88, 72, 78], nordic: [72, 42, 62],
  samurai: [78, 90, 50], shinobi: [86, 78, 36],
  vampire: [64, 54, 82], grimdark: [78, 74, 64],
};

function genreDirection(id: string): [number, number, number] {
  const authored = SINGLE_GENRE_DIRECTION[id];
  if (authored) return authored;
  const def = GENRES.find((g) => g.id === id);
  return def ? [...def.ideal] as [number, number, number] : [50, 50, 50];
}

function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function unit(seed: number, shift: number): number {
  const x = Math.imul((seed ^ (shift * 0x9e3779b9)) >>> 0, 2246822519) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) / 0xffffffff;
}

/**
 * Pair quality is intentionally banded instead of nearly neutral. A visibly
 * incompatible pairing must be capable of dragging down an otherwise strong
 * production, while strong and experimental pairings create a meaningful lift.
 */
export function genrePairQualityMultiplier(baseCombo: number): number {
  if (baseCombo < 0.82) return clamp(0.68 + Math.max(0, baseCombo - 0.60) * 0.45, 0.68, 0.78);
  if (baseCombo < 0.90) return clamp(0.80 + (baseCombo - 0.82) * 0.75, 0.80, 0.86);
  if (baseCombo < 0.97) return clamp(0.88 + (baseCombo - 0.90) * 0.85, 0.88, 0.94);
  if (baseCombo < 1.08) return 1;
  if (baseCombo < 1.20) return clamp(1.06 + (baseCombo - 1.08) * 0.65, 1.06, 1.14);
  return clamp(1.18 + (baseCombo - 1.20) * 0.6, 1.18, 1.30);
}

export function genreTargetFor(genres: GenreId[]): GenreProductionTarget {
  const ids = [...genres].sort();
  const key = ids.length ? ids.join("+") : "neutral";
  const defs = ids.map((id) => GENRES.find((g) => g.id === id)!).filter(Boolean);
  if (!defs.length) return { key, ideal: [50, 50, 50], ratio: [0.34, 0.33, 0.33], comboQualityMult: 1 };
  if (ids.length === 1) return { key, ideal: [...genreDirection(ids[0])] as [number, number, number], ratio: [...defs[0].ratio] as [number, number, number], comboQualityMult: 1 };

  const baseIdeal = [0, 1, 2].map((i) => ids.reduce((sum, id) => sum + genreDirection(id)[i], 0) / ids.length);
  const baseRatio = [0, 1, 2].map((i) => defs.reduce((sum, g) => sum + g.ratio[i], 0) / defs.length);
  const seed = hash32(key);
  const ideal = baseIdeal.map((v, i) => Math.round(clamp(v + (unit(seed, i + 1) * 2 - 1) * 13, 8, 92))) as [number, number, number];
  const rawRatio = baseRatio.map((v, i) => clamp(v + (unit(seed, i + 11) * 2 - 1) * 0.09, 0.08, 0.78));
  const total = rawRatio.reduce((a, b) => a + b, 0) || 1;
  const ratio = rawRatio.map((v) => v / total) as [number, number, number];
  const baseCombo = comboMult(ids as GenreId[], true);
  const comboQualityMult = genrePairQualityMultiplier(baseCombo);
  return { key, ideal, ratio, comboQualityMult };
}
