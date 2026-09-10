/* ============================================================================
 * CANONICAL CAST COVERAGE — strict Role × Anime Type × genre-pair invariant
 *
 * The generated canonical genre catalog defines the unordered pair matrix. The live
 * roster must provide a same-character witness for every pair inside each of
 * the eight exact Role × Anime Type buckets:
 *
 *   At 30 genres: 4 roles × 2 anime types × 435 pairs = 3,480 required cells.
 *
 * A witness carries BOTH genres anywhere among visibleAff + hiddenAff.
 * Hidden affinity counts mechanically but remains hidden from public copy.
 * ========================================================================== */
import { CANONICAL_GENRE_IDS, CAST_V2, type AnimeType, type CastMember, type CastRole, type GenreId } from "./data";

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
  const cells: CoverageCell[] = [];

  for (const role of CAST_COVERAGE_ROLES) {
    for (const type of CAST_COVERAGE_TYPES) {
      const bucket = members.filter((m) => m.role === role && m.type === type);
      for (const pair of pairs) {
        const witness = witnessFor(bucket, pair);
        cells.push({
          role,
          type,
          group: `${role}:${type}`,
          pair,
          covered: !!witness,
          witness,
        });
      }
    }
  }

  const covered = cells.filter((c) => c.covered).length;
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
  for (const c of cells) {
    let row = out.get(c.group);
    if (!row) out.set(c.group, (row = { required: 0, covered: 0, missing: [] }));
    row.required += 1;
    if (c.covered) row.covered += 1;
    else row.missing.push(`${c.pair[0]}|${c.pair[1]}`);
  }
  return out;
}
