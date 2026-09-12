import type { AnimeType, CastMember, CastRole, GenreId } from "./data";

/**
 * Casting Catalog V7
 * ------------------
 * The old catalogue inferred eligibility from affinity triples plus optional
 * castingPairKeys. That allowed the same visible pair to be repeated many times
 * and let several different code paths disagree about who owned a pair.
 *
 * This module rebuilds the catalogue from character identity only. Each exact
 * Role × Anime Type bucket gets one deterministic, non-overlapping block design:
 *  - 140 three-genre blocks
 *  - 15 two-genre blocks
 *  - every one of the 435 unordered genre pairs appears in exactly one block
 *  - all surplus portraits are explicit reserve entries and are not selectable
 *
 * The 155-block design comes from the 155 lines of PG(4,2), an STS(31). Removing
 * point 31 leaves 140 triples and 15 pairs over the 30 real genres. This gives
 * exact pair ownership without hand-authored pair wiring.
 */

export type CastingCatalogKind = "triple" | "pair" | "reserve";

export interface CastingCatalogMeta {
  active: boolean;
  kind: CastingCatalogKind;
  /** The single catalogue designation for this character. */
  genres: GenreId[];
  /** All pair cells owned by this one designation. */
  pairKeys: string[];
  /** The pair shown publicly on the card. */
  publicPairKey: string | null;
  /** The third genre for a triple; null for public-only pair blocks/reserves. */
  secretGenre: GenreId | null;
}

type CatalogMember = CastMember & {
  __castingCatalog?: CastingCatalogMeta;
  castingPairKeys?: string[];
};

const NO_SECRET = "__casting_catalog_no_secret__" as GenreId;
const ROLES: CastRole[] = ["protag", "secondary", "pet", "villain"];
const TYPES: AnimeType[] = ["shonen", "shojo"];

export const castingPairKey = (a: GenreId, b: GenreId) => [a, b].sort().join("|");

const hash32 = (text: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

const genreLabel = (genre: GenreId) =>
  String(genre)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Slice", "Slice of Life")
    .replace("Martial", "Martial Arts")
    .replace("Monster Taming", "Monster Taming")
    .replace("Cosmic Horror", "Cosmic Horror");

interface CatalogBlock {
  id: string;
  kind: "triple" | "pair";
  genres: GenreId[];
  pairKeys: string[];
}

function pairsFromGenres(genres: readonly GenreId[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < genres.length; i += 1) {
    for (let j = i + 1; j < genres.length; j += 1) out.push(castingPairKey(genres[i], genres[j]));
  }
  return out.sort();
}

/** Build the exact 155-block pair decomposition for 30 genres. */
export function buildCastingBlocks(genres: readonly GenreId[]): CatalogBlock[] {
  if (genres.length !== 30 || new Set(genres).size !== 30) {
    throw new Error(`Casting Catalog V7 requires exactly 30 unique genres; received ${genres.length}.`);
  }

  // Non-zero 5-bit vectors are the 31 points of PG(4,2). A line is
  // {a, b, a XOR b}; canonicalising the triples yields the STS(31).
  const lineKeys = new Set<string>();
  for (let a = 1; a <= 31; a += 1) {
    for (let b = a + 1; b <= 31; b += 1) {
      const c = a ^ b;
      const line = [a, b, c].sort((x, y) => x - y);
      if (new Set(line).size === 3) lineKeys.add(line.join("|"));
    }
  }
  if (lineKeys.size !== 155) throw new Error(`Expected 155 STS(31) lines, got ${lineKeys.size}.`);

  const blocks = [...lineKeys]
    .map((key) => key.split("|").map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
    .map((points, index): CatalogBlock => {
      const realPoints = points.filter((point) => point !== 31);
      const blockGenres = realPoints.map((point) => genres[point - 1]);
      const kind = blockGenres.length === 3 ? "triple" : "pair";
      const pairKeys = pairsFromGenres(blockGenres);
      return { id: `B${String(index + 1).padStart(3, "0")}`, kind, genres: blockGenres, pairKeys };
    });

  const triples = blocks.filter((block) => block.kind === "triple");
  const pairs = blocks.filter((block) => block.kind === "pair");
  if (triples.length !== 140 || pairs.length !== 15) {
    throw new Error(`Expected 140 triples + 15 pairs, got ${triples.length} + ${pairs.length}.`);
  }

  const owned = new Map<string, string>();
  for (const block of blocks) {
    for (const key of block.pairKeys) {
      const previous = owned.get(key);
      if (previous) throw new Error(`Pair ${key} is duplicated by ${previous} and ${block.id}.`);
      owned.set(key, block.id);
    }
  }
  if (owned.size !== 435) throw new Error(`Expected exact ownership of 435 pairs, got ${owned.size}.`);
  return blocks;
}

const VISUAL_SIGNATURE_GENRES = new Set<GenreId>([
  "mecha", "sports", "cyber", "idol", "cooking", "military", "space", "magical",
  "pirate", "martial", "nordic", "samurai", "shinobi", "vampire", "monster_taming",
  "kaiju", "arabia",
]);

// HARD_VISUAL_SIGNATURE_INVARIANT_V1
function visualSignatureGenres(member: CastMember): GenreId[] {
  return member.visibleAff.filter((genre) => VISUAL_SIGNATURE_GENRES.has(genre));
}

/**
 * The source visible affinities are no longer mechanical wiring, but they ARE
 * valuable art-direction metadata: those are the genres the portrait was
 * actually designed to communicate. Score them far above legacy hidden
 * affinity so visually literal portraits stay with a genre they look like.
 *
 * Score bands are deliberately lexicographic at whole-bucket scale:
 *  - pinned chemistry cast must remain active
 *  - preserve a visually distinctive source genre whenever possible
 *  - preserve at least one source-visible genre on every active portrait
 *  - then prefer both old visibles / exact old blocks / hidden affinity
 */
function scoreMemberForBlock(member: CastMember, block: CatalogBlock, pinned: ReadonlySet<string>) {
  const oldVisible = member.visibleAff.filter((genre) => String(genre) !== String(NO_SECRET));
  const blockSet = new Set(block.genres);
  const visualOverlap = oldVisible.filter((genre) => blockSet.has(genre));
  const signatureOverlap = visualOverlap.filter((genre) => VISUAL_SIGNATURE_GENRES.has(genre));
  const visibleInside = oldVisible.length === 2 && oldVisible.every((genre) => blockSet.has(genre));
  const exactPair = block.kind === "pair" && visibleInside &&
    castingPairKey(oldVisible[0], oldVisible[1]) === block.pairKeys[0];
  const oldAll = [...oldVisible, member.hiddenAff].filter((genre) => String(genre) !== String(NO_SECRET));
  const exactTriple = block.kind === "triple" && oldAll.length === 3 &&
    new Set(oldAll).size === 3 && oldAll.every((genre) => blockSet.has(genre));

  let score = 0;
  if (pinned.has(member.id)) score += 100_000_000_000;
  if (signatureOverlap.length) score += 1_000_000_000;
  if (visualOverlap.length) score += 100_000_000;
  score += signatureOverlap.length * 50_000;
  score += visualOverlap.length * 20_000;
  if (visibleInside) score += 30_000;
  if (exactPair) score += 20_000;
  if (exactTriple) score += 15_000;
  // Old hidden affinity is retained only as a very weak semantic tie-breaker;
  // it must never overpower what the portrait visibly depicts.
  if (blockSet.has(member.hiddenAff)) score += 100;
  return score;
}

/** Rectangular Hungarian assignment (blocks <= portraits), maximizing weight. */
function maximumWeightCatalogAssignment(
  blocks: readonly CatalogBlock[],
  members: readonly CastMember[],
  pinned: ReadonlySet<string>,
  role: CastRole,
  type: AnimeType,
): Map<string, CastMember> {
  const n = blocks.length;
  const m = members.length;
  if (n > m) throw new Error(`${role}/${type}: ${m} portraits cannot cover ${n} blocks.`);

  const weights = blocks.map((block) => members.map((member) => {
    const signatures = visualSignatureGenres(member);
    const hardVisualMismatch = signatures.length > 0 && !signatures.some((genre) => block.genres.includes(genre));
    const tie = hash32(`${role}|${type}|${block.id}|${member.id}`) % 97;
    // An unmistakably themed active portrait may never be relabelled into an
    // unrelated catalogue block. Rectangular assignment can leave surplus
    // themed portraits in reserve instead of lying about what the art depicts.
    if (hardVisualMismatch) return -1_000_000_000_000_000 + tie;
    return scoreMemberForBlock(member, block, pinned) + tie;
  }));
  const maxWeight = Math.max(...weights.flat());
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const p = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);

  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(Number.POSITIVE_INFINITY);
    const used = new Array<boolean>(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Number.POSITIVE_INFINITY;
      let j1 = 0;
      for (let j = 1; j <= m; j += 1) {
        if (used[j]) continue;
        const cost = maxWeight - weights[i0 - 1][j - 1];
        const cur = cost - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j += 1) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const out = new Map<string, CastMember>();
  for (let j = 1; j <= m; j += 1) {
    const blockIndex = p[j] - 1;
    if (blockIndex >= 0) out.set(blocks[blockIndex].id, members[j - 1]);
  }
  if (out.size !== n) throw new Error(`${role}/${type}: global catalogue assignment produced ${out.size}/${n} owners.`);
  return out;
}

function chooseTriplePresentation(member: CastMember, block: CatalogBlock, genreOrder: ReadonlyMap<GenreId, number>) {
  const oldVisible = member.visibleAff;
  const inBlock = (genre: GenreId) => block.genres.includes(genre);

  if (oldVisible.every(inBlock)) {
    const visible = [...oldVisible] as [GenreId, GenreId];
    const hidden = block.genres.find((genre) => !visible.includes(genre))!;
    return { visible, hidden };
  }

  const candidates = block.genres.map((hidden) => {
    const visible = block.genres
      .filter((genre) => genre !== hidden)
      .sort((a, b) => (genreOrder.get(a) ?? 999) - (genreOrder.get(b) ?? 999)) as [GenreId, GenreId];
    let score = visible.filter((genre) => oldVisible.includes(genre)).length * 100;
    if (hidden === member.hiddenAff) score += 70;
    if (oldVisible.includes(hidden)) score -= 20;
    return { visible, hidden, score };
  });
  candidates.sort((a, b) => b.score - a.score || String(a.hidden).localeCompare(String(b.hidden)));
  return { visible: candidates[0].visible, hidden: candidates[0].hidden };
}

function cleanedClone(member: CastMember): CastMember {
  // Deliberately throw away the old curated pair wiring. It is not copied into
  // the rebuilt runtime catalogue at all.
  const { castingPairKeys: _obsolete, __castingCatalog: _oldCatalog, ...rest } = member as CatalogMember;
  return { ...rest } as CastMember;
}

export function rebuildCastingCatalog(
  rawMembers: readonly CastMember[],
  genres: readonly GenreId[],
  options: { pinnedActiveIds?: ReadonlySet<string> } = {},
): CastMember[] {
  const blocks = buildCastingBlocks(genres);
  const pinned = options.pinnedActiveIds ?? new Set<string>();
  const genreOrder = new Map(genres.map((genre, index) => [genre, index]));
  const rebuiltById = new Map<string, CastMember>();
  const originalById = new Map(rawMembers.map((member) => [member.id, member] as const));

  for (const role of ROLES) {
    for (const type of TYPES) {
      const bucket = rawMembers.filter((member) => member.role === role && member.type === type && !member.legacyPlaceholder);
      if (bucket.length < blocks.length) {
        throw new Error(`${role}/${type}: ${bucket.length} portraits cannot cover ${blocks.length} catalogue blocks.`);
      }
      const pinnedHere = bucket.filter((member) => pinned.has(member.id));
      if (pinnedHere.length > blocks.length) {
        throw new Error(`${role}/${type}: too many pinned active cast (${pinnedHere.length}).`);
      }

      // Solve the whole bucket at once. Greedy assignment could consume a
      // locally good match and strand an unmistakably themed portrait in an
      // unrelated block. Maximum-weight matching preserves the exact 435-pair
      // catalogue while globally maximizing visual-art alignment.
      const ownerForBlock = maximumWeightCatalogAssignment(blocks, bucket, pinned, role, type);
      const usedMembers = new Set([...ownerForBlock.values()].map((member) => member.id));
      for (const member of pinnedHere) {
        if (!usedMembers.has(member.id)) throw new Error(`${role}/${type}: pinned cast ${member.id} fell into reserve.`);
      }

      for (const block of blocks) {
        const original = ownerForBlock.get(block.id)!;
        const member = cleanedClone(original) as CatalogMember;
        let visible: [GenreId, GenreId];
        let hidden: GenreId;
        let secretGenre: GenreId | null = null;

        if (block.kind === "triple") {
          const presentation = chooseTriplePresentation(original, block, genreOrder);
          visible = presentation.visible;
          hidden = presentation.hidden;
          secretGenre = hidden;
        } else {
          visible = [...block.genres].sort(
            (a, b) => (genreOrder.get(a) ?? 999) - (genreOrder.get(b) ?? 999),
          ) as [GenreId, GenreId];
          // Pair blocks intentionally have no secret. A private sentinel keeps
          // legacy CastMember shape intact while remaining impossible to match
          // against any production genre.
          hidden = NO_SECRET;
        }

        member.visibleAff = visible;
        member.hiddenAff = hidden;
        member.epithet = `${genreLabel(visible[0])} × ${genreLabel(visible[1])}`;
        member.__castingCatalog = {
          active: true,
          kind: block.kind,
          genres: [...block.genres],
          pairKeys: [...block.pairKeys],
          publicPairKey: castingPairKey(visible[0], visible[1]),
          secretGenre,
        };
        rebuiltById.set(member.id, member);
      }

      // Everything else is explicitly reserve. Identity/art remains available
      // to old saves through castById, but it cannot enter a new casting list.
      for (const original of bucket) {
        if (usedMembers.has(original.id)) continue;
        const member = cleanedClone(original) as CatalogMember;
        member.__castingCatalog = {
          active: false,
          kind: "reserve",
          genres: [],
          pairKeys: [],
          publicPairKey: null,
          secretGenre: null,
        };
        rebuiltById.set(member.id, member);
      }
    }
  }

  // Preserve any synthetic/legacy placeholders untouched but mark them reserve.
  for (const original of rawMembers) {
    if (rebuiltById.has(original.id)) continue;
    const member = cleanedClone(original) as CatalogMember;
    member.__castingCatalog = {
      active: false,
      kind: "reserve",
      genres: [],
      pairKeys: [],
      publicPairKey: null,
      secretGenre: null,
    };
    rebuiltById.set(member.id, member);
  }

  const rebuilt = rawMembers.map((member) => rebuiltById.get(member.id)!);

  // Final invariant: every exact Role × Type bucket has one and only one owner
  // for each of the 435 pair cells.
  for (const role of ROLES) {
    for (const type of TYPES) {
      const bucket = rebuilt.filter((member) => member.role === role && member.type === type && isCastingActive(member));
      if (bucket.length !== 155) throw new Error(`${role}/${type}: expected 155 active catalogue entries, got ${bucket.length}.`);
      const ownerCount = new Map<string, number>();
      for (const member of bucket) {
        for (const key of catalogPairKeys(member)) ownerCount.set(key, (ownerCount.get(key) ?? 0) + 1);
      }
      if (ownerCount.size !== 435) throw new Error(`${role}/${type}: expected 435 owned pairs, got ${ownerCount.size}.`);
      for (const [key, count] of ownerCount) {
        if (count !== 1) throw new Error(`${role}/${type}/${key}: expected one owner, got ${count}.`);
      }
      for (const member of bucket) {
        const original = originalById.get(member.id);
        if (!original) throw new Error(`${role}/${type}/${member.id}: original portrait metadata missing.`);
        const signatures = visualSignatureGenres(original);
        if (signatures.length > 0) {
          const assigned = castingCatalogMeta(member)?.genres ?? [];
          if (!signatures.some((genre) => assigned.includes(genre))) {
            throw new Error(`${role}/${type}/${member.id}: visual signature ${signatures.join(",")} was lost in active catalogue assignment.`);
          }
        }
      }
    }
  }

  return rebuilt;
}

export function castingCatalogMeta(member: CastMember): CastingCatalogMeta | null {
  return (member as CatalogMember).__castingCatalog ?? null;
}

export function isCastingActive(member: CastMember): boolean {
  const meta = castingCatalogMeta(member);
  return meta ? meta.active : !member.legacyPlaceholder;
}

export function catalogPairKeys(member: CastMember): string[] {
  const meta = castingCatalogMeta(member);
  if (meta) return [...meta.pairKeys];
  return [castingPairKey(member.visibleAff[0], member.visibleAff[1])];
}

export function catalogPublicPairKey(member: CastMember): string {
  return castingCatalogMeta(member)?.publicPairKey ?? castingPairKey(member.visibleAff[0], member.visibleAff[1]);
}

export function catalogHasSecret(member: CastMember): boolean {
  return castingCatalogMeta(member)?.kind === "triple";
}

export function catalogAvailableGenres(member: CastMember, discovered: ReadonlySet<string>): Set<GenreId> {
  if (!isCastingActive(member)) return new Set<GenreId>();
  const out = new Set<GenreId>(member.visibleAff);
  if (catalogHasSecret(member) && discovered.has(member.id)) out.add(member.hiddenAff);
  return out;
}

export function catalogAvailablePairKeys(member: CastMember, discovered: ReadonlySet<string>): string[] {
  if (!isCastingActive(member)) return [];
  const meta = castingCatalogMeta(member);
  if (!meta) return [castingPairKey(member.visibleAff[0], member.visibleAff[1])];
  if (meta.kind === "pair") return meta.publicPairKey ? [meta.publicPairKey] : [];
  if (meta.kind === "triple") return discovered.has(member.id) ? [...meta.pairKeys] : (meta.publicPairKey ? [meta.publicPairKey] : []);
  return [];
}

export function catalogPairUsesSecret(member: CastMember, pairKey: string): boolean {
  const meta = castingCatalogMeta(member);
  return !!meta && meta.kind === "triple" && meta.publicPairKey !== pairKey && meta.pairKeys.includes(pairKey);
}
