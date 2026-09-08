import type { AnimeType, CastMember, GenreId } from "./data";

export type CastBrowseFilter =
  | { kind: "type"; value: AnimeType }
  | { kind: "genre"; value: GenreId };

/** Stable presentation only. Hidden affinities never influence browsing order. */
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
 * Anime type uses the public Shonen/Shojo field; genre matching uses visible
 * affinities only, so hidden affinities can never leak through filtering.
 */
export function filterCastByFilters(
  members: readonly CastMember[],
  filters: readonly CastBrowseFilter[],
): CastMember[] {
  if (!filters.length) return [...members];
  return members.filter((member) =>
    filters.every((filter) =>
      filter.kind === "type"
        ? member.type === filter.value
        : member.visibleAff.includes(filter.value)
    )
  );
}

/** Backwards-compatible one-genre wrapper. */
export function filterCastByVisibleGenre(
  members: readonly CastMember[],
  genre: GenreId | null,
): CastMember[] {
  return filterCastByFilters(members, genre ? [{ kind: "genre", value: genre }] : []);
}
