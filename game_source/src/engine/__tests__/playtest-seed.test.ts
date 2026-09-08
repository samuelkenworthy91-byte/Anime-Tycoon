import { describe, expect, it } from "vitest";
import { makeAwardsPlaytestSave } from "../playtestSeed";
import { advanceWeeks, type RunState } from "../state";

describe("Year 2 awards playtest save", () => {
  it("parks slot 3 exactly one in-game day before the Year 2 ceremony", () => {
    const save = makeAwardsPlaytestSave();
    const run = save.run as RunState;

    expect(run.week).toBe(95);
    expect(run.day).toBe(95 * 7 + 6);
    expect(run.awardsCeremony).toBeNull();
    expect(save.clock.dayCount).toBe(6);
    expect(save.clock.day).toBe(6);
  });

  it("contains a credible 8-9/10 player slate with frozen official poster drafts", () => {
    const run = makeAwardsPlaytestSave().run as RunState;

    expect(run.showsMade).toBeGreaterThanOrEqual(8);
    expect(run.yearShows).toHaveLength(4);
    expect(run.yearShows.every((show) => show.player)).toBe(true);
    expect(run.yearShows.every((show) => show.score >= 32 && show.score <= 36)).toBe(true);
    expect(run.yearShows.every((show) => show.draft?.title === show.title)).toBe(true);
    expect(run.yearShows.every((show) => show.draft?.protag === show.protag)).toBe(true);
    expect(run.yearShows.every((show) => JSON.stringify(show.draft?.genres) === JSON.stringify(show.genres))).toBe(true);
    expect(new Set(run.yearShows.map((show) => show.animeType))).toEqual(new Set(["shonen", "shojo"]));
  });

  it("opens a complete Year 2 ceremony on the following weekly boundary", () => {
    const save = makeAwardsPlaytestSave();
    const run = save.run as RunState;
    const next = advanceWeeks({ ...run, day: run.day + 1 }, 1, { liveDaysAlreadyApplied: true });

    expect(next.week).toBe(96);
    expect(next.awardsCeremony?.year).toBe(2);
    expect(next.awardsCeremony?.categories.map((category) => category.id)).toEqual(
      expect.arrayContaining(["writing", "animation", "score", "fanfav", "shonen", "shojo", "aoty"]),
    );
    expect(next.awardsCeremony?.categories.some((category) => category.nominees.some((nominee) => nominee.player))).toBe(true);
    const playerNominees = next.awardsCeremony?.categories.flatMap((category) => category.nominees).filter((nominee) => nominee.player) ?? [];
    expect(playerNominees.length).toBeGreaterThan(0);
    expect(playerNominees.every((nominee) => nominee.draft?.title === nominee.title)).toBe(true);
  });
});
