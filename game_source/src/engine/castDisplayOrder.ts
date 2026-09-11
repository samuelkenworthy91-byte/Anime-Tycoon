import type { AnimeType, CastMember, GenreId } from "./data";

export type CastBrowseFilter =
  | { kind: "type"; value: AnimeType }
  | { kind: "genre"; value: GenreId };

/** Stable presentation order based on overt affinities. */
export function mixedCastOrder(members: readonly CastMember[]): CastMember[] {
  const hash = (id: string) => {
    let h = 2166136261;
    for (const char of id) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const remaining = [...members].sort((a, b) => hash(a.id) - hash(b.id) || a.id.localeCompare(b.id));
  const result: CastMember[] = [];
  // Track proportional genre demand, so common genres are spread throughout
  // the list rather than left as a large block at its end.
  const totals = new Map<string, number>();
  const used = new Map<string, number>();
  for (const member of members) for (const genre of member.visibleAff) totals.set(genre, (totals.get(genre) ?? 0) + 1);
  while (remaining.length) {
    const score = (member: CastMember) => {
      let value = 0;
      for (const genre of member.visibleAff) {
        value += ((result.length + 1) * (totals.get(genre) ?? 0) / members.length - (used.get(genre) ?? 0)) * 3;
        for (let back = 1; back <= 5; back++) {
          if (result[result.length - back]?.visibleAff.includes(genre)) value -= 6 / back;
        }
      }
      if (result.at(-1)?.type === member.type) value -= 1;
      return value;
    };
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const value = score(remaining[i]);
      if (value > bestScore) { best = i; bestScore = value; }
    }
    const [next] = remaining.splice(best, 1);
    result.push(next);
    for (const genre of next.visibleAff) used.set(genre, (used.get(genre) ?? 0) + 1);
  }
  return result;
}

/**
 * Browse-time cast filter. Every active filter must match.
 * Anime type uses the public Shonen/Shojo field. A two-genre query uses the
 * curated casting-connection index when available, allowing a concealed
 * affinity to support eligibility without exposing its label on the card.
 */
export function filterCastByFilters(
  members: readonly CastMember[],
  filters: readonly CastBrowseFilter[],
): CastMember[] {
  if (!filters.length) return [...members];
  const typeFilter = filters.find((filter) => filter.kind === "type");
  const genres = filters.filter((filter): filter is Extract<CastBrowseFilter, { kind: "genre" }> => filter.kind === "genre").map((filter) => filter.value);
  return members.filter((member) => {
    if (typeFilter && member.type !== typeFilter.value) return false;
    if (!genres.length) return true;
    const allAffinities = [...member.visibleAff, member.hiddenAff];
    if (genres.length === 1) return allAffinities.includes(genres[0]);
    if (genres.length === 2 && member.castingPairKeys) {
      return member.castingPairKeys.includes([...genres].sort().join("|"));
    }
    return genres.every((genre) => allAffinities.includes(genre));
  });
}

/** Backwards-compatible one-genre wrapper. */
export function filterCastByVisibleGenre(
  members: readonly CastMember[],
  genre: GenreId | null,
): CastMember[] {
  return filterCastByFilters(members, genre ? [{ kind: "genre", value: genre }] : []);
}
