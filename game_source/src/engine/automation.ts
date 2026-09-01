/* ======================================================================
 *  PRODUCTION AUTOMATION — delegate a project to a department head.
 *
 *  Once a studio is experienced enough (Sakuga Tower or bigger), a show
 *  can be handed to a department head. Delegated projects run their
 *  milestone sprints on their own, week by week, with quality driven by:
 *
 *    · the delegated head's own skill (their discipline counts double)
 *    · the assigned team's skill in each discipline
 *    · facilities (writers' room, animation dept, recording booth, QA…)
 *    · team morale
 *    · project difficulty (blockbusters and films are riskier)
 *
 *  Manual production still has the higher ceiling: a well-played sprint
 *  earns more points, trains the team's skills, and lets you experiment
 *  with direction sliders and secret combos. Automation is the ~70%
 *  solution for studios with too many shows to babysit.
 *
 *  The player can jump back in at any time — and is *asked* to when a
 *  production crisis hits, a deadline is threatened, or a major movie
 *  reaches a critical stage.
 * ==================================================================== */

import {
  GENRES,
  OFFICES,
  ROLE_POINT,
  staffPoint,
  type Draft,
  type PointType,
  type Staff,
} from "./data";
import { HEAD_TITLES, moraleF, type HeadSlot } from "./careers";
import {
  MILESTONE_LABEL,
  applyMilestoneOutcome,
  weeksToDeadline,
  type MilestoneId,
  type MilestoneOutcome,
  type Project,
} from "./projects";
import type { FacilityFX } from "./facilities";
import type { RunState } from "./state";

/** auto-manage unlocks at Sakuga Tower — studios with a real pipeline */
export const AUTO_MIN_OFFICE = 2;

/** milestones map to a discipline; the edit bay is discipline-neutral */
const MILESTONE_FOCUS: Record<MilestoneId, PointType | null> = {
  story: "story",
  art: "art",
  sound: "sound",
  edit: null,
};

/* --------------------------------------------------------- gating */
/** null = can delegate; otherwise a human-readable reason it can't */
export function delegationBlockReason(run: RunState, p: Project): string | null {
  if (run.officeLevel < AUTO_MIN_OFFICE)
    return `Requires ${OFFICES[AUTO_MIN_OFFICE]?.name ?? "a bigger office"} or larger`;
  if (p.stage === "airing" || p.stage === "done") return "Already finished production";
  if (p.auto && p.auto.intervention) return "Take over first — the team needs you";
  return null;
}

export function canDelegate(run: RunState, p: Project): boolean {
  return delegationBlockReason(run, p) === null;
}

/** set, swap or clear a delegation (null = team-led auto). */
export function setDelegation(
  run: RunState,
  projectId: string,
  headSlot: HeadSlot | null
): RunState | null {
  const p = run.projects.find((x) => x.id === projectId);
  if (!p) return null;
  if (headSlot !== null && delegationBlockReason(run, p)) return null;
  const label = headSlot === null ? null : HEAD_TITLES[headSlot];
  return {
    ...run,
    projects: run.projects.map((x) =>
      x.id === projectId
        ? { ...x, auto: { headSlot, startedWeek: run.week, intervention: false } }
        : x
    ),
    notices: [
      ...run.notices,
      label === null
        ? `“${p.draft.title}” is now team-led — the crew run every sprint themselves.`
        : `“${p.draft.title}” delegated to the ${label}.`,
    ],
  };
}

/** the player takes direct control back */
export function takeOver(run: RunState, projectId: string): RunState {
  const p = run.projects.find((x) => x.id === projectId);
  return {
    ...run,
    projects: run.projects.map((x) => (x.id === projectId ? { ...x, auto: null } : x)),
    notices: p ? [...run.notices, `You take the reins back on “${p.draft.title}”.`] : run.notices,
  };
}

/** dismiss a crisis and let automation carry on as before */
export function resumeAuto(run: RunState, projectId: string): RunState {
  const p = run.projects.find((x) => x.id === projectId);
  return {
    ...run,
    projects: run.projects.map((x) =>
      x.id === projectId && x.auto ? { ...x, auto: { ...x.auto, intervention: false } } : x
    ),
    notices: p ? [...run.notices, `The ${p.auto?.headSlot ? HEAD_TITLES[p.auto.headSlot] : "crew"} get back to work on “${p.draft.title}”.`] : run.notices,
  };
}

/* ------------------------------------------------------ quality */
export interface SprintQuality {
  focus: PointType | null;
  points: number;
  issues: number;
  squashed: number;
  rdGained: number;
  spent: number;
  headName: string | null;
  teamSkill: number;
  headSkill: number;
  morale: number;
}

/** the deterministic quality of one auto-run milestone sprint */
export function sprintQuality(
  run: RunState,
  p: Project,
  milestone: MilestoneId,
  fx: FacilityFX,
  staff: Staff[]
): SprintQuality {
  const team = staff.filter((s) => p.staffIds.includes(s.id));
  const focus = MILESTONE_FOCUS[milestone];

  /* the delegated head — their own craft drives the show */
  const head = p.auto?.headSlot
    ? staff.find((s) => s.id === run.heads[p.auto!.headSlot!])
    : undefined;
  const headSkill = head ? staffPoint(head, ROLE_POINT[head.role]) : 0;
  const headMatches = focus !== null && head !== undefined && ROLE_POINT[head.role] === focus;

  const teamSkill = focus !== null
    ? team.reduce((a, s) => a + staffPoint(s, focus as PointType), 0)
    : team.reduce((a, s) => a + (s.story + s.art + s.sound) / 3, 0);

  const morale = team.length ? team.reduce((a, s) => a + moraleF(s), 0) / team.length : 1;

  const risk = p.draft.budget === "blockbuster" ? 1.25 : p.draft.medium === "movie" ? 1.12 : 1;
  const facMult = focus ? fx.pointMult[focus] : 1;

  /* points: team + head, shaped by facilities, morale and difficulty.
     The 0.62 ceiling keeps a delegated sprint below a well-played manual
     one (manual floor points + lead-specialist bonus run higher). */
  const base = 10 + teamSkill * 0.34;
  const headBonus = headSkill * 0.4 * (headMatches ? 1 : 0.55);
  const points = focus
    ? Math.min(150, Math.round(((base + headBonus) * facMult * morale) / risk))
    : 0;

  /* issues: harder projects and thin teams introduce problems */
  const issues = focus ? Math.max(0, Math.round(1 + risk * 1.6 - team.length * 0.45)) : 0;
  const squashed = focus
    ? 0
    : Math.round(1 + team.length * 0.7 + (headMatches ? headSkill / 22 : 0) + fx.issueFix);

  const rdGained = focus ? Math.round(2 + team.length * 0.6) : 0;
  const spent = 2_000 + team.length * 600 + (p.draft.budget === "blockbuster" ? 2_500 : 0);

  return {
    focus,
    points,
    issues,
    squashed,
    rdGained,
    spent,
    headName: head?.name ?? null,
    teamSkill: Math.round(teamSkill),
    headSkill: Math.round(headSkill),
    morale: Math.round(morale * 100) / 100,
  };
}

/** the direction slider the head picks — the genre's textbook balance */
function autoSlider(d: Draft, focus: PointType): number {
  const idx = focus === "story" ? 0 : focus === "art" ? 1 : 2;
  const ideals = d.genres.map((g) => GENRES.find((x) => x.id === g)?.ideal[idx] ?? 50);
  return Math.round(ideals.reduce((a, b) => a + b, 0) / Math.max(1, ideals.length));
}

/** turn the quality estimate into a real MilestoneOutcome */
export function autoSprintOutcome(
  run: RunState,
  p: Project,
  milestone: MilestoneId,
  fx: FacilityFX,
  staff: Staff[]
): MilestoneOutcome {
  const q = sprintQuality(run, p, milestone, fx, staff);
  const focus = MILESTONE_FOCUS[milestone];
  if (!focus) {
    return {
      points: { story: 0, art: 0, sound: 0 },
      issues: 0,
      spent: q.spent,
      rdGained: 0,
      squashed: q.squashed,
    };
  }
  const pts = { story: 0, art: 0, sound: 0 } as { story: number; art: number; sound: number };
  pts[focus] = q.points;
  return {
    points: pts,
    issues: q.issues,
    spent: q.spent,
    rdGained: q.rdGained,
    slider: { index: focus === "story" ? 0 : focus === "art" ? 1 : 2, value: autoSlider(p.draft, focus) },
  };
}

/* --------------------------------------------------------- crisis */
export type CrisisId = "deadline" | "issues" | "movie";

export interface Crisis {
  id: CrisisId;
  text: string;
}

/** does the player need to step in right now? */
export function crisisOf(p: Project, week: number): Crisis | null {
  if (!p.auto) return null;
  if (p.stage === "airing" || p.stage === "done") return null;

  const rem = remainingWeeks(p);
  if (weeksToDeadline(p, week) < rem)
    return {
      id: "deadline",
      text: `“${p.draft.title}” will miss its broadcast deadline — ${rem} weeks of work left and the clock is running out.`,
    };
  if (p.issues >= 8)
    return {
      id: "issues",
      text: `“${p.draft.title}” is drowning in ${p.issues} production issues. The crew can't fix this alone.`,
    };
  if (
    p.draft.medium === "movie" &&
    (p.stage === "animation" || p.stage === "sound") &&
    !p.auto.warnedMovie
  )
    return {
      id: "movie",
      text: `“${p.draft.title}” has reached a critical stage — a film's ${p.stage} phase deserves your eye.`,
    };
  return null;
}

/** planned weeks left before the show is ready (current + future stages) */
function remainingWeeks(p: Project): number {
  const stages = ["concept", "preprod", "animation", "sound", "post", "marketing"] as const;
  const idx = stages.indexOf(p.stage as (typeof stages)[number]);
  if (idx < 0) return 0;
  let rem = Math.max(0, (p.plan[p.stage] ?? 1) - p.progress);
  for (let i = idx + 1; i < stages.length; i++) rem += p.plan[stages[i]] ?? 1;
  return rem;
}

/* ----------------------------------------------------- weekly tick */
export interface DelegatedTick {
  projects: Project[];
  notices: string[];
  staff: Staff[];
  rd: number;
  cash: number;
}

/**
 * Advance every delegated project by one calendar week: resolve waiting
 * milestone sprints automatically, flag crises for the player, and drain
 * the crew's stamina. Called from advanceWeeks, once per week.
 */
export function tickDelegated(
  run: RunState,
  projects: Project[],
  staff: Staff[],
  week: number,
  fx: FacilityFX
): DelegatedTick {
  const notices: string[] = [];
  let rd = 0;
  let cash = 0;
  const staminaSpent = new Set<string>();

  const next = projects.map((p0) => {
    const auto0 = p0.auto;
    if (!auto0) return p0;
    if (p0.stage === "airing" || p0.stage === "done") return p0;
    let p: Project = p0;

    /* crises pause automation and ask the player in */
    const crisis = crisisOf(p, week);
    if (crisis && !auto0.intervention) {
      p = { ...p, auto: { ...auto0, intervention: true, warnedMovie: true } };
      notices.push(`🚨 ${crisis.text}`);
      return p;
    }

    /* waiting milestone → run it automatically (unless the player is due) */
    if (p.milestone && !auto0.intervention) {
      const outcome = autoSprintOutcome(run, p, p.milestone, fx, staff);
      const before = p.rdGained;
      const folded = applyMilestoneOutcome(p, outcome);
      rd += folded.rdGained - before;
      cash -= outcome.spent;
      p.staffIds.forEach((id) => staminaSpent.add(id));
      notices.push(
        `⚙️ “${p.draft.title}”: ${MILESTONE_LABEL[p.milestone]} handled by ${auto0.headSlot ? HEAD_TITLES[auto0.headSlot] : "the crew"} (+${folded.rdGained - before} RD).`
      );
      p = folded;
    }

    return p;
  });

  /* delegated sprints still tire the crew — a touch less than hands-on */
  const nextStaff = staff.map((s) =>
    staminaSpent.has(s.id) ? { ...s, stamina: Math.max(15, s.stamina - 5) } : s
  );

  return { projects: next, notices, staff: nextStaff, rd, cash };
}
