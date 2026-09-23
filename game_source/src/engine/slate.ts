import { WEEKS_PER_YEAR, type Draft, type GenreId } from "./data";
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
  /** rough creative direction for calendar forecasts; creation can still change it */
  genres?: GenreId[];
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

/** Moving a planned release normally burns one banked planning week per week
 * moved. Jen Wailer can slide a release up to three weeks either way without
 * disturbing the team's preparation. */
export function rescheduleSlatePlan(
  run: RunState,
  id: string,
  targetWeek: number,
  patch: Partial<SlatePlan> = {},
): RunState {
  const plan = (run.slatePlans ?? []).find((candidate) => candidate.id === id);
  if (!plan) return run;
  const delta = Math.abs(targetWeek - plan.targetWeek);
  const preserve = run.showrunner === "planner" && delta <= 3;
  const createdWeek = preserve || delta === 0
    ? plan.createdWeek
    : Math.min(run.week, plan.createdWeek + delta);
  return updateSlatePlan(run, id, { ...patch, targetWeek, createdWeek });
}

export function removeSlatePlan(run: RunState, id: string): RunState {
  return { ...run, slatePlans: (run.slatePlans ?? []).filter((plan) => plan.id !== id), activeSlateSetupPlanId: run.activeSlateSetupPlanId === id ? undefined : run.activeSlateSetupPlanId };
}

export const SLATE_PREP_MIN_WEEKS = 4;
export interface SlatePreparation {
  planId: string;
  importance: SlateImportance;
  weeksPlanned: number;
  effectiveWeeks: number;
  ready: boolean;
  label: "IMPROVISED" | "PREPARED" | "READY" | "LOCKED" | "LONG LEAD";
  hypeBonus: number;
  burnDiscount: number;
  paceBonus: number;
  issueChanceMult: number;
  deadlineBufferWeeks: number;
  targetWeek: number;
}

/** Advance planning now matters progressively rather than flipping one binary
 * switch. Elliot Mercer accelerates every slate; Freja accelerates franchise
 * planning specifically. */
export function slatePreparation(plan: SlatePlan, nowWeek: number, showrunner?: string): SlatePreparation {
  const weeksPlanned = Math.max(0, nowWeek - plan.createdWeek);
  const speed = showrunner === "planner"
    ? 1.50
    : showrunner === "operations" || (showrunner === "franchise" && plan.kind === "franchise")
      ? 1.25
      : 1;
  const effectiveWeeks = Math.max(0, Math.round(weeksPlanned * speed));
  const importanceHype = plan.importance === "tentpole" ? 2 : plan.importance === "standard" ? 1 : 0;
  let label: SlatePreparation["label"] = "IMPROVISED";
  let hypeBonus = 0;
  let burnDiscount = 0;
  let paceBonus = 0;
  let issueChanceMult = 1;
  let deadlineBufferWeeks = 0;
  if (effectiveWeeks >= 20) {
    label = "LONG LEAD"; hypeBonus = 8 + importanceHype; burnDiscount = 0.08; paceBonus = 0.05; issueChanceMult = 0.85; deadlineBufferWeeks = 2;
  } else if (effectiveWeeks >= 12) {
    label = "LOCKED"; hypeBonus = 6 + importanceHype; burnDiscount = 0.07; paceBonus = 0.05; issueChanceMult = 0.90; deadlineBufferWeeks = 1;
  } else if (effectiveWeeks >= 8) {
    label = "READY"; hypeBonus = 4 + importanceHype; burnDiscount = 0.05; paceBonus = 0.03;
  } else if (effectiveWeeks >= 4) {
    label = "PREPARED"; hypeBonus = 2 + importanceHype; burnDiscount = 0.03;
  }
  return {
    planId: plan.id,
    importance: plan.importance,
    weeksPlanned,
    effectiveWeeks,
    ready: effectiveWeeks >= SLATE_PREP_MIN_WEEKS,
    label,
    hypeBonus,
    burnDiscount,
    paceBonus,
    issueChanceMult,
    deadlineBufferWeeks,
    targetWeek: plan.targetWeek,
  };
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
  const preparation = slatePreparation(plan, run.week, run.showrunner);
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
