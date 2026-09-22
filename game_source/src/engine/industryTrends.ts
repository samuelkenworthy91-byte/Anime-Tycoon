import type { Draft, GenreId, MediumId } from "./data";
import type { MarketState, ReleaseRecord } from "./market";
import { saturationOf } from "./market";
import type { RunState } from "./state";

export type IndustryMovementKind = "revival" | "fatigue" | "streaming" | "prestige";
export type IndustryMovementPhase = "emerging" | "boom" | "cooling";

export interface IndustryMovement {
  id: string;
  kind: IndustryMovementKind;
  genre?: GenreId;
  startsWeek: number;
  peakWeek: number;
  endsWeek: number;
}

declare module "./state" {
  interface RunState {
    industryMovements?: IndustryMovement[];
  }
}

export function movementPhase(movement: IndustryMovement, week: number): IndustryMovementPhase {
  if (week < movement.peakWeek) return "emerging";
  if (week >= movement.endsWeek - 24) return "cooling";
  return "boom";
}

export function movementLabel(movement: IndustryMovement, genreLabel?: string): string {
  if (movement.kind === "revival") return `THE ${(genreLabel ?? movement.genre ?? "").toUpperCase()} REVIVAL`;
  if (movement.kind === "fatigue") return `${(genreLabel ?? movement.genre ?? "").toUpperCase()} FATIGUE`;
  if (movement.kind === "streaming") return "THE STREAMING EXPLOSION";
  return "THE PRESTIGE WAVE";
}

export function activeIndustryMovements(run: Pick<RunState, "industryMovements" | "week">): IndustryMovement[] {
  return (run.industryMovements ?? []).filter((movement) => movement.startsWeek <= run.week && movement.endsWeek > run.week);
}

export function movementSalesMultiplier(movements: readonly IndustryMovement[], draft: Pick<Draft, "genres" | "medium" | "audience">, week: number): number {
  let mult = 1;
  for (const movement of movements) {
    if (movement.startsWeek > week || movement.endsWeek <= week) continue;
    const phase = movementPhase(movement, week);
    const phaseStrength = phase === "emerging" ? 0.55 : phase === "boom" ? 1 : 0.45;
    if (movement.kind === "revival" && movement.genre && draft.genres.includes(movement.genre)) mult *= 1 + 0.18 * phaseStrength;
    if (movement.kind === "fatigue" && movement.genre && draft.genres.includes(movement.genre)) mult *= 1 - 0.18 * phaseStrength;
    if (movement.kind === "streaming" && (draft.medium === "ona" || draft.medium === "fanweb")) mult *= 1 + 0.20 * phaseStrength;
    if (movement.kind === "prestige" && (draft.medium === "movie" || draft.medium === "special" || draft.audience === "adults")) mult *= 1 + 0.14 * phaseStrength;
  }
  return Math.max(0.74, Math.min(1.42, mult));
}

export function trendGenreBias(movements: readonly IndustryMovement[], week: number): GenreId[] {
  const out: GenreId[] = [];
  for (const movement of movements) {
    if (movement.kind !== "revival" || !movement.genre || movement.startsWeek > week || movement.endsWeek <= week) continue;
    out.push(movement.genre);
  }
  return [...new Set(out)];
}

function deterministicHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededMovementRng(seed: number): () => number {
  let x = seed || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0x1_0000_0000;
  };
}

function movementRngSeed(week: number, market: MarketState, recentReleases: ReleaseRecord[]): number {
  const heat = Object.entries(market.genres)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([genre, value]) => `${genre}:${value}`)
    .join("|");
  const releaseSignal = recentReleases
    .slice(-24)
    .map((release) => `${release.genre}:${release.week}:${release.weight}`)
    .join("|");
  return deterministicHash(`${week}|${heat}|${releaseSignal}`);
}

function strongestGenre(market: MarketState): GenreId | null {
  const rows = Object.entries(market.genres) as [GenreId, number][];
  return rows.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function mostFloodedGenre(releases: ReleaseRecord[], week: number, genres: readonly GenreId[]): GenreId | null {
  let best: { genre: GenreId; saturation: number } | null = null;
  for (const genre of genres) {
    const saturation = saturationOf(releases, genre, week);
    if (!best || saturation > best.saturation) best = { genre, saturation };
  }
  return best && best.saturation >= 5 ? best.genre : null;
}

export function tickIndustryMovements(
  current: readonly IndustryMovement[] | undefined,
  week: number,
  market: MarketState,
  recentReleases: ReleaseRecord[],
  genres: readonly GenreId[],
  rng?: () => number,
): { movements: IndustryMovement[]; notices: string[] } {
  const random = rng ?? seededMovementRng(movementRngSeed(week, market, recentReleases));
  let movements = (current ?? []).filter((movement) => movement.endsWeek > week);
  const notices: string[] = [];
  if (week % 12 !== 0) return { movements, notices };

  for (const movement of movements) {
    if (movement.peakWeek === week) notices.push(`🌊 Industry movement enters its peak: ${movement.kind === "streaming" ? "streaming demand" : movement.kind === "prestige" ? "prestige animation" : movement.genre}.`);
    if (movement.endsWeek - 24 === week) notices.push("📉 A long-running industry movement is beginning to cool.");
  }

  if (movements.length >= 2 || random() >= 0.34) return { movements, notices };

  const flooded = mostFloodedGenre(recentReleases, week, genres);
  const hot = strongestGenre(market);
  let kind: IndustryMovementKind;
  let genre: GenreId | undefined;
  const roll = random();
  if (flooded && roll < 0.34) { kind = "fatigue"; genre = flooded; }
  else if (hot && (market.genres[hot] ?? 0) >= 1 && roll < 0.72) { kind = "revival"; genre = hot; }
  else if (roll < 0.87) kind = "streaming";
  else kind = "prestige";

  if (genre && movements.some((movement) => movement.genre === genre)) return { movements, notices };
  const duration = 84 + Math.floor(random() * 49);
  const movement: IndustryMovement = {
    id: `movement:${week}:${kind}:${genre ?? "all"}`,
    kind,
    genre,
    startsWeek: week,
    peakWeek: week + 24,
    endsWeek: week + duration,
  };
  movements = [...movements, movement];
  notices.push(kind === "revival"
    ? `🌊 INDUSTRY MOVEMENT — ${genre} is entering a multi-season revival.`
    : kind === "fatigue"
      ? `📉 INDUSTRY MOVEMENT — years of releases are creating ${genre} fatigue.`
      : kind === "streaming"
        ? "📱 INDUSTRY MOVEMENT — streaming-first anime is becoming a major commercial force."
        : "🏆 INDUSTRY MOVEMENT — prestige adult animation is attracting unusual attention.");
  return { movements, notices };
}
