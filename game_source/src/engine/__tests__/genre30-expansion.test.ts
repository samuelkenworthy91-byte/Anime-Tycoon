import { describe, expect, it } from "vitest";
import {
  ARCS,
  ARC_COMBOS,
  AUDIENCES,
  CANONICAL_GENRE_IDS,
  CAST_V2,
  GENRES,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  SLOTS,
  VILLAINS,
  comboMult,
  type AnimeType,
  type CastMember,
  type CastRole,
  type GenreId,
} from "../data";
import genreRuntime from "../generated/genreV3.json";
import arcRuntime from "../generated/arcV3.json";
import { POSTER_DECOS, posterFontFor } from "../poster";
import { catalogPairKeys, isCastingActive } from "../castCatalog";

const NEW_IDS = ["monster_taming", "crime", "kaiju", "cosmic_horror", "arabia"] as GenreId[];
const ROLES: [CastRole, CastMember[]][] = [
  ["protag", PROTAGONISTS],
  ["secondary", SECONDARY],
  ["pet", PETS],
  ["villain", VILLAINS],
];
const TYPES: AnimeType[] = ["shonen", "shojo"];
const pairKey = (a: GenreId, b: GenreId) => [a, b].sort().join("|");
const allPairs = CANONICAL_GENRE_IDS.flatMap((a, i) => CANONICAL_GENRE_IDS.slice(i + 1).map((b) => pairKey(a, b)));
const newPairs = allPairs.filter((key) => key.split("|").some((g) => NEW_IDS.includes(g as GenreId)));
const v6 = CAST_V2.filter((c) => c.id.startsWith("g30_"));
const v6Arcs = arcRuntime.add_arcs.filter((a) => a.id.startsWith("g30_"));
const v6Combos = arcRuntime.add_combos.filter((a) => a.id.startsWith("g30_"));

describe("Genre 30 expansion", () => {
  it("lands exactly five new canonical genres and the complete 435-pair matrix", () => {
    expect(GENRES).toHaveLength(30);
    expect(CANONICAL_GENRE_IDS).toHaveLength(30);
    expect(allPairs).toHaveLength(435);
    expect(newPairs).toHaveLength(135);
    expect(genreRuntime.combos).toHaveLength(435);
    expect(new Set(genreRuntime.combos.map((c) => c.key))).toEqual(new Set(allPairs));
    for (const id of NEW_IDS) {
      const genre = GENRES.find((g) => g.id === id);
      expect(genre, id).toBeTruthy();
      expect(genre!.label.length, id).toBeGreaterThan(2);
      expect(genre!.desc.length, id).toBeGreaterThan(20);
      expect(genre!.rd, id).toBeGreaterThan(0);
      expect(genreRuntime.combos.filter((c) => c.genre_1 === id || c.genre_2 === id), id).toHaveLength(29);
    }
  });

  it("gives every new genre strong, supportive and non-obvious pair tuning", () => {
    for (const id of NEW_IDS) {
      const rows = genreRuntime.combos.filter((c) => c.genre_1 === id || c.genre_2 === id);
      const classes = new Set(rows.map((c) => c.discovery_class));
      expect(classes.has("strong"), id).toBe(true);
      expect(classes.has("supportive"), id).toBe(true);
      expect(classes.has("experimental") || classes.has("risky"), id).toBe(true);
    }
    expect(comboMult(["monster_taming", "kaiju"])).toBeGreaterThan(1.2);
    expect(comboMult(["crime", "mystery"])).toBeGreaterThan(1.2);
    expect(comboMult(["kaiju", "mecha"])).toBeGreaterThan(1.2);
    expect(comboMult(["cosmic_horror", "space"])).toBeGreaterThan(1.2);
    expect(comboMult(["arabia", "fantasy"])).toBeGreaterThan(1.2);
  });

  it("keeps exactly 520 V6 portrait identities while casting is remapped independently", () => {
    expect(CAST_V2).toHaveLength(1440);
    expect(v6).toHaveLength(520);
    expect(new Set(v6.map((c) => c.id)).size).toBe(520);
    expect(new Set(v6.map((c) => c.name)).size).toBe(520);
    const oldNames = new Set(CAST_V2.filter((c) => !c.id.startsWith("g30_")).map((c) => c.name));
    expect(v6.every((c) => !oldNames.has(c.name))).toBe(true);
    for (const member of v6) expect(member.img, member.id).toBe(`cast/v6/${member.id}.webp`);
  });

  it("retains 65 V6 identities in each Role × Type source bucket without making V6 its own casting island", () => {
    for (const role of ["protag", "secondary", "pet", "villain"] as CastRole[]) {
      for (const type of TYPES) {
        const bucket = v6.filter((c) => c.role === role && c.type === type);
        expect(bucket, `${role}/${type}`).toHaveLength(65);
      }
    }
  });

  it("closes every new pair exactly once through the rebuilt global catalog", () => {
    for (const [role, members] of ROLES) {
      for (const type of TYPES) {
        const bucket = members.filter((member) => member.type === type && isCastingActive(member));
        for (const key of newPairs) {
          const owners = bucket.filter((member) => catalogPairKeys(member).includes(key));
          expect(owners, `${role}/${type}/${key}`).toHaveLength(1);
        }
      }
    }
  });

  it("adds 50 story arcs and 30 arc-combo chains with valid references", () => {
    expect(v6Arcs).toHaveLength(50);
    expect(v6Combos).toHaveLength(30);
    const allArcIds = new Set(ARCS.map((a) => a.id));
    for (const combo of ARC_COMBOS) for (const id of combo.arcs) expect(allArcIds.has(id), `${combo.id}/${id}`).toBe(true);
    for (const id of NEW_IDS) {
      expect(v6Arcs.filter((a) => a.syn?.includes(id) || a.anti?.includes(id) || a.unlock?.genre === id).length, id).toBeGreaterThanOrEqual(8);
    }
    for (let i = 0; i < NEW_IDS.length; i++) for (let j = i + 1; j < NEW_IDS.length; j++) {
      const a = NEW_IDS[i], b = NEW_IDS[j];
      expect(v6Arcs.some((arc) => arc.syn?.includes(a) && arc.syn?.includes(b)), `${a}+${b}`).toBe(true);
    }
  });

  it("has complete poster, audience and broadcast-slot presentation hooks", () => {
    for (const id of NEW_IDS) {
      expect(posterFontFor(id), id).toBeTruthy();
      expect(POSTER_DECOS[id].length, id).toBeGreaterThan(0);
      for (const audience of Object.values(AUDIENCES)) expect(Number.isFinite(audience.fit[id] ?? 1), `${audience.label}/${id}`).toBe(true);
    }
    expect(SLOTS.evening.best).toContain("monster_taming");
    expect(SLOTS.prime.best).toContain("kaiju");
    expect(SLOTS.midnight.best).toContain("crime");
    expect(SLOTS.midnight.best).toContain("cosmic_horror");
    expect(SLOTS.evening.best).toContain("arabia");
  });
});
