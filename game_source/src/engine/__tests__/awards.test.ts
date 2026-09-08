import { describe, expect, it, vi } from "vitest";
import {
  AWARD_CATEGORIES,
  buildCeremony,
  ceremonyPlayerPrize,
  playerCraftFor,
  rivalCraftFor,
  rivalNominee,
  PRESENTATION_ORDER,
  type AwardNominee,
} from "../awards";
import { runCeremony, initialRun, advanceWeeks, releaseProject, startProject, type RunState } from "../state";
import { initRivalWorld, tickRivalWeek, yearRivalReleases } from "../rivals";
import type { GenreId } from "../data";

/* ------------------------------------------------------------ helpers */

const mk = (o: Partial<AwardNominee>): AwardNominee => ({
  title: "Show",
  studio: "Studio",
  player: false,
  animeType: "shonen",
  genres: ["action" as GenreId],
  score: 20,
  story: 20,
  art: 20,
  sound: 20,
  audience: 10_000,
  posterId: null,
  protag: null,
  ...o,
});

const SLATE: AwardNominee[] = [
  mk({ title: "Alpha Clash", studio: "Toe-i Frontier", score: 31, story: 44, art: 30, sound: 25, audience: 50_000 }),
  mk({ title: "Blade Days", studio: "Sunnyrise", score: 27, story: 22, art: 40, sound: 18, audience: 30_000 }),
  mk({ title: "Crimson Howl", studio: "Boneworks", score: 25, story: 33, art: 28, sound: 21, audience: 22_000 }),
  mk({ title: "Dawn Robo", studio: "Kyo-Hani", score: 22, story: 20, art: 20, sound: 19, audience: 18_000 }),
  mk({ title: "Even Flow", studio: "Madcap House", score: 19, story: 18, art: 19, sound: 17, audience: 15_000 }),
  mk({ title: "Fractal Girl", studio: "Turtle Line", animeType: "shojo", score: 29, story: 30, art: 32, sound: 38, audience: 44_000 }),
  mk({ title: "Glass Petal", studio: "Kyo-Hani", animeType: "shojo", score: 24, story: 28, art: 25, sound: 30, audience: 33_000 }),
  mk({
    title: "MY HERO PUNCH", studio: "Player Co", player: true, score: 26,
    story: 41, art: 18, sound: 14, audience: 90_000, protag: "hokai",
  }),
];

/* ------------------------------------------------------- category set */

describe("the London Anime Awards — category set", () => {
  it("has exactly the seven required categories in the required order of the pantheon", () => {
    const names = AWARD_CATEGORIES.map((c) => c.name);
    expect(names).toEqual([
      "Anime of the Year",
      "Best Shonen",
      "Best Shojo",
      "Best Writing",
      "Best Animation",
      "Best Original Score",
      "Fan Favourite",
    ]);
  });

  it("pays out exactly the tiered prizes — no flat £25k anywhere", () => {
    const by = Object.fromEntries(AWARD_CATEGORIES.map((c) => [c.id, c]));
    expect(by.aoty.cash).toBe(20_000);
    expect(by.aoty.fans).toBe(1_500);
    expect(by.shonen.cash).toBe(12_500);
    expect(by.shonen.fans).toBe(750);
    expect(by.shojo.cash).toBe(12_500);
    expect(by.shojo.fans).toBe(750);
    for (const id of ["writing", "animation", "score"] as const) {
      expect(by[id].cash).toBe(5_000);
      expect(by[id].fans).toBe(250);
    }
    expect(by.fanfav.cash).toBe(5_000);
    expect(by.fanfav.fans).toBe(1_000);
    expect(AWARD_CATEGORIES.some((c) => c.cash === 25_000)).toBe(false);
  });

  it("presents Anime of the Year LAST as the super-finale", () => {
    expect(PRESENTATION_ORDER[PRESENTATION_ORDER.length - 1]).toBe("aoty");
    const c = buildCeremony(1, SLATE);
    expect(c.presentation[c.presentation.length - 1]).toBe("aoty");
  });
});

/* ------------------------------------------------------------- judging */

describe("ceremony judging", () => {
  it("about four nominees per category, never more than 4", () => {
    const c = buildCeremony(1, SLATE);
    for (const cat of c.categories) {
      expect(cat.nominees.length).toBeGreaterThanOrEqual(2);
      expect(cat.nominees.length).toBeLessThanOrEqual(4);
    }
    expect(c.categories).toHaveLength(7);
  });

  it("is fully deterministic — no dice anywhere, identical across builds", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValueOnce(0.9);
    const a = buildCeremony(1, SLATE);
    spy.mockRestore();
    const b = vi.spyOn(Math, "random").mockReturnValueOnce(0.1) ? buildCeremony(1, SLATE) : null;
    expect(JSON.parse(JSON.stringify(b))).toEqual(JSON.parse(JSON.stringify(a)));
    vi.restoreAllMocks();
  });

  it("ties break by score, then audience, then title — stable and spelled out", () => {
    // equal story → Best Writing goes to higher score...
    const tie = buildCeremony(1, [
      mk({ title: "Zed", score: 25, story: 33 }),
      mk({ title: "Alpha", score: 30, story: 33 }),
    ]);
    expect(tie.categories.find((c) => c.id === "writing")!.winner.title).toBe("Alpha");
    // ...equal score too → higher audience...
    const tie2 = buildCeremony(1, [
      mk({ title: "Zed", score: 30, story: 33, audience: 5 }),
      mk({ title: "Beta", score: 30, story: 33, audience: 50 }),
    ]);
    expect(tie2.categories.find((c) => c.id === "writing")!.winner.title).toBe("Beta");
    // ...all equal → alphabetical title
    const tie3 = buildCeremony(1, [
      mk({ title: "Zed", score: 30, story: 33, audience: 50 }),
      mk({ title: "Ace", score: 30, story: 33, audience: 50 }),
    ]);
    expect(tie3.categories.find((c) => c.id === "writing")!.winner.title).toBe("Ace");
  });

  it("Best Shonen and Best Shojo judge only their own field", () => {
    const c = buildCeremony(1, SLATE);
    const shonen = c.categories.find((x) => x.id === "shonen")!;
    const shojo = c.categories.find((x) => x.id === "shojo")!;
    expect(shonen.nominees.every((n) => n.animeType === "shonen")).toBe(true);
    expect(shojo.nominees.every((n) => n.animeType === "shojo")).toBe(true);
    expect(shonen.winner.title).toBe("Alpha Clash");
    expect(shojo.winner.title).toBe("Fractal Girl");
  });

  it("craft awards follow craft strengths, not overall score", () => {
    const c = buildCeremony(1, SLATE);
    expect(c.categories.find((x) => x.id === "writing")!.winner.title).toBe("Alpha Clash"); // story 44
    expect(c.categories.find((x) => x.id === "animation")!.winner.title).toBe("Blade Days"); // art 40
    expect(c.categories.find((x) => x.id === "score")!.winner.title).toBe("Fractal Girl"); // sound 38
  });

  it("Fan Favourite follows audience; the player can win it fairly", () => {
    const c = buildCeremony(1, SLATE);
    const fav = c.categories.find((x) => x.id === "fanfav")!;
    expect(fav.winner.player).toBe(true);
    expect(fav.winner.title).toBe("MY HERO PUNCH");
  });

  it("aggregates the player's tiered prize ONCE into playerCash/playerFans", () => {
    const c = buildCeremony(1, SLATE);
    /* My Hero Punch wins: Fan Favourite (£5k/+1000) + Best Writing (story
       41 vs Alpha's 44 → actually no). Recompute honestly from the slate. */
    expect(c.playerCash).toBe(c.playerWins.reduce((a, w) => a + w.cash, 0));
    expect(c.playerFans).toBe(c.playerWins.reduce((a, w) => a + w.fans, 0));
    expect(c.playerAwards).toBe(c.playerWins.length);
    expect(ceremonyPlayerPrize(c)).toEqual({ cash: c.playerCash, fans: c.playerFans });
  });

  it("AOTY jackpot lands exactly once for a player sweep", () => {
    const c = buildCeremony(1, [mk({ title: "Mine", player: true, studio: "Player Co", score: 39, audience: 999_999 })]);
    expect(c.categories.find((x) => x.id === "aoty")!.winner.player).toBe(true);
    /* aoty + fanfav + 3 craft = 5 categories (no shojo field, shonen eligible) */
    const win = c.playerWins.find((w) => w.category === "aoty")!;
    expect(win.cash).toBe(20_000);
    expect(win.fans).toBe(1_500);
  });
});

/* ----------------------------------------------------- craft strengths */

describe("craft strengths", () => {
  it("player craft mirrors the REAL Story/Art/Sound point mix", () => {
    const c = playerCraftFor(30, { story: 8, art: 3, sound: 1 });
    expect(c.story).toBeGreaterThan(c.art);
    expect(c.art).toBeGreaterThan(c.sound);
    /* an even mix converges on the score itself */
    const even = playerCraftFor(30, { story: 1, art: 1, sound: 1 });
    expect(Math.abs(even.story - even.art)).toBeLessThan(0.5);
  });

  it("rival craft is persona-shaped, not score×3 copies", () => {
    const prestige = rivalCraftFor("prestige", 30, "p1");
    const idol = rivalCraftFor("idol", 30, "p1");
    const technical = rivalCraftFor("technical", 30, "p1");
    /* prestige leans to writing, idol to soundtrack, technical to animation */
    expect(prestige.story).toBeGreaterThan(idol.story);
    expect(idol.sound).toBeGreaterThan(technical.sound);
    expect(technical.art).toBeGreaterThan(prestige.art);
    /* and they aren't just three copies of the overall */
    expect(prestige.story).not.toBe(prestige.art);
  });

  it("rival craft is deterministic per production id", () => {
    expect(rivalCraftFor("experimental", 25, "showA")).toEqual(rivalCraftFor("experimental", 25, "showA"));
    expect(rivalCraftFor("experimental", 25, "showA")).not.toEqual(rivalCraftFor("experimental", 25, "showB"));
  });
});

/* ------------------------------------------- integration with the live sim */

describe("ceremony integration", () => {
  it("yearRivalReleases carry craft + poster identity ready for the ceremony", () => {
    let world = initRivalWorld(0);
    world = { ...world, studios: world.studios.map((s) => ({ ...s, status: "active" })) };
    for (let w = 1; w <= 48; w++) {
      const t = tickRivalWeek(world, w, { playerAiringGenres: new Set() });
      world = t.world;
    }
    const rels = yearRivalReleases(world, 1);
    expect(rels.length).toBeGreaterThan(0);
    for (const r of rels) {
      expect(r.craft.story).toBeGreaterThan(0);
      expect(r.craft.art).toBeGreaterThan(0);
      expect(r.craft.sound).toBeGreaterThan(0);
      expect(() => rivalNominee(r)).not.toThrow();
      expect(rivalNominee(r).posterId === null || typeof rivalNominee(r).posterId === "string").toBe(true);
      expect(rivalNominee(r).draft).toBeNull();
    }
  });

  it("a full run year produces player nominees with REAL release metrics", () => {
    let r: RunState = {
      ...initialRun("T", "steady"),
      cash: 50_000_000, rd: 500, officeLevel: 4,
      mediumsUnlocked: ["fanweb", "ona", "tv", "ova", "special", "movie"],
      staff: initialRun("T", "steady").staff.slice(0, 2),
    };
    const d = {
      title: "Award Bait Zero", genres: ["sports" as GenreId], medium: "tv" as const, budget: "indie" as const,
      slot: "midnight" as const, animeType: "shonen" as const, audience: "teens" as const,
      protag: "hero", protagName: "Aki", secondary: "", pet: "", villain: "",
      arcs: [], sliders: [60, 60, 50] as [number, number, number], season: 1,
    };
    r = startProject(r, d)!;
    const id = r.projects[0].id;
    r = {
      ...r,
      projects: r.projects.map((p) => ({
        ...p, stage: "ready" as const, points: { story: 80, art: 20, sound: 10 }, hype: 40,
      })) as never,
    };
    const out = releaseProject(r, id, { spent: 0, hype: 40 })!;
    const entry = out.run.yearShows.find((n) => n.player)!;
    expect(entry.title).toBe("Award Bait Zero");
    expect(entry.draft).toEqual(expect.objectContaining({ title: "Award Bait Zero", protag: d.protag, animeType: d.animeType }));
    expect(entry.draft?.genres).toEqual(d.genres);
    /* real production/result data — story actually dominates the point mix */
    expect(entry.score).toBe(out.result.total);
    expect(entry.story).toBeGreaterThan(entry.art);
    expect(entry.art).toBeGreaterThan(entry.sound);
    expect(entry.audience).toBe(out.result.fans);
    /* judged at the week-48 boundary, then the slate resets */
    const after = advanceWeeks({ ...out.run, week: 43, day: 43 * 7 }, 6);
    expect(after.awardsCeremony).toBeTruthy();
    const mine = after.awardsCeremony!.categories.flatMap((c) => c.nominees).find((n) => n.player);
    expect(mine).toBeTruthy();
    expect(mine!.title).toBe("Award Bait Zero");
    expect(after.yearShows).toHaveLength(0);
  });

  it("the old flat £25k×N payout is gone: year-end applies the ceremony prize once", () => {
    const year = 1;
    const shows = [mk({ title: "Sweep", player: true, score: 40, audience: 500_000 })];
    const c = buildCeremony(year, shows);
    /* Sweep wins everything it can: aoty + shonen + 3 craft + fanfav */
    const expectedCash = 20_000 + 12_500 + 3 * 5_000 + 5_000;
    const expectedFans = 1_500 + 750 + 3 * 250 + 1_000;
    expect(c.playerCash).toBe(expectedCash);
    expect(c.playerFans).toBe(expectedFans);
    expect(expectedCash).not.toBe(25_000 * c.playerAwards);
  });

  it("runCeremony / makeCeremony keep world releases in the judging pool", () => {
    let world = initRivalWorld(0);
    world = { ...world, studios: world.studios.map((s) => ({ ...s, status: "active" })) };
    for (let w = 1; w <= 48; w++) world = tickRivalWeek(world, w, { playerAiringGenres: new Set() }).world;
    const c = runCeremony(1, [mk({ title: "Mine", player: true, score: 40, story: 80, art: 80, sound: 80, audience: 1_000_000 })], world);
    expect(c).toBeTruthy();
    expect(c!.categories.length).toBeGreaterThanOrEqual(5);
    const all = c!.categories.flatMap((x) => x.nominees);
    expect(all.some((n) => !n.player)).toBe(true);
    expect(all.some((n) => n.player)).toBe(true);
  });

  it("a slate with no eligible shows builds an empty (safe) ceremony", () => {
    const c = buildCeremony(1, []);
    expect(c.categories).toHaveLength(0);
    expect(c.playerAwards).toBe(0);
    expect(c.playerCash).toBe(0);
  });
});
