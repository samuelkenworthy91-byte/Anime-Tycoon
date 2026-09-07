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

describe("Cast V3 canonical roster", () => {
  it("contains exactly 432 unique selectable IDs in four equal roles", () => {
    expect(CAST_V2).toHaveLength(432);
    expect(new Set(CAST_V2.map((member) => member.id)).size).toBe(432);
    for (const [, members] of ROLES) expect(members).toHaveLength(108);
    expect(ROLES.flatMap(([, members]) => members).map((member) => member.id).sort())
      .toEqual(CAST_V2.map((member) => member.id).sort());
  });

  it("balances every role at 54 Shonen / 54 Shojo", () => {
    for (const [role, members] of ROLES) {
      for (const type of TYPES) {
        const cell = members.filter((member) => member.type === type);
        expect(cell, `${role}/${type}`).toHaveLength(54);
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
    for (const [role, members] of ROLES) {
      for (const type of TYPES) {
        const covered = new Set(members.filter((member) => member.type === type).flatMap(affinities));
        for (const genre of CANONICAL_GENRE_IDS) expect(covered.has(genre), `${role}/${type}/${genre}`).toBe(true);
      }
    }
  });

  it("covers all 253 genre pairs in each of the four roles", () => {
    let measured = 0;
    for (let i = 0; i < CANONICAL_GENRE_IDS.length; i += 1) {
      for (let j = i + 1; j < CANONICAL_GENRE_IDS.length; j += 1) {
        measured += 1;
        const a = CANONICAL_GENRE_IDS[i];
        const b = CANONICAL_GENRE_IDS[j];
        for (const [role, members] of ROLES) expect(members.some((member) => affinities(member).includes(a) && affinities(member).includes(b)), `${role}/${a}|${b}`).toBe(true);
      }
    }
    expect(measured).toBe(253);
  });

  it("covers all 253 genre pairs globally within each Anime Type", () => {
    for (const type of TYPES) {
      const members = CAST_V2.filter((member) => member.type === type);
      let measured = 0;
      for (let i = 0; i < CANONICAL_GENRE_IDS.length; i += 1) {
        for (let j = i + 1; j < CANONICAL_GENRE_IDS.length; j += 1) {
          measured += 1;
          const a = CANONICAL_GENRE_IDS[i];
          const b = CANONICAL_GENRE_IDS[j];
          expect(
            members.some((member) => affinities(member).includes(a) && affinities(member).includes(b)),
            `${type}/${a}|${b}`,
          ).toBe(true);
        }
      }
      expect(measured).toBe(253);
    }
  });

  it("includes Samurai and Shinobi in the canonical content", () => {
    for (const id of ["samurai", "shinobi"] as GenreId[]) {
      expect(CAST_V2.some((member) => affinities(member).includes(id))).toBe(true);
      expect(CANONICAL_GENRE_IDS).toContain(id);
    }
  });
});
