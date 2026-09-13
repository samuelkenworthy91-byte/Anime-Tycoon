from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "game_source"
IMG = GAME / "public" / "img"
PACK = ROOT / ".tmp_worker_art" / "worker-art-pack.tar.gz"

if not PACK.exists():
    raise SystemExit(f"Missing worker art pack: {PACK}")

with tarfile.open(PACK, "r:gz") as tf:
    names = tf.getnames()
    expected = [f"{kind}-worker-{i}.webp" for kind in ("sprite", "portrait") for i in range(28, 33)]
    missing = sorted(set(expected) - set(names))
    if missing:
        raise SystemExit(f"Art pack missing: {missing}")
    tf.extractall(IMG)

for name in expected:
    p = IMG / name
    if not p.exists() or p.stat().st_size < 10000:
        raise SystemExit(f"Invalid extracted asset: {p}")

# ---- data.ts: wire four normal new looks plus rare Dante look (32) ----
data_path = GAME / "src" / "engine" / "data.ts"
data = data_path.read_text(encoding="utf-8")
old = '''export const WORKER_LOOKS: WorkerLook[] = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27].map((n) => ({
  sprite: `img/sprite-worker-${n}.png`,
  portrait: `img/portrait-worker-${n}.png`,
}));
export const BOSS_LOOK: WorkerLook = {
  sprite: "img/sprite-worker-6.png",
  portrait: "img/portrait-worker-6.png",
};
/** Reserved model numbers for the four new worker paintings. They are deliberately
 * not activated in WORKER_LOOKS until their sprite+portrait files exist. */
export const PENDING_WORKER_ART_IDS = [28, 29, 30, 31] as const;'''
new = '''const BASE_WORKER_LOOK_IDS = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27] as const;
const NEW_WORKER_LOOK_IDS = [28, 29, 30, 31] as const;
export const WORKER_LOOKS: WorkerLook[] = [
  ...BASE_WORKER_LOOK_IDS.map((n) => ({
    sprite: `img/sprite-worker-${n}.png`,
    portrait: `img/portrait-worker-${n}.png`,
  })),
  ...NEW_WORKER_LOOK_IDS.map((n) => ({
    sprite: `img/sprite-worker-${n}.webp`,
    portrait: `img/portrait-worker-${n}.webp`,
  })),
  { sprite: "img/sprite-worker-32.webp", portrait: "img/portrait-worker-32.webp" },
];
/** Dante-inspired veteran is deliberately excluded from ordinary look rolls. */
export const DANTE_WORKER_LOOK_INDEX = WORKER_LOOKS.length - 1;
export const STANDARD_WORKER_LOOK_COUNT = DANTE_WORKER_LOOK_INDEX;
export const BOSS_LOOK: WorkerLook = {
  sprite: "img/sprite-worker-6.png",
  portrait: "img/portrait-worker-6.png",
};'''
if old not in data:
    raise SystemExit("Could not find legacy WORKER_LOOKS block")
data = data.replace(old, new, 1)
old_roll = '    look: (staffId + Math.floor(Math.random() * 3)) % WORKER_LOOKS.length,'
new_roll = '    look: (staffId + Math.floor(Math.random() * 3)) % STANDARD_WORKER_LOOK_COUNT,'
if old_roll not in data:
    raise SystemExit("Could not find standard worker look roll")
data = data.replace(old_roll, new_roll, 1)
data_path.write_text(data, encoding="utf-8")

# ---- careers.ts: exactly 1% rare roll, elite stats/potential, synergistic traits ----
career_path = GAME / "src" / "engine" / "careers.ts"
career = career_path.read_text(encoding="utf-8")
old_import = '''import {
  GENRES,
  ROLE_POINT,
  STAFF_STAT_CAP,
  rollCandidate,'''
new_import = '''import {
  DANTE_WORKER_LOOK_INDEX,
  GENRES,
  ROLE_POINT,
  STAFF_STAT_CAP,
  rollCandidate,'''
if old_import not in career:
    raise SystemExit("Could not patch careers import")
career = career.replace(old_import, new_import, 1)
old_hire = '''/** roll a fresh candidate with a full personality */
export function rollHire(week: number): Staff {
  return ensureCareer(rollCandidate(week), week);
}'''
new_hire = '''/** Hidden veteran worker: a true 1-in-100 easter egg, never part of the normal look pool. */
export const DANTE_HIRE_CHANCE = 0.01;
export const DANTE_TRAITS = ["team", "organizer", "prodigy", "ensemble"] as const;

export function applyDanteEasterEgg(s: Staff, week: number): Staff {
  const tier = Math.min(45, Math.max(0, week) * 0.16);
  const eliteMain = Math.min(STAFF_STAT_CAP, Math.round(140 + tier * 0.8));
  const eliteOff = Math.min(STAFF_STAT_CAP, Math.round(95 + tier * 0.55));
  return {
    ...s,
    look: DANTE_WORKER_LOOK_INDEX,
    potential: 100,
    traits: [...DANTE_TRAITS],
    story: Math.max(s.story, s.role === "writer" ? eliteMain : eliteOff),
    art: Math.max(s.art, s.role === "animator" ? eliteMain : eliteOff),
    sound: Math.max(s.sound, s.role === "composer" ? eliteMain : eliteOff),
  };
}

/** roll a fresh candidate with a full personality */
export function rollHire(week: number): Staff {
  const base = rollCandidate(week);
  const candidate = Math.random() < DANTE_HIRE_CHANCE ? applyDanteEasterEgg(base, week) : base;
  return ensureCareer(candidate, week);
}'''
if old_hire not in career:
    raise SystemExit("Could not find rollHire block")
career = career.replace(old_hire, new_hire, 1)
career_path.write_text(career, encoding="utf-8")

# ---- regression tests ----
test_path = GAME / "src" / "engine" / "__tests__" / "worker-easter-egg.test.ts"
test_path.write_text('''import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  DANTE_WORKER_LOOK_INDEX,
  STANDARD_WORKER_LOOK_COUNT,
  WORKER_LOOKS,
  rollCandidate,
  type Staff,
} from "../data";
import { applyDanteEasterEgg, DANTE_HIRE_CHANCE, DANTE_TRAITS } from "../careers";

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

describe("new worker models and veteran easter egg", () => {
  it("wires all five new sprite/portrait pairs", () => {
    for (let id = 28; id <= 32; id += 1) {
      for (const kind of ["sprite", "portrait"] as const) {
        const rel = `img/${kind}-worker-${id}.webp`;
        const abs = path.resolve(process.cwd(), "public", rel);
        expect(fs.existsSync(abs), rel).toBe(true);
        expect(fs.statSync(abs).size, rel).toBeGreaterThan(10_000);
      }
    }
    expect(WORKER_LOOKS[DANTE_WORKER_LOOK_INDEX]).toEqual({
      sprite: "img/sprite-worker-32.webp",
      portrait: "img/portrait-worker-32.webp",
    });
  });

  it("keeps Dante out of ordinary worker look rolls", () => {
    expect(STANDARD_WORKER_LOOK_COUNT).toBe(DANTE_WORKER_LOOK_INDEX);
    for (let i = 0; i < 500; i += 1) {
      expect(rollCandidate(i).look).not.toBe(DANTE_WORKER_LOOK_INDEX);
    }
  });

  it("sets the easter egg chance to exactly one percent", () => {
    expect(DANTE_HIRE_CHANCE).toBe(0.01);
  });

  it.each(["writer", "animator", "composer"] as const)("makes a %s Dante roll elite", (role) => {
    const dante = applyDanteEasterEgg(staff(role), 0);
    expect(dante.look).toBe(DANTE_WORKER_LOOK_INDEX);
    expect(dante.potential).toBe(100);
    expect(dante.traits).toEqual([...DANTE_TRAITS]);
    const main = role === "writer" ? dante.story : role === "animator" ? dante.art : dante.sound;
    const offs = role === "writer" ? [dante.art, dante.sound] : role === "animator" ? [dante.story, dante.sound] : [dante.story, dante.art];
    expect(main).toBeGreaterThanOrEqual(140);
    expect(Math.min(...offs)).toBeGreaterThanOrEqual(95);
  });
});
''', encoding="utf-8")

print("Five worker models wired; Dante easter egg configured at 1%")
