import { describe, expect, it } from "vitest";
import { awardNomineeKey, buildCeremony, type AwardNominee } from "../awards";
import { initRivalWorld, RIVAL_TITLE_BANK } from "../rivals";
import { rivalPosterById } from "../rivalPosters";

const nominee = (sourceId: string | null, title: string, studio = "Studio B"): AwardNominee => ({
  sourceId,
  title,
  studio,
  player: false,
  animeType: "shonen",
  genres: ["martial"],
  score: 32,
  story: 32,
  art: 32,
  sound: 32,
  audience: 12_000,
  posterId: null,
  draft: null,
  protag: null,
});

describe("awards ceremony polish", () => {
  it("never places the same production twice in one category", () => {
    const repeated = nominee("release-42", "One Punch Overtime");
    const ceremony = buildCeremony(2, [
      repeated,
      { ...repeated },
      nominee("release-43", "Kiss Note"),
      nominee("release-44", "Mobile Suit: Rent Is Due"),
      nominee("release-45", "Sailor Mood"),
    ]);
    for (const category of ceremony.categories) {
      const keys = category.nominees.map(awardNomineeKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("deduplicates legacy entries without source ids by studio and title", () => {
    const legacy = nominee(null, "Uppercut Academia");
    const category = buildCeremony(2, [legacy, { ...legacy }, nominee(null, "Blue Locker Room", "Studio C")]).categories[0];
    expect(category.nominees.filter((entry) => entry.title === "Uppercut Academia")).toHaveLength(1);
  });

  it("plans a rival year with unique, non-empty release titles across studios", () => {
    const world = initRivalWorld(0);
    const titles = world.studios.flatMap((studio) => studio.productions.map((production) => production.title));
    expect(titles.length).toBeGreaterThan(6);
    expect(titles.every((title) => title.trim().length >= 5)).toBe(true);
    expect(new Set(titles.map((title) => title.toLowerCase())).size).toBe(titles.length);
  });

  it("keeps rival title banks cool and clear of workplace gag spam", () => {
    const banned = /\b(payroll|overtime|deadline|rent|receipt|timesheet|intern|office|business|accountant|meeting|compliance|benefits|emails?|annual leave|lunch break)\b/i;
    const shonen = Object.values(RIVAL_TITLE_BANK.shonen).flatMap((titles) => titles ?? []);
    const shojo = Object.values(RIVAL_TITLE_BANK.shojo).flatMap((titles) => titles ?? []);
    expect(shonen.length).toBeGreaterThan(50);
    expect(shojo.length).toBeGreaterThan(50);
    expect([...shonen, ...shojo].some((title) => banned.test(title))).toBe(false);
    const shojoSet = new Set(shojo.map((title) => title.toLowerCase()));
    expect(shonen.filter((title) => shojoSet.has(title.toLowerCase()))).toEqual([]);
  });

  it("keeps rival poster Anime Type aligned with every generated production", () => {
    const world = initRivalWorld(0);
    const productions = world.studios.flatMap((studio) => studio.productions);
    for (const production of productions) {
      if (!production.posterId) continue;
      const poster = rivalPosterById(production.posterId);
      expect(poster).not.toBeNull();
      expect(poster?.animeTypes).toContain(production.animeType);
    }
  });
});
