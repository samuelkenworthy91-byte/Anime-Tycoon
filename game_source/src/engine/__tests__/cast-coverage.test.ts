import { describe, expect, it } from "vitest";
import {
  CANONICAL_GENRE_IDS,
  CAST_V2,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  VILLAINS,
  type AnimeType,
  type CastMember,
  type GenreId,
} from "../data";
import { filterCastByFilters } from "../castDisplayOrder";
import {
  catalogAvailablePairKeys,
  catalogPairKeys,
  castingCatalogMeta,
  castingPairKey,
  isCastingActive,
} from "../castCatalog";

const ROLES: [string, CastMember[]][] = [
  ["lead", PROTAGONISTS],
  ["sidekick", SECONDARY],
  ["mascot", PETS],
  ["villain", VILLAINS],
];
const TYPES: AnimeType[] = ["shonen", "shojo"];
const ALL_DISCOVERED = CAST_V2.map((member) => member.id);
const ALL_PAIRS = CANONICAL_GENRE_IDS.flatMap((a, index) =>
  CANONICAL_GENRE_IDS.slice(index + 1).map((b) => castingPairKey(a, b)),
);

describe("Casting Catalog V7", () => {
  it("preserves all 1440 identities but exposes only the clean active catalogue", () => {
    expect(CAST_V2).toHaveLength(1440);
    expect(new Set(CAST_V2.map((member) => member.id)).size).toBe(1440);
    expect(CAST_V2.filter(isCastingActive)).toHaveLength(155 * 8);
    expect(CAST_V2.filter((member) => !isCastingActive(member))).toHaveLength(1440 - 155 * 8);

    for (const [role, members] of ROLES) {
      expect(members, role).toHaveLength(310);
      for (const type of TYPES) expect(members.filter((member) => member.type === type), `${role}/${type}`).toHaveLength(155);
    }
  });

  it("removes legacy castingPairKeys from every runtime cast record", () => {
    for (const member of CAST_V2) {
      expect((member as CastMember & { castingPairKeys?: string[] }).castingPairKeys, member.id).toBeUndefined();
      expect(castingCatalogMeta(member), member.id).not.toBeNull();
    }
  });

  it("uses 140 triple designations and 15 public-only pair designations per Role × Type bucket", () => {
    for (const [, members] of ROLES) {
      for (const type of TYPES) {
        const bucket = members.filter((member) => member.type === type);
        const kinds = bucket.map((member) => castingCatalogMeta(member)!.kind);
        expect(kinds.filter((kind) => kind === "triple")).toHaveLength(140);
        expect(kinds.filter((kind) => kind === "pair")).toHaveLength(15);
      }
    }
  });

  it("gives every canonical pair exactly one designated owner in every Role × Type bucket", () => {
    expect(ALL_PAIRS).toHaveLength(435);
    expect(new Set(ALL_PAIRS).size).toBe(435);

    for (const [role, members] of ROLES) {
      for (const type of TYPES) {
        const bucket = members.filter((member) => member.type === type);
        const counts = new Map<string, number>();
        for (const member of bucket) {
          for (const key of catalogPairKeys(member)) counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        expect(counts.size, `${role}/${type}`).toBe(435);
        for (const pair of ALL_PAIRS) expect(counts.get(pair), `${role}/${type}/${pair}`).toBe(1);
      }
    }
  });

  it("never repeats a public card pair inside the same Role × Type bucket", () => {
    for (const [role, members] of ROLES) {
      for (const type of TYPES) {
        const bucket = members.filter((member) => member.type === type);
        const publicKeys = bucket.map((member) => castingPairKey(member.visibleAff[0], member.visibleAff[1]));
        expect(new Set(publicKeys).size, `${role}/${type}`).toBe(publicKeys.length);
      }
    }
  });

  it("returns exactly one Shonen and one Shojo owner for every pair after secrets are known", () => {
    for (let i = 0; i < CANONICAL_GENRE_IDS.length; i += 1) {
      for (let j = i + 1; j < CANONICAL_GENRE_IDS.length; j += 1) {
        const a = CANONICAL_GENRE_IDS[i];
        const b = CANONICAL_GENRE_IDS[j];
        for (const [role, members] of ROLES) {
          const result = filterCastByFilters(members, [
            { kind: "genre", value: a },
            { kind: "genre", value: b },
          ], ALL_DISCOVERED);
          expect(result, `${role}/${a}|${b}`).toHaveLength(2);
          expect(new Set(result.map((member) => member.type))).toEqual(new Set(TYPES));
        }
      }
    }
  });

  it("returns exactly one owner for a Type + pair query after discovery", () => {
    for (const [role, members] of ROLES) {
      for (const type of TYPES) {
        for (const key of ALL_PAIRS) {
          const [a, b] = key.split("|") as [GenreId, GenreId];
          const result = filterCastByFilters(members, [
            { kind: "type", value: type },
            { kind: "genre", value: a },
            { kind: "genre", value: b },
          ], ALL_DISCOVERED);
          expect(result, `${role}/${type}/${key}`).toHaveLength(1);
          expect(catalogAvailablePairKeys(result[0], new Set(ALL_DISCOVERED))).toContain(key);
        }
      }
    }
  });

  it("keeps secret-owned pairs unavailable until that exact character is discovered", () => {
    const secretOwner = CAST_V2.find((member) => {
      const meta = castingCatalogMeta(member);
      return isCastingActive(member) && meta?.kind === "triple" && meta.pairKeys.some((key) => key !== meta.publicPairKey);
    })!;
    const meta = castingCatalogMeta(secretOwner)!;
    const secretPair = meta.pairKeys.find((key) => key !== meta.publicPairKey)!;

    expect(catalogAvailablePairKeys(secretOwner, new Set())).not.toContain(secretPair);
    expect(catalogAvailablePairKeys(secretOwner, new Set([secretOwner.id]))).toContain(secretPair);
  });
});
