import { describe, expect, it } from "vitest";
import { GENRES, type Staff } from "../data";
import {
  TRAIT_DEFS,
  contractCrewPayMult,
  ensureCareer,
  genreExperienceMultiplier,
  genreFamiliarity,
  recordShow,
  staffGenreMultiplier,
  staffReleaseFanMult,
  staffResearchDurationMult,
} from "../careers";
import { exactDirectionKnown, GENRE_MASTERY_KNOWLEDGE, showrunnerContractSkill, showrunnerStats } from "../studioOps";

const base = (traits: string[] = []): Staff => ensureCareer({ id: `depth-${traits.join("-")}`, name: "Depth", role: "writer", story: 60, art: 40, sound: 35, level: 1, salary: 500, cost: 1000, stamina: 100, portrait: 0, traits, spec: "w_comedy", favGenre: "comedy", genreExperience: {} }, 0);

describe("staff depth", () => {
  it("makes a non-preferred genre bad at first and neutral after three shipped works", () => {
    let s = base();
    expect(staffGenreMultiplier(s, ["mecha"])).toBe(0.60);
    s = recordShow(s, "One", 20, 1, ["mecha"]); expect(staffGenreMultiplier(s,["mecha"])).toBe(0.75);
    s = recordShow(s, "Two", 20, 2, ["mecha"]); expect(staffGenreMultiplier(s,["mecha"])).toBe(0.90);
    s = recordShow(s, "Three", 20, 3, ["mecha"]); expect(staffGenreMultiplier(s,["mecha"])).toBe(1.00);
  });
  it("treats specialisms/favourites as genuine starting familiarity", () => {
    const s=base(["fanatic"]);
    expect(genreFamiliarity(s,"comedy")).toBeGreaterThanOrEqual(4);
    expect(genreExperienceMultiplier(genreFamiliarity(s,"comedy"))).toBeGreaterThan(1);
    expect(staffGenreMultiplier(s,["mecha"])).toBeLessThan(1);
  });
  it("ships a much broader mechanical trait catalogue", () => {
    expect(TRAIT_DEFS.length).toBeGreaterThanOrEqual(24);
    for (const id of ["researcher","gossip","publicist","organizer","networker","lorekeeper"]) expect(TRAIT_DEFS.some((t)=>t.id===id)).toBe(true);
  });
  it("routes research, audience and contract personalities into real multipliers", () => {
    expect(staffResearchDurationMult([base(["researcher"])] )).toBe(0.92);
    expect(staffReleaseFanMult([base(["gossip"]),base(["publicist"])] )).toBeCloseTo(1.25);
    expect(contractCrewPayMult([base(["networker"]),base(["networker"])] )).toBeCloseTo(1.30);
  });
  it("uses one exact mastery rule for slider advice", () => {
    expect(GENRE_MASTERY_KNOWLEDGE).toBe(9);
    expect(exactDirectionKnown([8])).toBe(false);
    expect(exactDirectionKnown([9])).toBe(true);
    expect(exactDirectionKnown([4,4],3)).toBe(true);
    expect(exactDirectionKnown([9,9],0)).toBe(true);
  });
  it("showrunner displayed stats are their actual contract/rush craft stats", () => {
    for (const id of ["steady","vision","producer","marketer","operations","franchise","mentor","research"]) {
      const stats=showrunnerStats(id,12);
      expect(showrunnerContractSkill(id,12,"story")).toBe(stats.story);
      expect(showrunnerContractSkill(id,12,"art")).toBe(stats.art);
      expect(showrunnerContractSkill(id,12,"sound")).toBe(stats.sound);
    }
  });
  it("the live genre catalogue still exists for candidate readiness UI",()=>expect(GENRES.length).toBeGreaterThanOrEqual(21));
});
