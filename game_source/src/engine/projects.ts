/* ======================================================================
 * PROJECT PIPELINE
 *
 * Every show is a Project that lives in RunState.projects and moves
 * through a production pipeline week by week:
 *
 *   concept → preprod → animation → sound → post → marketing → ready
 *          → airing → done
 *
 * Interactive gameplay (direction sliders, specialist picks, the
 * production floor, debugging) happens at MILESTONE gates between
 * stages instead of freezing the whole studio:
 *
 *   concept   ends with the STORY sprint  (pre-production kickoff)
 *   preprod   ends with the ART sprint    (animation kickoff)
 *   animation ends with the SOUND sprint  (recording sessions)
 *   sound     rolls straight into post
 *   post      ends with the EDIT bay      (debug/QA floor)
 *   marketing completes on its own → the show is READY to air
 *
 * A ready show can be released (promotion, reviews — the existing
 * Release flow) or deliberately delayed for extra polish. Deadlines are
 * real: a late production bleeds money, hype and morale, and the
 * broadcaster cuts the cheque at release.
 * ==================================================================== */

import {
  AIR_WEEKS,
  ARCS,
  BUDGETS,
  GENRES,
  MEDIUMS,
  PRODUCTION_SCOPES,
  SLOTS,
  comboKey,
  staffPoint,
  type Draft,
  type PointType,
  type Staff,
} from "./data";
import { computeResult, type Points, type ShowResult } from "./scoring";
import { genreTargetFor } from "./genreTargets";
import { secretComboResearched } from "./creativeDiscovery";
import { over9000Charge } from "./showrunnerPerks";
import { NO_FX, fxSpeedFor, type FacilityFX } from "./facilities";
import { effectiveCoordinatedTeamSize, teamCoordinationEfficiency } from "./teamCoordination";
import { staffIsInjured } from "./staffAvailability";

/* ------------------------------------------------------------- costs */
const scopeOf = (d: Draft) => PRODUCTION_SCOPES[d.scope ?? "standard"];

export function draftCost(d: Draft): number {
  const arcCost = d.arcs.reduce((a, id) => a + (ARCS.find((x) => x.id === id)?.cost ?? 0), 0);
  const scope = scopeOf(d);
  return Math.round((BUDGETS[d.budget].cost * MEDIUMS[d.medium].costMult + SLOTS[d.slot].cost + arcCost) * scope.costMult);
}

/** planned production length in weeks (excluding airing). Better studios should
 * attempt larger work, not simply compress identical shows into half the calendar. */
export function draftWeeks(d: Draft): number {
  const scope = scopeOf(d);
  const budgetTime = d.budget === "blockbuster" ? 1.14 : d.budget === "indie" ? 0.94 : 1;
  const storyBeatCount = d.arcs.length + (d.licensedArcId ? 1 : 0);
  const base = 11 + MEDIUMS[d.medium].weeks + Math.max(0, storyBeatCount - 3);
  return Math.max(7, Math.round(base * scope.weeksMult * budgetTime));
}

/* ------------------------------------------------------------- types */
export type ProjectStage =
  | "concept"
  | "preprod"
  | "animation"
  | "sound"
  | "post"
  | "marketing"
  | "ready"
  | "shelved"
  | "airing"
  | "done";

export type MilestoneId = "story" | "art" | "sound" | "edit";
export type RushMilestoneId = Exclude<MilestoneId, "edit">;

export interface RushBoostPrompt {
  actorId: string;
  name: string;
  skill: number;
  type: PointType;
}

/** A key creative phase now unfolds on the live studio clock instead of in a
 * detached minigame. One lead owns the rush and contributes once per day. */
export interface ProjectRush {
  milestone: RushMilestoneId;
  type: PointType;
  leadId: string;
  leadName: string;
  skill: number;
  cost: number;
  slider: number;
  daysWorked: number;
  durationDays: number;
  pointsAdded: number;
  boostAsked: boolean;
  boostPrompt?: RushBoostPrompt | null;
  crunchDays?: number;
}

export interface RushAssignment {
  leadId: string;
  leadName: string;
  skill: number;
  type: PointType;
  cost: number;
  slider: number;
}

export const PRODUCTION_STAGES: ProjectStage[] = ["concept", "preprod", "animation", "sound", "post", "marketing"];

export const STAGE_LABEL: Record<ProjectStage, string> = {
  concept: "Concept",
  preprod: "Pre-production",
  animation: "Animation",
  sound: "Sound & Voice",
  post: "Post / QA",
  marketing: "Marketing",
  ready: "Ready to Air",
  shelved: "Shelved Master",
  airing: "On Air",
  done: "Completed",
};

/** which point type the passive weekly work feeds during each stage */
export const STAGE_FOCUS: Record<ProjectStage, PointType | null> = {
  concept: "story",
  preprod: "story",
  animation: "art",
  sound: "sound",
  post: null,
  marketing: null,
  ready: null,
  shelved: null,
  airing: null,
  done: null,
};

/** milestone sprint that gates the END of each stage (null = auto) */
export const STAGE_GATE: Record<ProjectStage, MilestoneId | null> = {
  concept: "story",
  preprod: "art",
  animation: "sound",
  sound: null,
  post: "edit",
  marketing: null,
  ready: null,
  shelved: null,
  airing: null,
  done: null,
};

const NEXT_STAGE: Partial<Record<ProjectStage, ProjectStage>> = {
  concept: "preprod",
  preprod: "animation",
  animation: "sound",
  sound: "post",
  post: "marketing",
  marketing: "ready",
};

export const MILESTONE_LABEL: Record<MilestoneId, string> = {
  story: "Story Sprint",
  art: "Animation Sprint",
  sound: "Recording Session",
  edit: "Edit Bay",
};

export interface Project {
  /** Distribution ownership is explicit for productions created after this expansion. */
  distributionOwner?: string;
  id: string;
  draft: Draft;
  stage: ProjectStage;
  /** fractional weeks of work banked inside the current stage */
  progress: number;
  /** weeks each production stage is planned to take */
  plan: Record<string, number>;
  createdWeek: number;
  /** exact live-clock day the project was greenlit (legacy saves fall back to week × 7) */
  createdDay?: number;
  /** the broadcaster's target release week — retained for finance/calendar compatibility */
  deadlineWeek: number;
  /** exact live-clock deadline */
  deadlineDay?: number;
  /** weeks past the deadline already suffered (release penalty compatibility) */
  lateWeeks: number;
  /** exact number of live calendar days late */
  lateDays?: number;
  /** ids of staff on this project (exclusive — one project per person) */
  staffIds: string[];
  /** one overall named creator; distinct from promise-based departmental leadership */
  creativeLeadId?: string;
  points: Points;
  /** Realised extra Story/Art/Sound attributed to named systems while producing. */
  impactTotals?: Record<string, Points>;
  /** Actual cash deliberately spent on named production interventions. */
  impactCosts?: Record<string, number>;
  /** quality already banked by live desk bubbles since the last week boundary */
  liveQuality?: Points;
  issues: number;
  hype: number;
  /** week a completed master was deliberately moved into the library */
  shelvedWeek?: number;
  /** everything spent on this show so far (upfront + burn + sprints) */
  spent: number;
  /** production cost charged every week while in the pipeline */
  weeklyBurn: number;
  rdGained: number;
  /** milestone sprint waiting for a lead/decision, if any */
  milestone: MilestoneId | null;
  /** live Game-Dev-Story-style rush currently unfolding on the studio clock */
  rush?: ProjectRush | null;
  milestonesDone: MilestoneId[];
  result: ShowResult | null;
  airedWeek: number | null;
  /** the deal financing this show — null/undefined = fully self-funded */
  commission?: ProjectCommission | null;
  /** advance planning earned from the Studio Slate before this project was greenlit */
  slatePrep?: { planId: string; importance: "supporting" | "standard" | "tentpole"; weeksPlanned: number; label?: string; hypeBonus: number; burnDiscount: number; paceBonus?: number; issueChanceMult?: number; deadlineBufferWeeks: number; targetWeek?: number };
  /** first few fully self-funded originals suffer rookie-studio inefficiency at final scoring */
  rookieSoloMult?: number;
  /** small spontaneous polish win rolled as the edit bay hands off to marketing */
  lastMinuteBoost?: { type: PointType; points: number } | null;
  /** production automation (engine/automation.ts) — null = fully manual */
  auto?: AutoState | null;
  /** paid, once-per-project contextual interventions */
  interventions?: string[];
  /** Executive Rush doubles visible production bubbles until this exact day. */
  executiveRushUntilDay?: number;
  /** Specialist Consultant stays for two weeks. Each new production note has a 50/50 chance to become R&D instead. */
  consultantUntilDay?: number;
  consultantConverted?: number;
  /** Legacy QoL2 fields retained only for save compatibility; no longer drive gameplay. */
  noteToRdUntilDay?: number;
  noteToRdConverted?: number;
}

/** delegation state for AUTO MANAGE (see engine/automation.ts) */
export interface AutoState {
  /** which department head the project is delegated to (null = team-led) */
  headSlot: "writer" | "animator" | "composer" | "production" | null;
  /** milestones = player designed the show; full = named employee designed and runs it */
  mode?: "milestones" | "full";
  /** creator who owns a fully delegated original */
  directorStaffId?: string;
  startedWeek: number;
  /** a crisis has paused automation — the player is being asked to step in */
  intervention: boolean;
  /** the critical-stage film prompt has fired once (don't nag) */
  warnedMovie?: boolean;
}

/** commission terms attached to a running project */
export interface ProjectCommission {
  partnerId: string;
  partnerName: string;
  /** successful delivery permanently teaches the studio this commissioned genre */
  genre?: Draft["genres"][number];
  advance: number;
  /** partner's cut of release revenue, 0..1 */
  share: number;
  minQuality: number;
  bonus: number;
  deadlineWeek: number;
  deadlineDay?: number;
}

/** Legacy export retained for old callers. Project assignment itself is uncapped. */
export const TEAM_MAX = Number.MAX_SAFE_INTEGER;

/* ------------------------------------------------------- stage plans */
/** split the total dev length across stages (different mediums/budgets
 *  naturally get different length pipelines) */
export function stagePlan(d: Draft): Record<string, number> {
  const total = draftWeeks(d);
  const weights: [ProjectStage, number][] = [
    ["concept", 0.1],
    ["preprod", 0.18],
    ["animation", 0.3],
    ["sound", 0.14],
    ["post", 0.14],
    ["marketing", 0.1],
  ];
  const plan: Record<string, number> = {};
  let used = 0;
  weights.forEach(([s, w], i) => {
    const isLast = i === weights.length - 1;
    const wk = isLast ? Math.max(1, total - used) : Math.max(1, Math.round(total * w));
    plan[s] = wk;
    used += wk;
  });
  return plan;
}

export const plannedWeeks = (p: Project) =>
  PRODUCTION_STAGES.reduce((a, s) => a + (p.plan[s] ?? 0), 0);

/** slack the broadcaster tolerates before a project counts as late */
export const DEADLINE_SLACK = 4;

/* -------------------------------------------------------- lifecycle */
let projectSeq = 0;

export function makeProject(draft: Draft, week: number, day = week * 7): Project {
  const plan = stagePlan(draft);
  const totalPlan = PRODUCTION_STAGES.reduce((a, s) => a + plan[s], 0);
  const cost = draftCost(draft);
  const upfront = Math.round(cost * 0.4);
  return {
    id: `p${++projectSeq}_${week}_${Math.floor(Math.random() * 1e6)}`,
    draft,
    stage: "concept",
    progress: 0,
    plan,
    createdWeek: week,
    createdDay: day,
    deadlineWeek: week + totalPlan + DEADLINE_SLACK,
    deadlineDay: day + (totalPlan + DEADLINE_SLACK) * 7,
    lateWeeks: 0,
    lateDays: 0,
    staffIds: [],
    points: { story: 0, art: 0, sound: 0 },
    impactTotals: {},
    impactCosts: {},
    liveQuality: { story: 0, art: 0, sound: 0 },
    issues: 0,
    hype: 0,
    spent: upfront,
    weeklyBurn: Math.max(500, Math.round((cost * 0.6) / totalPlan / 100) * 100),
    rdGained: 0,
    milestone: null,
    rush: null,
    milestonesDone: [],
    result: null,
    airedWeek: null,
  };
}

export const projectUpfront = (d: Draft) => Math.round(draftCost(d) * 0.4);


export function recordProjectImpact(p: Project, source: string, type: PointType, delta: number): Project {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.0001) return p;
  const current = p.impactTotals?.[source] ?? { story: 0, art: 0, sound: 0 };
  return {
    ...p,
    impactTotals: {
      ...(p.impactTotals ?? {}),
      [source]: { ...current, [type]: current[type] + delta },
    },
  };
}

export function recordProjectCost(p: Project, source: string, cost: number): Project {
  if (!Number.isFinite(cost) || cost <= 0) return p;
  return {
    ...p,
    impactCosts: {
      ...(p.impactCosts ?? {}),
      [source]: (p.impactCosts?.[source] ?? 0) + cost,
    },
  };
}

/** projects that occupy a production slot */
export const activeProjects = (projects: Project[]) =>
  projects.filter((p) => p.stage !== "airing" && p.stage !== "done" && p.stage !== "shelved");

export const isLate = (p: Project, week: number) =>
  p.stage !== "airing" && p.stage !== "done" && week > p.deadlineWeek;

/** weeks left until the deadline (legacy / high-level calendar view) */
export const weeksToDeadline = (p: Project, week: number) => p.deadlineWeek - week;
/** live production uses exact days; old saves derive the equivalent day from their week deadline. */
export const daysToDeadline = (p: Project, day: number) => (p.deadlineDay ?? p.deadlineWeek * 7) - day;

/* -------------------------------------------------- staff assignment */
export const projectOfStaff = (projects: Project[], staffId: string): Project | null =>
  projects.find((p) => p.stage !== "airing" && p.stage !== "done" && p.staffIds.includes(staffId)) ?? null;

/** toggle a staff member on a project; assigning removes them from any
 *  other project so nobody works two productions at once */
export function toggleAssign(projects: Project[], projectId: string, staffId: string): Project[] {
  const target = projects.find((p) => p.id === projectId);
  if (!target) return projects;
  const already = target.staffIds.includes(staffId);
  return projects.map((p) => {
    if (p.id === projectId) {
      if (already) return { ...p, staffIds: p.staffIds.filter((s) => s !== staffId) };
      return { ...p, staffIds: [...p.staffIds, staffId] };
    }
    /* pulled onto the new project — drop them from any other one */
    return already || !p.staffIds.includes(staffId)
      ? p
      : { ...p, staffIds: p.staffIds.filter((s) => s !== staffId) };
  });
}

/* ------------------------------------------------------- weekly tick */
const staminaF = (s: Staff) => 0.55 + s.stamina / 220;

/* ------------------------------------------------- per-person modifiers */
/** personal work modifiers (traits, specs, morale, bonds — see careers.ts) */
export interface StaffWorkMod {
  /** multiplier on weekly production points (replaces the stamina factor) */
  out: number;
  /** multiplier on this person's team-speed contribution */
  pace: number;
  /** flat team speed added just by being present */
  aura: number;
  /** multiplier on weekly XP earned */
  xpMult: number;
}
export type StaffModFn = (s: Staff, p: Project, team: Staff[]) => StaffWorkMod;

/** studio-wide production effects (department heads — see careers.ts) */
export interface StudioMod {
  speed: number;
  burnMult: number;
  /** Fraction of large-team coordination loss recovered by the Production Manager. */
  coordinationRelief?: number;
  /** Multiplier on NEW production-note creation. Editing itself never creates notes. */
  issueChanceMult?: number;
  /** Legacy boolean retained for old tests/saves; scheduleSpeedCap is authoritative. */
  ignoreScheduleCap?: boolean;
  scheduleSpeedCap?: number;
}
export const NO_STUDIO: StudioMod = { speed: 0, burnMult: 1, coordinationRelief: 0, issueChanceMult: 1 };

/** raw studio capacity. Capacity above the schedule ceiling becomes quality
 * and consistency rather than endlessly shortening the campaign. */
export function rawTeamCapacity(
  p: Project,
  team: Staff[],
  fx: FacilityFX = NO_FX,
  mods?: StaffModFn,
  studio: StudioMod = NO_STUDIO
): number {
  const focus = STAGE_FOCUS[p.stage];
  let v = 0.35; // the showrunner keeps things moving even solo
  for (const s of team) {
    const rel = focus ? staffPoint(s, focus) : (s.story + s.art + s.sound) / 3;
    const m = mods?.(s, p, team);
    v += (0.22 + rel / 280) * (m ? m.pace : staminaF(s)) + (m?.aura ?? 0);
  }
  /* Large anime crews are no longer forbidden. Instead, communication overhead
     dampens the team's staff-driven capacity. A Production Coordinator on the
     project removes this entirely; Production Manager skill recovers part of it. */
  const coordination = teamCoordinationEfficiency(team, studio.coordinationRelief ?? 0);
  v = 0.35 + (v - 0.35) * coordination;
  v += fxSpeedFor(fx, p.draft.budget) + studio.speed;
  if (p.stage === "animation") v += fx.speedAnimation;
  return v;
}

export const SCHEDULE_SPEED_CAP = 1.35;

/** how much stage work the team banks in one week (1 = on schedule). */
export function teamSpeed(
  p: Project,
  team: Staff[],
  fx: FacilityFX = NO_FX,
  mods?: StaffModFn,
  studio: StudioMod = NO_STUDIO
): number {
  const raw = rawTeamCapacity(p, team, fx, mods, studio);
  const requestedCap = studio.scheduleSpeedCap ?? (studio.ignoreScheduleCap ? 2.05 : SCHEDULE_SPEED_CAP);
  if (requestedCap <= SCHEDULE_SPEED_CAP || raw <= SCHEDULE_SPEED_CAP) return Math.min(requestedCap, raw);
  const headroom = requestedCap - SCHEDULE_SPEED_CAP;
  const overflow = raw - SCHEDULE_SPEED_CAP;
  const eased = SCHEDULE_SPEED_CAP + headroom * (1 - Math.exp(-overflow / Math.max(0.01, headroom)));
  return Math.min(requestedCap, eased);
}

/** surplus capacity improves the work instead of deleting calendar time. */
export function teamQualityMultiplier(
  p: Project,
  team: Staff[],
  fx: FacilityFX = NO_FX,
  mods?: StaffModFn,
  studio: StudioMod = NO_STUDIO
): number {
  const surplus = Math.max(0, rawTeamCapacity(p, team, fx, mods, studio) - SCHEDULE_SPEED_CAP);
  return Math.min(1.28, 1 + surplus * 0.18);
}

export interface WeekTickResult {
  projects: Project[];
  cashDelta: number;
  notices: string[];
}

/** advance every project by one calendar week */
export function tickProjectsWeek(
  projects: Project[],
  staff: Staff[],
  week: number,
  fx: FacilityFX = NO_FX,
  mods?: StaffModFn,
  studio: StudioMod = NO_STUDIO,
  departmentLoad: Record<string, number> = {}
): WeekTickResult {
  let cashDelta = 0;
  const notices: string[] = [];

  const next = projects.map((p0) => {
    if (p0.stage === "done") return p0;
    const p = { ...p0, points: { ...p0.points } };
    const team = staff.filter((s) => p.staffIds.includes(s.id) && !staffIsInjured(s, p.stage === "airing" ? week * 7 : week * 7));

    /* ----- airing: the payout schedule does the work; just finish up */
    if (p.stage === "airing") {
      if (p.airedWeek !== null && week >= p.airedWeek + AIR_WEEKS) {
        p.stage = "done";
        notices.push(`“${p.draft.title}” finishes its broadcast run.`);
      }
      return p;
    }

    /* ----- production burn */
    const burn = Math.round(p.weeklyBurn * studio.burnMult);
    cashDelta -= burn;
    p.spent += burn;

    /* ----- work happens unless the team is waiting on a milestone */
    if (!p.milestone) {
      const plan = p.plan[p.stage] ?? 1;
      /* Story / Art / Sound are deliberately NOT generated here. Quality now
         comes only from visible Kairosoft-style desk bubbles, rushes and explicit
         events. The weekly engine controls schedule, burn, deadlines and rework. */
      if (p.stage === "marketing") {
        p.hype = Math.min(100, p.hype + Math.round((3 + effectiveCoordinatedTeamSize(team, studio.coordinationRelief ?? 0) * 2) * fx.hypeMult));
      }
      if (p.stage === "ready") {
        /* waiting never fixes editing notes for free; it only lets launch heat cool. */
        p.hype = Math.max(0, p.hype - 1);
      } else {
        const load = departmentLoad[p.id] ?? 1;
        p.progress += teamSpeed(p, team, fx, mods, studio) * load;
        /* sustained over-capacity creates rework instead of making a fifth simultaneous
           prestige show free. */
        if (load < 0.72 && week % 2 === 0 && (p.stage === "animation" || p.stage === "post") && Math.random() < (studio.issueChanceMult ?? 1) * (p.slatePrep?.issueChanceMult ?? 1)) p.issues += 1;
        if (p.progress >= plan) {
          const gate = STAGE_GATE[p.stage];
          if (gate && !p.milestonesDone.includes(gate)) {
            p.progress = plan;
            p.milestone = gate;
            notices.push(`“${p.draft.title}”: ${MILESTONE_LABEL[gate]} is ready — the team needs you on the floor.`);
          } else {
            const nx = NEXT_STAGE[p.stage];
            if (nx) {
              p.stage = nx;
              p.progress = 0;
              if (nx === "ready") notices.push(`“${p.draft.title}” is ready for broadcast. Release it — or delay for polish.`);
            }
          }
        }
      }
    }

    /* ----- deadline pressure */
    if (week > p.deadlineWeek) {
      p.lateWeeks += 1;
      const fee = 1_500 + Math.round(draftCost(p.draft) * 0.015);
      cashDelta -= fee;
      p.spent += fee;
      p.hype = Math.max(0, p.hype - 2);
      if (p.lateWeeks === 1)
        notices.push(`“${p.draft.title}” has missed its broadcast deadline — the network wants penalties (−£${fee.toLocaleString("en-GB")}/wk).`);
      else if (p.lateWeeks % 4 === 0)
        notices.push(`“${p.draft.title}” is ${p.lateWeeks} weeks late. Morale and hype are bleeding.`);
    }

    return p;
  });

  return { projects: next, cashDelta, notices };
}

export interface DayTickResult extends WeekTickResult {
  attention: boolean;
}

/** Live-clock project schedule. Plans stay expressed in week-equivalents for save
 * compatibility, but one in-game day banks exactly one seventh of normal schedule
 * work and one seventh of production burn. Milestones can therefore arrive on any
 * day rather than only at an arbitrary Sunday boundary. */
export function tickProjectsDay(
  projects: Project[],
  staff: Staff[],
  day: number,
  fx: FacilityFX = NO_FX,
  mods?: StaffModFn,
  studio: StudioMod = NO_STUDIO,
  departmentLoad: Record<string, number> = {}
): DayTickResult {
  let cashDelta = 0;
  let attention = false;
  const notices: string[] = [];

  const next = projects.map((p0) => {
    if (p0.stage === "done" || p0.stage === "airing") return p0;
    const p = { ...p0, points: { ...p0.points } };
    const team = staff.filter((s) => p.staffIds.includes(s.id) && !staffIsInjured(s, day));

    const burn = Math.max(1, Math.round((p.weeklyBurn * studio.burnMult) / 7));
    cashDelta -= burn;
    p.spent += burn;

    if (!p.milestone) {
      const plan = p.plan[p.stage] ?? 1;
      if (p.stage === "marketing") {
        p.hype = Math.min(100, p.hype + ((3 + effectiveCoordinatedTeamSize(team, studio.coordinationRelief ?? 0) * 2) * fx.hypeMult) / 7);
      }
      if (p.stage === "ready") {
        p.hype = Math.max(0, p.hype - 1 / 7);
      } else {
        const load = departmentLoad[p.id] ?? 1;
        p.progress += (teamSpeed(p, team, fx, mods, studio) * load) / 7;
        if (load < 0.72 && day % 14 === 0 && (p.stage === "animation" || p.stage === "post") && Math.random() < (studio.issueChanceMult ?? 1) * (p.slatePrep?.issueChanceMult ?? 1)) p.issues += 1;
        if (p.progress >= plan) {
          const gate = STAGE_GATE[p.stage];
          if (gate && !p.milestonesDone.includes(gate)) {
            p.progress = plan;
            p.milestone = gate;
            attention = true;
            notices.push(`“${p.draft.title}”: ${MILESTONE_LABEL[gate]} is ready — the team needs you on the floor.`);
          } else {
            const nx = NEXT_STAGE[p.stage];
            if (nx) {
              p.stage = nx;
              p.progress = 0;
              if (nx === "ready") {
                attention = true;
                notices.push(`“${p.draft.title}” is ready for broadcast. Release it — or keep it back deliberately.`);
              }
            }
          }
        }
      }
    }

    const dueDay = p.deadlineDay ?? p.deadlineWeek * 7;
    if (day > dueDay) {
      const lateDays = (p.lateDays ?? p.lateWeeks * 7) + 1;
      p.lateDays = lateDays;
      p.lateWeeks = Math.ceil(lateDays / 7);
      const weeklyFee = 1_500 + Math.round(draftCost(p.draft) * 0.015);
      const fee = Math.max(1, Math.round(weeklyFee / 7));
      cashDelta -= fee;
      p.spent += fee;
      p.hype = Math.max(0, p.hype - 2 / 7);
      if (lateDays === 1) notices.push(`“${p.draft.title}” misses its broadcast deadline — late fees now accrue every day.`);
      else if (lateDays % 7 === 0) notices.push(`“${p.draft.title}” is ${lateDays} days late. Hype and cash are bleeding.`);
    }
    return p;
  });

  return { projects: next, cashDelta, notices, attention };
}

/** staff ids currently committed to an in-production project */
export function assignedStaffIds(projects: Project[]): Set<string> {
  const set = new Set<string>();
  for (const p of projects) {
    if (p.stage === "airing" || p.stage === "done") continue;
    p.staffIds.forEach((id) => set.add(id));
  }
  return set;
}

/* ------------------------------------------------------- milestones */
export interface MilestoneOutcome {
  points: Points;
  issues: number;
  spent: number;
  rdGained: number;
  /** Research Data deliberately invested in rush boost attempts. */
  rdSpent?: number;
  /** Final title/cast billing locked after the edit bay. */
  rename?: Partial<Pick<Draft, "title" | "protagName" | "secondaryName" | "petName" | "villainName">>;
  /** direction slider set during the sprint's planning meeting */
  slider?: { index: 0 | 1 | 2; value: number };
  /** bugs fixed during the edit bay */
  squashed?: number;
}

/** fold a played milestone back into its project and open the next stage */
export function applyMilestoneOutcome(p: Project, o: MilestoneOutcome): Project {
  const done = p.milestone;
  if (!done) return p;
  const directed: Draft = o.slider
    ? { ...p.draft, sliders: p.draft.sliders.map((v, i) => (i === o.slider!.index ? o.slider!.value : v)) as [number, number, number] }
    : p.draft;
  const draft: Draft = o.rename ? { ...directed, ...o.rename } : directed;
  const nx = NEXT_STAGE[p.stage] ?? p.stage;
  /* A small post-QC chance for one last inspired bubble before marketing.
     It is deliberately modest: 24% chance, +2..6 in one craft. */
  const lastMinuteBoost = done === "edit" && Math.random() < 0.24
    ? { type: (["story", "art", "sound"] as PointType[])[Math.floor(Math.random() * 3)], points: 2 + Math.floor(Math.random() * 5) }
    : null;
  let next: Project = {
    ...p,
    draft,
    stage: nx,
    progress: 0,
    milestone: null,
    milestonesDone: [...p.milestonesDone, done],
    liveQuality: { story: 0, art: 0, sound: 0 },
    points: {
      story: p.points.story + o.points.story + (lastMinuteBoost?.type === "story" ? lastMinuteBoost.points : 0),
      art: p.points.art + o.points.art + (lastMinuteBoost?.type === "art" ? lastMinuteBoost.points : 0),
      sound: p.points.sound + o.points.sound + (lastMinuteBoost?.type === "sound" ? lastMinuteBoost.points : 0),
    },
    lastMinuteBoost,
    /* Final editing is a one-way quality pass: notes may be cleared, never manufactured. */
    issues: done === "edit" ? Math.max(0, p.issues - (o.squashed ?? 0)) : p.issues + o.issues,
    spent: p.spent + o.spent,
    rdGained: p.rdGained + o.rdGained + (done === "edit" ? (o.squashed ?? 0) : 0),
  };
  const milestoneSource =
    done === "story" ? "Milestone · Story Sprint" :
    done === "art" ? "Milestone · Animation Sprint" :
    done === "sound" ? "Milestone · Recording Session" :
    "Milestone · Edit Bay";
  for (const type of ["story", "art", "sound"] as const) {
    if (o.points[type]) next = recordProjectImpact(next, milestoneSource, type, o.points[type]);
  }
  if (lastMinuteBoost) next = recordProjectImpact(next, "Last-minute QC inspiration", lastMinuteBoost.type, lastMinuteBoost.points);
  return next;
}

/* ---------------------------------------------------------- release */
/** broadcaster dissatisfaction: every late week shaves the payout */
export const lateRevenueMult = (p: Project) => Math.max(0.7, 1 - 0.03 * p.lateWeeks);

export interface ScoringContext {
  research: string[];
  /** merch department revenue multiplier (1 = none) */
  merchMult?: number;
  /** market demand multiplier (trends + saturation + attention, 1 = neutral) */
  marketMult?: number;
  /** franchise excitement multiplier (popularity/fatigue/format aware) */
  franchiseMult?: number;
  showrunner: string;
  comboLevels: Record<string, number>;
  castCombos: string[];
  arcCombos: string[];
  /** best raw quality ever shipped — historical RECORD only */
  studioTop: number;
  /** slow rolling expectation (EMA of past quality) — mild review nudge */
  reviewExpectation?: number;
  franchises: Record<string, { season: number }>;
  fans: number;
  /** dynasty-era audience expectations — mildly raises the review bar */
  audienceBar?: number;
  careerWeek?: number;
  industryPressureLevel?: number;
  /** House Specialty multiplies Story / Art / Sound equally before review scoring. */
  specialisationScoreMult?: number;
  /** Every Business & Audience level improves shipped-release economics. */
  businessMult?: number;
  castAffinityDiscovered?: string[];
  showrunnerLevel?: number;
  staff?: Staff[];
  /** deterministic reviewer/sales rolls for balance tests; normal gameplay omits this */
  rng?: () => number;
}

/** compute the review result for a project from its accumulated state */
export function computeProjectResult(p: Project, ctx: ScoringContext): ShowResult {
  const d = p.draft;
  const genres = d.genres;
  const productionTarget = genreTargetFor(genres);
  const ideal = productionTarget.ideal;
  const ratio = productionTarget.ratio;

  const key = comboKey(genres);
  const comboLevel = ctx.comboLevels[key] ?? 0;
  const comboKnown = (key in ctx.comboLevels) || secretComboResearched(ctx.research, key);
  const franchiseMult = ctx.franchiseMult ?? (d.franchiseKey ? 1 + 0.14 * (d.season - 1) : 1);
  const houseScoreMult = ctx.specialisationScoreMult ?? 1;
  const rookieSoloMult = p.rookieSoloMult ?? 1;
  const delegated = ctx.showrunner === "delegator" && p.auto?.mode === "full";
  const delegatedScoreMult = delegated ? 1.10 : 1;
  const crew = delegated ? (ctx.staff ?? []).filter((member) => p.staffIds.includes(member.id)) : [];
  const director = delegated && p.auto?.directorStaffId ? crew.find((member) => member.id === p.auto!.directorStaffId) : undefined;
  const directorCraft = director ? (director.story + director.art + director.sound) / 3 : 0;
  const supportCraft = crew.length
    ? crew.reduce((sum, member) => sum + Math.max(member.story, member.art, member.sound), 0) / crew.length
    : 0;
  const delegationQualityFloor = delegated
    ? Math.min(39, Math.max(34, 31 + directorCraft / 35 + supportCraft / 55 + Math.min(5, crew.length) * 0.7))
    : undefined;
  const qualityMult = houseScoreMult * rookieSoloMult * delegatedScoreMult;
  const scoredPoints: Points = {
    story: p.points.story * qualityMult,
    art: p.points.art * qualityMult,
    sound: p.points.sound * qualityMult,
  };

  const res = computeResult({
    draft: d,
    points: scoredPoints,
    issues: p.issues,
    hype: p.hype,
    research: ctx.research,
    showrunner: ctx.showrunner,
    genreIdeal: ideal,
    genreRatio: ratio,
    comboLevel,
    newCombo: !(key in ctx.comboLevels),
    comboDiscovered: comboKnown,
    castCombos: ctx.castCombos,
    arcCombos: ctx.arcCombos,
    studioTop: ctx.studioTop,
    reviewExpectation: ctx.reviewExpectation,
    franchiseMult,
    costs: p.spent,
    fanBase: ctx.fans,
    audienceBar: ctx.audienceBar,
    careerWeek: ctx.careerWeek,
    industryPressureLevel: ctx.industryPressureLevel,
    productionImpact: p.impactTotals ?? {},
    castAffinityDiscovered: ctx.castAffinityDiscovered,
    qualityFloor: delegationQualityFloor,
    salesCap: over9000Charge(ctx.showrunner, ctx.showrunnerLevel ?? 1).salesCap,
    rng: ctx.rng,
  });

  let out = res;

  if (p.impactCosts) {
    for (const [source, cost] of Object.entries(p.impactCosts)) {
      if (!Number.isFinite(cost) || cost <= 0) continue;
      out = {
        ...out,
        impactReport: [...(out.impactReport ?? []), {
          category: "cost",
          source,
          metric: "cost",
          delta: -cost,
          positive: false,
          detail: `£${Math.round(cost).toLocaleString("en-GB")} spent on this production`,
        }],
      };
    }
  }

  const appendImpact = (entry: NonNullable<ShowResult["impactReport"]>[number]) => {
    out = { ...out, impactReport: [...(out.impactReport ?? []), entry] };
  };
  const addCraftMultiplierImpact = (source: string, mult: number, before: Points) => {
    if (Math.abs(mult - 1) <= 0.001) return { ...before };
    const after = { story: before.story * mult, art: before.art * mult, sound: before.sound * mult };
    for (const metric of ["story", "art", "sound"] as const) {
      appendImpact({
        category: "production",
        source,
        metric,
        before: before[metric],
        delta: after[metric] - before[metric],
        after: after[metric],
        multiplier: mult,
        positive: mult >= 1,
        detail: `${before[metric].toFixed(1)} → ${after[metric].toFixed(1)} (${after[metric] - before[metric] >= 0 ? "+" : ""}${(after[metric] - before[metric]).toFixed(1)})`,
      });
    }
    return after;
  };
  let craftWalk: Points = { ...p.points };
  craftWalk = addCraftMultiplierImpact(houseScoreMult > 1 ? "House genre expertise" : "Outside house specialty", houseScoreMult, craftWalk);
  craftWalk = addCraftMultiplierImpact("Rookie self-funded production", rookieSoloMult, craftWalk);
  craftWalk = addCraftMultiplierImpact("Delegator · executive quality control", delegatedScoreMult, craftWalk);

  if (Math.abs(houseScoreMult - 1) > 0.001) {
    out = {
      ...out,
      breakdown: [...out.breakdown, { label: houseScoreMult > 1 ? "House genre expertise" : "Outside house specialty", pts: `×${houseScoreMult.toFixed(3)} Story · Art · Sound` }],
    };
  }
  if (delegatedScoreMult > 1.001) {
    out = {
      ...out,
      breakdown: [...out.breakdown, { label: "Delegator · executive quality control", pts: `×1.10 craft · competence floor ${delegationQualityFloor?.toFixed(1) ?? "—"} quality` }],
    };
  }
  if (rookieSoloMult < 0.999) {
    out = {
      ...out,
      breakdown: [...out.breakdown, { label: "Rookie self-funded production", pts: `×${rookieSoloMult.toFixed(2)} Story · Art · Sound` }],
    };
  }

  const business = ctx.businessMult ?? 1;
  if (business > 1.001) {
    const revenueBefore = out.revenue;
    const fansBefore = out.fans;
    const revenueAfter = Math.round(revenueBefore * business);
    const fansAfter = Math.round(fansBefore * (1 + (business - 1) * 0.5));
    out = {
      ...out,
      revenue: revenueAfter,
      fans: fansAfter,
      breakdown: [...out.breakdown, { label: "Business & Audience discipline", pts: `×${business.toFixed(2)} release revenue` }],
      impactReport: [
        ...(out.impactReport ?? []),
        { category: "commercial", source: "Business & Audience discipline", metric: "revenue", before: revenueBefore, delta: revenueAfter - revenueBefore, after: revenueAfter, multiplier: business, positive: true, detail: `£${revenueBefore.toLocaleString("en-GB")} → £${revenueAfter.toLocaleString("en-GB")} (+£${(revenueAfter - revenueBefore).toLocaleString("en-GB")})` },
        { category: "fans", source: "Business & Audience discipline", metric: "fans", before: fansBefore, delta: fansAfter - fansBefore, after: fansAfter, positive: true, detail: `+${(fansAfter - fansBefore).toLocaleString("en-GB")} extra fans` },
      ],
    };
  }

  /* the market pays what the market pays — reviews are unaffected */
  const mkt = ctx.marketMult ?? 1;
  if (Math.abs(mkt - 1) > 0.001) {
    const revenueBefore = out.revenue;
    const fansBefore = out.fans;
    const revenueAfter = Math.round(revenueBefore * mkt);
    const fanMult = Math.min(1.2, Math.max(0.85, mkt));
    const fansAfter = Math.round(fansBefore * fanMult);
    out = {
      ...out,
      revenue: revenueAfter,
      fans: fansAfter,
      breakdown: [...out.breakdown, { label: "Market demand", pts: `×${mkt.toFixed(2)} revenue` }],
      impactReport: [
        ...(out.impactReport ?? []),
        { category: "commercial", source: "Market demand", metric: "revenue", before: revenueBefore, delta: revenueAfter - revenueBefore, after: revenueAfter, multiplier: mkt, positive: mkt >= 1, detail: `£${revenueBefore.toLocaleString("en-GB")} → £${revenueAfter.toLocaleString("en-GB")} (${revenueAfter - revenueBefore >= 0 ? "+" : "−"}£${Math.abs(revenueAfter - revenueBefore).toLocaleString("en-GB")})` },
        { category: "fans", source: "Market demand", metric: "fans", before: fansBefore, delta: fansAfter - fansBefore, after: fansAfter, multiplier: fanMult, positive: fanMult >= 1, detail: `${fansAfter - fansBefore >= 0 ? "+" : ""}${(fansAfter - fansBefore).toLocaleString("en-GB")} fans` },
      ],
    };
  }

  /* the merch department turns every hit into acrylic stands */
  const merch = ctx.merchMult ?? 1;
  if (merch > 1) {
    const extra = Math.round(out.revenue * (merch - 1));
    out = {
      ...out,
      revenue: out.revenue + extra,
      breakdown: [...out.breakdown, { label: "Merch Department", pts: `+£${extra.toLocaleString("en-GB")}` }],
      impactReport: [...(out.impactReport ?? []), { category: "commercial", source: "Merch Department", metric: "revenue", before: out.revenue, delta: extra, after: out.revenue + extra, multiplier: merch, positive: true, detail: `+£${extra.toLocaleString("en-GB")} realised on this release` }],
    };
  }

  /* the broadcaster docks a late delivery */
  const mult = lateRevenueMult(p);
  if (mult < 1) {
    const revenueBefore = out.revenue;
    const fansBefore = out.fans;
    const revenueAfter = Math.round(revenueBefore * mult);
    const fansAfter = Math.round(fansBefore * mult);
    out = {
      ...out,
      revenue: revenueAfter,
      fans: fansAfter,
      breakdown: [...out.breakdown, { label: `Late delivery (${p.lateWeeks} wk)`, pts: `×${mult.toFixed(2)} revenue` }],
      impactReport: [
        ...(out.impactReport ?? []),
        { category: "commercial", source: `Late delivery (${p.lateWeeks} wk)`, metric: "revenue", before: revenueBefore, delta: revenueAfter - revenueBefore, after: revenueAfter, multiplier: mult, positive: false, detail: `−£${(revenueBefore - revenueAfter).toLocaleString("en-GB")} release income` },
        { category: "fans", source: `Late delivery (${p.lateWeeks} wk)`, metric: "fans", before: fansBefore, delta: fansAfter - fansBefore, after: fansAfter, multiplier: mult, positive: false, detail: `−${(fansBefore - fansAfter).toLocaleString("en-GB")} fans` },
      ],
    };
  }
  return out;
}
