import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAST_V2, type AnimeType, type CastRole, type GenreId } from "../data";
import { filterCastByFilters } from "../castDisplayOrder";

const ROOT = path.resolve(__dirname, "../../..");
const v6 = CAST_V2.filter((member) => member.id.startsWith("g30_"));
const roles: CastRole[] = ["protag", "secondary", "pet", "villain"];
const types: AnimeType[] = ["shonen", "shojo"];
const requestedPairs: [GenreId, GenreId][] = [
  ["monster_taming", "crime"], ["monster_taming", "cosmic_horror"], ["monster_taming", "arabia"],
  ["crime", "cosmic_horror"], ["crime", "arabia"], ["kaiju", "cosmic_horror"],
  ["kaiju", "arabia"], ["cosmic_horror", "arabia"],
];

describe("cast portrait wiring regression gate", () => {
  it("passes the full source-to-runtime byte and metadata verifier", () => {
    expect(() => execFileSync(process.execPath, ["scripts/verify-cast-wiring.mjs"], { cwd: ROOT, stdio: "pipe" })).not.toThrow();
  });

  it("keeps every Genre 30 source sequence, identity and epithet unique", () => {
    expect(new Set(v6.map((member) => member.sourceManifestSequence)).size).toBe(520);
    expect(new Set(v6.map((member) => member.name)).size).toBe(520);
    expect(new Set(v6.map((member) => member.epithet)).size).toBe(520);
    expect(v6.some((member) => member.epithet === "The Ashen Viper")).toBe(false);
  });

  it("preserves the same canonical 65 affinity cells in all eight Role × Type buckets", () => {
    const reference = new Map(v6.filter((member) => member.role === "protag" && member.type === "shonen").map((member) => [member.id.slice(-3), [...member.visibleAff, member.hiddenAff]]));
    expect(reference.size).toBe(65);
    for (const role of roles) for (const type of types) {
      const bucket = v6.filter((member) => member.role === role && member.type === type);
      expect(bucket, `${role}/${type}`).toHaveLength(65);
      for (const member of bucket) expect([...member.visibleAff, member.hiddenAff], member.id).toEqual(reference.get(member.id.slice(-3)));
    }
  });

  it("returns exactly one curated V6 connection in every Role × Type cell", () => {
    for (const role of roles) for (const type of types) for (const [genreA, genreB] of requestedPairs) {
      const bucket = v6.filter((member) => member.role === role && member.type === type);
      const result = filterCastByFilters(bucket, [
        { kind: "type", value: type }, { kind: "genre", value: genreA }, { kind: "genre", value: genreB },
      ]);
      expect(result, `${role}/${type}/${genreA}+${genreB}`).toHaveLength(1);
      expect([...result[0].visibleAff, result[0].hiddenAff]).toEqual(expect.arrayContaining([genreA, genreB]));
      expect(result[0].castingPairKeys).toContain([genreA, genreB].sort().join("|"));
    }
  });

  it("balances all 135 Genre 30 connections and gives Cosmic Horror × Slice of Life two leads", () => {
    const pairKeys = new Set(v6.flatMap((member) => member.castingPairKeys ?? []));
    expect(pairKeys.size).toBe(135);
    for (const pairKey of pairKeys) {
      const [genreA, genreB] = pairKey.split("|") as [GenreId, GenreId];
      for (const role of roles) for (const type of types) {
        const bucket = v6.filter((member) => member.role === role && member.type === type);
        expect(filterCastByFilters(bucket, [{ kind: "genre", value: genreA }, { kind: "genre", value: genreB }]), `${role}/${type}/${pairKey}`).toHaveLength(1);
      }
    }
    const leads = filterCastByFilters(v6.filter((member) => member.role === "protag"), [
      { kind: "genre", value: "cosmic_horror" }, { kind: "genre", value: "slice" },
    ]);
    expect(leads).toHaveLength(2);
    expect(new Set(leads.map((member) => member.type))).toEqual(new Set(["shonen", "shojo"]));
  });

  it("keeps the committed full roster as the authoritative Genre 30 source", () => {
    const roster = readFileSync(path.join(ROOT, "docs/content-v6/GENRE30_CAST_ROSTER.csv"), "utf8");
    expect(roster.split(/\r?\n/).filter(Boolean)).toHaveLength(521);
    expect(roster).toContain("coverage_edges_this_member");
    expect(roster).toContain("concept_brief");
  });
});
