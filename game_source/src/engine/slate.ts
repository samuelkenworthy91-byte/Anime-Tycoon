import { WEEKS_PER_YEAR } from "./data";
import type { RunState } from "./state";

export type SlatePlanKind = "original" | "franchise" | "licensed";
export type SlateImportance = "supporting" | "standard" | "tentpole";

export interface SlatePlan {
  id: string;
  kind: SlatePlanKind;
  title: string;
  targetWeek: number;
  importance: SlateImportance;
  franchiseKey?: string;
  licensedIpId?: string;
  createdWeek: number;
  status: "planned" | "setup";
}

declare module "./state" {
  interface RunState {
    slatePlans?: SlatePlan[];
  }
}

export const QUARTER_WEEKS = WEEKS_PER_YEAR / 4;

export function careerCalendarYear(week: number): number {
  return Math.floor(Math.max(0, week) / WEEKS_PER_YEAR) + 1;
}

export function weekWithinYear(week: number): number {
  return ((Math.max(0, week) % WEEKS_PER_YEAR) + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;
}

export function quarterIndexForWeek(week: number): number {
  return Math.min(3, Math.floor(weekWithinYear(week) / QUARTER_WEEKS));
}

export function quarterStartWeek(year: number, quarter: number): number {
  return (Math.max(1, year) - 1) * WEEKS_PER_YEAR + Math.max(0, Math.min(3, quarter)) * QUARTER_WEEKS;
}

export function addSlatePlan(
  run: RunState,
  input: Omit<SlatePlan, "id" | "createdWeek" | "status">,
): RunState {
  const seq = (run.slatePlans?.length ?? 0) + 1;
  const plan: SlatePlan = {
    ...input,
    id: `slate:${run.week}:${seq}:${input.kind}`,
    createdWeek: run.week,
    status: "planned",
  };
  return { ...run, slatePlans: [...(run.slatePlans ?? []), plan] };
}

export function updateSlatePlan(run: RunState, id: string, patch: Partial<SlatePlan>): RunState {
  return { ...run, slatePlans: (run.slatePlans ?? []).map((plan) => plan.id === id ? { ...plan, ...patch, id: plan.id } : plan) };
}

export function removeSlatePlan(run: RunState, id: string): RunState {
  return { ...run, slatePlans: (run.slatePlans ?? []).filter((plan) => plan.id !== id) };
}

export function plansForQuarter(run: Pick<RunState, "slatePlans">, year: number, quarter: number): SlatePlan[] {
  const start = quarterStartWeek(year, quarter);
  const end = start + QUARTER_WEEKS - 1;
  return (run.slatePlans ?? []).filter((plan) => plan.targetWeek >= start && plan.targetWeek <= end).sort((a, b) => a.targetWeek - b.targetWeek);
}

export function slatePlanPressure(plan: SlatePlan): number {
  return plan.importance === "tentpole" ? 3 : plan.importance === "standard" ? 2 : 1;
}

export function slateQuarterWarnings(run: RunState, year: number, quarter: number): string[] {
  const plans = plansForQuarter(run, year, quarter);
  const warnings: string[] = [];
  const pressure = plans.reduce((sum, plan) => sum + slatePlanPressure(plan), 0);
  const capacity = Math.max(2, 2 + run.officeLevel * 2);
  if (pressure > capacity) warnings.push(`Planned slate pressure ${pressure} exceeds the studio's rough safe load of ${capacity}.`);
  const tentpoles = plans.filter((plan) => plan.importance === "tentpole");
  if (tentpoles.length > 1) warnings.push("Multiple tentpoles share this quarter and may compete for your best staff, marketing and cash.");
  if (plans.length >= 3 && run.cash < 500_000) warnings.push("This quarter is crowded relative to current cash reserves.");
  const franchiseKeys = plans.map((plan) => plan.franchiseKey).filter(Boolean);
  if (new Set(franchiseKeys).size < franchiseKeys.length) warnings.push("The same franchise appears multiple times in one quarter.");
  return warnings;
}
