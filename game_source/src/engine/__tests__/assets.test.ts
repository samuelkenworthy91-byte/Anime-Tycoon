import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";
import {
  WORKER_LOOKS,
  BOSS_LOOK,
  SHOWRUNNERS,
  PROTAGONISTS,
  SECONDARY,
  PETS,
  VILLAINS,
} from "../data";

/*
 * Every portrait/sprite referenced from game data (or a src literal) must
 * ship in public/img — a missing file renders silently blank in-game
 * (the <img>'s onError hides it), which is exactly how the roster art
 * went missing before. This test fails loudly instead.
 */

const ROOT = path.resolve(__dirname, "../../.."); // game_source/
const PUBLIC = path.join(ROOT, "public");

function collectRefs(): string[] {
  const refs = new Set<string>();
  const add = (p?: string | null) => {
    if (p) refs.add(p.replace(/^\//, ""));
  };
  for (const look of WORKER_LOOKS) {
    add(look.sprite);
    add(look.portrait);
  }
  add(BOSS_LOOK.sprite);
  add(BOSS_LOOK.portrait);
  for (const s of SHOWRUNNERS) {
    add(s.img);
    add(s.sprite);
    add(s.portrait);
  }
  // staff sprite sheets are used by the staff HUD
  for (const f of readdirSync(path.join(PUBLIC, "img"))) {
    if (f.startsWith("staff-") && f.endsWith(".png")) refs.add(`img/${f}`);
  }
  for (const m of [...PROTAGONISTS, ...SECONDARY, ...PETS, ...VILLAINS]) add(m.img);

  // string literals in components ("img/…", "/img/…") — scenes, logos…
  const scan = (dir: string) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== "node_modules" && !ent.name.startsWith(".")) scan(full);
      } else if (/\.(tsx?|jsx?|css)$/.test(ent.name)) {
        const src = readFileSync(full, "utf8");
        for (const m of src.matchAll(/["'`](\/?img\/[\w\-./]+\.(?:png|jpg|jpeg|webp|mp4|json))["'`]/g)) {
          refs.add(m[1].replace(/^\//, ""));
        }
      }
    }
  };
  scan(path.join(ROOT, "src"));
  return [...refs].sort();
}

describe("installed art assets", () => {
  const refs = collectRefs();
  it("finds a meaningful number of references", () => {
    expect(refs.length).toBeGreaterThan(40);
  });

  const byDir = new Map<string, string[]>();
  for (const r of refs) {
    const d = path.dirname(r);
    if (!byDir.has(d)) byDir.set(d, []);
    byDir.get(d)!.push(r);
  }

  for (const [dir, files] of byDir) {
    it(`all ${dir}/ references exist and are non-empty`, () => {
      const missing = files.filter((f) => {
        const p = path.join(PUBLIC, f);
        return !existsSync(p) || statSync(p).size === 0;
      });
      expect(missing, `missing/empty assets:\n${missing.join("\n")}`).toEqual([]);
    });
  }
});
