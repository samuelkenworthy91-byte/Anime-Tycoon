import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  AVRIL_WORKER_LOOK_INDEX,
  DANTE_WORKER_LOOK_INDEX,
  STANDARD_WORKER_LOOK_COUNT,
  STANDARD_WORKER_LOOK_INDICES,
  WORKER_LOOKS,
  rollCandidate,
  workerLook,
  workerLookIndex,
  type Staff,
} from "../data";
import {
  applyAvrilEasterEgg,
  applyDanteEasterEgg,
  AVRIL_HIRE_CHANCE,
  AVRIL_TRAITS,
  DANTE_HIRE_CHANCE,
  DANTE_TRAITS,
  ensureCareer,
  rollHire,
  specDef,
} from "../careers";

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

afterEach(() => vi.restoreAllMocks());

describe("worker art expansion and special hires", () => {
  it("wires every committed sprite and portrait path", () => {
    for (let id = 28; id <= 42; id += 1) {
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
    expect(WORKER_LOOKS.slice(31)).toEqual(Array.from({ length: 10 }, (_, offset) => {
      const id = 33 + offset;
      return { sprite: `img/sprite-worker-${id}.webp`, portrait: `img/portrait-worker-${id}.webp` };
    }));
  });

  it("keeps every pre-expansion worker look index stable for old saves", () => {
    const oldIds = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
    const expected = [
      ...oldIds.map((id) => ({ sprite: `img/sprite-worker-${id}.png`, portrait: `img/portrait-worker-${id}.png` })),
      ...[28, 29, 30, 31, 32].map((id) => ({ sprite: `img/sprite-worker-${id}.webp`, portrait: `img/portrait-worker-${id}.webp` })),
    ];
    expect(WORKER_LOOKS.slice(0, 31)).toEqual(expected);
    for (let look = 0; look <= DANTE_WORKER_LOOK_INDEX; look += 1) {
      const migrated = ensureCareer({ ...staff("writer"), id: `legacy-${look}`, look }, 100);
      expect(migrated.look).toBe(look);
      expect(workerLookIndex(migrated)).toBe(look);
      expect(workerLook(migrated)).toEqual(expected[look]);
    }
    expect(workerLookIndex({ ...staff("writer"), look: undefined, portrait: 15 })).toBe(15);
  });

  it("rolls every ordinary new look while excluding both special-hire looks", () => {
    expect(DANTE_WORKER_LOOK_INDEX).toBe(30);
    expect(AVRIL_WORKER_LOOK_INDEX).toBe(33);
    expect(STANDARD_WORKER_LOOK_COUNT).toBe(39);
    expect(STANDARD_WORKER_LOOK_INDICES).not.toContain(DANTE_WORKER_LOOK_INDEX);
    expect(STANDARD_WORKER_LOOK_INDICES).not.toContain(AVRIL_WORKER_LOOK_INDEX);
    expect(STANDARD_WORKER_LOOK_INDICES.filter((index) => index >= 31)).toEqual([31, 32, 34, 35, 36, 37, 38, 39, 40]);

    vi.spyOn(Math, "random").mockReturnValue(0);
    const rolled = new Set(Array.from({ length: STANDARD_WORKER_LOOK_COUNT }, (_, week) => rollCandidate(week).look));
    expect([...rolled].sort((a, b) => (a ?? -1) - (b ?? -1))).toEqual([...STANDARD_WORKER_LOOK_INDICES]);
  });

  it("gives Dante and Avril separate exact one-percent hire windows", () => {
    expect(DANTE_HIRE_CHANCE).toBe(0.01);
    expect(AVRIL_HIRE_CHANCE).toBe(0.01);
    expect(rollHire(0, () => 0).name).toBe("Dante");
    expect(rollHire(0, () => 0.009999).look).toBe(DANTE_WORKER_LOOK_INDEX);
    expect(rollHire(0, () => 0.01).name).toBe("Avril");
    expect(rollHire(0, () => 0.019999).look).toBe(AVRIL_WORKER_LOOK_INDEX);
    const ordinary = rollHire(0, () => 0.02);
    expect(ordinary.look).not.toBe(DANTE_WORKER_LOOK_INDEX);
    expect(ordinary.look).not.toBe(AVRIL_WORKER_LOOK_INDEX);
  });

  it("migrates the legacy Dante Vale display name without changing Dante's identity", () => {
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

  it.each(["writer", "animator", "composer"] as const)("makes a %s Avril roll elite, shojo-focused and art-locked", (role) => {
    const avril = applyAvrilEasterEgg(staff(role), 0);
    expect(avril.name).toBe("Avril");
    expect(avril.look).toBe(AVRIL_WORKER_LOOK_INDEX);
    expect(avril.potential).toBe(100);
    expect(avril.traits).toEqual([...AVRIL_TRAITS]);
    expect(specDef(avril.spec)?.genres).toEqual(expect.arrayContaining(["romance", "idol"]));
    expect(workerLook(avril)).toEqual({
      sprite: "img/sprite-worker-35.webp",
      portrait: "img/portrait-worker-35.webp",
    });
    expect(ensureCareer({ ...avril, look: 0 }, 0).look).toBe(AVRIL_WORKER_LOOK_INDEX);
    const main = role === "writer" ? avril.story : role === "animator" ? avril.art : avril.sound;
    const offs = role === "writer" ? [avril.art, avril.sound] : role === "animator" ? [avril.story, avril.sound] : [avril.story, avril.art];
    expect(main).toBeGreaterThanOrEqual(140);
    expect(Math.min(...offs)).toBeGreaterThanOrEqual(95);
  });
});
