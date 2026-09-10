import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { CAST_V2 } from "../data";

const ROOT = path.resolve(__dirname, "../../..");

describe("independent runtime cast portraits", () => {
  it("maps every canonical cast ID to one unique stable-ID-based portrait", () => {
    expect(CAST_V2).toHaveLength(920);
    expect(new Set(CAST_V2.map((member) => member.img)).size).toBe(920);
    for (const member of CAST_V2) {
      if (member.id.startsWith("vg_")) {
        expect(member.img, member.id).toBe(`cast/v5/${member.id}.png`);
      } else {
        expect(member.img).toMatch(/^cast\/v[234]\/[a-z0-9_]+\.webp$/);
        expect(path.basename(member.img), member.id).toContain(`${member.id}.webp`);
      }
      expect("pos" in member, `${member.id} must not depend on a sprite-sheet position`).toBe(false);
    }
  });

  it("ships exactly 920 readable, non-empty runtime portraits", () => {
    const files = ["v2", "v3", "v4", "v5"].flatMap(v =>
      readdirSync(path.join(ROOT, "public", "cast", v))
        .filter(f => f.endsWith(".webp") || f.endsWith(".png"))
        .map(f => `cast/${v}/${f}`)
    ).sort();
    const expected = CAST_V2.map((member) => member.img).sort();
    expect(files).toEqual(expected);
    expect(files).toHaveLength(920);
    for (const file of files) {
      const target = path.join(ROOT, "public", file);
      expect(existsSync(target), file).toBe(true);
      expect(statSync(target).size, file).toBeGreaterThan(0);
    }
  });
});
