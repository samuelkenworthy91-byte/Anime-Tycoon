import genreRuntime from "./generated/genreV3.json";
import { arcCombosFor, comboKey, comboMult, type Draft, type GenreId, type PointType } from "./data";

export const HYPE_ARCHITECT_ID = "casting";
export const CONTRARIAN_ID = "festival";
export const PRODUCTION_SAVANT_ID = "dealmaker";
export const TRAILBLAZER_ID = "genre";
export const PRINCE_OF_DARKNESS_ID = "darkness";
export const BRIGHTER_THAN_DAWN_ID = "dawn";
export const WHO_NEEDS_BALANCE_ID = "unbalanced";
export const FINISHER_ID = "finisher";
export const CRITICAL_DARLING_ID = "critical";
export const ENSEMBLE_DIRECTOR_ID = "ensemble";

const DARK_GENRES = new Set<GenreId>(["grimdark", "vampire", "horror", "cosmic_horror"]);
const BRIGHT_GENRES = new Set<GenreId>(["romance", "idol", "slice", "magical"]);

export const storyStructureMult = (showrunner: string, value: number) =>
  showrunner === HYPE_ARCHITECT_ID && value > 0 ? value * 1.15 : value;

export function narrativeMomentumFanMult(
  showrunner: string,
  draft: Pick<Draft, "arcs">,
  points: Record<PointType, number>,
): number {
  if (showrunner !== HYPE_ARCHITECT_ID) return 1;
  const coherent = arcCombosFor(draft.arcs).some((c) => c.q > 0 || c.f > 0);
  const storyLeads = points.story >= points.art && points.story >= points.sound;
  return coherent && storyLeads ? 1.50 : 1.25;
}

export function contrarianComboMult(showrunner: string, genres: GenreId[]): number {
  const base = comboMult(genres, true);
  if (showrunner !== CONTRARIAN_ID || genres.length !== 2) return base;
  const row = genreRuntime.combos.find((c) => c.key === comboKey(genres));
  return row?.discovery_class === "experimental" ? 1 + (base - 1) * 1.60 : base;
}

export function engineerEyeRange(showrunner: string, target: number, exactKnown: boolean): { low: number; high: number } | null {
  if (showrunner !== PRODUCTION_SAVANT_ID || exactKnown) return null;
  return { low: Math.max(0, Math.round(target - 10)), high: Math.min(100, Math.round(target + 10)) };
}

export function trailblazerProductionMult(showrunner: string, genres: GenreId[], comboLevels: Record<string, number>): number {
  if (showrunner !== TRAILBLAZER_ID || genres.length !== 2) return 1;
  return (comboLevels[comboKey(genres)] ?? 0) <= 0 ? 1.35 : 1;
}


/** Mirrored specialist identities. The penalty is equal in magnitude to the
 * benefit around neutral output: ±35% for one net aligned genre and ±70% for
 * a fully aligned/opposed two-genre production. Opposed+aligned tags cancel. */
export function polarityProductionMult(showrunner: string, genres: GenreId[]): number {
  const aligned = showrunner === PRINCE_OF_DARKNESS_ID
    ? DARK_GENRES
    : showrunner === BRIGHTER_THAN_DAWN_ID
      ? BRIGHT_GENRES
      : null;
  if (!aligned) return 1;
  const opposed = showrunner === PRINCE_OF_DARKNESS_ID ? BRIGHT_GENRES : DARK_GENRES;
  const net = genres.reduce((score, genre) => score + (aligned.has(genre) ? 1 : opposed.has(genre) ? -1 : 0), 0);
  if (net >= 2) return 1.70;
  if (net === 1) return 1.35;
  if (net === -1) return 0.65;
  if (net <= -2) return 0.30;
  return 1;
}

export const criticsIgnoreBalance = (showrunner: string) => showrunner === WHO_NEEDS_BALANCE_ID;
export const criticalDarlingReviewBonus = (showrunner: string) => showrunner === CRITICAL_DARLING_ID ? 0.40 : 0;
export const cleanMasterQualityMult = (showrunner: string, issues: number) => showrunner === FINISHER_ID && issues === 0 ? 1.05 : 1;
export const slothFinalQualityMult = (showrunner: string) => showrunner === "sloth" ? 1.08 : 1;
export const slothCriticPolishBonus = (showrunner: string) => showrunner === "sloth" ? 0.15 : 0;
