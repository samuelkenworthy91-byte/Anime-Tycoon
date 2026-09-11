import type { AnimeType, CastMember, GenreId } from "./data";
import {
  catalogAvailableGenres,
  catalogAvailablePairKeys,
  castingPairKey,
  catalogPublicPairKey,
  isCastingActive,
} from "./castCatalog";

export type CastBrowseFilter =
  | { kind: "type"; value: AnimeType }
  | { kind: "genre"; value: GenreId };

const GENRE_LABELS: Partial<Record<GenreId, string>> = {
  slice: "Slice of Life",
  martial: "Martial Arts",
  monster_taming: "Monster Taming",
  cosmic_horror: "Cosmic Horror",
};

const genreLabel = (genre: GenreId) =>
  GENRE_LABELS[genre] ?? genre.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const hash = (id: string) => {
  let h = 2166136261;
  for (const char of id) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
};

function presentationCopy(member: CastMember, matchedGenres: readonly GenreId[]): CastMember {
  const visible = member.visibleAff.map(genreLabel).join(" × ");
  if (!matchedGenres.length) return { ...member, epithet: visible };

  const usesSecret = matchedGenres.some((genre) => !member.visibleAff.includes(genre));
  if (matchedGenres.length === 1) {
    return { ...member, epithet: usesSecret ? `${visible} · SECRET MATCH` : visible };
  }

  const matched = matchedGenres.map(genreLabel).join(" × ");
  return { ...member, epithet: usesSecret ? `${matched} · SECRET MATCH` : matched };
}

/** Stable browse order for the clean active catalogue only. */
export function mixedCastOrder(members: readonly CastMember[]): CastMember[] {
  const remaining = members
    .filter(isCastingActive)
    .sort((a, b) => hash(a.id) - hash(b.id) || a.id.localeCompare(b.id));
  const result: CastMember[] = [];
  const totals = new Map<string, number>();
  const used = new Map<string, number>();
  for (const member of remaining) for (const genre of member.visibleAff) totals.set(genre, (totals.get(genre) ?? 0) + 1);
  const totalMembers = Math.max(1, remaining.length);

  while (remaining.length) {
    const score = (member: CastMember) => {
      let value = 0;
      for (const genre of member.visibleAff) {
        value += ((result.length + 1) * (totals.get(genre) ?? 0) / totalMembers - (used.get(genre) ?? 0)) * 3;
        for (let back = 1; back <= 5; back += 1) {
          if (result[result.length - back]?.visibleAff.includes(genre)) value -= 6 / back;
        }
      }
      if (result.at(-1)?.type === member.type) value -= 1;
      return value;
    };

    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const value = score(remaining[i]);
      if (value > bestScore) {
        best = i;
        bestScore = value;
      }
    }
    const [next] = remaining.splice(best, 1);
    result.push(next);
    for (const genre of next.visibleAff) used.set(genre, (used.get(genre) ?? 0) + 1);
  }
  return result;
}

/**
 * Casting Catalog V7 filter.
 *
 * There is no ranking, duplicate suppression or fallback owner selection here.
 * The catalogue has already designated exactly one owner for every pair in every
 * Role × Type bucket. Filtering simply asks that catalogue who is currently
 * eligible. Secret edges of a triple become eligible only after discovery.
 */
export function filterCastByFilters(
  members: readonly CastMember[],
  filters: readonly CastBrowseFilter[],
  discoveredCastIds: readonly string[] = [],
): CastMember[] {
  const typeFilter = filters.find((filter) => filter.kind === "type");
  const genres = [...new Set(
    filters
      .filter((filter): filter is Extract<CastBrowseFilter, { kind: "genre" }> => filter.kind === "genre")
      .map((filter) => filter.value),
  )];
  const discovered = new Set(discoveredCastIds);

  const active = members.filter(isCastingActive);
  const typed = typeFilter ? active.filter((member) => member.type === typeFilter.value) : [...active];
  if (!genres.length) return typed.map((member) => presentationCopy(member, []));

  if (genres.length === 1) {
    return typed
      .filter((member) => catalogAvailableGenres(member, discovered).has(genres[0]))
      .map((member) => presentationCopy(member, genres));
  }

  if (genres.length === 2) {
    const key = castingPairKey(genres[0], genres[1]);
    return typed
      .filter((member) => catalogAvailablePairKeys(member, discovered).includes(key))
      .map((member) => presentationCopy(member, genres));
  }

  // The UI currently exposes at most two genre chips plus a Type chip. Keep a
  // deterministic safe path for any future wider query without inventing owners.
  return typed
    .filter((member) => genres.every((genre) => catalogAvailableGenres(member, discovered).has(genre)))
    .map((member) => presentationCopy(member, genres));
}

/** Backwards-compatible one-genre wrapper. */
export function filterCastByVisibleGenre(
  members: readonly CastMember[],
  genre: GenreId | null,
  discoveredCastIds: readonly string[] = [],
): CastMember[] {
  return filterCastByFilters(members, genre ? [{ kind: "genre", value: genre }] : [], discoveredCastIds);
}

/** Public pair exposed for UI/tests without consulting obsolete pair wiring. */
export const publicCastPairKey = (member: CastMember) => catalogPublicPairKey(member);
