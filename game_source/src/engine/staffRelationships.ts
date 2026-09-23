import { bondBetween, bondKey, type BondKind } from "./careers";
import type { Staff } from "./data";
import type { RunState } from "./state";

export interface StaffRelationshipRecord {
  key: string;
  staffIds: [string, string];
  kind: BondKind;
  formedWeek: number;
  lastActiveWeek: number;
  sharedReleases: number;
  acclaimedReleases: number;
  bestScore: number;
  bestTitle?: string;
  goldenPair: boolean;
  formalMentorId?: string;
  formalMenteeId?: string;
}

declare module "./state" {
  interface RunState {
    staffRelationships?: StaffRelationshipRecord[];
  }
}

export function relationshipRecord(run: Pick<RunState, "staffRelationships">, a: string, b: string): StaffRelationshipRecord | null {
  const key = bondKey(a, b);
  return run.staffRelationships?.find((record) => record.key === key) ?? null;
}

export function syncRelationshipHistory(
  records: readonly StaffRelationshipRecord[] | undefined,
  staff: readonly Staff[],
  bonds: Record<string, number>,
  week: number,
): StaffRelationshipRecord[] {
  const next = [...(records ?? [])];
  for (let i = 0; i < staff.length; i++) {
    for (let j = i + 1; j < staff.length; j++) {
      const a = staff[i], b = staff[j];
      const bond = bondBetween(bonds, a, b);
      if (!bond) continue;
      const key = bondKey(a.id, b.id);
      const index = next.findIndex((record) => record.key === key);
      if (index < 0) {
        next.push({
          key,
          staffIds: [a.id, b.id],
          kind: bond.kind,
          formedWeek: week,
          lastActiveWeek: week,
          sharedReleases: 0,
          acclaimedReleases: 0,
          bestScore: 0,
          goldenPair: false,
        });
      } else {
        next[index] = { ...next[index], kind: bond.kind, lastActiveWeek: week };
      }
    }
  }
  return next;
}

export function recordRelationshipRelease(
  run: RunState,
  staffIds: readonly string[],
  title: string,
  score: number,
): RunState {
  let records = syncRelationshipHistory(run.staffRelationships, run.staff, run.bonds, run.week);
  for (let i = 0; i < staffIds.length; i++) {
    for (let j = i + 1; j < staffIds.length; j++) {
      const key = bondKey(staffIds[i], staffIds[j]);
      const index = records.findIndex((record) => record.key === key);
      if (index < 0) continue;
      const prior = records[index];
      const acclaimed = prior.acclaimedReleases + (score >= 27 ? 1 : 0);
      records[index] = {
        ...prior,
        sharedReleases: prior.sharedReleases + 1,
        acclaimedReleases: acclaimed,
        bestScore: Math.max(prior.bestScore, score),
        bestTitle: score >= prior.bestScore ? title : prior.bestTitle,
        goldenPair: prior.kind === "partnership" && acclaimed >= 3,
        lastActiveWeek: run.week,
      };
    }
  }
  return { ...run, staffRelationships: records };
}

export function formalizeMentorship(run: RunState, mentorId: string, menteeId: string): RunState | null {
  const mentor = run.staff.find((staff) => staff.id === mentorId);
  const mentee = run.staff.find((staff) => staff.id === menteeId);
  if (!mentor || !mentee || mentor.id === mentee.id || mentor.level <= mentee.level) return null;
  const key = bondKey(mentorId, menteeId);
  let records = syncRelationshipHistory(run.staffRelationships, run.staff, run.bonds, run.week);
  const index = records.findIndex((record) => record.key === key);
  if (index < 0) return null;
  records[index] = { ...records[index], kind: "mentorship", formalMentorId: mentorId, formalMenteeId: menteeId };
  return {
    ...run,
    staffRelationships: records,
    notices: [...run.notices, `🎓 MENTORSHIP — ${mentor.name} formally takes ${mentee.name} under their wing.`].slice(-40),
  };
}

export function relationshipXpMultiplier(
  run: Pick<RunState, "staffRelationships">,
  staffId: string,
  showrunner = "",
): number {
  const formallyMentored = run.staffRelationships?.some((record) => record.formalMenteeId === staffId);
  if (!formallyMentored) return 1;
  return showrunner === "mentor" ? 1.20 : 1.12;
}

export function goldenPairMultiplier(
  records: readonly StaffRelationshipRecord[] | undefined,
  staffId: string,
  teamIds: readonly string[],
): number {
  return (records ?? []).some((record) =>
    record.goldenPair &&
    record.staffIds.includes(staffId) &&
    record.staffIds.every((id) => teamIds.includes(id))
  ) ? 1.03 : 1;
}
