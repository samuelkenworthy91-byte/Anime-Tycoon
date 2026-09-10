import { describe, expect, it } from "vitest";
import { GENRES, SECRET_COMBOS, comboKey, comboMult, type GenreId } from "../data";
import { arcClashesFor, genreReleaseEffect } from "../creativeDiscovery";
import { genrePairQualityMultiplier } from "../genreTargets";
import { careerYearForWeek, contextualReviewQuote } from "../reviewNarrative";

function pairWhere(test: (mult: number) => boolean): GenreId[] {
  for (let a = 0; a < GENRES.length; a += 1) {
    for (let b = a + 1; b < GENRES.length; b += 1) {
      const pair = [GENRES[a].id, GENRES[b].id] as GenreId[];
      const key = comboKey(pair);
      if (key in SECRET_COMBOS) continue;
      if (test(comboMult(pair, true))) return pair;
    }
  }
  throw new Error("No matching genre pair found in the live manifest");
}

describe("creative discovery consequences", () => {
  it("gives secret experimental genre pairs a conspicuous commercial jackpot", () => {
    const key = Object.keys(SECRET_COMBOS)[0];
    expect(key).toBeTruthy();
    const pair = key.split("|") as GenreId[];
    const fx = genreReleaseEffect(pair);
    expect(fx.secret).toBe(true);
    expect(fx.kind).toBe("secret");
    expect(fx.salesMultiplier).toBeGreaterThanOrEqual(1.35);
  });

  it("makes weak known genre pairings hurt both quality and sales", () => {
    const pair = pairWhere((mult) => mult < 0.97);
    const base = comboMult(pair, true);
    const fx = genreReleaseEffect(pair);
    expect(genrePairQualityMultiplier(base)).toBeLessThan(1);
    expect(fx.salesMultiplier).toBeLessThan(1);
  });

  it("makes ordered story clashes care about sequence", () => {
    expect(arcClashesFor(["finale", "origin"]).some((c) => c.id === "clash_finale_before_origin")).toBe(true);
    expect(arcClashesFor(["origin", "finale"]).some((c) => c.id === "clash_finale_before_origin")).toBe(false);
    expect(arcClashesFor(["twist", "case"]).some((c) => c.id === "clash_twist_before_case")).toBe(true);
  });
});

describe("career-aware reviewer lines", () => {
  const base = {
    outlet: "The London Reel",
    focus: "industry",
    total: 18,
    quality: 18,
    baseQuote: "Fallback quote.",
  } as const;

  it("identifies the studio debut", () => {
    const quote = contextualReviewQuote({ ...base, score: 4, careerWeek: 0, showsMade: 0 });
    expect(quote.toLowerCase()).toMatch(/debut|first production/);
  });

  it("can explicitly criticise a poor third-year release", () => {
    expect(careerYearForWeek(96)).toBe(3);
    const quote = contextualReviewQuote({ ...base, score: 4, careerWeek: 96, showsMade: 7 });
    expect(quote.toLowerCase()).toMatch(/three years|year three|third year/);
  });

  it("is deterministic for a saved release", () => {
    const ctx = { ...base, score: 9, total: 36, quality: 37, careerWeek: 110, showsMade: 9 };
    expect(contextualReviewQuote(ctx)).toBe(contextualReviewQuote(ctx));
  });
});
