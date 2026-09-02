import { describe, expect, it } from "vitest";
import {
  GENRES,
  PROTAGONISTS,
  SECONDARY,
  PETS,
  VILLAINS,
  CAST_WAVE_THREE,
  type CastMember,
} from "../data";

/*
 * Cast coverage guarantees — the Create menu draws from the four role
 * arrays below, so these are asserted against exactly those arrays (not
 * just the CAST registry). docs/cast-coverage.md is the human-readable
 * snapshot; this suite is the permanent contract:
 *
 *   1. every roster member registered in CAST is actually selectable
 *      (wave-three was data-only before and couldn't be cast at all)
 *   2. every role x genre cell has at least TWO members — no genre shows
 *      an empty/thin picker, whatever the player picks
 *   3. every one of the 190 genre pairs has at least one member whose
 *      affinities cover BOTH genres (the dual-cover premium pick)
 *   4. every pair is fully castable — each of the four roles can field
 *      somebody whose affinities hit at least one of the two genres
 *      (the "mecha x shonen" case the player asked about)
 */

const ROLES: [string, CastMember[]][] = [
  ["lead", PROTAGONISTS],
  ["support", SECONDARY],
  ["pet", PETS],
  ["villain", VILLAINS],
];
const ALL = ROLES.flatMap(([, arr]) => arr);

describe("roster integrity", () => {
  it("wave three is selectable (folded into the pick lists)", () => {
    for (const m of CAST_WAVE_THREE) {
      const pool = { protag: PROTAGONISTS, secondary: SECONDARY, pet: PETS, villain: VILLAINS }[m.role];
      expect(pool, `${m.name} must appear in the ${m.role} array`).toContain(m);
    }
  });

  it("no duplicate member ids across the role arrays", () => {
    const ids = ALL.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every affinity inside every roster member is a real genre", () => {
    const valid = new Set(GENRES.map((g) => g.id as string));
    for (const m of ALL) {
      for (const a of m.aff) {
        expect(valid.has(a as string), `${m.id} has unknown genre aff '${a}'`).toBe(true);
      }
    }
  });

  it("no member carries duplicate affinities", () => {
    for (const m of ALL) {
      expect(new Set(m.aff).size, m.id).toBe(m.aff.length);
    }
  });
});

describe("single-genre coverage (menu availability)", () => {
  for (const g of GENRES) {
    it(`${g.id}: every role has at least 2 fitting members`, () => {
      for (const [role, arr] of ROLES) {
        const n = arr.filter((m) => m.aff.includes(g.id)).length;
        expect(n, `${role}/${g.id}`).toBeGreaterThanOrEqual(2);
      }
    });
  }
});

describe("genre-pair coverage (all 190 combos)", () => {
  for (let i = 0; i < GENRES.length; i++) {
    for (let j = i + 1; j < GENRES.length; j++) {
      const [a, b] = [GENRES[i], GENRES[j]];
      it(`${a.id} x ${b.id}: at least one dual-cover member, and fully castable`, () => {
        const dual = ALL.filter((m) => m.aff.includes(a.id) && m.aff.includes(b.id));
        expect(dual.length, `no member covers ${a.id}+${b.id}`).toBeGreaterThanOrEqual(1);
        for (const [role, arr] of ROLES) {
          expect(
            arr.some((m) => m.aff.includes(a.id) || m.aff.includes(b.id)),
            `a ${role} slot cannot be filled for ${a.id}/${b.id}`
          ).toBe(true);
        }
      });
    }
  }

  it("spotlight: mecha x shonen has several picks like the player asked", () => {
    const dual = ALL.filter((m) => m.aff.includes("mecha") && m.aff.includes("shonen"));
    expect(dual.length).toBeGreaterThanOrEqual(3);
  });
});
