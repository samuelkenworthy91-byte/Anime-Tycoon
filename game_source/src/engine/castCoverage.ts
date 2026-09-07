/* ============================================================================
 *  CAST COVERAGE — 253 visible genre pairs × 8 role groups = 2,024 cells
 *
 *  Groups are the 4 cast roles × 2 anime types (8 in total). A cell
 *  (role, type, {genreA, genreB}) is REQUIRED for every pair of canonical
 *  genres the player can pick. It is COVERED the strict way when at least
 *  one selectable (non-legacy, valid) member of that cell's group carries
 *  BOTH genres among their affinities, so the role can be filled against
 *  any paired prompt. Crew-union coverage (both genres present somewhere
 *  inside the group) is the softer feasibility floor.
 *
 *  This module is pure and testable; the CLI (scripts/castCoverage.mjs)
 *  reads the very same generated manifest the engine imports.
 * ========================================================================== */
import { CANONICAL_GENRE_IDS, type AnimeType, type GenreId, CAST_V2 } from "./data";
import type { CastMember } from "./data";

export interface CoverageCell {
  group: string;         // e.g. "protag.shonen"
  role: string;
  animeType: AnimeType;
  pair: [GenreId, GenreId];
  covered: boolean;      // one member of the group holds BOTH genres
  crewUnion: boolean;    // both genres appear somewhere in the group
  witness?: string;      // member id that covers the cell
}

export const CAST_COVERAGE_ROLES = ["protag", "secondary", "pet", "villain"] as const;
export const CAST_COVERAGE_TYPES: AnimeType[] = ["shonen", "shojo"];

/** all unordered canonical genre pairs — exactly 253 for 23 genres */
export function genrePairs(genres: GenreId[] = CANONICAL_GENRE_IDS): [GenreId, GenreId][] {
  const out: [GenreId, GenreId][] = [];
  for (let i = 0; i < genres.length; i++)
    for (let j = i + 1; j < genres.length; j++) out.push([genres[i], genres[j]]);
  return out;
}

const affinitiesOf = (m: CastMember): GenreId[] => [...m.visibleAff, m.hiddenAff];
const selectable = (m: CastMember) => !m.legacyPlaceholder;

/** the full 8 × 253 grid, each cell adjudicated in one pass */
export function computeCoverage(roster: CastMember[] = CAST_V2): {
  required: number;
  covered: number;
  crewCovered: number;
  cells: CoverageCell[];
  pairs: number;
  groups: string[];
} {
  const pairs = genrePairs();
  const groups: string[] = [];
  for (const role of CAST_COVERAGE_ROLES)
    for (const t of CAST_COVERAGE_TYPES) groups.push(`${role}.${t}`);
  const byGroup = new Map<string, CastMember[]>();
  for (const g of groups) byGroup.set(g, []);
  for (const m of roster.filter(selectable)) {
    const key = `${(m as unknown as { role: string }).role}.${m.type}`;
    if (byGroup.has(key)) byGroup.get(key)!.push(m);
  }

  const cells: CoverageCell[] = [];
  for (const group of groups) {
    const members = byGroup.get(group)!;
    const union = new Set<GenreId>();
    const pairWitness = new Map<string, string>(); // sorted "a|b" -> member id
    for (const m of members) {
      const aff = affinitiesOf(m);
      for (const g of aff) union.add(g);
      for (let i = 0; i < aff.length; i++)
        for (let j = i + 1; j < aff.length; j++)
          pairWitness.set([...aff.slice(i, i + 1), ...aff.slice(j, j + 1)].sort().join("|"), m.id);
    }
    const [role, t] = group.split(".") as [string, AnimeType];
    for (const pair of pairs) {
      const key = `${[...pair].sort().join("|")}`;
      cells.push({
        group,
        role,
        animeType: t,
        pair,
        covered: pairWitness.has(key),
        crewUnion: union.has(pair[0]) && union.has(pair[1]),
        witness: pairWitness.get(key),
      });
    }
  }
  return {
    required: cells.length,
    covered: cells.filter((c) => c.covered).length,
    crewCovered: cells.filter((c) => c.crewUnion).length,
    cells,
    pairs: pairs.length,
    groups,
  };
}

/** per-group roll-up for reports */
export function groupSummary(cells: CoverageCell[]) {
  const out = new Map<string, { required: number; covered: number; crew: number; missing: string[] }>();
  for (const c of cells) {
    let row = out.get(c.group);
    if (!row) out.set(c.group, (row = { required: 0, covered: 0, crew: 0, missing: [] }));
    row.required++;
    if (c.covered) row.covered++;
    else row.missing.push(`${c.pair[0]}|${c.pair[1]}`);
    if (c.crewUnion) row.crew++;
  }
  return out;
}
