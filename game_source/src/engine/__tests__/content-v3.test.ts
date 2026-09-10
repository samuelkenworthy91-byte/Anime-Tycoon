import { describe, expect, it } from "vitest";
import { ARCS, ARC_COMBOS, CAST_V2, WORKER_LOOKS } from "../data";
import { AUCTION_IPS } from "../ip";
import original from "../generated/castV2.json";
import { mixedCastOrder } from "../castDisplayOrder";

function longestGenreRun(members: typeof CAST_V2) {
  let max = 0;
  const streak = new Map<string, number>();
  for (const member of members) {
    for (const genre of streak.keys()) if (!member.visibleAff.includes(genre as never)) streak.set(genre, 0);
    for (const genre of member.visibleAff) {
      const n = (streak.get(genre) ?? 0) + 1;
      streak.set(genre, n); max = Math.max(max, n);
    }
  }
  return max;
}

describe("V3 content integration", () => {
  it("preserves every existing cast field and adds epithets", () => {
    for (const member of original.cast) expect(CAST_V2.find(c => c.id === member.id)).toMatchObject(member);
    expect(CAST_V2.every(c => c.epithet && c.epithet.split(/\s+/).length >= 2)).toBe(true);
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
    expect(ARCS).toHaveLength(90 + AUCTION_IPS.length); expect(ARC_COMBOS).toHaveLength(49 + AUCTION_IPS.length);
    expect(new Set(ARCS.map(a => a.id)).size).toBe(ARCS.length);
    expect(new Set(ARC_COMBOS.map(a => a.id)).size).toBe(ARC_COMBOS.length);
    for (const combo of ARC_COMBOS) for (const id of combo.arcs) expect(ARCS.some(a => a.id === id)).toBe(true);
  });
  it("mixes every role without omissions, mutation or hidden-affinity influence", () => {
    for (const role of ["protag", "secondary", "pet", "villain"]) {
      const pool = CAST_V2.filter(c => c.role === role);
      const before = JSON.stringify(pool);
      const mixed = mixedCastOrder(pool);
      expect(mixed.map(c => c.id).sort()).toEqual(pool.map(c => c.id).sort());
      expect(JSON.stringify(pool)).toBe(before);
      expect(mixedCastOrder(pool)).toEqual(mixed);
      expect(mixedCastOrder([...pool].reverse())).toEqual(mixed);
      const hiddenChanged = pool.map(c => ({ ...c, hiddenAff: "horror" as const }));
      expect(mixedCastOrder(hiddenChanged).map(c => c.id)).toEqual(mixed.map(c => c.id));
      expect(longestGenreRun(mixed)).toBeLessThan(longestGenreRun(pool));
      expect(longestGenreRun(mixed)).toBeLessThanOrEqual(3);
      console.info(`${role}: longest visible-genre run ${longestGenreRun(pool)} → ${longestGenreRun(mixed)}`);
    }
  });
});
