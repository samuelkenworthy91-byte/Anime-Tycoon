import { describe, expect, it } from "vitest";
import rawRuntime from "../generated/castV3.json";
import { CAST_V2, type CastMember } from "../data";
import { isCastingActive } from "../castCatalog";

describe("Casting Catalog V7 portrait semantics", () => {
  it("keeps every active portrait on at least one genre it was visually designed for", () => {
    const sourceById = new Map(
      (rawRuntime.cast as CastMember[]).map((member) => [member.id, member] as const),
    );
    const mismatches: string[] = [];

    for (const member of CAST_V2.filter(isCastingActive)) {
      const source = sourceById.get(member.id)!;
      const sourceVisuals = source.visibleAff;
      if (!member.visibleAff.some((genre) => sourceVisuals.includes(genre))) {
        mismatches.push(
          `${member.id}: source ${sourceVisuals.join("+")} -> public ${member.visibleAff.join("+")}`,
        );
      }
    }

    expect(mismatches, mismatches.join("\n")).toEqual([]);
  });

  it("does not use the old hidden affinity as a substitute for visual art direction", () => {
    const sourceById = new Map(
      (rawRuntime.cast as CastMember[]).map((member) => [member.id, member] as const),
    );

    for (const member of CAST_V2.filter(isCastingActive)) {
      const source = sourceById.get(member.id)!;
      expect(
        member.visibleAff.some((genre) => source.visibleAff.includes(genre)),
        `${member.id} should visibly retain ${source.visibleAff.join(" or ")}`,
      ).toBe(true);
    }
  });
});
