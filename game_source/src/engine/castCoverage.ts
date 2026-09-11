/* ============================================================================
 * CASTING CATALOG V7 COVERAGE — strict Role × Type × genre-pair ownership
 *
 * Coverage is no longer inferred from overlapping affinity triples. The rebuilt
 * catalogue gives every pair exactly one designated owner inside every one of
 * the eight Role × Anime Type buckets.
 * ========================================================================== */
import { CANONICAL_GENRE_IDS, type AnimeType, type CastMember, type CastRole, type GenreId } from "./data";
import { CAST_V2 } from "./castV2";
import { catalogPairKeys, isCastingActive } from "./castCatalog";

export const CAST_COVERAGE_ROLES: CastRole[] = ["protag", "secondary", "pet", "villain"];
export const CAST_COVERAGE_TYPES: AnimeType[] = ["shonen", "shojo"];

export interface CoverageCell {
  role: CastRole;
  type: AnimeType;
  group: string;
  pair: [GenreId, GenreId];
  covered: boolean;
  witness?: string;
}

/** All unordered pairs from the generated canonical genre catalog. */
export function genrePairs(genres: GenreId[] = CANONICAL_GENRE_IDS): [GenreId, GenreId][] {
  const out: [GenreId, GenreId][] = [];
  for (let i = 0; i < genres.length; i += 1) {
    for (let j = i + 1; j < genres.length; j += 1) out.push([genres[i], genres[j]]);
  }
  return out;
}

const pairKey = (pair: [GenreId, GenreId]) => [...pair].sort().join("|");

function ownersFor(members: CastMember[], pair: [GenreId, GenreId]): CastMember[] {
  const key = pairKey(pair);
  return members.filter((member) => isCastingActive(member) && catalogPairKeys(member).includes(key));
}

export function computeCoverage(roster: CastMember[] = CAST_V2) {
  const pairs = genrePairs();
  const cells: CoverageCell[] = [];

  for (const role of CAST_COVERAGE_ROLES) {
    for (const type of CAST_COVERAGE_TYPES) {
      const bucket = roster.filter((member) => member.role === role && member.type === type && isCastingActive(member));
      for (const pair of pairs) {
        const owners = ownersFor(bucket, pair);
        if (owners.length > 1) {
          throw new Error(`${role}/${type}/${pairKey(pair)} has ${owners.length} catalogue owners.`);
        }
        cells.push({
          role,
          type,
          group: `${role}:${type}`,
          pair,
          covered: owners.length === 1,
          witness: owners[0]?.id,
        });
      }
    }
  }

  const covered = cells.filter((cell) => cell.covered).length;
  return {
    pairs: pairs.length,
    required: cells.length,
    covered,
    cells,
    groups: CAST_COVERAGE_ROLES.flatMap((role) =>
      CAST_COVERAGE_TYPES.map((type) => `${role}:${type}`),
    ),
  };
}

/** per exact Role × Type bucket roll-up for reports */
export function groupSummary(cells: CoverageCell[]) {
  const out = new Map<string, { required: number; covered: number; missing: string[] }>();
  for (const cell of cells) {
    let row = out.get(cell.group);
    if (!row) out.set(cell.group, (row = { required: 0, covered: 0, missing: [] }));
    row.required += 1;
    if (cell.covered) row.covered += 1;
    else row.missing.push(`${cell.pair[0]}|${cell.pair[1]}`);
  }
  return out;
}
