import genreRuntime from "./generated/genreV3.json";
import { arcCombosFor, comboKey, comboMult, type Draft, type GenreId, type PointType } from "./data";

export const HYPE_ARCHITECT_ID = "casting";
export const CONTRARIAN_ID = "festival";
export const PRODUCTION_SAVANT_ID = "dealmaker";
export const TRAILBLAZER_ID = "genre";

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
