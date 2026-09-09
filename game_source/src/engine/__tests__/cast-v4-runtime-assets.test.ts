import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAST_V2 } from "../data";

const ROOT = path.resolve(__dirname, "../../..");
const v4 = CAST_V2.filter((member) => member.id.startsWith("v4_"));

function webpDimensions(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.subarray(0, 4).toString("ascii"), file).toBe("RIFF");
  expect(b.subarray(8, 12).toString("ascii"), file).toBe("WEBP");
  const kind = b.subarray(12, 16).toString("ascii");
  if (kind === "VP8 ") {
    expect(b.subarray(23, 26), file).toEqual(Buffer.from([0x9d, 0x01, 0x2a]));
    return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  }
  if (kind === "VP8L") {
    expect(b[20], file).toBe(0x2f);
    const bits = b.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  if (kind === "VP8X") {
    const width = 1 + b[24] + (b[25] << 8) + (b[26] << 16);
    const height = 1 + b[27] + (b[28] << 8) + (b[29] << 16);
    return [width, height];
  }
  throw new Error(`${file}: unsupported WebP chunk ${JSON.stringify(kind)}`);
}

describe("Cast V4 runtime asset gate", () => {
  it("integrates all 304 V4 records with no staging paths", () => {
    expect(v4).toHaveLength(304);
    for (const member of v4) {
      expect(member.img).toBe(`cast/v4/${member.id}.webp`);
      expect(member.img.includes("art_src/cast_v4_upload_staging"), member.id).toBe(false);
    }
  });

  it("ships every V4 portrait as an exact 512×512 WebP", () => {
    for (const member of v4) {
      const file = path.join(ROOT, "public", member.img);
      expect(existsSync(file), member.id).toBe(true);
      expect(webpDimensions(file), member.id).toEqual([512, 512]);
    }
  });

  it("introduces no V4 full-name collision", () => {
    const names = new Map<string, string[]>();
    for (const member of CAST_V2) {
      const ids = names.get(member.name) ?? [];
      ids.push(member.id);
      names.set(member.name, ids);
    }
    for (const member of v4) expect(names.get(member.name), member.name).toEqual([member.id]);
  });
});
