import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { CAST_V2 } from "../data";

const ROOT = path.resolve(__dirname, "../../..");
const PORTRAITS = path.join(ROOT, "public", "cast", "v2");

describe("Cast V2 independent runtime portraits", () => {
  it("maps every canonical cast ID to one unique stable-ID-based WebP", () => {
    expect(CAST_V2).toHaveLength(192);
    expect(new Set(CAST_V2.map((member) => member.img)).size).toBe(192);
    for (const member of CAST_V2) {
      expect(member.img).toMatch(/^cast\/v2\/[a-z0-9_]+\.webp$/);
      expect(path.basename(member.img), member.id).toContain(`__${member.id}.webp`);
      expect("pos" in member, `${member.id} must not depend on a sprite-sheet position`).toBe(false);
    }
  });

  it("ships exactly 192 readable, non-empty runtime WebPs", () => {
    const files = readdirSync(PORTRAITS).filter((file) => file.endsWith(".webp")).sort();
    const expected = CAST_V2.map((member) => path.basename(member.img)).sort();
    expect(files).toEqual(expected);
    expect(files).toHaveLength(192);
    for (const file of files) {
      const target = path.join(PORTRAITS, file);
      expect(existsSync(target), file).toBe(true);
      expect(statSync(target).size, file).toBeGreaterThan(0);
    }
  });
});
