import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  DANTE_WORKER_LOOK_INDEX,
  STANDARD_WORKER_LOOK_COUNT,
  WORKER_LOOKS,
  rollCandidate,
  type Staff,
} from "../data";
import { applyDanteEasterEgg, DANTE_HIRE_CHANCE, DANTE_TRAITS, ensureCareer, rollHire, specDef } from "../careers";

const staff = (role: Staff["role"]): Staff => ({
  id: `test-${role}`,
  name: "Test",
  role,
  story: 30,
  art: 30,
  sound: 30,
  level: 1,
  salary: 100,
  cost: 1000,
  stamina: 100,
  portrait: 0,
  look: 0,
});

describe("new worker models and Dante easter egg", () => {
  it("wires all five committed sprite/portrait pairs", () => {
    for (let id = 28; id <= 32; id += 1) {
      for (const kind of ["sprite", "portrait"] as const) {
        const rel = `img/${kind}-worker-${id}.webp`;
        const abs = path.resolve(process.cwd(), "public", rel);
        expect(fs.existsSync(abs), rel).toBe(true);
        expect(fs.statSync(abs).size, rel).toBeGreaterThan(10_000);
      }
    }
    expect(WORKER_LOOKS.slice(26, 30)).toEqual([28, 29, 30, 31].map((id) => ({
      sprite: `img/sprite-worker-${id}.webp`,
      portrait: `img/portrait-worker-${id}.webp`,
    })));
    expect(WORKER_LOOKS[DANTE_WORKER_LOOK_INDEX]).toEqual({
      sprite: "img/sprite-worker-32.webp",
      portrait: "img/portrait-worker-32.webp",
    });
  });

  it("keeps Dante out of ordinary worker appearance rolls", () => {
    expect(STANDARD_WORKER_LOOK_COUNT).toBe(DANTE_WORKER_LOOK_INDEX);
    expect(DANTE_WORKER_LOOK_INDEX).toBe(30);
    for (let i = 0; i < 500; i += 1) {
      expect(rollCandidate(i).look).not.toBe(DANTE_WORKER_LOOK_INDEX);
    }
  });

  it("uses an exact one-percent Dante candidate chance", () => {
    expect(DANTE_HIRE_CHANCE).toBe(0.01);
    expect(rollHire(0, () => 0).name).toBe("Dante");
    expect(rollHire(0, () => 0.01).look).not.toBe(DANTE_WORKER_LOOK_INDEX);
  });

  it("migrates the legacy Dante Vale display name without changing the Dante worker identity", () => {
    const legacy = { ...applyDanteEasterEgg(staff("writer"), 0), name: "Dante Vale" };
    const migrated = ensureCareer(legacy, 0);
    expect(migrated.name).toBe("Dante");
    expect(migrated.look).toBe(DANTE_WORKER_LOOK_INDEX);
  });

  it.each(["writer", "animator", "composer"] as const)("makes a %s Dante roll elite and internally synergistic", (role) => {
    const dante = applyDanteEasterEgg(staff(role), 0);
    expect(dante.name).toBe("Dante");
    expect(dante.look).toBe(DANTE_WORKER_LOOK_INDEX);
    expect(dante.potential).toBe(100);
    expect(dante.traits).toEqual([...DANTE_TRAITS]);
    expect(dante.favGenre).toBe("martial");
    expect(specDef(dante.spec)?.genres).toContain("martial");
    const main = role === "writer" ? dante.story : role === "animator" ? dante.art : dante.sound;
    const offs = role === "writer" ? [dante.art, dante.sound] : role === "animator" ? [dante.story, dante.sound] : [dante.story, dante.art];
    expect(main).toBeGreaterThanOrEqual(140);
    expect(Math.min(...offs)).toBeGreaterThanOrEqual(95);
  });
});
