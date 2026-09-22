import { WEEKS_PER_YEAR, type Draft } from "./data";
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
    /** the plan whose START SETUP button opened the current creation flow */
    activeSlateSetupPlanId?: string;
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
  return { ...run, slatePlans: (run.slatePlans ?? []).filter((plan) => plan.id !== id), activeSlateSetupPlanId: run.activeSlateSetupPlanId === id ? undefined : run.activeSlateSetupPlanId };
}

export const SLATE_PREP_MIN_WEEKS = 4;
export interface SlatePreparation {
  planId: string;
  importance: SlateImportance;
  weeksPlanned: number;
  ready: boolean;
  hypeBonus: number;
  burnDiscount: number;
  deadlineBufferWeeks: number;
}

export function slatePreparation(plan: SlatePlan, nowWeek: number): SlatePreparation {
  const weeksPlanned = Math.max(0, nowWeek - plan.createdWeek);
  const ready = weeksPlanned >= SLATE_PREP_MIN_WEEKS;
  const values = plan.importance === "tentpole"
    ? { hypeBonus: 10, burnDiscount: 0.08, deadlineBufferWeeks: 1 }
    : plan.importance === "standard"
      ? { hypeBonus: 7, burnDiscount: 0.06, deadlineBufferWeeks: 1 }
      : { hypeBonus: 4, burnDiscount: 0.04, deadlineBufferWeeks: 0 };
  return { planId: plan.id, importance: plan.importance, weeksPlanned, ready, hypeBonus: ready ? values.hypeBonus : 0, burnDiscount: ready ? values.burnDiscount : 0, deadlineBufferWeeks: ready ? values.deadlineBufferWeeks : 0 };
}

export function armSlatePlan(run: RunState, id: string): RunState {
  return { ...updateSlatePlan(run, id, { status: "setup" }), activeSlateSetupPlanId: id };
}

function planMatchesDraft(plan: SlatePlan, draft: Draft): boolean {
  if (plan.kind === "licensed") return !!plan.licensedIpId && draft.licensedIpId === plan.licensedIpId;
  if (plan.kind === "franchise") return !!plan.franchiseKey && draft.franchiseKey === plan.franchiseKey;
  return !draft.licensedIpId && !draft.franchiseKey;
}

export function consumeArmedSlatePlan(run: RunState, draft: Draft): { run: RunState; preparation: SlatePreparation | null } {
  const id = run.activeSlateSetupPlanId;
  if (!id) return { run, preparation: null };
  const plan = (run.slatePlans ?? []).find((candidate) => candidate.id === id);
  if (!plan || !planMatchesDraft(plan, draft)) return { run: { ...run, activeSlateSetupPlanId: undefined }, preparation: null };
  const preparation = slatePreparation(plan, run.week);
  return {
    run: { ...run, slatePlans: (run.slatePlans ?? []).filter((candidate) => candidate.id !== id), activeSlateSetupPlanId: undefined },
    preparation,
  };
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
