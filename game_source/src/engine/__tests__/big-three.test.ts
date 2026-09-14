import { describe, expect, it } from "vitest";
import { AUCTION_IPS, initIPMarket } from "../ip";
import { ipRenewalCost } from "../ipRenewal";
import { createFranchise } from "../franchise";
import { makeProject } from "../projects";
import { pickRivalPoster } from "../rivalPosters";
import { initialRun, migrateRun } from "../state";
import {
  BIG_THREE_MAX_SLOTS,
  BIG_THREE_RIVAL_COOLDOWN_WEEKS,
  BIG_THREE_RIVAL_GRACE_WEEKS,
  BIG_THREE_SEED_POSTER_ID,
  BIG_THREE_START_WEEK,
  advanceBigThreeWeek,
  bigThreeQualifies,
  pendingBigThreeReveal,
  recognisePlayerBigThreeRelease,
  resolveBigThreeSlotOwner,
  syncBigThreeEra,
} from "../bigThree";
import { PETS, PROTAGONISTS, SECONDARY, VILLAINS, type Draft, type GenreId } from "../data";

const draft = (title = "Crown of Tomorrow", genres: GenreId[] = ["fantasy", "mecha"], licensedIpId?: string): Draft => ({
  title,
  medium: "tv",
  budget: "blockbuster",
  scope: "standard",
  slot: "prime",
  animeType: "shonen",
  genres,
  audience: "teens",
  protag: PROTAGONISTS[0].id,
  protagName: PROTAGONISTS[0].name,
  secondary: SECONDARY[0].id,
  pet: PETS[0].id,
  villain: VILLAINS[0].id,
  arcs: ["hook", "lore", "finale"],
  sliders: [50, 50, 50],
  season: 1,
  ...(licensedIpId ? { licensedIpId, licensedArcId: `${licensedIpId}_opening`, licensedCharacters: ["Hero"] } : {}),
});

function playerCandidate(title = "Crown of Tomorrow", licensedIpId?: string) {
  let run = initialRun("Player House", "steady");
  run.week = BIG_THREE_START_WEEK;
  run = syncBigThreeEra(run);
  const d = draft(title, ["fantasy", "mecha"], licensedIpId);
  const fr = createFranchise(title, d, {
    protag: d.protag, protagName: d.protagName, secondary: d.secondary, secondaryName: "S", pet: d.pet, petName: "P", villain: d.villain, villainName: "V",
  }, { total: 36, revenue: 4_000_000, fans: 150_000, hallOfFame: true }, run.week);
  fr.popularity = 88;
  fr.lifetimeFans = 160_000;
  fr.entries.push({ kind: "season", title: `${title} II`, score: 35, revenue: 2_000_000, fans: 80_000, week: run.week, animeType: "shonen" });
  fr.lastScore = 35;
  fr.bestScore = 36;
  run.franchises = { [title]: fr };
  return { run, d };
}

function recognise(run: ReturnType<typeof initialRun>, d: Draft, projectId = "p1") {
  return recognisePlayerBigThreeRelease(run, {
    projectId,
    draft: d,
    score: 36,
    points: { story: 360, art: 390, sound: 350 },
    reach: 150_000,
    franchiseKey: d.title,
  });
}

describe("Year 6 Big Three endgame", () => {
  it("stays dormant before Year 6", () => {
    const run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK - 1;
    const next = syncBigThreeEra(run);
    expect(next.bigThree.introduced).toBe(false);
    expect(next.bigThree.slots).toHaveLength(0);
  });

  it("seeds Sunnyrise exactly once at the start of Year 6 with a persistent reveal", () => {
    let run = initialRun("House", "steady");
    const sunnyBefore = run.rivalWorld.studios.find((s) => s.id === "Sunnyrise")!;
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    const sunnyAfter = run.rivalWorld.studios.find((s) => s.id === "Sunnyrise")!;
    expect(run.bigThree.introduced).toBe(true);
    expect(run.bigThree.slots).toHaveLength(1);
    expect(run.bigThree.slots[0]).toMatchObject({ title: "Astra Breaker: Eclipse", originalStudio: "Sunnyrise", recognisedYear: 6, posterId: BIG_THREE_SEED_POSTER_ID });
    expect(pendingBigThreeReveal(run)?.reveal.kind).toBe("era");
    expect(sunnyAfter.fans).toBe(sunnyBefore.fans + 180_000);
    expect(sunnyAfter.revenue).toBe(sunnyBefore.revenue + 4_200_000);
    expect(sunnyAfter.releasesCount).toBe(sunnyBefore.releasesCount + 1);
    expect(sunnyAfter.masterpieces).toBe(sunnyBefore.masterpieces + 1);
    const twice = syncBigThreeEra(run);
    expect(twice.bigThree.slots).toHaveLength(1);
    expect(twice.rivalWorld.studios.find((s) => s.id === "Sunnyrise")?.releases.filter((r) => r.title === "Astra Breaker: Eclipse")).toHaveLength(1);
  });

  it("requires critics, reach, craft and cultural momentum together", () => {
    expect(bigThreeQualifies({ score: 36, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(true);
    expect(bigThreeQualifies({ score: 33, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);
    expect(bigThreeQualifies({ score: 36, reach: 20_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);
    expect(bigThreeQualifies({ score: 36, reach: 150_000, craftFloor: 20, momentum: 80, culturalScore: 400 })).toBe(false);
  });

  it("lets a qualifying player production claim an open slot and grants prestige rewards once", () => {
    const { run: base, d } = playerCandidate();
    const fans = base.fans;
    const rd = base.rd;
    const popularityBefore = base.franchises[d.title].popularity;
    const rivalriesBefore = base.rivalWorld.studios.map((studio) => [studio.id, studio.rivalry] as const);
    const next = recognise(base, d);
    expect(next.bigThree.slots).toHaveLength(2);
    expect(next.bigThree.slots[1]).toMatchObject({ player: true, originalStudio: "Player House", title: d.title });
    expect(next.fans).toBe(fans + 75_000);
    expect(next.rd).toBe(rd + 60);
    expect(next.franchises[d.title].bigThree).toBe(true);
    expect(next.franchises[d.title].popularity).toBe(Math.min(100, popularityBefore + 12));
    for (const [id, rivalry] of rivalriesBefore) {
      const rival = next.rivalWorld.studios.find((studio) => studio.id === id)!;
      if (rival.status !== "collapsed") expect(rival.rivalry).toBe(Math.min(100, rivalry + 8));
    }
    const twice = recognise(next, d);
    expect(twice.bigThree.slots).toHaveLength(2);
    expect(twice.fans).toBe(next.fans);
  });

  it("does not reserve a player slot, but rival cultural consensus cannot consume both open places instantly", () => {
    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    const studio = run.rivalWorld.studios.find((s) => s.id !== "Sunnyrise")!;
    const release = (title: string, week: number) => ({
      title, studioId: studio.id, studio: studio.name, score: 37, week, year: Math.floor(week / 48) + 1,
      genres: ["fantasy"] as GenreId[], animeType: "shonen" as const, revenue: 4_000_000, fans: 150_000,
      kind: "original" as const, hallOfFame: true, craft: { story: 52, art: 54, sound: 50 }, posterId: null, franchiseKey: title,
    });

    run = { ...run, week: BIG_THREE_START_WEEK + 1, rivalWorld: { ...run.rivalWorld, studios: run.rivalWorld.studios.map((s) => s.id === studio.id ? { ...s, releases: [...s.releases, release("Rival Crown", BIG_THREE_START_WEEK + 1)] } : s) } };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(1); // Year-6 shock gets breathing room.

    const rivalBeforeRecognition = run.rivalWorld.studios.find((s) => s.id === studio.id)!;
    run = { ...run, week: BIG_THREE_START_WEEK + BIG_THREE_RIVAL_GRACE_WEEKS };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(2);
    const rivalAfterRecognition = run.rivalWorld.studios.find((s) => s.id === studio.id)!;
    expect(rivalAfterRecognition.fans).toBe(rivalBeforeRecognition.fans + 50_000);
    expect(rivalAfterRecognition.reputation).toBe(Math.min(100, rivalBeforeRecognition.reputation + 8));
    expect(rivalAfterRecognition.momentum).toBe(Math.min(30, rivalBeforeRecognition.momentum + 8));

    const firstRivalRecognition = run.bigThree.slots[1].recognisedWeek;
    run = { ...run, week: firstRivalRecognition + 1, rivalWorld: { ...run.rivalWorld, studios: run.rivalWorld.studios.map((s) => s.id === studio.id ? { ...s, releases: [...s.releases, release("Rival Throne", firstRivalRecognition + 1)] } : s) } };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(2);

    run = { ...run, week: firstRivalRecognition + BIG_THREE_RIVAL_COOLDOWN_WEEKS };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(BIG_THREE_MAX_SLOTS);

    const { run: player, d } = playerCandidate("Too Late");
    const filled = { ...player, bigThree: run.bigThree };
    expect(recognise(filled, d, "late").bigThree.slots).toHaveLength(3);
  });

  it("migrates a post-Year-6 old save neutrally, then initialises once and survives JSON reload", () => {
    const old = initialRun("Legacy", "steady") as Partial<ReturnType<typeof initialRun>>;
    old.week = BIG_THREE_START_WEEK + 70;
    delete old.bigThree;
    let migrated = migrateRun(JSON.parse(JSON.stringify(old)));
    expect(migrated.bigThree.introduced).toBe(false);
    migrated = syncBigThreeEra(migrated);
    expect(migrated.bigThree.slots).toHaveLength(1);
    const reloaded = migrateRun(JSON.parse(JSON.stringify(migrated)));
    const synced = syncBigThreeEra(reloaded);
    expect(synced.bigThree.slots).toHaveLength(1);
    expect(synced.bigThree.pendingReveals).toHaveLength(1);
  });

  it("preserves creator credit while showing live ownership after an original IP sale", () => {
    const { run: base, d } = playerCandidate();
    let run = recognise(base, d);
    const slot = run.bigThree.slots[1];
    run = { ...run, franchises: { ...run.franchises, [d.title]: { ...run.franchises[d.title], soldTo: { id: "Toe-i Animation", name: "Toe-i Animation", kind: "rival", week: run.week + 1, price: 5_000_000 } } } };
    const resolved = resolveBigThreeSlotOwner(run, slot);
    expect(resolved.originalStudio).toBe("Player House");
    expect(resolved.currentOwner).toBe("Toe-i Animation");
  });

  it("gives a Big Three licensed adaptation lasting renewal leverage", () => {
    const ip = AUCTION_IPS[0];
    const { run: base, d } = playerCandidate(ip.title, ip.id);
    const contract = { ipId: ip.id, acquiredWeek: 200, expiresWeek: 300, purchasePrice: ip.rightsBaseValue, royaltyRate: ip.royaltyRate, ownershipShare: .7, sequelRights: true, merchRights: true, internationalRights: true, adaptations: 1, bestScore: 36, discoveredArcs: [] };
    let run = { ...base, ipMarket: { ...initIPMarket(base.week), owned: { [ip.id]: contract } } };
    const before = ipRenewalCost(run.ipMarket, ip.id, 0)!;
    run = recognise(run, d);
    const after = ipRenewalCost(run.ipMarket, ip.id, 0)!;
    expect(run.ipMarket.owned[ip.id].bigThreePrestige).toBe(true);
    expect(after).toBeLessThan(before);
  });

  it("keeps the seeded flagship poster out of routine rival poster rolls", () => {
    const picks = Array.from({ length: 30 }, () => pickRivalPoster({ studio: "Sunnyrise", animeType: "shonen", genres: ["mecha", "space"], rand: () => .3 })?.id);
    expect(picks).not.toContain(BIG_THREE_SEED_POSTER_ID);
  });
});
