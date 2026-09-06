import { describe, expect, it } from "vitest";
import {
  CANONICAL_GENRE_IDS,
  CAST_V2,
  GENRES,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  VILLAINS,
  type AnimeType,
  type CastMember,
  type GenreId,
} from "../data";

const ROLES: [string, CastMember[]][] = [
  ["lead", PROTAGONISTS],
  ["sidekick", SECONDARY],
  ["mascot", PETS],
  ["villain", VILLAINS],
];
const TYPES: AnimeType[] = ["shonen", "shojo"];
const affinities = (member: CastMember): GenreId[] => [...member.visibleAff, member.hiddenAff];

describe("Cast V2 canonical roster", () => {
  it("contains exactly 192 unique selectable IDs in four equal roles", () => {
    expect(CAST_V2).toHaveLength(192);
    expect(new Set(CAST_V2.map((member) => member.id)).size).toBe(192);
    for (const [, members] of ROLES) expect(members).toHaveLength(48);
    expect(ROLES.flatMap(([, members]) => members).map((member) => member.id).sort())
      .toEqual(CAST_V2.map((member) => member.id).sort());
  });

  it("balances every role at 24 Shonen / 24 Shojo and 12 / 12 gender", () => {
    for (const [role, members] of ROLES) {
      for (const type of TYPES) {
        const cell = members.filter((member) => member.type === type);
        expect(cell, `${role}/${type}`).toHaveLength(24);
        expect(cell.filter((member) => member.gender === "male"), `${role}/${type}/male`).toHaveLength(12);
        expect(cell.filter((member) => member.gender === "female"), `${role}/${type}/female`).toHaveLength(12);
      }
    }
  });

  it("gives every member two visible and one distinct hidden active affinity", () => {
    const active = new Set(GENRES.map((genre) => genre.id));
    for (const member of CAST_V2) {
      expect(member.visibleAff, member.id).toHaveLength(2);
      expect(new Set(affinities(member)).size, member.id).toBe(3);
      for (const genre of affinities(member)) expect(active.has(genre), `${member.id}/${genre}`).toBe(true);
    }
  });

  it("provides practical all-genre coverage in every role × Type group", () => {
    /* coverage is guaranteed against the CANONICAL 21 genres — the 192 cast
       affinities are Cast V2 canonical data and are NOT being re-balanced for
       the provisional Samurai/Shinobi ids in this pass */
    for (const [role, members] of ROLES) {
      for (const type of TYPES) {
        const covered = new Set(members.filter((member) => member.type === type).flatMap(affinities));
        for (const genre of CANONICAL_GENRE_IDS) expect(covered.has(genre), `${role}/${type}/${genre}`).toBe(true);
      }
    }
  });

  it("covers all 210 unordered canonical genre pairs across complete affinity sets", () => {
    let measured = 0;
    for (let i = 0; i < CANONICAL_GENRE_IDS.length; i += 1) {
      for (let j = i + 1; j < CANONICAL_GENRE_IDS.length; j += 1) {
        measured += 1;
        const a = CANONICAL_GENRE_IDS[i];
        const b = CANONICAL_GENRE_IDS[j];
        expect(CAST_V2.some((member) => affinities(member).includes(a) && affinities(member).includes(b)), `${a}|${b}`).toBe(true);
      }
    }
    expect(measured).toBe(210);
  });

  it("leaves the provisional Samurai/Shinobi ids out of Cast V2 coverage (Work will re-balance)", () => {
    /* the cast manifest has no Samurai/Shinobi affinities — this pass does not
       invent Cast V3 assignments or touch the existing 192 affinity sets */
    for (const id of ["samurai", "shinobi"] as GenreId[]) {
      expect(CAST_V2.every((member) => !affinities(member).includes(id))).toBe(true);
      expect(CANONICAL_GENRE_IDS).not.toContain(id);
    }
  });
});
