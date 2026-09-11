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

function scoreMemberForBlock(member: CastMember, block: CatalogBlock, pinned: ReadonlySet<string>) {
  const oldVisible = member.visibleAff.filter((genre) => String(genre) !== String(NO_SECRET));
  const oldAll = [...oldVisible, member.hiddenAff].filter((genre) => String(genre) !== String(NO_SECRET));
  const blockSet = new Set(block.genres);
  const overlap = oldAll.filter((genre) => blockSet.has(genre)).length;
  const visibleInside = oldVisible.every((genre) => blockSet.has(genre));
  const exactPair = block.kind === "pair" && oldVisible.length === 2 &&
    castingPairKey(oldVisible[0], oldVisible[1]) === block.pairKeys[0];
  const exactTriple = block.kind === "triple" && oldAll.length === 3 &&
    new Set(oldAll).size === 3 && oldAll.every((genre) => blockSet.has(genre));

  let score = overlap * 400;
  if (visibleInside) score += 2_500;
  if (blockSet.has(member.hiddenAff)) score += 700;
  if (exactPair) score += 7_500;
  if (exactTriple) score += 12_000;
  if (pinned.has(member.id)) score += 1_000_000;
  return score;
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

      // Full bipartite candidate list, greedily consuming the strongest
      // art/old-affinity match. There is no coverage heuristic here: every
      // block already owns its pair cells exactly once before characters enter.
      const candidates = blocks.flatMap((block) =>
        bucket.map((member) => ({
          block,
          member,
          score: scoreMemberForBlock(member, block, pinned),
          tie: hash32(`${role}|${type}|${block.id}|${member.id}`),
        })),
      );
      candidates.sort((a, b) => b.score - a.score || a.tie - b.tie || a.member.id.localeCompare(b.member.id));

      const usedMembers = new Set<string>();
      const usedBlocks = new Set<string>();
      const ownerForBlock = new Map<string, CastMember>();
      for (const candidate of candidates) {
        if (usedMembers.has(candidate.member.id) || usedBlocks.has(candidate.block.id)) continue;
        usedMembers.add(candidate.member.id);
        usedBlocks.add(candidate.block.id);
        ownerForBlock.set(candidate.block.id, candidate.member);
        if (ownerForBlock.size === blocks.length) break;
      }
      if (ownerForBlock.size !== blocks.length) {
        throw new Error(`${role}/${type}: failed to assign all ${blocks.length} catalogue blocks.`);
      }
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
