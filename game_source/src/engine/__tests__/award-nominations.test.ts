import { describe, expect, it } from "vitest";
import {
  buildCeremony,
  buildNominationSlate,
  freezeNominationEntries,
  type AwardNominee,
} from "../awards";
import {
  acknowledgeNominationAnnouncement,
  advanceAwardsWeek,
  freezeNominationsIfDue,
  nominationFrozenForYear,
  pendingNominationAnnouncement,
  restoreAwardNominationMetadata,
} from "../awardCycle";
import { initialRun, migrateRun } from "../state";
import type { GenreId } from "../data";

const mk = (title: string, studio: string, extra: Partial<AwardNominee> = {}): AwardNominee => ({
  title,
  studio,
  studioId: extra.player ? "player" : studio.toLowerCase().replace(/\s+/g, "-"),
  player: false,
  animeType: "shonen",
  genres: ["action" as GenreId],
  score: 34,
  story: 48,
  art: 48,
  sound: 48,
  audience: 120_000,
  sourceId: `${studio}:${title}`,
  posterId: null,
  draft: null,
  protag: null,
  ...extra,
});

describe("November awards nomination slate", () => {
  it("targets three studios and normally caps one studio at two nominees", () => {
    const shows = [
      mk("Sun 1", "Sunrise Studio", { art: 70 }),
      mk("Sun 2", "Sunrise Studio", { art: 68 }),
      mk("Sun 3", "Sunrise Studio", { art: 66 }),
      mk("Sun 4", "Sunrise Studio", { art: 64 }),
      mk("Bone 1", "Boneworks", { art: 60 }),
      mk("Kyo 1", "Kyo-Hani", { art: 58 }),
    ];
    const slate = buildNominationSlate(1, shows);
    const animation = slate.categories.find((category) => category.id === "animation")!;
    expect(animation.nominees).toHaveLength(4);
    expect(new Set(animation.nominees.map((nominee) => nominee.studio)).size).toBeGreaterThanOrEqual(3);
    expect(animation.nominees.filter((nominee) => nominee.studio === "Sunrise Studio")).toHaveLength(2);
  });

  it("relaxes the studio cap only when the qualifying field cannot fill otherwise", () => {
    const shows = [1, 2, 3, 4].map((n) => mk(`Solo ${n}`, "Solo Studio", { art: 70 - n }));
    const animation = buildNominationSlate(1, shows).categories.find((category) => category.id === "animation")!;
    expect(animation.nominees).toHaveLength(4);
    expect(animation.nominees.every((nominee) => nominee.studio === "Solo Studio")).toBe(true);
  });

  it("never promotes an unqualified show merely to manufacture diversity", () => {
    const shows = [
      mk("Great A", "A", { art: 60 }),
      mk("Great B", "A", { art: 58 }),
      mk("Bad B", "B", { score: 10, art: 80 }),
      mk("Bad C", "C", { score: 10, art: 80 }),
    ];
    const animation = buildNominationSlate(1, shows).categories.find((category) => category.id === "animation")!;
    expect(animation.nominees.map((nominee) => nominee.title)).toEqual(expect.arrayContaining(["Great A", "Great B"]));
    expect(animation.nominees.some((nominee) => nominee.title.startsWith("Bad"))).toBe(false);
  });

  it("the ceremony consumes the frozen November slate rather than a later recalculation", () => {
    const early = [
      mk("November One", "A", { score: 36, art: 60 }),
      mk("November Two", "B", { score: 35, art: 58 }),
      mk("November Three", "C", { score: 34, art: 56 }),
      mk("November Four", "D", { score: 33, art: 54 }),
    ];
    const frozen = freezeNominationEntries(1, early);
    const lateMasterpiece = mk("December Masterpiece", "Late Studio", { score: 40, art: 80, story: 80, sound: 80, audience: 1_000_000 });
    const ceremony = buildCeremony(1, [...frozen, lateMasterpiece]);
    expect(ceremony.categories.flatMap((category) => category.nominees).some((nominee) => nominee.title === lateMasterpiece.title)).toBe(false);
    expect(ceremony.categories.find((category) => category.id === "aoty")?.nominees.map((nominee) => nominee.title))
      .toEqual(frozen.filter((nominee) => nominee.nominationCategories?.includes("aoty")).map((nominee) => nominee.title));
  });
});

describe("annual nomination cycle integration", () => {
  it("freezes once at week 43 and presents one acknowledgement-driven announcement", () => {
    const mine = mk("My Contender", "Player Studio", { player: true, studioId: "player", score: 38, art: 65, story: 65, sound: 65, audience: 300_000 });
    const before = { ...initialRun("Player Studio", "steady"), week: 43, day: 43 * 7, yearShows: [mine] };
    const frozen = freezeNominationsIfDue(before);
    expect(nominationFrozenForYear(frozen, 1)).toBe(true);
    const count = frozen.yearShows.length;
    expect(freezeNominationsIfDue(frozen).yearShows).toHaveLength(count);

    const pending = pendingNominationAnnouncement(frozen);
    expect(pending?.year).toBe(1);
    expect(pending?.slate.categories.some((category) => category.nominees.some((nominee) => nominee.player))).toBe(true);
    const acknowledged = acknowledgeNominationAnnouncement(frozen, 1);
    expect(pendingNominationAnnouncement(acknowledged)).toBeNull();
  });

  it("persists an empty-year marker so a zero-candidate November check cannot replay every week", () => {
    const before = { ...initialRun("Empty Studio", "steady"), week: 43, day: 43 * 7, yearShows: [] };
    const frozen = freezeNominationsIfDue(before);
    expect(nominationFrozenForYear(frozen, 1)).toBe(true);
    expect(frozen.yearShows).toHaveLength(1);
    expect(frozen.yearShows[0].nominationCategories).toEqual([]);
    expect(freezeNominationsIfDue(frozen).yearShows).toHaveLength(1);
    expect(pendingNominationAnnouncement(frozen)?.slate.categories).toHaveLength(0);
  });

  it("restores only the exact frozen rows after legacy migration, without duplicating a player nomination", () => {
    const mine = mk("Reload Me", "Player Studio", { player: true, studioId: "player", score: 39, art: 68, story: 68, sound: 68, audience: 350_000 });
    const raw = freezeNominationsIfDue({ ...initialRun("Player Studio", "steady"), week: 44, day: 44 * 7, yearShows: [mine] });
    const migrated = migrateRun(JSON.parse(JSON.stringify(raw)));
    expect(migrated.yearShows.some((entry) => entry.nominationYear === 1)).toBe(false);
    const restored = restoreAwardNominationMetadata(migrated, raw.yearShows);
    expect(restored.yearShows.filter((entry) => entry.nominationYear === 1)).toHaveLength(1);
    expect(restored.yearShows.filter((entry) => entry.sourceId === mine.sourceId && entry.nominationYear === 1)).toHaveLength(1);
    expect(pendingNominationAnnouncement(restored)?.year).toBe(1);
    for (const category of pendingNominationAnnouncement(restored)!.slate.categories) {
      const ids = category.nominees.map((nominee) => nominee.sourceId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("restores licensed-IP award ownership proof that the defensive migration omits", () => {
    const proof = { ipId: "ip_demo", auctionId: "auction_demo", ownerStudioId: "player" };
    const licensed = mk("Licensed Contender", "Player Studio", {
      player: true,
      studioId: "player",
      draft: {
        title: "Licensed Contender",
        animeType: "shonen",
        genres: ["action" as GenreId],
        medium: "tv",
        budget: "standard",
        episodes: 12,
        protag: "v2_lead_shonen_001",
        sidekick: "v2_sidekick_shonen_001",
        pet: "v2_pet_shonen_001",
        villain: "v2_villain_shonen_001",
        arcs: [],
        sliders: [50, 50, 50],
        licensedIpId: proof.ipId,
      } as AwardNominee["draft"],
      licensedIpAward: proof,
    });
    const raw = { ...initialRun("Player Studio", "steady"), yearShows: [licensed] };
    const migrated = migrateRun(JSON.parse(JSON.stringify(raw)));
    expect(migrated.yearShows[0].licensedIpAward).toBeUndefined();
    const restored = restoreAwardNominationMetadata(migrated, raw.yearShows);
    expect(restored.yearShows[0].licensedIpAward).toEqual(proof);
    expect(restored.yearShows[0].studioId).toBe("player");
  });

  it("carries a post-cutoff player release into the next award cycle without changing the frozen ceremony", () => {
    const early = mk("Early Show", "Player Studio", { player: true, studioId: "player", score: 38, art: 64, story: 64, sound: 64, audience: 250_000, nominationConsideredYear: 1 });
    const frozen = {
      ...early,
      nominationYear: 1,
      nominationCategories: ["aoty", "shonen", "writing", "animation", "score", "fanfav"] as AwardNominee["nominationCategories"],
      nominationAnnouncementSeen: true,
    };
    const late = mk("Late Show", "Player Studio", { player: true, studioId: "player", score: 40, art: 80, story: 80, sound: 80, audience: 900_000 });
    const run = {
      ...initialRun("Player Studio", "steady"),
      week: 47,
      day: 47 * 7,
      cash: 5_000_000,
      yearShows: [early, frozen, late],
    };
    const after = advanceAwardsWeek(run);
    expect(after.awardsCeremony?.year).toBe(1);
    expect(after.awardsCeremony?.categories.flatMap((category) => category.nominees).some((nominee) => nominee.title === "Late Show")).toBe(false);
    expect(after.yearShows.some((entry) => entry.title === "Late Show")).toBe(true);
    expect(after.yearShows.some((entry) => entry.title === "Early Show")).toBe(false);
  });

  it("an old save first encountered after the cutoff freezes before its year-end ceremony", () => {
    const mine = mk("Old Save Contender", "Player Studio", { player: true, studioId: "player", score: 39, art: 70, story: 70, sound: 70, audience: 400_000 });
    const run = {
      ...initialRun("Player Studio", "steady"),
      week: 47,
      day: 47 * 7,
      cash: 5_000_000,
      yearShows: [mine],
    };
    const after = advanceAwardsWeek(run);
    expect(after.awardsCeremony?.year).toBe(1);
    expect(after.awardsCeremony?.categories.flatMap((category) => category.nominees).some((nominee) => nominee.title === mine.title)).toBe(true);
  });
});
