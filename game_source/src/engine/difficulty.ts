/* ======================================================================
 * CAMPAIGN DIFFICULTY / ANTI-SNOWBALL
 *
 * Success should create new problems rather than simply inflate every cost.
 * This module keeps the opening forgiving, then makes the industry react to
 * a studio that is winning early: rivals improve, audiences expect more,
 * salaries rise, elite talent becomes harder to poach, and running several
 * productions at once becomes a genuine management challenge.
 *
 * Everything here is derived from existing save fields, so old saves need no
 * schema migration and immediately receive an appropriate pressure level.
 * ==================================================================== */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

export type IndustryPressureBand = "rookie" | "noticed" | "contender" | "powerhouse" | "empire";

export interface IndustryPressureInput {
  week: number;
  cash: number;
  fans: number;
  awards: number;
  hits: number;
  bestScore: number;
  showsMade: number;
  playerRank?: number;
}

export interface IndustryPressure {
  /** 1-based campaign year */
  year: number;
  /** 0..6; chronology + visible success */
  level: number;
  band: IndustryPressureBand;
  /** added to next year's rival greenlight quality */
  rivalBoost: number;
  /** added to the existing audience expectation bar */
  audienceBar: number;
  /** multiplier on player staff payroll */
  salaryMult: number;
  /** summary strings for UI/debug/tests */
  reasons: string[];
}

/**
 * Career pressure begins gently but reacts immediately to a breakout.
 * Chronology alone never maxes the scale: a struggling studio still gets a
 * manageable campaign, while an early dynasty attracts tougher competition.
 */
export function industryPressure(input: IndustryPressureInput): IndustryPressure {
  const year = Math.max(1, Math.floor(Math.max(0, input.week) / 48) + 1);
  const reasons: string[] = [];
  let level = Math.min(3.8, Math.max(0, year - 1) * 0.42);
  if (year > 1) reasons.push(`Year ${year} industry maturity`);

  if (input.bestScore >= 30) { level += 0.65; reasons.push("breakout reviews"); }
  if (input.bestScore >= 34) { level += 0.45; reasons.push("elite reviews"); }
  if (input.bestScore >= 37) { level += 0.30; reasons.push("critical dominance"); }

  const hitPressure = Math.min(0.9, Math.max(0, input.hits) * 0.10);
  if (hitPressure > 0) { level += hitPressure; reasons.push("repeat hits"); }

  const awardPressure = Math.min(1.0, Math.max(0, input.awards) * 0.08);
  if (awardPressure > 0) { level += awardPressure; reasons.push("awards profile"); }

  if (input.fans >= 75_000) { level += 0.20; reasons.push("large fanbase"); }
  if (input.fans >= 250_000) level += 0.25;
  if (input.fans >= 1_000_000) { level += 0.30; reasons.push("mass audience"); }

  if (input.cash >= 500_000) level += 0.15;
  if (input.cash >= 2_000_000) { level += 0.20; reasons.push("deep reserves"); }
  if (input.cash >= 8_000_000) level += 0.25;
  if (input.cash >= 25_000_000) { level += 0.25; reasons.push("market power"); }

  /* playerRank starts at 1 on a fresh save, so only count it after Year 1. */
  if (year >= 2 && input.playerRank === 1 && input.showsMade >= 2) {
    level += 0.55;
    reasons.push("industry #1");
  }

  level = round2(clamp(level, 0, 6));
  const band: IndustryPressureBand =
    level < 1 ? "rookie" :
    level < 2.25 ? "noticed" :
    level < 3.5 ? "contender" :
    level < 4.75 ? "powerhouse" : "empire";

  return {
    year,
    level,
    band,
    rivalBoost: round2(Math.min(6, level * 0.95)),
    /* scoring converts audienceBar at −0.07 per critic; cap keeps reviews
       fundamentally absolute while an acclaimed studio has to keep evolving. */
    audienceBar: round2(Math.min(6, level * 0.9)),
    salaryMult: round2(1 + Math.min(0.28, level * 0.045)),
    reasons,
  };
}

export const campaignRivalBoost = (input: IndustryPressureInput) => industryPressure(input).rivalBoost;
export const campaignAudienceBar = (input: IndustryPressureInput) => industryPressure(input).audienceBar;
export const campaignSalaryMult = (input: IndustryPressureInput) => industryPressure(input).salaryMult;

/* ----------------------------------------------------------- fan flywheel */

/**
 * Fans still make every release safer, but no longer turn one hit into an
 * unlimited money printer. Rough landmarks:
 *   75k fans  ≈ ×1.35
 *   150k      ≈ ×1.55
 *   300k+     → approaches the ×1.80 ceiling
 */
export const FANBASE_SALES_CAP = 1.8;
export function fanBaseSalesMultiplier(fans: number): number {
  const positive = Math.max(0, fans);
  return Math.min(FANBASE_SALES_CAP, 1 + Math.log1p(positive / 75_000) * 0.5);
}

/* ------------------------------------------------------ management strain */

/**
 * One focused production has no management penalty. Each simultaneous extra
 * pipeline costs 7.5% studio-wide output; larger offices, department heads
 * and the flagship HQ claw some of that back. This makes scale powerful but
 * not free and turns management infrastructure into a real solution.
 */
export function managementOutputMult(
  activeProjects: number,
  officeLevel: number,
  departmentHeads: number,
  flagshipHq = false,
): number {
  const extras = Math.max(0, activeProjects - 1);
  if (!extras) return 1;
  const rawPenalty = extras * 0.075;
  const mitigation = Math.max(0, officeLevel) * 0.012 + Math.min(3, Math.max(0, departmentHeads)) * 0.012 + (flagshipHq ? 0.04 : 0);
  return round2(clamp(1 - rawPenalty + mitigation, 0.70, 1));
}

/* ----------------------------------------------------- rival talent market */

export interface TalentPressureInput extends IndustryPressureInput {
  officeLevel: number;
}

export interface TalentLike {
  skill: number;
  level: number;
  cost: number;
}

export interface RivalStudioLike {
  tier: number;
  reputation: number;
  rivalry: number;
}

export interface TalentPoachTerms {
  askingPrice: number;
  playerPrestige: number;
  requiredPrestige: number;
  blockedReason: string | null;
}

/** public-facing studio prestige used only for talent willingness. */
export function playerTalentPrestige(input: TalentPressureInput): number {
  const fanSignal = Math.log1p(Math.max(0, input.fans) / 10_000) * 8;
  return round2(clamp(
    input.bestScore * 1.5 +
      input.awards * 5 +
      input.hits * 2 +
      fanSignal +
      input.officeLevel * 7 +
      Math.max(0, input.showsMade - 2) * 0.5,
    0,
    160,
  ));
}

/**
 * Rival stars are employees under contract, not shop items. The asking price
 * includes a contract buyout and an employer protection/counter-offer premium.
 * Stronger or angrier studios demand more, and elite talent will refuse a
 * tiny newcomer no matter how much cash the player happens to have.
 */
export function talentPoachTerms(
  input: TalentPressureInput,
  talent: TalentLike,
  studio: RivalStudioLike,
): TalentPoachTerms {
  const pressure = industryPressure(input).level;
  const playerPrestige = playerTalentPrestige(input);
  const requiredPrestige = round2(
    42 + studio.tier * 8 + studio.reputation * 0.26 + talent.skill * 0.18 + studio.rivalry * 0.20,
  );

  const baseValue = 40_000 + talent.skill * 4_500 + talent.level * 25_000;
  const employerProtection = 1 + studio.tier * 0.12 + studio.reputation * 0.003 + studio.rivalry * 0.003;
  const successMarket = 1 + pressure * 0.08;
  const counterOffer = 1 + Math.min(0.30, studio.rivalry / 300 + (studio.reputation >= 70 ? 0.07 : 0));
  const raw = Math.max(talent.cost * 4, baseValue * employerProtection * successMarket * counterOffer);
  const askingPrice = Math.max(100_000, Math.round(raw / 25_000) * 25_000);

  const blockedReason = playerPrestige + 0.001 < requiredPrestige
    ? `Needs studio prestige ${Math.ceil(requiredPrestige)} (you ${Math.floor(playerPrestige)})`
    : null;

  return { askingPrice, playerPrestige, requiredPrestige, blockedReason };
}
