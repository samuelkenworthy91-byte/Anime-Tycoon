import { describe, expect, it } from "vitest";
import { GENRES, PROTAGONISTS } from "../data";
import { filterCastByFilters, filterCastByVisibleGenre } from "../castDisplayOrder";
import { castingCatalogMeta, castingPairKey } from "../castCatalog";

const ALL_DISCOVERED = PROTAGONISTS.map((member) => member.id);

describe("clean cast browse filters", () => {
  it("ordinary browsing contains only active, unique public catalogue cards", () => {
    const result = filterCastByFilters(PROTAGONISTS, []);
    expect(result).toHaveLength(PROTAGONISTS.length);

    for (const type of ["shonen", "shojo"] as const) {
      const cell = result.filter((member) => member.type === type);
      expect(cell).toHaveLength(155);
      const keys = cell.map((member) => castingPairKey(member.visibleAff[0], member.visibleAff[1]));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("filters directly by Shonen or Shojo", () => {
    for (const type of ["shonen", "shojo"] as const) {
      const result = filterCastByFilters(PROTAGONISTS, [{ kind: "type", value: type }]);
      expect(result).toHaveLength(155);
      expect(result.every((member) => member.type === type)).toBe(true);
    }
  });

  it("supports a strict Type + public pair query with its one designated owner", () => {
    const target = PROTAGONISTS.find((member) => castingCatalogMeta(member)?.publicPairKey)!;
    const result = filterCastByFilters(PROTAGONISTS, [
      { kind: "type", value: target.type },
      { kind: "genre", value: target.visibleAff[0] },
      { kind: "genre", value: target.visibleAff[1] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(target.id);
  });

  it("returns cast connected to every real genre after all secrets are known", () => {
    for (const genre of GENRES.map((item) => item.id)) {
      const result = filterCastByVisibleGenre(PROTAGONISTS, genre, ALL_DISCOVERED);
      expect(result.length, genre).toBeGreaterThan(0);
    }
  });

  it("does not expose a secret genre or secret pair until its owner is discovered", () => {
    const owner = PROTAGONISTS.find((member) => castingCatalogMeta(member)?.kind === "triple")!;
    const meta = castingCatalogMeta(owner)!;
    const secret = meta.secretGenre!;
    const publicGenre = owner.visibleAff[0];

    const beforeGenre = filterCastByFilters(PROTAGONISTS, [{ kind: "genre", value: secret }], []);
    expect(beforeGenre.some((member) => member.id === owner.id)).toBe(false);

    const afterGenre = filterCastByFilters(PROTAGONISTS, [{ kind: "genre", value: secret }], [owner.id]);
    expect(afterGenre.some((member) => member.id === owner.id)).toBe(true);
    expect(afterGenre.find((member) => member.id === owner.id)?.epithet).toContain("SECRET MATCH");

    const beforePair = filterCastByFilters(PROTAGONISTS, [
      { kind: "type", value: owner.type },
      { kind: "genre", value: publicGenre },
      { kind: "genre", value: secret },
    ], []);
    expect(beforePair.some((member) => member.id === owner.id)).toBe(false);

    const afterPair = filterCastByFilters(PROTAGONISTS, [
      { kind: "type", value: owner.type },
      { kind: "genre", value: publicGenre },
      { kind: "genre", value: secret },
    ], [owner.id]);
    expect(afterPair).toHaveLength(1);
    expect(afterPair[0].id).toBe(owner.id);
    expect(afterPair[0].epithet).toContain("SECRET MATCH");
  });

  it("public-only pair blocks never invent a secret match", () => {
    const pairOnly = PROTAGONISTS.find((member) => castingCatalogMeta(member)?.kind === "pair")!;
    const meta = castingCatalogMeta(pairOnly)!;
    expect(meta.secretGenre).toBeNull();
    expect(meta.pairKeys).toHaveLength(1);
    const result = filterCastByFilters(PROTAGONISTS, [
      { kind: "type", value: pairOnly.type },
      { kind: "genre", value: pairOnly.visibleAff[0] },
      { kind: "genre", value: pairOnly.visibleAff[1] },
    ], ALL_DISCOVERED);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(pairOnly.id);
    expect(result[0].epithet).not.toContain("SECRET MATCH");
  });
});
