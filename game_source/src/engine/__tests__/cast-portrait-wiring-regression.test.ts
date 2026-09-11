import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAST_V2, PETS, PROTAGONISTS, SECONDARY, VILLAINS, type AnimeType, type CastMember, type CastRole, type GenreId } from "../data";
import { filterCastByFilters } from "../castDisplayOrder";
import { castingCatalogMeta, isCastingActive } from "../castCatalog";

const ROOT = path.resolve(__dirname, "../../..");
const v6 = CAST_V2.filter((member) => member.id.startsWith("g30_"));
const ALL_DISCOVERED = CAST_V2.map((member) => member.id);
const roles: [CastRole, CastMember[]][] = [
  ["protag", PROTAGONISTS],
  ["secondary", SECONDARY],
  ["pet", PETS],
  ["villain", VILLAINS],
];
const types: AnimeType[] = ["shonen", "shojo"];
const requestedPairs: [GenreId, GenreId][] = [
  ["monster_taming", "crime"], ["monster_taming", "cosmic_horror"], ["monster_taming", "arabia"],
  ["crime", "cosmic_horror"], ["crime", "arabia"], ["kaiju", "cosmic_horror"],
  ["kaiju", "arabia"], ["cosmic_horror", "arabia"],
];

describe("portrait identity survives the casting catalog rebuild", () => {
  it("keeps all 520 Genre 30 portraits and stable IDs without using their old affinity wiring", () => {
    expect(v6).toHaveLength(520);
    expect(new Set(v6.map((member) => member.id)).size).toBe(520);
    expect(new Set(v6.map((member) => member.sourceManifestSequence)).size).toBe(520);
    expect(new Set(v6.map((member) => member.name)).size).toBe(520);
    expect(v6.every((member) => member.img === `cast/v6/${member.id}.webp`)).toBe(true);
    expect(v6.every((member) => (member as CastMember & { castingPairKeys?: string[] }).castingPairKeys === undefined)).toBe(true);
  });

  it("marks every Genre 30 portrait explicitly active or reserve", () => {
    for (const member of v6) {
      const meta = castingCatalogMeta(member);
      expect(meta, member.id).not.toBeNull();
      expect(meta!.active, member.id).toBe(isCastingActive(member));
      expect(["triple", "pair", "reserve"]).toContain(meta!.kind);
    }
  });

  it("resolves formerly problematic new-genre pairs through the global clean catalog, not V6-only wiring", () => {
    for (const [role, members] of roles) {
      for (const type of types) {
        for (const [genreA, genreB] of requestedPairs) {
          const result = filterCastByFilters(members, [
            { kind: "type", value: type },
            { kind: "genre", value: genreA },
            { kind: "genre", value: genreB },
          ], ALL_DISCOVERED);
          expect(result, `${role}/${type}/${genreA}+${genreB}`).toHaveLength(1);
          expect(result[0].type).toBe(type);
        }
      }
    }
  });

  it("keeps source roster metadata as art provenance rather than live casting authority", () => {
    const roster = readFileSync(path.join(ROOT, "docs/content-v6/GENRE30_CAST_ROSTER.csv"), "utf8");
    expect(roster.split(/\r?\n/).filter(Boolean)).toHaveLength(521);
    expect(roster).toContain("coverage_edges_this_member");
    expect(roster).toContain("concept_brief");

    // The archived field can remain for provenance, but no live cast record is
    // allowed to carry the old curated-owner index into selection.
    expect(CAST_V2.some((member) => (member as CastMember & { castingPairKeys?: string[] }).castingPairKeys?.length)).toBe(false);
  });
});
