import { describe, expect, it } from "vitest";
import { initialRun, migrateRun, startBlockReason, startProject, unlockFormat } from "../state";
import { adaptationCommission, emergencyCommission, initMarket, rollCommission } from "../market";
import { formatLockReason } from "../state";
import type { MediumId } from "../data";
import type { Commission } from "../market";

/** a minimal valid draft in the requested medium */
function draft(medium: MediumId, genres: ("slice" | "fantasy")[] = ["slice", "fantasy"]) {
  return {
    title: "Progression Probe",
    medium,
    budget: "standard" as const,
    scope: "standard" as const,
    slot: medium === "tv" || medium === "special" ? ("midnight" as const) : (medium === "fanweb" ? ("web" as const) : "stream" as const),
    animeType: "shonen" as const,
    genres,
    audience: "teens" as const,
    protag: "kai",
    protagName: "Kai Moriyama",
    secondary: "none",
    pet: "none",
    villain: "none",
    arcs: ["hook", "festival", "confession"],
    sliders: [50, 50, 50] as [number, number, number],
    season: 1,
  };
}

function fakeCommission(medium: MediumId, genre: "slice" | "fantasy" = "slice"): Commission {
  return {
    id: `com-probe-${medium}`,
    partnerId: "streamline",
    genre,
    audience: "teens",
    medium,
    advance: 150_000,
    share: 0.5,
    minQuality: 18,
    bonus: 20_000,
    maxWeeks: 12,
    expiresWeek: 20,
    restriction: "probe",
  };
}

describe("format progression — commission generation", () => {
  it("a fresh studio (fan web only) never receives a locked-format commission", () => {
    const market = initMarket();
    const partners: Record<string, number> = {};
    for (let i = 0; i < 500; i += 1) {
      const c = rollCommission(40 + i, partners, market, ["fanweb"]);
      expect(c.medium).toBe("fanweb");
    }
  });

  it("ONA becomes available after unlock, then TV, then Film", () => {
    const market = initMarket();
    const partners: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (let i = 0; i < 300; i += 1) {
      const c = rollCommission(40 + i, partners, market, ["fanweb", "ona"]);
      expect(["fanweb", "ona"]).toContain(c.medium);
      counts[c.medium] = (counts[c.medium] ?? 0) + 1;
    }
    expect(counts.ona ?? 0).toBeGreaterThan(0);

    const all: Record<string, number> = {};
    for (let i = 0; i < 500; i += 1) {
      const c = rollCommission(40 + i, partners, market, ["fanweb", "ona", "tv", "ova", "special", "movie"]);
      all[c.medium] = (all[c.medium] ?? 0) + 1;
    }
    expect(all.tv ?? 0).toBeGreaterThan(0);
    expect(all.movie ?? 0).toBeGreaterThan(0);
  });

  it("market events (emergency/adaptation) also respect unlocked formats", () => {
    const market = initMarket();
    const partners: Record<string, number> = {};
    for (let i = 0; i < 200; i += 1) {
      expect(emergencyCommission(40 + i, "ntv8", partners, market, ["fanweb"]).medium).toBe("fanweb");
      expect(adaptationCommission(40 + i, partners, market, ["fanweb"]).medium).toBe("fanweb");
    }
  });
});

describe("format progression — state-level validation", () => {
  it("a locked commission cannot start through the state API", () => {
    let r = initialRun("Probe", "producer");
    r = migrateRun(r as unknown as Record<string, unknown>) ?? r;
    expect(r.mediumsUnlocked).toEqual(["fanweb"]);
    expect(startBlockReason(r, draft("tv"))).toMatch(/Requires/);
    expect(startBlockReason(r, draft("ona"))).toMatch(/Requires/);
    expect(startBlockReason(r, draft("movie"))).toMatch(/Requires/);
    expect(startBlockReason(r, draft("fanweb"))).toBeNull();
    expect(startProject(r, draft("tv"), fakeCommission("tv"))).toBeNull();
    expect(startProject(r, draft("ona"), fakeCommission("ona"))).toBeNull();
    expect(startProject(r, draft("movie"), fakeCommission("movie"))).toBeNull();
    expect(startProject(r, draft("fanweb"), fakeCommission("fanweb"))).not.toBeNull();
  });

  it("unlocking formats follows the milestone ladder", () => {
    let r = initialRun("Probe", "producer");
    /* ONA needs rd 14 + 2 shows */
    r = { ...r, rd: 14, showsMade: 2 };
    expect(formatLockReason(r, "ona")).toBeNull();
    const unlocked = unlockFormat(r, "ona");
    expect(unlocked).not.toBeNull();
    expect(unlocked!.mediumsUnlocked).toEqual(["fanweb", "ona"]);
    expect(startBlockReason(unlocked!, draft("ona"))).toBeNull();
    /* TV needs rd 24 + 3 shows + fans — still locked until all are met */
    expect(formatLockReason(unlocked!, "tv")).not.toBeNull();
    const tvReady = { ...unlocked!, rd: 24, showsMade: 3, fans: 1_500, officeLevel: 1 };
    expect(formatLockReason(tvReady, "tv")).toBeNull();
    expect(unlockFormat(tvReady, "tv")!.mediumsUnlocked).toEqual(["fanweb", "ona", "tv"]);
  });
});
