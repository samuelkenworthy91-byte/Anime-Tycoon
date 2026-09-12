import { describe, expect, it } from "vitest";
import raw from "../generated/castV3.json";
import { CAST_V2 } from "../castV2";
import { isCastingActive } from "../castCatalog";

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

describe("active cast visual alignment", () => {
  it("does not relabel active portraits completely away from their source art direction", () => {
    const source = new Map(raw.cast.map((m) => [m.id, m]));
    const active = CAST_V2.filter(isCastingActive);
    let exact = 0;
    let one = 0;
    let zero = 0;
    for (const member of active) {
      const old = source.get(member.id)!;
      const overlap = member.visibleAff.filter((g) => old.visibleAff.includes(g)).length;
      if (pairKey(member.visibleAff[0], member.visibleAff[1]) === pairKey(old.visibleAff[0], old.visibleAff[1])) exact += 1;
      else if (overlap === 1) one += 1;
      else zero += 1;
    }
    console.log(`Cast visual alignment: exact source pair ${exact}/${active.length}; one source genre ${one}; zero source genres ${zero}.`);
    expect(zero).toBe(0);
    expect(exact).toBeGreaterThan(active.length * 0.30);
  });
});
