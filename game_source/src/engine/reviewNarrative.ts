export interface ReviewNarrativeContext {
  outlet: string;
  focus: string;
  score: number;
  total: number;
  quality: number;
  careerWeek: number;
  showsMade: number;
  baseQuote: string;
}

export const careerYearForWeek = (week: number) => Math.max(1, Math.floor(Math.max(0, week) / 48) + 1);

function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function pick(lines: string[], seed: string): string {
  if (!lines.length) return "";
  return lines[hash32(seed) % lines.length];
}

function outletVoice(outlet: string, band: "great" | "good" | "mixed" | "poor"): string[] {
  if (outlet === "Animage Monthly") {
    if (band === "great") return ["The writing has intent, structure and nerve.", "The script knows exactly what it wants to be."];
    if (band === "good") return ["The writing carries more of the weight than the spectacle.", "There is a real dramatic spine here."];
    if (band === "mixed") return ["The ideas are better than the structure holding them together.", "A rewrite could have turned this into something sharper."];
    return ["The script never finds a shape worth defending.", "The story problems begin early and compound from there."];
  }
  if (outlet === "Otaku Pulse") {
    if (band === "great") return ["People are going to be talking about this one all season.", "The clips are already writing their own fan culture."];
    if (band === "good") return ["Easy to root for, easy to recommend.", "The audience has plenty to latch onto here."];
    if (band === "mixed") return ["The discourse may be more entertaining than the show.", "There are fans here, but they are going to be arguing."];
    return ["This is heading for the wrong kind of trending page.", "Even the reaction images look exhausted."];
  }
  if (outlet === "The London Reel") {
    if (band === "great") return ["This is the sort of release that changes how the industry talks about a studio.", "A serious production from a studio demanding serious attention."];
    if (band === "good") return ["A credible professional release with clear strengths.", "The studio is beginning to look dependable."];
    if (band === "mixed") return ["There is ambition here, but not enough control.", "The production never quite justifies its confidence."];
    return ["The committee should be asking difficult questions after this.", "This is not a standard an established studio can defend."];
  }
  if (outlet === "StudioScope") {
    if (band === "great") return ["The craft departments are working in unusually clean harmony.", "Direction, animation and sound are all pulling the same way."];
    if (band === "good") return ["Technically sound, with several sequences that rise above the baseline.", "The pipeline has produced a genuinely polished result."];
    if (band === "mixed") return ["The production inconsistencies are visible from scene to scene.", "Good cuts keep colliding with avoidable technical compromises."];
    return ["The production pipeline has left too many problems on screen.", "The technical shortcomings are impossible to disguise."];
  }
  return [];
}

/**
 * The score still comes from the scoring engine; this function changes only
 * the critic's displayed line. Career references are deterministic so loading
 * the same release cannot reroll a more flattering quote.
 */
export function contextualReviewQuote(ctx: ReviewNarrativeContext): string {
  const year = careerYearForWeek(ctx.careerWeek);
  const debut = ctx.showsMade === 0;
  const band = ctx.score >= 9 ? "great" : ctx.score >= 7 ? "good" : ctx.score >= 5 ? "mixed" : "poor";
  const seed = `${ctx.outlet}|${ctx.focus}|${ctx.score}|${ctx.total}|${Math.round(ctx.quality)}|${year}|${ctx.showsMade}`;

  if (debut) {
    if (ctx.score >= 9) return pick([
      "A debut this assured is absurd. Keep the studio name handy.",
      "First production, and already this controlled. That gets attention.",
      "For a debut, this is frighteningly complete.",
    ], seed);
    if (ctx.score >= 7) return pick([
      "A strong debut. The rough edges are there, but so is the promise.",
      "For a first production, there is a lot here worth following.",
      "A credible opening statement from a studio still learning the room.",
    ], seed);
    if (ctx.score >= 5) return pick([
      "A recognisable debut: promising instincts, rookie mistakes everywhere.",
      "The first-production nerves are obvious, but there is something to build on.",
      "Uneven, inexperienced and occasionally interesting. A very first show.",
    ], seed);
    return pick([
      "A painful debut. The studio has learned, at least, how much it still has to learn.",
      "First production, first hard lesson. Almost nothing here is ready for prime time.",
      "A debut this rough makes survival to production two the immediate objective.",
    ], seed);
  }

  if (year === 2 && ctx.score <= 5) return pick([
    "Year two should be where the rookie errors start disappearing. They have not.",
    "A second-year studio can no longer hide every mistake behind inexperience.",
    "There has been time to learn since the debut. Too little of it is visible here.",
  ], seed);

  if (year === 3 && ctx.score <= 5) return pick([
    "Three years in, this is a poor show. The beginner's excuse has expired.",
    "Year three, and the same avoidable weaknesses are still making it to air.",
    "A studio in its third year should be producing with far more control than this.",
  ], seed);

  if (year >= 4 && ctx.score <= 4) return pick([
    `Year ${year}: an established studio delivering work this weak is difficult to excuse.`,
    `After ${year} years, this feels less like a mistake and more like a warning sign.`,
    `A Year ${year} studio should not be shipping something this undercooked.`,
  ], seed);

  if (year >= 4 && ctx.score === 5) return pick([
    `Year ${year}, and merely surviving the review is not enough anymore.`,
    `At this stage of the studio's life, competent-but-fragile work feels like regression.`,
    `An established Year ${year} outfit should be setting a higher floor than this.`,
  ], seed);

  if (year <= 2 && ctx.score >= 9) return pick([
    `Only Year ${year}, and the studio is already producing work with veteran confidence.`,
    `This early in a career, a score like this changes expectations immediately.`,
    `A breakthrough arriving in Year ${year}. Rivals will notice.`,
  ], seed);

  if (year >= 3 && ctx.score >= 9) return pick([
    `Year ${year} and the studio looks fully formed. This is elite work.`,
    `The experience is visible now: controlled, confident and difficult to fault.`,
    `This is what an established studio is supposed to grow into.`,
  ], seed);

  const voice = outletVoice(ctx.outlet, band);
  if (voice.length) return pick(voice, seed);
  return ctx.baseQuote;
}
