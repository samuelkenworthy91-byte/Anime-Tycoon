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
const ROLE_TOTALS: Record<string, number> = { lead: 231, sidekick: 227, mascot: 230, villain: 232 };
const ROLE_TYPE_TOTALS: Record<string, number> = {
  "lead:shonen": 113,
  "lead:shojo": 118,
  "sidekick:shonen": 112,
  "sidekick:shojo": 115,
  "mascot:shonen": 113,
  "mascot:shojo": 117,
  "villain:shonen": 115,
  "villain:shojo": 117,
};
const TYPES: AnimeType[] = ["shonen", "shojo"];
const affinities = (member: CastMember): GenreId[] => [...member.visibleAff, member.hiddenAff];
const expectedPairs = (CANONICAL_GENRE_IDS.length * (CANONICAL_GENRE_IDS.length - 1)) / 2;

describe("canonical 25-genre cast roster", () => {
  it("contains exactly 920 unique selectable IDs while preserving all four roles", () => {
    expect(CAST_V2).toHaveLength(920);
    expect(new Set(CAST_V2.map((member) => member.id)).size).toBe(920);
    for (const [role, members] of ROLES) expect(members, role).toHaveLength(ROLE_TOTALS[role]);
    expect(ROLES.flatMap(([, members]) => members).map((member) => member.id).sort())
      .toEqual(CAST_V2.map((member) => member.id).sort());
  });

  it("matches the expanded role × type bucket sizes", () => {
    for (const [role, members] of ROLES) {
      for (const type of TYPES) {
        const cell = members.filter((member) => member.type === type);
        expect(cell, `${role}/${type}`).toHaveLength(ROLE_TYPE_TOTALS[`${role}:${type}`]);
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

  it("covers every canonical pair inside every exact role × anime-type bucket", () => {
    let measured = 0;
    for (let i = 0; i < CANONICAL_GENRE_IDS.length; i += 1) {
      for (let j = i + 1; j < CANONICAL_GENRE_IDS.length; j += 1) {
        measured += 1;
        const a = CANONICAL_GENRE_IDS[i];
        const b = CANONICAL_GENRE_IDS[j];
        for (const [role, members] of ROLES) {
          for (const type of TYPES) {
            const bucket = members.filter((member) => member.type === type);
            expect(
              bucket.some((member) => affinities(member).includes(a) && affinities(member).includes(b)),
              `${role}/${type}/${a}|${b}`,
            ).toBe(true);
          }
        }
      }
    }
    expect(measured).toBe(expectedPairs);
    expect(measured).toBe(300);
  });

  it("includes Samurai, Shinobi, Vampire and Grimdark in canonical content", () => {
    for (const id of ["samurai", "shinobi", "vampire", "grimdark"] as GenreId[]) {
      expect(CAST_V2.some((member) => affinities(member).includes(id))).toBe(true);
      expect(CANONICAL_GENRE_IDS).toContain(id);
    }
  });
});
