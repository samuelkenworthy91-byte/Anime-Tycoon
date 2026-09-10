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

type MechanicalCast = {
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

function readBatch(path: string): MechanicalCast[] {
  const lines = readFileSync(resolve(process.cwd(), path), "utf8").trim().split(/\r?\n/);
  expect(lines.shift()).toBe("id,role,anime_type,visible_genre_1,visible_genre_2,hidden_genre,batch,filename");
  return lines.map((line) => {
    const [id, role, type, g1, g2, hiddenAff, , filename] = line.split(",");
    return { id, role: role as CastRole, type: type as AnimeType, visibleAff: [g1 as GenreId, g2 as GenreId], hiddenAff: hiddenAff as GenreId, filename };
  });
}

const mechanics = batchPaths.flatMap(readBatch);
const roles: CastRole[] = ["protag", "secondary", "pet", "villain"];
const types: AnimeType[] = ["shonen", "shojo"];
const affinities = (member: { visibleAff: [GenreId, GenreId]; hiddenAff: GenreId }) => [...member.visibleAff, member.hiddenAff] as GenreId[];
const pairs: [GenreId, GenreId][] = CANONICAL_GENRE_IDS.flatMap((a, index) => CANONICAL_GENRE_IDS.slice(index + 1).map((b) => [a, b] as [GenreId, GenreId]));

describe("Cast V4 canonical mechanics after runtime integration", () => {
  it("keeps exactly 304 locked V4 stable IDs inside the expanded 1,440-member live roster", () => {
    expect(mechanics).toHaveLength(304);
    expect(new Set(mechanics.map((member) => member.id)).size).toBe(304);
    expect(new Set(mechanics.map((member) => member.filename)).size).toBe(304);
    expect(CAST_V2).toHaveLength(1440);
    expect(new Set(CAST_V2.map((member) => member.id)).size).toBe(1440);

    const liveById = new Map(CAST_V2.map((member) => [member.id, member]));
    for (const expected of mechanics) {
      const actual = liveById.get(expected.id);
      expect(actual, expected.id).toBeTruthy();
      expect(actual!.role, expected.id).toBe(expected.role);
      expect(actual!.type, expected.id).toBe(expected.type);
      expect(actual!.visibleAff, expected.id).toEqual(expected.visibleAff);
      expect(actual!.hiddenAff, expected.id).toBe(expected.hiddenAff);
      expect(actual!.img, expected.id).toBe(`cast/v4/${expected.id}.webp`);
      const memberAffinities = affinities(actual!);
      expect(new Set(memberAffinities).size, expected.id).toBe(3);
      for (const genre of memberAffinities) expect(CANONICAL_GENRE_IDS, `${expected.id}/${genre}`).toContain(genre);
    }
  });

  it("retains the exact optimized V4 additions per role/type bucket", () => {
    const expected: Record<string, number> = {
      "protag:shonen": 36, "protag:shojo": 41,
      "secondary:shonen": 35, "secondary:shojo": 38,
      "pet:shonen": 36, "pet:shojo": 40,
      "villain:shonen": 38, "villain:shojo": 40,
    };
    for (const role of roles) for (const type of types) {
      expect(mechanics.filter((member) => member.role === role && member.type === type), `${role}:${type}`).toHaveLength(expected[`${role}:${type}`]);
    }
  });

  it("permanently closes all 3,480 strict role/type genre-pair cells", () => {
    expect(pairs).toHaveLength(435);
    let coveredCells = 0;
    for (const role of roles) for (const type of types) {
      const members = CAST_V2.filter((member) => member.role === role && member.type === type);
      for (const [genreA, genreB] of pairs) {
        const witness = members.some((member) => {
          const memberAffinities = affinities(member);
          return memberAffinities.includes(genreA) && memberAffinities.includes(genreB);
        });
        expect(witness, `${role}/${type}/${genreA}+${genreB}`).toBe(true);
        coveredCells += Number(witness);
      }
    }
    expect(coveredCells).toBe(3480);
  });
});
