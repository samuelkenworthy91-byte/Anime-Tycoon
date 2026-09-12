import { describe, expect, it } from "vitest";
import { initialRun, intensiveDevelop } from "../state";
import { MAX_LEVEL, XP_LEVELS, intensiveGainFor, intensiveRdCost, intensiveTargetXp, levelFromXp, levelTitle } from "../careers";
import { ROLE_POINT, type Staff } from "../data";

function staff(id: string, role: Staff["role"] = "writer"): Staff {
  return {
    id,
    name: id.toUpperCase(),
    role,
    story: 40,
    art: 30,
    sound: 20,
    level: 3,
    salary: 800,
    cost: 5_000,
    stamina: 80,
    portrait: 0,
    xp: XP_LEVELS[2] + 100, // mid level 3 [XP_LEVELS[2], XP_LEVELS[3])
    morale: 70,
    traits: [],
    spec: "w_comedy",
    joinedWeek: 0,
    favGenre: "comedy",
  };
}

describe("intensive development", () => {
  it("advances exactly one level through the canonical XP path", () => {
    const r = { ...initialRun("Intense", "steady"), rd: 500, staff: [staff("a")] };
    const before = r.staff[0];
    const out = intensiveDevelop(r, "a")!;
    const after = out.staff[0];
    expect(after.level).toBe(before.level + 1);
    expect(after.xp).toBe(XP_LEVELS[before.level]); // exactly the next threshold
    expect(levelFromXp(after.xp ?? 0)).toBe(after.level);
    expect(after.level).toBe(4);
    expect(levelTitle(after.level)).toBe("Key Staff");
  });

  it("stat growth comes from the same potential-driven gainXp roll", () => {
    const r = { ...initialRun("Intense", "steady"), rd: 500, staff: [staff("a", "writer")] };
    const before = r.staff[0];
    const after = intensiveDevelop(r, "a")!.staff[0];
    const gain = intensiveGainFor(before);
    expect(ROLE_POINT["writer"]).toBe("story");
    expect(after.story - before.story).toBe(gain.story);
    expect(after.art - before.art).toBe(gain.art);
    expect(after.sound - before.sound).toBe(gain.sound);
    expect((after.story-before.story)+(after.art-before.art)+(after.sound-before.sound)).toBeGreaterThanOrEqual(0);
    expect(after.pendingLevelUps).toHaveLength(1);
  });

  it("cost escalates with level and RD is spent", () => {
    expect(intensiveRdCost(1)).toBeLessThan(intensiveRdCost(5));
    const r = { ...initialRun("Intense", "steady"), rd: intensiveRdCost(3), staff: [staff("a")] };
    const out = intensiveDevelop(r, "a")!;
    expect(out.rd).toBe(0);
  });

  it("cannot be used at max level", () => {
    const s = { ...staff("a"), level: MAX_LEVEL, xp: XP_LEVELS[MAX_LEVEL - 1] };
    const r = { ...initialRun("Intense", "steady"), rd: 500, staff: [s] };
    expect(intensiveTargetXp(s)).toBeNull();
    expect(intensiveDevelop(r, "a")).toBeNull();
  });

  it("cannot be used without enough RD", () => {
    const r = { ...initialRun("Intense", "steady"), rd: 0, staff: [staff("a")] };
    expect(intensiveDevelop(r, "a")).toBeNull();
  });

  it("exactly hits the milestone XP, leaving a full level progress bar", () => {
    const s = { ...staff("a", "animator"), level: 2, xp: XP_LEVELS[1] + 40 }; // mid level 2
    const amount = intensiveTargetXp(s)!;
    expect(amount).toBe(XP_LEVELS[2] - XP_LEVELS[1] - 40);
    const r = { ...initialRun("Intense", "steady"), rd: 500, staff: [s] };
    const after = intensiveDevelop(r, "a")!.staff[0];
    expect(after.xp).toBe(XP_LEVELS[2]);
    expect(after.level).toBe(3);
  });
});
