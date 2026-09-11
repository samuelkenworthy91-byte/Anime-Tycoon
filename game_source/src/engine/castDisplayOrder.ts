import type { AnimeType, CastMember, GenreId } from "./data";

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

const visiblePairKey = (member: CastMember) => [...member.visibleAff].sort().join("|");
const availableAffinitySet = (member: CastMember, discovered: ReadonlySet<string>) => {
  const available = new Set<GenreId>(member.visibleAff);
  if (discovered.has(member.id)) available.add(member.hiddenAff);
  return available;
};
const roleTypeKey = (member: CastMember) => `${member.role}|${member.type}`;

function presentationCopy(member: CastMember, matchedGenres: readonly GenreId[]): CastMember {
  const visible = member.visibleAff.map(genreLabel).join(" × ");
  if (!matchedGenres.length) return { ...member, epithet: visible };

  const usesHidden = matchedGenres.includes(member.hiddenAff);
  if (matchedGenres.length === 1) {
    return { ...member, epithet: usesHidden ? `${visible} · SECRET MATCH` : visible };
  }

  const matched = matchedGenres.map(genreLabel).join(" × ");
  return { ...member, epithet: usesHidden ? `${matched} · SECRET MATCH` : matched };
}

/** Stable presentation order based on overt affinities. */
export function mixedCastOrder(members: readonly CastMember[]): CastMember[] {
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

function dedupeVisiblePairs(members: readonly CastMember[], matchedGenres: readonly GenreId[]): CastMember[] {
  const chosen = new Map<string, CastMember>();
  for (const member of members) {
    const key = `${roleTypeKey(member)}|${visiblePairKey(member)}`;
    const current = chosen.get(key);
    if (!current) {
      chosen.set(key, member);
      continue;
    }

    // A one-genre search should prefer the character for whom the searched
    // genre is public rather than a reserve portrait whose match is secret.
    if (matchedGenres.length === 1) {
      const genre = matchedGenres[0];
      const currentPublic = current.visibleAff.includes(genre);
      const nextPublic = member.visibleAff.includes(genre);
      if (nextPublic !== currentPublic) {
        if (nextPublic) chosen.set(key, member);
        continue;
      }
    }

    if (hash(member.id) < hash(current.id)) chosen.set(key, member);
  }
  const keep = new Set([...chosen.values()].map((member) => member.id));
  return members.filter((member) => keep.has(member.id)).map((member) => presentationCopy(member, matchedGenres));
}

function strictOwnersForGenres(members: readonly CastMember[], genres: readonly GenreId[], discovered: ReadonlySet<string>): CastMember[] {
  const groups = new Map<string, CastMember[]>();
  for (const member of members) {
    const all = availableAffinitySet(member, discovered);
    if (!genres.every((genre) => all.has(genre))) continue;
    const key = roleTypeKey(member);
    const group = groups.get(key) ?? [];
    group.push(member);
    groups.set(key, group);
  }

  const pairKey = genres.length === 2 ? [...genres].sort().join("|") : null;
  const winnerIds = new Set<string>();
  for (const group of groups.values()) {
    const ranked = [...group].sort((a, b) => {
      const score = (member: CastMember) => {
        let value = 0;
        if (pairKey && member.castingPairKeys?.includes(pairKey)) value += 10_000;
        if (genres.length === 2 && visiblePairKey(member) === pairKey) value += 2_000;
        value += genres.filter((genre) => member.visibleAff.includes(genre)).length * 250;
        if (!genres.includes(member.hiddenAff)) value += 25;
        return value;
      };
      const diff = score(b) - score(a);
      return diff || hash(a.id) - hash(b.id) || a.id.localeCompare(b.id);
    });
    if (ranked[0]) winnerIds.add(ranked[0].id);
  }

  return members
    .filter((member) => winnerIds.has(member.id))
    .map((member) => presentationCopy(member, genres));
}

/**
 * Browse-time cast filter.
 *
 * Ordinary browsing is deduped by public genre pair inside each Role × Type
 * bucket so reserve portraits with the same visible pairing do not flood the
 * select screen. They remain in the runtime pool for old saves and for a
 * targeted secret-affinity connection that genuinely needs them. A hidden
 * affinity is never eligible until that cast ID is present in the current
 * save's `castAffinityDiscovered` list.
 *
 * A two-genre search is strict: exactly one deterministic owner is selected
 * per Role × Shonen/Shojo bucket whenever coverage exists. Curated
 * `castingPairKeys` win first, then an exact public pair, then the strongest
 * public match. This preserves concealed-affinity coverage without showing a
 * wall of duplicate public pairings.
 */
export function filterCastByFilters(
  members: readonly CastMember[],
  filters: readonly CastBrowseFilter[],
  discoveredCastIds: readonly string[] = [],
): CastMember[] {
  const typeFilter = filters.find((filter) => filter.kind === "type");
  const genres = filters
    .filter((filter): filter is Extract<CastBrowseFilter, { kind: "genre" }> => filter.kind === "genre")
    .map((filter) => filter.value);

  const discovered = new Set(discoveredCastIds);
  const typed = typeFilter ? members.filter((member) => member.type === typeFilter.value) : [...members];
  if (!genres.length) return dedupeVisiblePairs(typed, []);

  if (genres.length >= 2) return strictOwnersForGenres(typed, genres, discovered);

  const matching = typed.filter((member) => availableAffinitySet(member, discovered).has(genres[0]));
  return dedupeVisiblePairs(matching, genres);
}

/** Backwards-compatible one-genre wrapper. */
export function filterCastByVisibleGenre(
  members: readonly CastMember[],
  genre: GenreId | null,
  discoveredCastIds: readonly string[] = [],
): CastMember[] {
  return filterCastByFilters(members, genre ? [{ kind: "genre", value: genre }] : [], discoveredCastIds);
}
