import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_GENRE_IDS,
  CAST_V2,
  type AnimeType,
  type CastRole,
  type GenreId,
} from "../data";

type PendingCast = {
  id: string;
  role: CastRole;
  type: AnimeType;
  visibleAff: [GenreId, GenreId];
  hiddenAff: GenreId;
  filename: string;
};

const batchPaths = [
  "art_src/cast_v4_upload_staging/batch_01_001-080/CAST_V4_MECHANICS.csv",
  "art_src/cast_v4_upload_staging/batch_02_081-160/CAST_V4_MECHANICS.csv",
  "art_src/cast_v4_upload_staging/batch_03_161-240/CAST_V4_MECHANICS.csv",
  "art_src/cast_v4_upload_staging/batch_04_241-304/CAST_V4_MECHANICS.csv",
];

function readBatch(path: string): PendingCast[] {
  const lines = readFileSync(resolve(process.cwd(), path), "utf8").trim().split(/\r?\n/);
  expect(lines.shift()).toBe(
    "id,role,anime_type,visible_genre_1,visible_genre_2,hidden_genre,batch,filename",
  );
  return lines.map((line) => {
    const [id, role, type, g1, g2, hiddenAff, , filename] = line.split(",");
    return {
      id,
      role: role as CastRole,
      type: type as AnimeType,
      visibleAff: [g1 as GenreId, g2 as GenreId],
      hiddenAff: hiddenAff as GenreId,
      filename,
    };
  });
}

const pending = batchPaths.flatMap(readBatch);
const roles: CastRole[] = ["protag", "secondary", "pet", "villain"];
const types: AnimeType[] = ["shonen", "shojo"];
const affinities = (member: { visibleAff: [GenreId, GenreId]; hiddenAff: GenreId }) => [
  ...member.visibleAff,
  member.hiddenAff,
] as GenreId[];

const pairs: [GenreId, GenreId][] = CANONICAL_GENRE_IDS.flatMap((a, index) =>
  CANONICAL_GENRE_IDS.slice(index + 1).map((b) => [a, b] as [GenreId, GenreId]),
);

describe("Cast V4 staging mechanical manifest", () => {
  it("defines exactly 304 new stable IDs with valid three-affinity records", () => {
    expect(CAST_V2).toHaveLength(432);
    expect(pending).toHaveLength(304);
    expect(new Set(pending.map((member) => member.id)).size).toBe(304);
    expect(new Set(pending.map((member) => member.filename)).size).toBe(304);

    const existingIds = new Set(CAST_V2.map((member) => member.id));
    for (const member of pending) {
      expect(existingIds.has(member.id), member.id).toBe(false);
      expect(roles).toContain(member.role);
      expect(types).toContain(member.type);
      expect(member.filename).toMatch(new RegExp(`__${member.id}\\.png$`));
      const memberAffinities = affinities(member);
      expect(new Set(memberAffinities).size, member.id).toBe(3);
      for (const genre of memberAffinities) {
        expect(CANONICAL_GENRE_IDS, `${member.id}/${genre}`).toContain(genre);
      }
    }
  });

  it("matches the exact optimized additions per role/type bucket", () => {
    const expected: Record<string, number> = {
      "protag:shonen": 36,
      "protag:shojo": 41,
      "secondary:shonen": 35,
      "secondary:shojo": 38,
      "pet:shonen": 36,
      "pet:shojo": 40,
      "villain:shonen": 38,
      "villain:shojo": 40,
    };
    for (const role of roles) {
      for (const type of types) {
        expect(
          pending.filter((member) => member.role === role && member.type === type),
          `${role}:${type}`,
        ).toHaveLength(expected[`${role}:${type}`]);
      }
    }
  });

  it("would take the 432 live cast to 736 and close all 2,024 strict role/type pair cells", () => {
    const future = [...CAST_V2, ...pending];
    expect(future).toHaveLength(736);
    expect(new Set(future.map((member) => member.id)).size).toBe(736);
    expect(pairs).toHaveLength(253);

    let coveredCells = 0;
    for (const role of roles) {
      for (const type of types) {
        const members = future.filter((member) => member.role === role && member.type === type);
        for (const [genreA, genreB] of pairs) {
          const witness = members.some((member) => {
            const memberAffinities = affinities(member);
            return memberAffinities.includes(genreA) && memberAffinities.includes(genreB);
          });
          expect(witness, `${role}/${type}/${genreA}+${genreB}`).toBe(true);
          coveredCells += Number(witness);
        }
      }
    }
    expect(coveredCells).toBe(2024);
  });
});
