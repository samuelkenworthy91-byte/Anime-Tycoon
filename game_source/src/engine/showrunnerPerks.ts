import genreRuntime from "./generated/genreV3.json";
import { arcCombosFor, comboKey, comboMult, type Draft, type GenreId, type PointType } from "./data";

export const HYPE_ARCHITECT_ID = "casting";
export const CONTRARIAN_ID = "festival";
export const PRODUCTION_SAVANT_ID = "dealmaker";
export const TRAILBLAZER_ID = "genre";
export const PRINCE_DARKNESS_ID = "prince_darkness";
export const BRIGHTER_DAWN_ID = "brighter_dawn";
export const NO_BALANCE_ID = "no_balance";

const DARK_GENRES = new Set<GenreId>(["horror", "vampire", "grimdark", "cosmic_horror"]);
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


/** Experimental mirrored specialist perk.
 * One net aligned genre is a major +35% output boost; a fully aligned
 * two-genre production doubles down to +70%. The mirrored penalties are
 * deliberately severe at -25% / -50%. Opposing tags cancel one-for-one. */
export function polarisedGenreProductionMult(showrunner: string, genres: GenreId[]): number {
  if (showrunner !== PRINCE_DARKNESS_ID && showrunner !== BRIGHTER_DAWN_ID) return 1;
  const favoured = showrunner === PRINCE_DARKNESS_ID ? DARK_GENRES : BRIGHT_GENRES;
  const opposed = showrunner === PRINCE_DARKNESS_ID ? BRIGHT_GENRES : DARK_GENRES;
  let alignment = 0;
  for (const genre of genres) {
    if (favoured.has(genre)) alignment += 1;
    if (opposed.has(genre)) alignment -= 1;
  }
  if (alignment >= 2) return 1.70;
  if (alignment === 1) return 1.35;
  if (alignment === -1) return 0.75;
  if (alignment <= -2) return 0.50;
  return 1;
}

export const criticsIgnoreBalance = (showrunner: string) => showrunner === NO_BALANCE_ID;
