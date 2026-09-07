/* ============================================================================
 *  CAST V3 COVERAGE — canonical closure invariants
 *
 *  The 32-character closure now on main was designed to guarantee TWO
 *  complementary things across the 23 canonical genres / 253 unordered pairs:
 *
 *    1. every pair has a same-member witness in EACH CAST ROLE, with anime
 *       types mixed inside that role (4 × 253 = 1,012 role cells);
 *    2. every pair has a same-member witness in EACH ANIME TYPE, with roles
 *       mixed inside that type (2 × 253 = 506 type cells).
 *
 *  Together that is 1,518 required canonical coverage cells. It is NOT the
 *  impossible role × anime-type intersection grid: one 54-member bucket with
 *  three distinct affinities per member can witness at most 162 pair slots,
 *  so demanding all 253 pairs in each of eight intersections cannot be the
 *  acceptance rule for this roster.
 *
 *  A witness carries BOTH genres among visibleAff + hiddenAff, matching the
 *  canonical Cast V3 tests and the closure manifest maths.
 * ========================================================================== */
import { CANONICAL_GENRE_IDS, CAST_V2, type AnimeType, type CastMember, type GenreId } from "./data";

export const CAST_COVERAGE_ROLES = ["protag", "secondary", "pet", "villain"] as const;
export const CAST_COVERAGE_TYPES: AnimeType[] = ["shonen", "shojo"];

export type CoverageDimension = "role" | "type";

export interface CoverageCell {
  dimension: CoverageDimension;
  group: string;
  pair: [GenreId, GenreId];
  covered: boolean;
  witness?: string;
}

/** all unordered canonical genre pairs — exactly 253 for 23 genres */
export function genrePairs(genres: GenreId[] = CANONICAL_GENRE_IDS): [GenreId, GenreId][] {
  const out: [GenreId, GenreId][] = [];
  for (let i = 0; i < genres.length; i += 1) {
    for (let j = i + 1; j < genres.length; j += 1) out.push([genres[i], genres[j]]);
  }
  return out;
}

const selectable = (m: CastMember) => !m.legacyPlaceholder;
const affinitiesOf = (m: CastMember): GenreId[] => [...m.visibleAff, m.hiddenAff];

function witnessFor(members: CastMember[], pair: [GenreId, GenreId]): string | undefined {
  return members.find((m) => {
    const aff = affinitiesOf(m);
    return aff.includes(pair[0]) && aff.includes(pair[1]);
  })?.id;
}

export function computeCoverage(roster: CastMember[] = CAST_V2) {
  const members = roster.filter(selectable);
  const pairs = genrePairs();

  const roleCells: CoverageCell[] = [];
  for (const role of CAST_COVERAGE_ROLES) {
    const bucket = members.filter((m) => m.role === role);
    for (const pair of pairs) {
      const witness = witnessFor(bucket, pair);
      roleCells.push({ dimension: "role", group: role, pair, covered: !!witness, witness });
    }
  }

  const typeCells: CoverageCell[] = [];
  for (const type of CAST_COVERAGE_TYPES) {
    const bucket = members.filter((m) => m.type === type);
    for (const pair of pairs) {
      const witness = witnessFor(bucket, pair);
      typeCells.push({ dimension: "type", group: type, pair, covered: !!witness, witness });
    }
  }

  const cells = [...roleCells, ...typeCells];
  const roleCovered = roleCells.filter((c) => c.covered).length;
  const typeCovered = typeCells.filter((c) => c.covered).length;

  return {
    pairs: pairs.length,
    roleRequired: roleCells.length,
    roleCovered,
    typeRequired: typeCells.length,
    typeCovered,
    required: cells.length,
    covered: roleCovered + typeCovered,
    roleCells,
    typeCells,
    cells,
    groups: [
      ...CAST_COVERAGE_ROLES.map((x) => `role:${x}`),
      ...CAST_COVERAGE_TYPES.map((x) => `type:${x}`),
    ],
  };
}

/** per-group roll-up for reports */
export function groupSummary(cells: CoverageCell[]) {
  const out = new Map<string, { required: number; covered: number; missing: string[] }>();
  for (const c of cells) {
    const key = `${c.dimension}:${c.group}`;
    let row = out.get(key);
    if (!row) out.set(key, (row = { required: 0, covered: 0, missing: [] }));
    row.required += 1;
    if (c.covered) row.covered += 1;
    else row.missing.push(`${c.pair[0]}|${c.pair[1]}`);
  }
  return out;
}
