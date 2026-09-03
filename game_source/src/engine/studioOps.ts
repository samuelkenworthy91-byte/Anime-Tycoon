import { staffPoint, type Contract, type PointType, type Staff } from "./data";

export interface ContractAssignment {
  id: string;
  contract: Contract;
  staffIds: string[];
  /** Founding showrunner can personally take one of the three seats. */
  showrunner?: boolean;
  startWeek: number;
  dueWeek: number;
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
}

export interface ResearchJob {
  id: string;
  researchId: string;
  name: string;
  startWeek: number;
  completesWeek: number;
  rdCost: number;
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

export function contractWeeklyOutput(contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0): number {
  const pipeline = research.includes("pipeline") ? 1.12 : 1;
  const base = 4;
  const runner = showrunnerSkill > 0 ? showrunnerSkill * 0.16 : 0;
  return Math.max(
    1,
    Math.round((base + runner + crew.reduce((a, s) => a + staffPoint(s, contract.type) * (0.14 + s.stamina / 1000), 0)) * pipeline)
  );
}

/** Approximate live desk-bubble output per in-game day for the Jobs UI.
 * Actual delivery remains RNG-driven and can be faster or slower. */
export function contractDailyOutputEstimate(contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0): number {
  const pipeline = research.includes("pipeline") ? 1.12 : 1;
  const one = (skill: number) => {
    const s = Math.max(1, Math.min(99, skill));
    const chance = Math.min(0.97, 0.62 + s / 300);
    const avgBubble = Math.min(6, 1 + s / 34 + 0.9);
    return 5.7 * chance * avgBubble;
  };
  const staff = crew.reduce((a, s) => a + one(staffPoint(s, contract.type)), 0);
  const runner = showrunnerSkill > 0 ? one(showrunnerSkill) : 0;
  return Math.max(1, Math.round((staff + runner) * pipeline));
}

export const projectedContractTotal = (contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0) =>
  contractDailyOutputEstimate(contract, crew, research, showrunnerSkill) * contract.weeks * 7;

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
