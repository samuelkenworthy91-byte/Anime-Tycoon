import { CAREER_WEEKS, WEEKS_PER_YEAR } from "./data";

export type CareerEraId = "founding" | "breakthrough" | "major" | "global" | "legacy" | "sandbox";

export interface CareerEra {
  id: CareerEraId;
  name: string;
  startYear: number;
  endYear: number | null;
  blurb: string;
  managementFocus: string;
  delegationTier: 0 | 1 | 2 | 3 | 4;
}

export const CAREER_ERAS: readonly CareerEra[] = [
  { id: "founding", name: "Founding Era", startYear: 1, endYear: 3, blurb: "A tiny studio where every production can change the company.", managementFocus: "Survival, contracts and hands-on production", delegationTier: 0 },
  { id: "breakthrough", name: "Breakthrough Era", startYear: 4, endYear: 7, blurb: "The studio has a name. Franchises, awards and rivals start to matter.", managementFocus: "First franchises, department leads and deliberate growth", delegationTier: 1 },
  { id: "major", name: "Major Studio Era", startYear: 8, endYear: 12, blurb: "Multiple productions compete for the same people and rooms.", managementFocus: "Slate planning, delegation and prestige projects", delegationTier: 2 },
  { id: "global", name: "Global Era", startYear: 13, endYear: 18, blurb: "The studio is an international business as well as a creative house.", managementFocus: "International audiences, IP and portfolio strategy", delegationTier: 3 },
  { id: "legacy", name: "Legacy Era", startYear: 19, endYear: 25, blurb: "The studio is an institution. The player sets direction rather than clicking every task.", managementFocus: "Tentpoles, succession, rivals and legacy", delegationTier: 4 },
  { id: "sandbox", name: "Sandbox", startYear: 26, endYear: null, blurb: "The formal career is over; continue the studio without a finish line.", managementFocus: "Endless studio management", delegationTier: 4 },
] as const;

export const careerYearForWeek = (week: number): number =>
  Math.max(1, Math.floor(Math.max(0, week) / WEEKS_PER_YEAR) + 1);

export function careerEraForWeek(week: number): CareerEra {
  if (week >= CAREER_WEEKS) return CAREER_ERAS[CAREER_ERAS.length - 1];
  const year = careerYearForWeek(week);
  return CAREER_ERAS.find((era) => era.endYear !== null && year >= era.startYear && year <= era.endYear) ?? CAREER_ERAS[0];
}

export const careerProgress = (week: number): number =>
  Math.max(0, Math.min(1, week / CAREER_WEEKS));

export function eraTransitionAtWeek(week: number): CareerEra | null {
  const year = careerYearForWeek(week);
  return CAREER_ERAS.find((era) => era.id !== "sandbox" && era.startYear === year && week % WEEKS_PER_YEAR === 0) ?? null;
}

export function canDelegateRoutineProduction(week: number): boolean {
  return careerEraForWeek(week).delegationTier >= 2;
}

export function canDelegatePortfolioOps(week: number): boolean {
  return careerEraForWeek(week).delegationTier >= 3;
}
