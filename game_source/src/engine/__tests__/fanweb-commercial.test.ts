import { describe, expect, it } from "vitest";
import {
  ARCS,
  GENRE,
  MEDIUMS,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  VILLAINS,
  affinityTier,
  payoutLabelFor,
  type CastMember,
  type CastRole,
  type Draft,
  type GenreId,
  type MediumId,
  type ScopeId,
} from "../data";
import { commercialTierOf, computeResult, seededRng, WEB_ECONOMY } from "../scoring";
import { expectedProductionPoints } from "../production";

/* ====================================================================
 * FAN WEB COMMERCIAL MODEL
 *  - reviews are NOT capped for fan work (9/10 or even 10 possible)
 *  - commercial impact IS capped at CULT CLASSIC by the platform
 *  - the web economy is distinct: low money per view, slow growth,
 *    long tail, strong fan conversion, almost no distribution fee
 * ==================================================================== */

const GENRES: GenreId[] = ["romance", "military"];
const blend = (i: 0 | 1 | 2, key: "ideal" | "ratio") =>
  GENRES.reduce((a, g) => a + GENRE(g)[key][i], 0) / GENRES.length;
const IDEAL: [number, number, number] = [0, 1, 2].map((i) => Math.round(blend(i as 0 | 1 | 2, "ideal"))) as [number, number, number];
const RATIO: [number, number, number] = [0, 1, 2].map((i) => blend(i as 0 | 1 | 2, "ratio")) as [number, number, number];

const pools: Record<CastRole, CastMember[]> = {
  protag: PROTAGONISTS,
  secondary: SECONDARY,
  pet: PETS,
  villain: VILLAINS,
};
const roles: CastRole[] = ["protag", "secondary", "pet", "villain"];

function makeDraft(medium: MediumId, scope: ScopeId = "standard", effort = 1.55): { draft: Draft; points: { story: number; art: number; sound: number } } {
  const totalPts = Math.round(expectedProductionPoints({ scope, medium }) * effort);
  const cast = Object.fromEntries(roles.map((r) => [r, pools[r].find((c) => affinityTier(c, GENRES) === 2)!])) as Record<CastRole, CastMember>;
  return {
    draft: {
      title: "Web Probe",
      medium,
      budget: "standard",
      scope,
      slot: medium === "tv" || medium === "special" ? "midnight" : (MEDIUMS[medium].slot ?? "stream"),
      animeType: "shonen",
      genres: GENRES,
      audience: "teens",
      protag: cast.protag.id,
      protagName: cast.protag.name,
      secondary: cast.secondary.id,
      pet: cast.pet.id,
      villain: cast.villain.id,
      arcs: ["narr_politics", "lore", "confession", "finale"].filter((id) => ARCS.some((a) => a.id === id)),
      sliders: IDEAL,
      season: 1,
    },
    points: { story: Math.round(totalPts * 0.28), art: Math.round(totalPts * 0.48), sound: Math.round(totalPts * 0.24) },
  };
}

function resultFor(medium: MediumId, seed = 1, effort = 1.55, hype = 85) {
  const { draft, points } = makeDraft(medium, "standard", effort);
  return computeResult({
    draft,
    points,
    issues: 0,
    hype,
    research: [],
    showrunner: "steady",
    genreIdeal: IDEAL,
    genreRatio: RATIO,
    comboLevel: 0,
    newCombo: false,
    comboDiscovered: true,
    castCombos: [],
    arcCombos: [],
    studioTop: 0,
    reviewExpectation: 35,
    franchiseMult: 1,
    costs: 100_000,
    fanBase: 1_000,
    rng: seededRng(seed),
  });
}

describe("fan web commercial model", () => {
  it("reviews are NOT capped for fan web — an excellent fan series reviews well", () => {
    const scores: number[] = [];
    for (let seed = 1; seed <= 1000; seed += 1) scores.push(resultFor("fanweb", seed).total / 4);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    /* the artistic ceiling for fan work is the same as anywhere else */
    expect(mean).toBeGreaterThanOrEqual(8.3);
    /* a genuine critic 9 exists for exceptional fan work — no review cap */
    let nine = 0;
    let ten = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const r = resultFor("fanweb", seed, 1.78, 95);
      if (r.reviews.some((x) => x.score >= 9)) nine += 1;
      if (r.reviews.some((x) => x.score >= 10)) ten += 1;
    }
    expect(nine).toBeGreaterThan(0);
    /* even a 10 from a critic is possible — the platform never caps art */
    expect(ten).toBeGreaterThan(0);
  });

  it("commercial impact is capped at CULT CLASSIC for fan web — even for a mega-hit", () => {
    const huge = commercialTierOf("fanweb", 50_000_000);
    expect(huge.id).toBe("cult");
    /* a professional medium of the same value climbs higher */
    expect(commercialTierOf("movie", 50_000_000).id).toBe("phenomenon");
    expect(commercialTierOf("tv", 1_600_000).index).toBeGreaterThanOrEqual(4);
    /* the same superb show can be a review hit while its commercial impact
       stays capped by the platform */
    const r = resultFor("fanweb");
    expect(r.total / 4).toBeGreaterThanOrEqual(8);
    expect(r.commercial.id).toBe("cult");
  });

  it("fan web runs a distinct, slow commercial model", () => {
    const web = resultFor("fanweb");
    const tv = resultFor("tv");
    expect(web.revenue).toBeLessThan(tv.revenue * 0.4);
    /* low money per view: ad revenue vs £2.60/unit */
    const webViews = web.sales.reduce((a, b) => a + b, 0);
    expect(web.revenue / webViews).toBeLessThan(WEB_ECONOMY.revenuePerView + 0.01);
    expect(web.revenue / webViews).toBeGreaterThan(WEB_ECONOMY.revenuePerView * 0.95);
    /* stronger fan conversion relative to cash */
    expect(web.fans / web.revenue).toBeGreaterThan(tv.fans / tv.revenue * 2);
    /* slower climb: the peak week arrives no earlier than broadcast */
    const webPeak = web.sales.indexOf(Math.max(...web.sales));
    const tvPeak = tv.sales.indexOf(Math.max(...tv.sales));
    expect(webPeak).toBeGreaterThanOrEqual(tvPeak);
  });

  it("payout labels are format-aware", () => {
    expect(payoutLabelFor("fanweb", "A")).toBe("“A” Open Video ads");
    expect(payoutLabelFor("ona", "A")).toContain("streaming licence");
    expect(payoutLabelFor("tv", "A")).toContain("broadcast");
    expect(payoutLabelFor("ova", "A")).toContain("home-video sales");
    expect(payoutLabelFor("special", "A")).toContain("special broadcast");
    expect(payoutLabelFor("movie", "A")).toContain("box office");
  });

  it("web scope choices stay legitimately narrow", () => {
    expect(MEDIUMS.fanweb.scopes).toEqual(["short", "standard"]);
  });
});
