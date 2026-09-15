import { describe, expect, it } from "vitest";
import { initialRun } from "../state";
import { expansionOf } from "../studioExpansion";
import { advanceStaffStories, type StaffStory } from "../staffStories";
import { marketSalary, moraleXpMultiplier, personMod } from "../careers";
import type { Staff } from "../data";

const worker = (id: string, patch: Partial<Staff> = {}): Staff => ({ id, name: id, role: "writer", level: 1, story: 30, art: 20, sound: 20, salary: 500, cost: 5000, portrait: 0, stamina: 100, morale: 70, ...patch });

describe("passion-project people loop", () => {
  it("high morale improves XP velocity and softens salary demand", () => {
    const happy = worker("happy", { morale: 95 });
    const neutral = worker("neutral", { morale: 70 });
    expect(moraleXpMultiplier(happy)).toBeGreaterThan(moraleXpMultiplier(neutral));
    expect(marketSalary(happy)).toBeLessThan(marketSalary(neutral));
    const project = { id: "p", draft: { title: "x", medium: "tv", budget: "standard", scope: "standard", slot: "midnight", animeType: "shonen", genres: ["horror"], audience: "teens", protag: "kai", protagName: "Kai", secondary: "x", pet: "x", villain: "x", arcs: [], sliders: [50,50,50], season: 1 }, stage: "concept", staffIds: [], points: {story:0,art:0,sound:0}, issues:0 } as any;
    expect(personMod(happy, project, [], { bonds: {} }).xpMult).toBeGreaterThan(personMod(neutral, project, [], { bonds: {} }).xpMult);
  });

  it("completed mentorship closes a skill gap and transfers genre familiarity", () => {
    const mentor = worker("mentor", { level: 7, story: 95, favGenre: "horror", genreExperience: { horror: 8 } });
    const junior = worker("junior", { level: 1, story: 25, genreExperience: { horror: 0 } });
    let run = { ...initialRun("Mentors", "producer"), day: 0, week: 0, staff: [mentor, junior] };
    const story: StaffStory = { id: "mentoring", source: "test", kind: "mentorship", staffIds: [mentor.id, junior.id], openedDay: 0, expiresDay: 28, status: "active", title: "Mentor", text: "Test", decision: "mentor", progress: 7 };
    run = { ...run, expansion: { ...expansionOf(run), stories: [story] } };
    const next = advanceStaffStories(run);
    const trained = next.staff.find((s) => s.id === junior.id)!;
    expect(trained.story).toBeGreaterThan(junior.story);
    expect(trained.genreExperience?.horror ?? 0).toBeGreaterThan(0);
    expect(expansionOf(next).stories?.[0].status).toBe("resolved");
  });
});
