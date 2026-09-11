import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_GENRE_IDS,
  CAST_V2,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  VILLAINS,
  type AnimeType,
  type CastMember,
  type CastRole,
  type GenreId,
} from "../data";
import { catalogPairKeys, isCastingActive } from "../castCatalog";

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
const roles: [CastRole, CastMember[]][] = [
  ["protag", PROTAGONISTS],
  ["secondary", SECONDARY],
  ["pet", PETS],
  ["villain", VILLAINS],
];
const types: AnimeType[] = ["shonen", "shojo"];
const pairKeys = CANONICAL_GENRE_IDS.flatMap((a, index) =>
  CANONICAL_GENRE_IDS.slice(index + 1).map((b) => [a, b].sort().join("|")),
);

describe("Cast V4 identity after catalog rebuild", () => {
  it("keeps exactly 304 locked V4 stable identities and portrait paths inside the 1,440-member archive", () => {
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
      expect(actual!.img, expected.id).toBe(`cast/v4/${expected.id}.webp`);
    }
  });

  it("retains the exact V4 source additions per role/type bucket as art provenance", () => {
    const expected: Record<string, number> = {
      "protag:shonen": 36, "protag:shojo": 41,
      "secondary:shonen": 35, "secondary:shojo": 38,
      "pet:shonen": 36, "pet:shojo": 40,
      "villain:shonen": 38, "villain:shojo": 40,
    };
    for (const role of ["protag", "secondary", "pet", "villain"] as CastRole[]) {
      for (const type of types) {
        expect(mechanics.filter((member) => member.role === role && member.type === type), `${role}:${type}`)
          .toHaveLength(expected[`${role}:${type}`]);
      }
    }
  });

  it("closes all 3,480 role/type pair cells exactly once through the rebuilt catalog", () => {
    expect(pairKeys).toHaveLength(435);
    let ownedCells = 0;
    for (const [role, members] of roles) {
      for (const type of types) {
        const bucket = members.filter((member) => member.type === type && isCastingActive(member));
        expect(bucket, `${role}/${type}`).toHaveLength(155);
        for (const key of pairKeys) {
          const owners = bucket.filter((member) => catalogPairKeys(member).includes(key));
          expect(owners, `${role}/${type}/${key}`).toHaveLength(1);
          ownedCells += 1;
        }
      }
    }
    expect(ownedCells).toBe(3480);
  });
});
