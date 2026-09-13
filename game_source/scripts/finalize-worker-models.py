from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "game_source"
IMG = GAME / "public" / "img"

# Assets are now committed directly to public/img by the user. Avoid archive
# transport entirely: the two previous failures were caused by a truncated
# temporary tarball, not by the artwork itself.
expected = [f"{kind}-worker-{i}.webp" for kind in ("sprite", "portrait") for i in range(28, 33)]
for name in expected:
    p = IMG / name
    if not p.exists() or p.stat().st_size < 10_000:
        raise SystemExit(f"Missing or invalid committed worker asset: {p}")

# ---- data.ts: four ordinary new looks plus rare Dante look (32) ----
data_path = GAME / "src" / "engine" / "data.ts"
data = data_path.read_text(encoding="utf-8")
legacy_looks = '''export const WORKER_LOOKS: WorkerLook[] = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27].map((n) => ({
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
new_looks = '''const BASE_WORKER_LOOK_IDS = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27] as const;
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
/** Dante-inspired veteran is deliberately excluded from ordinary appearance rolls. */
export const DANTE_WORKER_LOOK_INDEX = WORKER_LOOKS.length - 1;
export const STANDARD_WORKER_LOOK_COUNT = DANTE_WORKER_LOOK_INDEX;
export const BOSS_LOOK: WorkerLook = {
  sprite: "img/sprite-worker-6.png",
  portrait: "img/portrait-worker-6.png",
};'''
if legacy_looks in data:
    data = data.replace(legacy_looks, new_looks, 1)
elif "export const DANTE_WORKER_LOOK_INDEX = WORKER_LOOKS.length - 1;" not in data:
    raise SystemExit("Could not find worker-look block to patch")

legacy_roll = '    look: (staffId + Math.floor(Math.random() * 3)) % WORKER_LOOKS.length,'
new_roll = '    look: (staffId + Math.floor(Math.random() * 3)) % STANDARD_WORKER_LOOK_COUNT,'
if legacy_roll in data:
    data = data.replace(legacy_roll, new_roll, 1)
elif new_roll not in data:
    raise SystemExit("Could not find ordinary worker look roll")

data_path.write_text(data, encoding="utf-8")

# ---- careers.ts: true 1% rare hire, elite stats/potential and aligned traits ----
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
if old_import in career:
    career = career.replace(old_import, new_import, 1)
elif "  DANTE_WORKER_LOOK_INDEX," not in career:
    raise SystemExit("Could not patch careers import")

old_hire = '''/** roll a fresh candidate with a full personality */
export function rollHire(week: number): Staff {
  return ensureCareer(rollCandidate(week), week);
}'''
new_hire = '''/** Hidden veteran worker: a true 1-in-100 easter egg, never part of the normal look pool. */
export const DANTE_HIRE_CHANCE = 0.01;
export const DANTE_TRAITS = ["team", "reliable", "prodigy", "fanatic"] as const;

const danteSpecForRole = (role: StaffRole) =>
  role === "writer" ? "w_action" : role === "animator" ? "a_sakuga" : "c_battle";

export function applyDanteEasterEgg(s: Staff, week: number): Staff {
  const tier = Math.min(45, Math.max(0, week) * 0.16);
  const eliteMain = Math.min(STAFF_STAT_CAP, Math.round(140 + tier * 0.8));
  const eliteOff = Math.min(STAFF_STAT_CAP, Math.round(95 + tier * 0.55));
  return {
    ...s,
    name: "Dante Vale",
    look: DANTE_WORKER_LOOK_INDEX,
    potential: 100,
    traits: [...DANTE_TRAITS],
    favGenre: "martial",
    spec: danteSpecForRole(s.role),
    story: Math.max(s.story, s.role === "writer" ? eliteMain : eliteOff),
    art: Math.max(s.art, s.role === "animator" ? eliteMain : eliteOff),
    sound: Math.max(s.sound, s.role === "composer" ? eliteMain : eliteOff),
  };
}

/** roll a fresh candidate with a full personality */
export function rollHire(week: number, rng: () => number = Math.random): Staff {
  const base = rollCandidate(week);
  const candidate = rng() < DANTE_HIRE_CHANCE ? applyDanteEasterEgg(base, week) : base;
  return ensureCareer(candidate, week);
}'''
if old_hire in career:
    career = career.replace(old_hire, new_hire, 1)
elif "export const DANTE_HIRE_CHANCE = 0.01;" not in career:
    raise SystemExit("Could not find rollHire block")

career_path.write_text(career, encoding="utf-8")

# ---- update the existing content integration regression for the expanded pool ----
content_test_path = GAME / "src" / "engine" / "__tests__" / "content-v3.test.ts"
content_test = content_test_path.read_text(encoding="utf-8")
old_content_test = '''  it("adds eleven worker looks after the original fifteen", () => {
    expect(WORKER_LOOKS).toHaveLength(26);
    expect(WORKER_LOOKS[14].sprite).toContain("sprite-worker-16.png");
    expect(WORKER_LOOKS[15].sprite).toContain("sprite-worker-17.png");
    expect(WORKER_LOOKS[21].sprite).toContain("sprite-worker-23.png");
    expect(WORKER_LOOKS[22].sprite).toContain("sprite-worker-24.png");
    expect(WORKER_LOOKS[25].sprite).toContain("sprite-worker-27.png");
  });'''
new_content_test = '''  it("adds sixteen worker looks after the original fifteen", () => {
    expect(WORKER_LOOKS).toHaveLength(31);
    expect(WORKER_LOOKS[14].sprite).toContain("sprite-worker-16.png");
    expect(WORKER_LOOKS[15].sprite).toContain("sprite-worker-17.png");
    expect(WORKER_LOOKS[21].sprite).toContain("sprite-worker-23.png");
    expect(WORKER_LOOKS[22].sprite).toContain("sprite-worker-24.png");
    expect(WORKER_LOOKS[25].sprite).toContain("sprite-worker-27.png");
    expect(WORKER_LOOKS[26].sprite).toContain("sprite-worker-28.webp");
    expect(WORKER_LOOKS[29].sprite).toContain("sprite-worker-31.webp");
    expect(WORKER_LOOKS[30].sprite).toContain("sprite-worker-32.webp");
  });'''
if old_content_test in content_test:
    content_test = content_test.replace(old_content_test, new_content_test, 1)
elif 'expect(WORKER_LOOKS).toHaveLength(31);' not in content_test:
    raise SystemExit("Could not update content-v3 worker-count regression")
content_test_path.write_text(content_test, encoding="utf-8")

# ---- focused regression tests ----
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
import { applyDanteEasterEgg, DANTE_HIRE_CHANCE, DANTE_TRAITS, rollHire, specDef } from "../careers";

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
    expect(rollHire(0, () => 0).name).toBe("Dante Vale");
    expect(rollHire(0, () => 0.01).look).not.toBe(DANTE_WORKER_LOOK_INDEX);
  });

  it.each(["writer", "animator", "composer"] as const)("makes a %s Dante roll elite and internally synergistic", (role) => {
    const dante = applyDanteEasterEgg(staff(role), 0);
    expect(dante.name).toBe("Dante Vale");
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
''', encoding="utf-8")

print("Five worker models wired; Dante candidate configured at exactly 1%")
