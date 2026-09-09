import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { CAST_V2 } from "../data";

const ROOT = path.resolve(__dirname, "../../..");

describe("Cast V4 independent runtime portraits", () => {
  it("maps every canonical cast ID to one unique stable-ID-based WebP", () => {
    expect(CAST_V2).toHaveLength(736);
    expect(new Set(CAST_V2.map((member) => member.img)).size).toBe(736);
    for (const member of CAST_V2) {
      expect(member.img).toMatch(/^cast\/v[234]\/[a-z0-9_]+\.webp$/);
      expect(path.basename(member.img), member.id).toContain(`${member.id}.webp`);
      expect("pos" in member, `${member.id} must not depend on a sprite-sheet position`).toBe(false);
    }
  });

  it("ships exactly 736 readable, non-empty runtime WebPs", () => {
    const files = ["v2", "v3", "v4"].flatMap(v => readdirSync(path.join(ROOT, "public", "cast", v)).filter(f => f.endsWith(".webp")).map(f => `cast/${v}/${f}`)).sort();
    const expected = CAST_V2.map((member) => member.img).sort();
    expect(files).toEqual(expected);
    expect(files).toHaveLength(736);
    for (const file of files) {
      const target = path.join(ROOT, "public", file);
      expect(existsSync(target), file).toBe(true);
      expect(statSync(target).size, file).toBeGreaterThan(0);
    }
  });
});
