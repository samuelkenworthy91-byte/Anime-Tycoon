import { describe, expect, it } from "vitest";
import { ARCS, ARC_COMBOS, CAST_V2, WORKER_LOOKS } from "../data";
import { AUCTION_IPS } from "../ip";
import original from "../generated/castV2.json";
import arcRuntime from "../generated/arcV3.json";
import { mixedCastOrder } from "../castDisplayOrder";
import { isCastingActive } from "../castCatalog";

function longestGenreRun(members: typeof CAST_V2) {
  let max = 0;
  const streak = new Map<string, number>();
  for (const member of members) {
    for (const genre of streak.keys()) if (!member.visibleAff.includes(genre as never)) streak.set(genre, 0);
    for (const genre of member.visibleAff) {
      const n = (streak.get(genre) ?? 0) + 1;
      streak.set(genre, n);
      max = Math.max(max, n);
    }
  }
  return max;
}

describe("V3/V5 content integration after catalog rebuild", () => {
  it("preserves existing cast identity/art fields while allowing affinities to be remapped", () => {
    for (const source of original.cast) {
      const actual = CAST_V2.find((member) => member.id === source.id)!;
      expect(actual).toBeTruthy();
      expect(actual).toMatchObject({
        id: source.id,
        name: source.name,
        archetype: source.archetype,
        img: source.img,
        personality: source.personality,
        role: source.role,
        type: source.type,
        gender: source.gender,
        species: source.species,
        ageBand: source.ageBand,
        culturalBasis: source.culturalBasis,
      });
    }
    expect(CAST_V2.filter(isCastingActive).every((member) => member.epithet && member.epithet.split(/\s+/).length >= 2)).toBe(true);
  });

  it("adds eleven worker looks after the original fifteen", () => {
    expect(WORKER_LOOKS).toHaveLength(26);
    expect(WORKER_LOOKS[14].sprite).toContain("sprite-worker-16.png");
    expect(WORKER_LOOKS[15].sprite).toContain("sprite-worker-17.png");
    expect(WORKER_LOOKS[21].sprite).toContain("sprite-worker-23.png");
    expect(WORKER_LOOKS[22].sprite).toContain("sprite-worker-24.png");
    expect(WORKER_LOOKS[25].sprite).toContain("sprite-worker-27.png");
  });

  it("loads unique arcs and valid combo references", () => {
    const baseArcCount = 66;
    const baseComboCount = 31;
    expect(ARCS).toHaveLength(baseArcCount + arcRuntime.add_arcs.length + AUCTION_IPS.length);
    expect(ARC_COMBOS).toHaveLength(baseComboCount + arcRuntime.add_combos.length + AUCTION_IPS.length);
    expect(new Set(ARCS.map((arc) => arc.id)).size).toBe(ARCS.length);
    expect(new Set(ARC_COMBOS.map((combo) => combo.id)).size).toBe(ARC_COMBOS.length);
    for (const combo of ARC_COMBOS) for (const id of combo.arcs) expect(ARCS.some((arc) => arc.id === id)).toBe(true);
  });

  it("mixes every active role without mutation or hidden-affinity influence", () => {
    for (const role of ["protag", "secondary", "pet", "villain"] as const) {
      const archivePool = CAST_V2.filter((member) => member.role === role);
      const activePool = archivePool.filter(isCastingActive);
      const before = JSON.stringify(archivePool);
      const mixed = mixedCastOrder(archivePool);

      expect(mixed.map((member) => member.id).sort()).toEqual(activePool.map((member) => member.id).sort());
      expect(JSON.stringify(archivePool)).toBe(before);
      expect(mixedCastOrder(archivePool)).toEqual(mixed);
      expect(mixedCastOrder([...archivePool].reverse())).toEqual(mixed);

      const hiddenChanged = archivePool.map((member) => ({ ...member, hiddenAff: "horror" as const }));
      expect(mixedCastOrder(hiddenChanged).map((member) => member.id)).toEqual(mixed.map((member) => member.id));
      expect(longestGenreRun(mixed)).toBeLessThanOrEqual(3);
    }
  });
});
