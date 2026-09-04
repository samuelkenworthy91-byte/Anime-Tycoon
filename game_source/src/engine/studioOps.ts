import { staffPoint, type Contract, type PointType, type Staff } from "./data";

export interface ContractAssignment {
  id: string;
  contract: Contract;
  staffIds: string[];
  /** Founding showrunner can personally take one of the three seats. */
  showrunner?: boolean;
  startWeek: number;
  dueWeek: number;
  /** day-accurate deadline used by the live studio clock */
  startDay?: number;
  dueDay?: number;
  progress: number;
  /** progress already produced by live desk bubbles in the current week */
  liveProgressThisWeek?: number;
}

export interface TrainingJob {
  id: string;
  staffId: string;
  staffName: string;
  focus: PointType;
  tier: number;
  startWeek: number;
  completesWeek: number;
  startDay?: number;
  completesDay?: number;
}

export interface ResearchJob {
  id: string;
  researchId: string;
  name: string;
  startWeek: number;
  completesWeek: number;
  startDay?: number;
  completesDay?: number;
  rdCost: number;
}

/** Live-clock constants shared by playback, ETA maths and tests. */
export const LIVE_DAY_MS = 10_000;
export const LIVE_WORK_PULSE_BASE_MS = 1_750;
export const LIVE_WORK_PULSES_PER_DAY = LIVE_DAY_MS / LIVE_WORK_PULSE_BASE_MS;
export const SHOWRUNNER_CONTRACT_PULSE_CHANCE = 0.34;

/** Playback speed changes real time only. Every speed therefore gets the same
 * expected number of contribution checks per in-game day. */
export function liveWorkPulseGapMs(speed: number): number {
  if (speed <= 0) return LIVE_WORK_PULSE_BASE_MS;
  return Math.max(80, Math.round(LIVE_WORK_PULSE_BASE_MS / speed));
}

export const trainingWeeks = (tier: number) => Math.max(2, 5 - Math.max(1, tier));
export const researchWeeks = (rd: number, archiveTier: number) => Math.max(2, Math.round(2 + rd / 18) - archiveTier);

export function showrunnerContractSkill(showrunner: string, showsMade: number, type: PointType): number {
  const base = Math.min(90, 50 + showsMade * 2);
  const speciality =
    showrunner === "steady" && type === "art" ? 12
    : showrunner === "vision" && type === "story" ? 12
    : showrunner === "producer" ? 8
    : showrunner === "marketer" && type === "sound" ? 8
    : 0;
  return Math.min(99, base + speciality);
}

/** Showrunners are senior contributors, not another junior desk roll.
 * Every personal showrunner bubble gets +1 on top of the normal percentile output. */
export function showrunnerBubbleOutput(effectiveSkill: number, roll = Math.random()): number {
  const skill = Math.max(0, effectiveSkill);
  const guaranteed = Math.floor(skill / 100);
  const remainder = skill - guaranteed * 100;
  return 1 + guaranteed + (roll * 100 < remainder ? 1 : 0);
}

export function contractWeeklyOutput(contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0): number {
  const pipeline = research.includes("pipeline") ? 1.12 : 1;
  const base = 4;
  /* Legacy/headless cadence mirrors the live senior-bubble floor. */
  const runner = showrunnerSkill > 0 ? 6 + showrunnerSkill * 0.16 : 0;
  return Math.max(
    1,
    Math.round((base + runner + crew.reduce((a, s) => a + staffPoint(s, contract.type) * (0.14 + s.stamina / 1000), 0)) * pipeline)
  );
}

/** Approximate live desk-bubble output per in-game day for the Jobs UI.
 * Actual delivery remains RNG-driven and can be faster or slower. */
export function contractDailyOutputEstimate(contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0): number {
  const pipeline = research.includes("pipeline") ? 1.12 : 1;
  const staffPerPulse = crew.reduce((a, s) => a + (staffPoint(s, contract.type) * pipeline) / 100, 0);
  const runnerEffective = showrunnerSkill * pipeline;
  const runnerPerPulse = showrunnerSkill > 0
    ? SHOWRUNNER_CONTRACT_PULSE_CHANCE * (1 + runnerEffective / 100)
    : 0;
  return Math.max(0.1, Math.round((staffPerPulse + runnerPerPulse) * LIVE_WORK_PULSES_PER_DAY * 10) / 10);
}

export const projectedContractTotal = (contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0) =>
  Math.round(contractDailyOutputEstimate(contract, crew, research, showrunnerSkill) * contract.weeks * 7);

/** Better staff need less Research Data to reach the same boost confidence. */
export function rushResearchCost(skill: number, chance: number): number {
  const base = chance >= 0.8 ? 14 : chance >= 0.5 ? 8 : 4;
  const expertise = Math.max(0.48, 1.15 - Math.min(99, skill) / 160);
  return Math.max(1, Math.round(base * expertise));
}

export const rushStreamPoint = (skill: number, roll: number) =>
  Math.max(2, Math.round(Math.min(99, skill) * (0.045 + Math.max(0, Math.min(1, roll)) * 0.035)));

export const rushBoostPoint = (skill: number) => Math.max(6, Math.round(4 + Math.min(99, skill) * 0.13));

/** Stronger rush specialists now have a substantially higher floor AND ceiling. */
export function rushOutcomeRange(skill: number): { min: number; max: number } {
  const s = Math.max(1, Math.min(99, Math.round(skill)));
  const min = Math.max(4, Math.round(8 + s * 0.45));
  const max = Math.max(min + 6, Math.round(18 + s * 0.90));
  return { min, max };
}

/** The rest of the assigned production team still matters during a lead spotlight. */
export const rushTeamSupport = (skills: number[]) =>
  Math.min(30, Math.round(skills.reduce((a, v) => a + Math.max(0, Math.min(99, v)) * 0.08, 0)));
