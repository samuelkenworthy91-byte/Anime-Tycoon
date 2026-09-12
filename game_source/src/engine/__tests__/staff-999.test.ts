import { describe, expect, it } from "vitest";
import { effectiveStaffSkill, STAFF_EFFECTIVE_SKILL_CAP, STAFF_STAT_CAP, type Staff } from "../data";
import { ensureCareer, gainXp, levelFromXp, levelTitle, MAX_LEVEL, XP_LEVELS } from "../careers";

const staff = (over: Partial<Staff> = {}): Staff => ({
  id: "mastery", name: "Mastery Worker", role: "writer", story: 99, art: 99, sound: 99,
  level: 12, salary: 2000, cost: 0, stamina: 100, portrait: 0, xp: XP_LEVELS[11],
  morale: 70, traits: [], spec: "w_action", favGenre: "sports", joinedWeek: 0, shows: [],
  awardsWon: 0, bestShow: null, ...over,
});

describe("999-level staff progression", () => {
  it("has 999 career levels and 999 raw craft caps", () => {
    expect(MAX_LEVEL).toBe(999);
    expect(STAFF_STAT_CAP).toBe(999);
    expect(XP_LEVELS).toHaveLength(999);
    expect(levelFromXp(XP_LEVELS[998])).toBe(999);
    expect(levelTitle(999)).toBe("Pinnacle");
  });

  it("keeps improving stats after the old 99 cap", () => {
    const nextXp = XP_LEVELS[12] - XP_LEVELS[11];
    const out = gainXp(staff(), nextXp);
    expect(out.staff.level).toBe(13);
    expect(out.staff.story + out.staff.art + out.staff.sound).toBeGreaterThan(297);
    expect(out.staff.pendingLevelUps).toHaveLength(1);
    expect(out.staff.pendingLevelUps![0].afterLevel).toBe(13);
  });

  it("honours XP banked by an old max-level save", () => {
    const migrated = ensureCareer(staff({ xp: XP_LEVELS[15] }), 400);
    expect(migrated.level).toBe(16);
    expect(migrated.story + migrated.art + migrated.sound).toBeGreaterThan(297);
    expect(migrated.potential).toBeGreaterThanOrEqual(1);
    expect(migrated.potential).toBeLessThanOrEqual(100);
  });

  it("preserves old balance through 99, then gives diminishing but real mastery returns", () => {
    expect(effectiveStaffSkill(60)).toBe(60);
    expect(effectiveStaffSkill(99)).toBe(99);
    expect(effectiveStaffSkill(150)).toBeGreaterThan(99);
    expect(effectiveStaffSkill(999)).toBeGreaterThan(200);
    expect(effectiveStaffSkill(999)).toBeLessThanOrEqual(STAFF_EFFECTIVE_SKILL_CAP);
  });
});
