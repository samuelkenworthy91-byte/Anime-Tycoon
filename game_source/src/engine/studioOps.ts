import { staffPoint, type Contract, type PointType, type Staff } from "./data";

export interface ContractAssignment {
  id: string;
  contract: Contract;
  staffIds: string[];
  startWeek: number;
  dueWeek: number;
  progress: number;
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

export function contractWeeklyOutput(contract: Contract, crew: Staff[], research: string[] = []): number {
  const pipeline = research.includes("pipeline") ? 1.12 : 1;
  const base = 4; // showrunner / producer coordination
  return Math.max(
    1,
    Math.round(
      (base + crew.reduce((a, s) => a + staffPoint(s, contract.type) * (0.14 + s.stamina / 1000), 0)) * pipeline
    )
  );
}

export const projectedContractTotal = (contract: Contract, crew: Staff[], research: string[] = []) =>
  contractWeeklyOutput(contract, crew, research) * contract.weeks;
