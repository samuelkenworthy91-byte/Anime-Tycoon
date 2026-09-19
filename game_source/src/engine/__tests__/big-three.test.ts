import { describe, expect, it } from "vitest";
import { createFranchise } from "../franchise";
import { rivalNominee } from "../awards";
import { initialRun } from "../state";
import {
  BIG_THREE_MARCH_WEEK,
  BIG_THREE_MAX_SLOTS,
  BIG_THREE_START_YEAR,
  BIG_THREE_START_WEEK,
  advanceBigThreeWeek,
  bigThreeQualifies,
  pendingBigThreeReveal,
  recognisePlayerBigThreeRelease,
  syncBigThreeEra,
} from "../bigThree";
import { PETS, PROTAGONISTS, SECONDARY, VILLAINS, type Draft, type GenreId } from "../data";
import type { RivalRelease } from "../rivals";

const draft = (title = "Crown of Tomorrow", genres: GenreId[] = ["fantasy", "mecha"]): Draft => ({
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
});

function addPlayerWatchCandidate(run: ReturnType<typeof initialRun>, title = "Crown of Tomorrow", fans = 170_000) {
  const d = draft(title);
  const fr = createFranchise(title, d, {
    protag: d.protag,
    protagName: d.protagName,
    secondary: d.secondary,
    secondaryName: "S",
    pet: d.pet,
    petName: "P",
    villain: d.villain,
    villainName: "V",
  }, { total: 39, revenue: 4_000_000, fans, hallOfFame: true }, run.week);
  fr.popularity = 88;
  fr.lifetimeFans = fans;
  fr.lastScore = 39;
  fr.bestScore = 39;
  run.franchises = { ...run.franchises, [title]: fr };
  return {
    run: recognisePlayerBigThreeRelease(run, {
      projectId: `player-${title}`,
      draft: d,
      score: 39,
      points: { story: 520, art: 540, sound: 510 },
      reach: fans,
      franchiseKey: title,
    }),
    draft: d,
  };
}

function rivalRelease(studioId: string, studio: string, title: string, week: number, fans = 220_000, score = 39): RivalRelease {
  return {
    title,
    studioId,
    studio,
    score,
    week,
    year: Math.floor(week / 48) + 1,
    genres: ["fantasy"],
    animeType: "shonen",
    revenue: 4_000_000,
    fans,
    kind: "original",
    hallOfFame: true,
    craft: { story: 54, art: 55, sound: 53 },
    posterId: null,
    franchiseKey: title,
    licensedIpId: null,
  };
}

function addRivalRelease(run: ReturnType<typeof initialRun>, studioIndex: number, title: string, fans = 220_000, score = 39) {
  const studio = run.rivalWorld.studios[studioIndex];
  const release = rivalRelease(studio.id, studio.name, title, run.week - 2, fans, score);
  run.rivalWorld = {
    ...run.rivalWorld,
    studios: run.rivalWorld.studios.map((candidate) =>
      candidate.id === studio.id ? { ...candidate, releases: [...candidate.releases, release] } : candidate
    ),
  };
  return { studio, release };
}

describe("March Big Three cultural canon", () => {
  it("stays dormant before March of Year 5 and activates silently if nobody qualifies", () => {
    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK - 1;
    run = syncBigThreeEra(run);
    expect(run.bigThree.introduced).toBe(false);
    expect(run.bigThree.slots).toHaveLength(0);

    const noticesBefore = run.notices.length;
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    expect(run.bigThree.introduced).toBe(true);
    expect(run.bigThree.slots).toHaveLength(0);
    expect(run.notices).toHaveLength(noticesBefore);

    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(0);
    expect(run.notices).toHaveLength(noticesBefore);
    expect(pendingBigThreeReveal(run)).toBeNull();
  });

  it("requires critics, reach, craft and cultural momentum together", () => {
    expect(bigThreeQualifies({ score: 38, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(true);
    expect(bigThreeQualifies({ score: 37, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);
    expect(bigThreeQualifies({ score: 38, reach: 149_999, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);
    expect(bigThreeQualifies({ score: 38, reach: 150_000, craftFloor: 31, momentum: 80, culturalScore: 400 })).toBe(false);
  });

  it("only performs the industry selection on the March check", () => {
    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    addRivalRelease(run, 0, "March Crown");

    run.week = BIG_THREE_START_WEEK + 3;
    addRivalRelease(run, 0, "Recent March Crown");
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(0);

    run.week = BIG_THREE_START_WEEK + 48;
    expect(run.week % 48).toBe(BIG_THREE_MARCH_WEEK);
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(1);
  });

  it("can name the three monuments in one March assessment but never takes two titles from one studio", () => {
    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);

    const first = addRivalRelease(run, 0, "Studio A Crown", 320_000);
    const sameStudio = rivalRelease(first.studio.id, first.studio.name, "Studio A Second", run.week - 1, 310_000, 39);
    run.rivalWorld = {
      ...run.rivalWorld,
      studios: run.rivalWorld.studios.map((studio) =>
        studio.id === first.studio.id ? { ...studio, releases: [...studio.releases, sameStudio] } : studio
      ),
    };
    addRivalRelease(run, 1, "Studio B Crown", 280_000);
    addRivalRelease(run, 2, "Studio C Crown", 260_000);

    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(BIG_THREE_MAX_SLOTS);
    expect(new Set(run.bigThree.slots.map((slot) => slot.originalStudioId)).size).toBe(3);
    expect(run.bigThree.slots.filter((slot) => slot.originalStudioId === first.studio.id)).toHaveLength(1);
  });

  it("uses recent awards strongly when choosing the first monument", () => {
    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    const lower = addRivalRelease(run, 0, "Awarded Crown", 180_000, 38);
    addRivalRelease(run, 1, "Bigger Unawarded Crown", 250_000, 39);

    const nominee = rivalNominee(lower.release);
    run.awardsCeremony = {
      year: BIG_THREE_START_YEAR - 1,
      categories: [{
        id: "aoty",
        name: "Anime of the Year",
        blurb: "",
        tier: 3,
        payout: { cash: 0, fans: 0 },
        nominees: [nominee],
        winner: nominee,
      }],
      playerAwards: 0,
      playerCash: 0,
      playerFans: 0,
      presentation: ["aoty"],
      playerWins: [],
    };

    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots[0]?.title).toBe("Awarded Crown");
    expect(pendingBigThreeReveal(run)?.reveal.kind).toBe("era");
  });

  it("awards player prestige once and keeps the player to one monument", () => {
    let run = initialRun("Player House", "steady");
    run.week = BIG_THREE_START_WEEK - 1;
    const first = addPlayerWatchCandidate(run, "Player Crown", 240_000);
    run = first.run;
    const second = addPlayerWatchCandidate(run, "Player Crown Two", 230_000);
    run = second.run;
    const fansBefore = run.fans;
    const rdBefore = run.rd;

    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    addRivalRelease(run, 0, "Rival One", 270_000);
    addRivalRelease(run, 1, "Rival Two", 260_000);
    run = advanceBigThreeWeek(run);

    expect(run.bigThree.slots).toHaveLength(3);
    expect(run.bigThree.slots.filter((slot) => slot.player)).toHaveLength(1);
    expect(run.fans).toBe(fansBefore + 75_000);
    expect(run.rd).toBe(rdBefore + 60);

    const after = advanceBigThreeWeek(run);
    expect(after.fans).toBe(run.fans);
    expect(after.rd).toBe(run.rd);
  });
});
