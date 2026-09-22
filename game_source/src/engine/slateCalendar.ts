import { GENRES, type GenreId } from "./data";
import type { RunState } from "./state";
import type { SlateImportance, SlatePlan } from "./slate";

export type SlateCalendarStage = "development" | "preprod" | "animation" | "sound" | "post" | "marketing" | "release";

export interface SlateStageBlock {
  stage: SlateCalendarStage;
  label: string;
  short: string;
  startWeek: number;
  endWeek: number;
}

export interface SlateCalendarWarning {
  id: string;
  severity: "danger" | "caution" | "opportunity";
  title: string;
  body: string;
}

const STAGE_LABELS: Record<SlateCalendarStage, { label: string; short: string }> = {
  development: { label: "Development", short: "DEV" },
  preprod: { label: "Pre-production", short: "PRE" },
  animation: { label: "Animation", short: "ANI" },
  sound: { label: "Sound / Voice", short: "SND" },
  post: { label: "Post / QA", short: "POST" },
  marketing: { label: "Marketing", short: "MKT" },
  release: { label: "Release", short: "REL" },
};

const IMPORTANCE_DURATIONS: Record<SlateImportance, Record<Exclude<SlateCalendarStage, "release">, number>> = {
  supporting: { development: 2, preprod: 1, animation: 3, sound: 1, post: 1, marketing: 1 },
  standard: { development: 2, preprod: 2, animation: 4, sound: 2, post: 2, marketing: 1 },
  tentpole: { development: 3, preprod: 3, animation: 6, sound: 2, post: 2, marketing: 2 },
};

export const SLATE_ESTIMATED_COST: Record<SlateImportance, number> = {
  supporting: 90_000,
  standard: 260_000,
  tentpole: 700_000,
};

export function genreLabel(id: GenreId): string {
  return GENRES.find((genre) => genre.id === id)?.label ?? id;
}

export function slateStageBlocks(plan: SlatePlan): SlateStageBlock[] {
  const durations = IMPORTANCE_DURATIONS[plan.importance];
  const ordered: Exclude<SlateCalendarStage, "release">[] = [
    "development",
    "preprod",
    "animation",
    "sound",
    "post",
    "marketing",
  ];
  const total = ordered.reduce((sum, stage) => sum + durations[stage], 0);
  let cursor = plan.targetWeek - total;
  const blocks: SlateStageBlock[] = [];
  for (const stage of ordered) {
    const length = durations[stage];
    const meta = STAGE_LABELS[stage];
    blocks.push({ stage, label: meta.label, short: meta.short, startWeek: cursor, endWeek: cursor + length - 1 });
    cursor += length;
  }
  blocks.push({ stage: "release", label: STAGE_LABELS.release.label, short: STAGE_LABELS.release.short, startWeek: plan.targetWeek, endWeek: plan.targetWeek });
  return blocks;
}

export function slateStageAtWeek(plan: SlatePlan, week: number): SlateStageBlock | null {
  return slateStageBlocks(plan).find((block) => week >= block.startWeek && week <= block.endWeek) ?? null;
}

export function slateEstimatedStartWeek(plan: SlatePlan): number {
  return slateStageBlocks(plan)[0]?.startWeek ?? plan.targetWeek;
}

function plannedAnimationWeeks(plan: SlatePlan): number[] {
  const animation = slateStageBlocks(plan).find((block) => block.stage === "animation");
  if (!animation) return [];
  return Array.from({ length: animation.endWeek - animation.startWeek + 1 }, (_, i) => animation.startWeek + i);
}

function matchingGenre(a: readonly GenreId[] | undefined, b: readonly GenreId[] | undefined): GenreId | null {
  if (!a?.length || !b?.length) return null;
  return a.find((genre) => b.includes(genre)) ?? null;
}

export function slateCalendarWarnings(run: RunState, plans: readonly SlatePlan[]): SlateCalendarWarning[] {
  const warnings: SlateCalendarWarning[] = [];
  if (!plans.length) return warnings;

  const plannedCost = plans.reduce((sum, plan) => sum + SLATE_ESTIMATED_COST[plan.importance], 0);
  if (plannedCost > Math.max(150_000, run.cash * 0.9)) {
    warnings.push({
      id: "cash-risk",
      severity: "danger",
      title: "CASH RISK",
      body: `This slate roughly commits £${Math.round(plannedCost / 1000).toLocaleString()}k against £${Math.round(run.cash / 1000).toLocaleString()}k currently on hand.`,
    });
  }

  const animationMap = new Map<number, SlatePlan[]>();
  for (const plan of plans) {
    for (const week of plannedAnimationWeeks(plan)) {
      animationMap.set(week, [...(animationMap.get(week) ?? []), plan]);
    }
  }
  const worstAnimation = [...animationMap.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (worstAnimation && worstAnimation[1].length >= 2) {
    const names = worstAnimation[1].slice(0, 3).map((plan) => plan.title).join(" + ");
    warnings.push({
      id: `animation:${worstAnimation[0]}`,
      severity: worstAnimation[1].length >= 3 ? "danger" : "caution",
      title: "ANIMATION CRUNCH",
      body: `${names} overlap in animation around week ${worstAnimation[0]}. Expect your animation department to be the pressure point.`,
    });
  }

  const tentpoles = plans.filter((plan) => plan.importance === "tentpole");
  if (tentpoles.length > 1) {
    warnings.push({
      id: "tentpole-clash",
      severity: "caution",
      title: "TENTPOLE CLASH",
      body: `${tentpoles.length} tentpoles share this quarter. They will compete for your best staff, cash and publicity attention.`,
    });
  }

  for (let i = 0; i < plans.length; i += 1) {
    for (let j = i + 1; j < plans.length; j += 1) {
      const a = plans[i];
      const b = plans[j];
      const genre = matchingGenre(a.genres, b.genres);
      if (genre && Math.abs(a.targetWeek - b.targetWeek) <= 4) {
        warnings.push({
          id: `audience:${a.id}:${b.id}`,
          severity: "caution",
          title: "AUDIENCE CLASH",
          body: `${a.title} and ${b.title} both lean ${genreLabel(genre)} and release close together. They may split attention.`,
        });
        i = plans.length;
        break;
      }
    }
  }

  for (const plan of plans.filter((candidate) => candidate.licensedIpId)) {
    const contract = Object.values(run.ipMarket?.owned ?? {}).find((owned) => owned.ipId === plan.licensedIpId);
    if (contract && contract.expiresWeek <= plan.targetWeek) {
      warnings.push({
        id: `rights:${plan.id}`,
        severity: "danger",
        title: "RIGHTS EXPIRY",
        body: `${plan.title} is scheduled after its licence expires. Move it earlier or renew the rights before greenlighting.`,
      });
    }
  }

  const rivalPremieres = run.rivalWorld.studios.flatMap((studio) =>
    studio.productions.map((production) => ({ ...production, studioName: studio.name })),
  );
  for (const plan of plans) {
    const rival = rivalPremieres.find((production) =>
      Math.abs(production.week - plan.targetWeek) <= 2 &&
      !!matchingGenre(plan.genres, production.genres),
    );
    if (rival) {
      warnings.push({
        id: `rival:${plan.id}:${rival.id}`,
        severity: "caution",
        title: "RIVAL RELEASE",
        body: `${rival.studioName}'s ${rival.title} lands within two weeks of ${plan.title} in a matching genre.`,
      });
    }
  }

  for (const plan of plans) {
    for (const movement of run.industryMovements ?? []) {
      if (!movement.genre || !plan.genres?.includes(movement.genre)) continue;
      if (plan.targetWeek < movement.startsWeek || plan.targetWeek >= movement.endsWeek) continue;
      warnings.push({
        id: `movement:${plan.id}:${movement.id}`,
        severity: movement.kind === "revival" ? "opportunity" : movement.kind === "fatigue" ? "caution" : "opportunity",
        title: movement.kind === "revival" ? "MARKET OPPORTUNITY" : movement.kind === "fatigue" ? "GENRE FATIGUE" : "INDUSTRY WINDOW",
        body: movement.kind === "revival"
          ? `${plan.title} is currently timed inside the ${genreLabel(movement.genre)} revival.`
          : `${plan.title} is currently timed inside ${genreLabel(movement.genre)} fatigue.`,
      });
    }
  }

  const franchiseKeys = plans.map((plan) => plan.franchiseKey).filter((key): key is string => !!key);
  if (new Set(franchiseKeys).size < franchiseKeys.length) {
    warnings.push({
      id: "same-franchise",
      severity: "caution",
      title: "FRANCHISE CROWDING",
      body: "The same franchise appears more than once in this quarter.",
    });
  }

  return warnings.slice(0, 6);
}
