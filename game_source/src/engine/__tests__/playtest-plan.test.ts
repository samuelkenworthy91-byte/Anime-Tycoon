import { describe, expect, it } from "vitest";
import { ARCS, PROTAGONISTS, SECONDARY, PETS, VILLAINS, arcCombosFor, type Draft, type GenreId } from "../data";
import { AUCTION_IPS, type IPContract } from "../ip";
import { makeProject } from "../projects";
import { initialRun, releaseProject } from "../state";
import { migrateDraftV2, migrateUnlockedGenres } from "../castV2Migration";
import { applyLicensedAdaptationOutcome } from "../licensedAdaptation";
import { genreTargetFor } from "../genreTargets";
import { RESEARCHABLE_SECRET_COMBOS, arcClashesFor, experimentalStudyPresentation } from "../creativeDiscovery";
import { genreUnlockCost, officeRelocationBlockReason, officeRelocationRequirements } from "../progression";
import type { ShowResult } from "../scoring";

const contractFor = (ipId: string): IPContract => ({
  ipId, acquiredWeek: 0, expiresWeek: 999, purchasePrice: 100_000,
  royaltyRate: 0.1, ownershipShare: 0.45, sequelRights: true, merchRights: true,
  internationalRights: true, adaptations: 1, bestScore: 0, discoveredArcs: [],
});

const licensedDraft = (ip = AUCTION_IPS[0], overrides: Partial<Draft> = {}): Draft => ({
  title: ip.title, medium: "tv", budget: "standard", scope: "standard", slot: "midnight",
  animeType: ip.animeType, genres: ip.genreTags.slice(0, 2), audience: ip.audience,
  protag: PROTAGONISTS[0].id, protagName: ip.characters[0].name,
  secondary: SECONDARY[0].id, secondaryName: ip.characters[1].name,
  pet: PETS[0].id, petName: ip.characters.find((c) => c.role === "mascot")?.name ?? "",
  villain: VILLAINS[0].id, villainName: ip.characters.find((c) => c.role === "antagonist")?.name ?? ip.characters[2].name,
  arcs: ["hook", "finale"], sliders: [50, 50, 50], season: 1,
  licensedIpId: ip.id, licensedArcId: ip.availableArcs[0].id, licensedCharacters: ip.characters.map((c) => c.name),
  ...overrides,
});

const baseResult = (total = 20): ShowResult => ({
  reviews: Array.from({ length: 4 }, (_, i) => ({ outlet: `R${i}`, focus: "test", score: Math.max(1, Math.min(10, Math.round(total / 4))), quote: "test" })),
  total, tier: "mixed", hallOfFame: false, points: { story: 100, art: 100, sound: 100 }, issues: 0,
  revenue: 100_000, fans: 8_000, costs: 50_000, rd: 0, sales: Array.from({ length: 16 }, () => 10_000),
  commercial: { id: "breakout", label: "BREAKOUT HIT", index: 2 }, breakdown: [], comboLevel: 0, newCombo: false,
  chemMult: 1, chemDiscovered: [], secretDiscovered: false, quality: 20, arcCombosDiscovered: [], arcClashes: [], genreSalesMult: 1,
});

describe("licensed adaptation boundary", () => {
  it("releases every current auction IP without treating its route as a normal ARCS entry", () => {
    expect(AUCTION_IPS.length).toBeGreaterThanOrEqual(80);
    for (const ip of AUCTION_IPS) {
      const draft = licensedDraft(ip);
      expect(draft.arcs.every((id) => ARCS.some((arc) => arc.id === id))).toBe(true);
      let project = makeProject(draft, 0, 0);
      project = { ...project, stage: "ready", points: { story: 180, art: 180, sound: 180 }, issues: 0 };
      const base = initialRun("IP Test", "steady");
      const run = {
        ...base, cash: 50_000_000, officeLevel: 4, projects: [project],
        ipMarket: { ...base.ipMarket, owned: { ...base.ipMarket.owned, [ip.id]: contractFor(ip.id) } },
      };
      const out = releaseProject(run, project.id, { spent: 0, hype: 35 });
      expect(out, ip.title).not.toBeNull();
      expect(Number.isFinite(out!.result.revenue), ip.title).toBe(true);
      expect(Number.isFinite(out!.result.fans), ip.title).toBe(true);
    }
  });

  it("repairs broken current-save licensed drafts and preserves recent random genre ownership", () => {
    const ip = AUCTION_IPS[0];
    const broken = licensedDraft(ip, { licensedArcId: undefined, arcs: [ip.availableArcs[0].id, "hook", "finale"] });
    const migrated = migrateDraftV2(broken);
    expect(migrated.licensedArcId).toBe(ip.availableArcs[0].id);
    expect(migrated.arcs).toEqual(["hook", "finale"]);
    expect(migrateUnlockedGenres(["kaiju", "romance"], false)).toEqual(["kaiju", "romance"]);
  });

  it("keeps licensed direction targets identical to the exact same original genre pair", () => {
    for (const ip of AUCTION_IPS.slice(0, 20)) {
      const original = genreTargetFor(ip.genreTags.slice(0, 2));
      const licensed = genreTargetFor(licensedDraft(ip).genres);
      expect(licensed.ideal).toEqual(original.ideal);
      expect(licensed.ratio).toEqual(original.ratio);
    }
  });

  it("lets a famous bad adaptation make money while producing real fan backlash", () => {
    const ip = [...AUCTION_IPS].sort((a, b) => b.fanbase - a.fanbase)[0];
    const draft = licensedDraft(ip, { medium: "tv", budget: "indie", scope: "short", sliders: [0, 0, 0] });
    const outcome = applyLicensedAdaptationOutcome({
      ip, contract: contractFor(ip.id), draft, result: baseResult(12), hype: 90,
      genreIdeal: genreTargetFor(draft.genres).ideal,
    });
    expect(outcome.revenue).toBeGreaterThan(0);
    expect(outcome.fans).toBeLessThan(8_000);
    expect(outcome.breakdown.some((row) => row.label.includes("backlash"))).toBe(true);
  });

  it("makes a well-resourced adaptation a larger fan and money opportunity", () => {
    const ip = [...AUCTION_IPS].sort((a, b) => b.fanbase - a.fanbase)[0];
    const poorDraft = licensedDraft(ip, { budget: "indie", scope: "short" });
    const strongDraft = licensedDraft(ip, { budget: "blockbuster", scope: "prestige" });
    const ideal = genreTargetFor(ip.genreTags.slice(0, 2)).ideal;
    const poor = applyLicensedAdaptationOutcome({ ip, contract: contractFor(ip.id), draft: poorDraft, result: baseResult(20), hype: 35, genreIdeal: ideal });
    const strong = applyLicensedAdaptationOutcome({ ip, contract: contractFor(ip.id), draft: strongDraft, result: baseResult(28), hype: 35, genreIdeal: ideal });
    expect(strong.total).toBeGreaterThan(poor.total);
    expect(strong.fans).toBeGreaterThan(poor.fans);
    expect(strong.revenue).toBeGreaterThan(poor.revenue);
  });
});

describe("research, arcs and progression", () => {
  it("conceals experimental pair labels until the study is completed", () => {
    for (const study of RESEARCHABLE_SECRET_COMBOS) {
      const hidden = experimentalStudyPresentation({ id: study.id, name: `Experimental Combination Study ${study.order}`, desc: "Investigate an unusual relationship between two genres." }, false);
      const shown = experimentalStudyPresentation({ id: study.id, name: "x", desc: "x" }, true);
      for (const genre of study.label.split(" × ")) expect(`${hidden.name} ${hidden.desc}`).not.toContain(genre);
      expect(shown.name).toContain(study.label);
    }
  });

  it("adds the requested ordered story structures and adjacency-aware clashes", () => {
    expect(arcCombosFor(["narr_betrayal", "narr_revenge"]).some((c) => c.id === "personal_vendetta")).toBe(true);
    expect(arcCombosFor(["narr_rivalintro", "narr_rescue", "narr_betrayal"]).some((c) => c.id === "retrieval_crisis")).toBe(true);
    expect(arcClashesFor(["narr_sacrifice", "narr_rescue"]).some((c) => c.id === "clash_sacrifice_undone")).toBe(true);
    expect(arcClashesFor(["narr_sacrifice", "hook", "narr_rescue"]).some((c) => c.id === "clash_sacrifice_undone")).toBe(false);
    expect(arcClashesFor(["redemption", "origin"]).some((c) => c.id === "clash_redemption_before_origin")).toBe(true);
  });

  it("escalates genre licence costs while preserving an affordable first expansion", () => {
    const target = "cosmic_horror" as GenreId;
    const first = genreUnlockCost({ genresUnlocked: ["kaiju", "romance"] }, target);
    const mid = genreUnlockCost({ genresUnlocked: GENRE_IDS_FOR_TEST.slice(0, 12) }, target);
    const late = genreUnlockCost({ genresUnlocked: GENRE_IDS_FOR_TEST.slice(0, 25) }, target);
    expect(first).toBeLessThanOrEqual(12);
    expect(mid).toBeGreaterThan(first);
    expect(late).toBeGreaterThanOrEqual(60);
    expect(late).toBeLessThanOrEqual(95);
  });

  it("requires sustained studio growth for relocation, not cash alone", () => {
    const richButTiny = { cash: 50_000_000, officeLevel: 0, showsMade: 0, staff: [], fans: 0 };
    expect(officeRelocationBlockReason(richButTiny)).toContain("Productions aired");
    const ready = { cash: 500_000, officeLevel: 0, showsMade: 3, staff: [{}], fans: 3_000 };
    expect(officeRelocationBlockReason(ready)).toBeNull();
    expect(officeRelocationRequirements(ready).every((r) => r.met)).toBe(true);
  });
});

const GENRE_IDS_FOR_TEST = [
  "mecha", "isekai", "slice", "horror", "romance", "sports", "cyber", "fantasy", "idol", "mystery",
  "comedy", "cooking", "military", "supernatural", "space", "magical", "survival", "pirate", "martial", "mythology",
  "nordic", "samurai", "shinobi", "vampire", "grimdark", "monster_taming", "crime", "kaiju", "cosmic_horror", "arabia",
] as GenreId[];
