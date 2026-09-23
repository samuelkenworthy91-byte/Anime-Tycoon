import type { Draft, GenreId } from "./data";
import type { ShowResult } from "./scoring";
import type { RunState } from "./state";

export type AudienceSegmentId = "core" | "casual" | "online" | "prestige" | "collectors";

export interface AudienceProfile {
  core: number;
  casual: number;
  online: number;
  prestige: number;
  collectors: number;
  dominant: AudienceSegmentId;
}

export interface AudienceProfileRecord {
  title: string;
  week: number;
  reach: number;
  profile: AudienceProfile;
}

declare module "./state" {
  interface RunState {
    audienceProfiles?: Record<string, AudienceProfileRecord>;
    franchiseAudienceProfiles?: Record<string, AudienceProfile>;
  }
}

const genreSignals: Partial<Record<GenreId, Partial<Record<AudienceSegmentId, number>>>> = {
  mecha: { core: 2, collectors: 3, online: 1 },
  isekai: { core: 2, online: 3, casual: 1 },
  slice: { prestige: 2, online: 1, casual: 1 },
  horror: { core: 2, prestige: 2, online: 1 },
  romance: { casual: 2, online: 3, prestige: 1 },
  sports: { casual: 3, online: 2, core: 1 },
  cyber: { core: 2, prestige: 2, online: 2 },
  fantasy: { casual: 3, core: 1, collectors: 2 },
  idol: { online: 4, collectors: 3, core: 1 },
  mystery: { prestige: 3, core: 1 },
  comedy: { casual: 3, online: 2 },
  cooking: { casual: 3, online: 2 },
  military: { core: 2, prestige: 2, collectors: 1 },
  supernatural: { core: 2, casual: 2, online: 2 },
  space: { prestige: 2, collectors: 2, core: 1 },
  magical: { online: 2, collectors: 3, casual: 2 },
  survival: { casual: 2, online: 2, core: 1 },
  pirate: { casual: 2, collectors: 2, online: 1 },
  martial: { casual: 3, core: 2, online: 2 },
  mythology: { prestige: 2, collectors: 1, core: 1 },
  nordic: { prestige: 2, core: 1 },
  samurai: { prestige: 3, core: 2, collectors: 1 },
  shinobi: { casual: 2, core: 2, online: 2 },
  vampire: { online: 3, core: 2, collectors: 1 },
  grimdark: { prestige: 2, core: 3 },
  monster_taming: { casual: 3, collectors: 4, online: 2 },
  crime: { prestige: 3, casual: 1 },
  kaiju: { casual: 3, collectors: 3, core: 2 },
  cosmic_horror: { core: 3, prestige: 3 },
  arabia: { casual: 2, prestige: 1, collectors: 2 },
};

const ids: AudienceSegmentId[] = ["core", "casual", "online", "prestige", "collectors"];

function normalize(scores: Record<AudienceSegmentId, number>): AudienceProfile {
  const total = ids.reduce((sum, id) => sum + Math.max(0.1, scores[id]), 0);
  const values = Object.fromEntries(ids.map((id) => [id, Math.round(scores[id] / total * 100)])) as Record<AudienceSegmentId, number>;
  const rounding = 100 - ids.reduce((sum, id) => sum + values[id], 0);
  values.core += rounding;
  const dominant = [...ids].sort((a, b) => values[b] - values[a])[0];
  return { ...values, dominant };
}

function audienceScoresForDraft(draft: Draft): Record<AudienceSegmentId, number> {
  const scores: Record<AudienceSegmentId, number> = { core: 4, casual: 4, online: 4, prestige: 3, collectors: 3 };
  for (const genre of draft.genres) {
    const signal = genreSignals[genre] ?? {};
    for (const id of ids) scores[id] += signal[id] ?? 0;
  }
  if (draft.audience === "kids" || draft.audience === "family") scores.casual += 3;
  if (draft.audience === "teens") scores.online += 2;
  if (draft.audience === "adults") scores.prestige += 2;
  if (draft.medium === "fanweb" || draft.medium === "ona") scores.online += 3;
  if (draft.medium === "movie") { scores.prestige += 3; scores.casual += 1; }
  if (draft.pet !== "none") scores.collectors += 1.5;
  return scores;
}

/** Ryka can read the likely audience shape from the concept before release.
 * This excludes quality/commercial-result signals that only exist after air. */
export function audienceProfileForDraft(draft: Draft): AudienceProfile {
  return normalize(audienceScoresForDraft(draft));
}

export function audienceProfileForRelease(draft: Draft, result: Pick<ShowResult, "total" | "fans" | "commercial" | "chemMult">): AudienceProfile {
  const scores = audienceScoresForDraft(draft);
  if (result.total >= 32) scores.prestige += 3;
  if (result.total <= 18) scores.core += 1.5;
  if (result.commercial.index >= 4) scores.casual += 4;
  if (result.chemMult >= 1.08) scores.online += 1.5;
  return normalize(scores);
}

function blend(a: AudienceProfile | undefined, b: AudienceProfile, oldWeight = 2, newWeight = 1): AudienceProfile {
  if (!a) return b;
  const scores = Object.fromEntries(ids.map((id) => [id, a[id] * oldWeight + b[id] * newWeight])) as Record<AudienceSegmentId, number>;
  return normalize(scores);
}

export function recordAudienceProfile(
  run: RunState,
  projectId: string,
  franchiseKey: string,
  draft: Draft,
  result: ShowResult,
): RunState {
  const profile = audienceProfileForRelease(draft, result);
  const previous = run.franchiseAudienceProfiles?.[franchiseKey];
  return {
    ...run,
    audienceProfiles: {
      ...(run.audienceProfiles ?? {}),
      [projectId]: { title: draft.title, week: run.week, reach: Math.max(0, Math.round(result.fans)), profile },
    },
    franchiseAudienceProfiles: {
      ...(run.franchiseAudienceProfiles ?? {}),
      [franchiseKey]: blend(previous, profile),
    },
  };
}

export function audienceSegmentDemand(profile: AudienceProfile | undefined, segment: AudienceSegmentId): number {
  if (!profile) return 1;
  return Math.max(0.75, Math.min(1.35, 0.75 + profile[segment] / 50));
}

export function franchiseAudienceProfile(run: Pick<RunState, "franchiseAudienceProfiles">, franchiseKey: string): AudienceProfile | null {
  return run.franchiseAudienceProfiles?.[franchiseKey] ?? null;
}

export const AUDIENCE_SEGMENT_LABELS: Record<AudienceSegmentId, string> = {
  core: "Core Fans",
  casual: "Casual Viewers",
  online: "Online Fandom",
  prestige: "Prestige Audience",
  collectors: "Collectors",
};
