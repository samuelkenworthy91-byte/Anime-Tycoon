import type { RunState } from "./state";

export type RivalMemoryKind = "head_to_head" | "poach" | "award" | "auction" | "coproduction" | "spat";

export interface RivalMemory {
  id: string;
  studioId: string;
  kind: RivalMemoryKind;
  week: number;
  text: string;
  heat: number;
}

declare module "./state" {
  interface RunState {
    rivalMemories?: Record<string, RivalMemory[]>;
  }
}

export function recordRivalMemory(run: RunState, studioId: string, kind: RivalMemoryKind, text: string, heat = 0): RunState {
  const existing = run.rivalMemories?.[studioId] ?? [];
  const memory: RivalMemory = { id: `${kind}:${run.week}:${existing.length}`, studioId, kind, week: run.week, text, heat };
  return {
    ...run,
    rivalMemories: {
      ...(run.rivalMemories ?? {}),
      [studioId]: [...existing, memory].slice(-12),
    },
  };
}

export function rivalMemoriesFor(run: Pick<RunState, "rivalMemories">, studioId: string): RivalMemory[] {
  return [...(run.rivalMemories?.[studioId] ?? [])].sort((a, b) => b.week - a.week);
}

export function rivalMemoryHeat(run: Pick<RunState, "rivalMemories">, studioId: string): number {
  return Math.max(-20, Math.min(20, (run.rivalMemories?.[studioId] ?? []).slice(-6).reduce((sum, memory) => sum + memory.heat, 0)));
}

export function recordHeadToHeadMemories(run: RunState, title: string, genres: readonly string[], score: number): RunState {
  let next = run;
  for (const studio of run.rivalWorld.studios) {
    const clash = studio.releases
      .filter((release) => Math.abs(release.week - run.week) <= 2 && release.genres.some((genre) => genres.includes(genre)))
      .sort((a, b) => Math.abs(a.week - run.week) - Math.abs(b.week - run.week))[0];
    if (!clash) continue;
    const result = score > clash.score ? "You won the critical head-to-head" : score < clash.score ? "They won the critical head-to-head" : "The critics called it even";
    next = recordRivalMemory(next, studio.id, "head_to_head", `“${title}” vs “${clash.title}” · ${result} (${score}–${clash.score}).`, score >= clash.score ? 2 : 3);
  }
  return next;
}
