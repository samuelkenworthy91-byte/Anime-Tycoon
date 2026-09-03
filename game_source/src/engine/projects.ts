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
import { NO_FX, fxSpeedFor, type FacilityFX } from "./facilities";

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
  const base = 11 + MEDIUMS[d.medium].weeks + Math.max(0, d.arcs.length - 3);
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
  id: string;
  draft: Draft;
  stage: ProjectStage;
  /** fractional weeks of work banked inside the current stage */
  progress: number;
  /** weeks each production stage is planned to take */
  plan: Record<string, number>;
  createdWeek: number;
  /** the broadcaster's target release week */
  deadlineWeek: number;
  /** weeks past the deadline already suffered */
  lateWeeks: number;
  /** ids of staff on this project (exclusive — one project per person) */
  staffIds: string[];
  points: Points;
  /** quality already banked by live desk bubbles since the last week boundary */
  liveQuality?: Points;
  issues: number;
  hype: number;
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
  /** production automation (engine/automation.ts) — null = fully manual */
  auto?: AutoState | null;
}

/** delegation state for AUTO MANAGE (see engine/automation.ts) */
export interface AutoState {
  /** which department head the project is delegated to (null = team-led) */
  headSlot: "writer" | "animator" | "composer" | "production" | null;
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
  advance: number;
  /** partner's cut of release revenue, 0..1 */
  share: number;
  minQuality: number;
  bonus: number;
  deadlineWeek: number;
}

export const TEAM_MAX = 6;

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

export function makeProject(draft: Draft, week: number): Project {
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
    deadlineWeek: week + totalPlan + DEADLINE_SLACK,
    lateWeeks: 0,
    staffIds: [],
    points: { story: 0, art: 0, sound: 0 },
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

/** projects that occupy a production slot */
export const activeProjects = (projects: Project[]) =>
  projects.filter((p) => p.stage !== "airing" && p.stage !== "done");

export const isLate = (p: Project, week: number) =>
  p.stage !== "airing" && p.stage !== "done" && week > p.deadlineWeek;

/** weeks left until the deadline (negative = already late) */
export const weeksToDeadline = (p: Project, week: number) => p.deadlineWeek - week;

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
      if (p.staffIds.length >= TEAM_MAX) return p;
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
}
export type StaffModFn = (s: Staff, p: Project, team: Staff[]) => StaffWorkMod;

/** studio-wide production effects (department heads — see careers.ts) */
export interface StudioMod {
  speed: number;
  burnMult: number;
}
export const NO_STUDIO: StudioMod = { speed: 0, burnMult: 1 };

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
  return Math.min(SCHEDULE_SPEED_CAP, rawTeamCapacity(p, team, fx, mods, studio));
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
    const team = staff.filter((s) => p.staffIds.includes(s.id));

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
      const qualityMult = teamQualityMultiplier(p, team, fx, mods, studio);
      if (p.stage === "post") {
        const surplusFix = Math.max(0, Math.floor((qualityMult - 1) * 8));
        p.issues = Math.max(0, p.issues - Math.round(team.length * 0.6 + 0.4) - fx.issueFix - surplusFix);
      }
      if (p.stage === "marketing") {
        p.hype = Math.min(100, p.hype + Math.round((3 + team.length * 2) * fx.hypeMult));
      }
      if (p.stage === "ready") {
        /* deliberate delay: polish the master, but hype cools */
        p.issues = Math.max(0, p.issues - Math.max(1, Math.round(team.length * 0.5)));
        p.hype = Math.max(0, p.hype - 1);
      } else {
        const load = departmentLoad[p.id] ?? 1;
        p.progress += teamSpeed(p, team, fx, mods, studio) * load;
        /* sustained over-capacity creates rework instead of making a fifth simultaneous
           prestige show free. */
        if (load < 0.72 && week % 2 === 0 && (p.stage === "animation" || p.stage === "post")) p.issues += 1;
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
      if (p.lateWeeks % 2 === 0) p.issues += 1;
      if (p.lateWeeks === 1)
        notices.push(`“${p.draft.title}” has missed its broadcast deadline — the network wants penalties (−£${fee.toLocaleString("en-GB")}/wk).`);
      else if (p.lateWeeks % 4 === 0)
        notices.push(`“${p.draft.title}” is ${p.lateWeeks} weeks late. Morale and hype are bleeding.`);
    }

    return p;
  });

  return { projects: next, cashDelta, notices };
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
  return {
    ...p,
    draft,
    stage: nx,
    progress: 0,
    milestone: null,
    milestonesDone: [...p.milestonesDone, done],
    liveQuality: { story: 0, art: 0, sound: 0 },
    points: {
      story: p.points.story + o.points.story,
      art: p.points.art + o.points.art,
      sound: p.points.sound + o.points.sound,
    },
    issues: done === "edit" ? Math.max(0, p.issues + o.issues - (o.squashed ?? 0)) : p.issues + o.issues,
    spent: p.spent + o.spent,
    rdGained: p.rdGained + o.rdGained + (done === "edit" ? (o.squashed ?? 0) : 0),
  };
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
  studioTop: number;
  franchises: Record<string, { season: number }>;
  fans: number;
  /** dynasty-era audience expectations — raises the review bar */
  audienceBar?: number;
}

/** compute the review result for a project from its accumulated state */
export function computeProjectResult(p: Project, ctx: ScoringContext): ShowResult {
  const d = p.draft;
  const genres = d.genres;
  const avgOf = (pick: (i: number) => number[]) =>
    [0, 1, 2].map((i) => pick(i).reduce((a, b) => a + b, 0) / Math.max(1, genres.length));
  const ideal = avgOf((i) => genres.map((g) => GENRES.find((x) => x.id === g)!.ideal[i])).map(Math.round) as [number, number, number];
  const ratio = (genres.length
    ? avgOf((i) => genres.map((g) => GENRES.find((x) => x.id === g)!.ratio[i]))
    : [0.34, 0.33, 0.33]) as [number, number, number];

  const key = comboKey(genres);
  const comboLevel = ctx.comboLevels[key] ?? 0;
  const franchiseMult = ctx.franchiseMult ?? (d.franchiseKey ? 1 + 0.14 * (d.season - 1) : 1);

  const res = computeResult({
    draft: d,
    points: p.points,
    issues: p.issues,
    hype: p.hype,
    research: ctx.research,
    showrunner: ctx.showrunner,
    genreIdeal: ideal,
    genreRatio: ratio,
    comboLevel,
    newCombo: !(key in ctx.comboLevels),
    comboDiscovered: key in ctx.comboLevels,
    castCombos: ctx.castCombos,
    arcCombos: ctx.arcCombos,
    studioTop: ctx.studioTop,
    franchiseMult,
    costs: p.spent,
    fanBase: ctx.fans,
    audienceBar: ctx.audienceBar,
  });

  let out = res;

  /* the market pays what the market pays — reviews are unaffected */
  const mkt = ctx.marketMult ?? 1;
  if (Math.abs(mkt - 1) > 0.001) {
    out = {
      ...out,
      revenue: Math.round(out.revenue * mkt),
      fans: Math.round(out.fans * Math.min(1.2, Math.max(0.85, mkt))),
      breakdown: [...out.breakdown, { label: "Market demand", pts: `×${mkt.toFixed(2)} revenue` }],
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
    };
  }

  /* the broadcaster docks a late delivery */
  const mult = lateRevenueMult(p);
  if (mult < 1) {
    out = {
      ...out,
      revenue: Math.round(out.revenue * mult),
      fans: Math.round(out.fans * mult),
      breakdown: [...out.breakdown, { label: `Late delivery (${p.lateWeeks} wk)`, pts: `×${mult.toFixed(2)} revenue` }],
    };
  }
  return out;
}
