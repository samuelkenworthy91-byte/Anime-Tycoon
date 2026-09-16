import type { Staff } from "./data";
import { potentialOf } from "./careers";

export const STAFF_APPRAISAL_RESEARCH_ID = "staff_appraisal";
export const TALENT_SCOUTING_RESEARCH_ID = "talent_scouting";

export interface PotentialBand {
  min: number;
  max: number;
  label: string;
}

export const POTENTIAL_BANDS: PotentialBand[] = [
  { min: 1, max: 10, label: "Quietly Quit" },
  { min: 11, max: 20, label: "Very Limited" },
  { min: 21, max: 30, label: "Limited Upside" },
  { min: 31, max: 40, label: "Modest Potential" },
  { min: 41, max: 50, label: "Solid Professional" },
  { min: 51, max: 60, label: "Promising" },
  { min: 61, max: 70, label: "High Potential" },
  { min: 71, max: 80, label: "Breakout Talent" },
  { min: 81, max: 90, label: "Elite Prospect" },
  { min: 91, max: 100, label: "Generational Talent" },
];

export const potentialBandForValue = (value: number): PotentialBand => {
  const clamped = Math.max(1, Math.min(100, Math.round(value)));
  return POTENTIAL_BANDS.find((band) => clamped >= band.min && clamped <= band.max) ?? POTENTIAL_BANDS[POTENTIAL_BANDS.length - 1];
};

export const potentialLabel = (staff: Staff): string => potentialBandForValue(potentialOf(staff)).label;

export const canSeeEmployeePotential = (research: readonly string[]): boolean =>
  research.includes(STAFF_APPRAISAL_RESEARCH_ID) || research.includes(TALENT_SCOUTING_RESEARCH_ID);

export const canSeeCandidatePotential = (research: readonly string[]): boolean =>
  research.includes(TALENT_SCOUTING_RESEARCH_ID);
