from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, repl: str, flags=0) -> None:
    text = read(path)
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"Expected exactly one regex match in {path}, found {count}: {pattern[:120]!r}")
    write(path, out)


# ---------------------------------------------------------------------------
# 1) Production scope and research language
# ---------------------------------------------------------------------------
data = "game_source/src/engine/data.ts"
replace_once(
    data,
    'export type BudgetId = "indie" | "standard" | "blockbuster";\nexport type SlotId = "midnight" | "evening" | "prime" | "stream";',
    'export type BudgetId = "indie" | "standard" | "blockbuster";\nexport type ScopeId = "short" | "standard" | "extended" | "prestige";\nexport type SlotId = "midnight" | "evening" | "prime" | "stream";'
)
replace_once(
    data,
    '  budget: BudgetId;\n  slot: SlotId;',
    '  budget: BudgetId;\n  /** production ambition: larger scopes cost more, take longer and strain departments */\n  scope?: ScopeId;\n  slot: SlotId;'
)
# Insert scope definitions immediately before the budgets table.
replace_once(
    data,
    'export const BUDGETS: Record<BudgetId, { label: string; cost: number; scope: number; desc: string; heat: number }> = {',
    '''export interface ProductionScope {\n  label: string;\n  shortLabel: string;\n  desc: string;\n  weeksMult: number;\n  costMult: number;\n  workMult: number;\n  audienceMult: number;\n  minOffice: number;\n  minStaff: number;\n}\n\nexport const PRODUCTION_SCOPES: Record<ScopeId, ProductionScope> = {\n  short: { label: "Short Run", shortLabel: "SHORT", desc: "Lean, focused and forgiving — ideal for a small crew.", weeksMult: 0.78, costMult: 0.78, workMult: 0.72, audienceMult: 0.78, minOffice: 0, minStaff: 0 },\n  standard: { label: "Standard Production", shortLabel: "STANDARD", desc: "The normal seasonal production target.", weeksMult: 1, costMult: 1, workMult: 1, audienceMult: 1, minOffice: 0, minStaff: 0 },\n  extended: { label: "Extended Production", shortLabel: "EXTENDED", desc: "More episodes, more cuts and a much heavier pipeline.", weeksMult: 1.42, costMult: 1.5, workMult: 1.45, audienceMult: 1.18, minOffice: 1, minStaff: 3 },\n  prestige: { label: "Prestige Production", shortLabel: "PRESTIGE", desc: "An event-scale slate anchor. Huge ceiling, brutal departmental demand.", weeksMult: 1.82, costMult: 2.15, workMult: 1.9, audienceMult: 1.38, minOffice: 2, minStaff: 5 },\n};\n\nexport const scopeLabel = (scope: ScopeId, medium: MediumId) => {\n  if (scope === "short") return medium === "movie" ? "Short Feature" : medium === "ona" ? "Short Run" : "Short Cour";\n  if (scope === "standard") return medium === "movie" ? "Standard Feature" : medium === "ona" ? "Streaming Season" : "Standard Cour";\n  if (scope === "extended") return medium === "movie" ? "Major Feature" : medium === "ona" ? "Full Streaming Season" : "Double Cour";\n  return medium === "movie" ? "Event Film" : medium === "ona" ? "Prestige Streaming Event" : "Prestige Series";\n};\n\nexport const BUDGETS: Record<BudgetId, { label: string; cost: number; scope: number; desc: string; heat: number }> = {'''
)
replace_once(
    data,
    '''export const RESEARCH: ResearchItem[] = [\n  { id: "storyboard", name: "Storyboard Method", rd: 20, desc: "Bubbles linger 25% longer on the floor." },\n  { id: "pipeline", name: "Digital Pipeline", rd: 28, desc: "+20% bubble spawn rate in every phase." },\n  { id: "qa", name: "Editing Room", rd: 24, desc: "30% fewer editing notes appear on the floor." },''',
    '''export const RESEARCH: ResearchItem[] = [\n  { id: "storyboard", name: "Storyboard Method", rd: 20, desc: "Work stays available 25% longer before it becomes a miss." },\n  { id: "pipeline", name: "Digital Pipeline", rd: 28, desc: "Crew automatically clears production work 12% faster." },\n  { id: "qa", name: "Editing Room", rd: 24, desc: "Editing staff clear notes 15% faster and production issues are reduced." },'''
)
replace_once(
    data,
    '''  { id: "mocap", name: "Motion Reference", rd: 40, desc: "Art bubbles are worth +1 point." },\n  { id: "cg", name: "CG Assist", rd: 44, desc: "+25% bubble spawn rate in every phase." },\n  { id: "local", name: "Localisation", rd: 48, desc: "+12% revenue from overseas markets." },\n  { id: "autoclean", name: "Auto-Cleanup", rd: 52, desc: "50% fewer editing notes appear." },''',
    '''  { id: "mocap", name: "Motion Reference", rd: 40, desc: "Animation sprint output gains +12% Art quality." },\n  { id: "cg", name: "CG Assist", rd: 44, desc: "Animation department capacity +20%; blockbuster animation demand −10%." },\n  { id: "local", name: "Localisation", rd: 48, desc: "+12% revenue from overseas markets." },\n  { id: "autoclean", name: "Auto-Cleanup", rd: 52, desc: "Automatically clears 35% of outstanding edit notes before final QA." },'''
)

# ---------------------------------------------------------------------------
# 2) Project length/cost, diminishing speed returns and bottleneck hook
# ---------------------------------------------------------------------------
projects = "game_source/src/engine/projects.ts"
replace_once(
    projects,
    '  MEDIUMS,\n  SLOTS,',
    '  MEDIUMS,\n  PRODUCTION_SCOPES,\n  SLOTS,'
)
replace_once(
    projects,
    '''export function draftCost(d: Draft): number {\n  const arcCost = d.arcs.reduce((a, id) => a + (ARCS.find((x) => x.id === id)?.cost ?? 0), 0);\n  return Math.round(BUDGETS[d.budget].cost * MEDIUMS[d.medium].costMult + SLOTS[d.slot].cost + arcCost);\n}\n\n/** planned production length in weeks (excluding airing) */\nexport function draftWeeks(d: Draft): number {\n  return 11 + MEDIUMS[d.medium].weeks + Math.max(0, d.arcs.length - 3);\n}''',
    '''const scopeOf = (d: Draft) => PRODUCTION_SCOPES[d.scope ?? "standard"];\n\nexport function draftCost(d: Draft): number {\n  const arcCost = d.arcs.reduce((a, id) => a + (ARCS.find((x) => x.id === id)?.cost ?? 0), 0);\n  const scope = scopeOf(d);\n  return Math.round((BUDGETS[d.budget].cost * MEDIUMS[d.medium].costMult + SLOTS[d.slot].cost + arcCost) * scope.costMult);\n}\n\n/** planned production length in weeks (excluding airing). Better studios should\n * attempt larger work, not simply compress identical shows into half the calendar. */\nexport function draftWeeks(d: Draft): number {\n  const scope = scopeOf(d);\n  const budgetTime = d.budget === "blockbuster" ? 1.14 : d.budget === "indie" ? 0.94 : 1;\n  const base = 11 + MEDIUMS[d.medium].weeks + Math.max(0, d.arcs.length - 3);\n  return Math.max(7, Math.round(base * scope.weeksMult * budgetTime));\n}'''
)
replace_once(
    projects,
    '''/** how much stage work the team banks in one week (1 = on schedule) */\nexport function teamSpeed(\n  p: Project,\n  team: Staff[],\n  fx: FacilityFX = NO_FX,\n  mods?: StaffModFn,\n  studio: StudioMod = NO_STUDIO\n): number {\n  const focus = STAGE_FOCUS[p.stage];\n  let v = 0.35; // the showrunner keeps things moving even solo\n  for (const s of team) {\n    const rel = focus ? staffPoint(s, focus) : (s.story + s.art + s.sound) / 3;\n    const m = mods?.(s, p, team);\n    v += (0.22 + rel / 280) * (m ? m.pace : staminaF(s)) + (m?.aura ?? 0);\n  }\n  /* render farm speeds everything (blockbusters most); the animation\n     department cuts delays specifically during the animation stage;\n     a production manager keeps every schedule tight */\n  v += fxSpeedFor(fx, p.draft.budget) + studio.speed;\n  if (p.stage === "animation") v += fx.speedAnimation;\n  return Math.min(2.4, v);\n}''',
    '''/** raw studio capacity. Capacity above the schedule ceiling becomes quality\n * and consistency rather than endlessly shortening the campaign. */\nexport function rawTeamCapacity(\n  p: Project,\n  team: Staff[],\n  fx: FacilityFX = NO_FX,\n  mods?: StaffModFn,\n  studio: StudioMod = NO_STUDIO\n): number {\n  const focus = STAGE_FOCUS[p.stage];\n  let v = 0.35; // the showrunner keeps things moving even solo\n  for (const s of team) {\n    const rel = focus ? staffPoint(s, focus) : (s.story + s.art + s.sound) / 3;\n    const m = mods?.(s, p, team);\n    v += (0.22 + rel / 280) * (m ? m.pace : staminaF(s)) + (m?.aura ?? 0);\n  }\n  v += fxSpeedFor(fx, p.draft.budget) + studio.speed;\n  if (p.stage === "animation") v += fx.speedAnimation;\n  return v;\n}\n\nexport const SCHEDULE_SPEED_CAP = 1.35;\n\n/** how much stage work the team banks in one week (1 = on schedule). */\nexport function teamSpeed(\n  p: Project,\n  team: Staff[],\n  fx: FacilityFX = NO_FX,\n  mods?: StaffModFn,\n  studio: StudioMod = NO_STUDIO\n): number {\n  return Math.min(SCHEDULE_SPEED_CAP, rawTeamCapacity(p, team, fx, mods, studio));\n}\n\n/** surplus capacity improves the work instead of deleting calendar time. */\nexport function teamQualityMultiplier(\n  p: Project,\n  team: Staff[],\n  fx: FacilityFX = NO_FX,\n  mods?: StaffModFn,\n  studio: StudioMod = NO_STUDIO\n): number {\n  const surplus = Math.max(0, rawTeamCapacity(p, team, fx, mods, studio) - SCHEDULE_SPEED_CAP);\n  return Math.min(1.28, 1 + surplus * 0.18);\n}'''
)
replace_once(
    projects,
    '''export function tickProjectsWeek(\n  projects: Project[],\n  staff: Staff[],\n  week: number,\n  fx: FacilityFX = NO_FX,\n  mods?: StaffModFn,\n  studio: StudioMod = NO_STUDIO\n): WeekTickResult {''',
    '''export function tickProjectsWeek(\n  projects: Project[],\n  staff: Staff[],\n  week: number,\n  fx: FacilityFX = NO_FX,\n  mods?: StaffModFn,\n  studio: StudioMod = NO_STUDIO,\n  departmentLoad: Record<string, number> = {}\n): WeekTickResult {'''
)
replace_once(
    projects,
    '''      const plan = p.plan[p.stage] ?? 1;\n      const focus = STAGE_FOCUS[p.stage];\n      if (focus) {\n        for (const s of team) {\n          const m = mods?.(s, p, team);\n          p.points[focus] += Math.round(staffPoint(s, focus) * 0.07 * (m ? m.out : staminaF(s)) * fx.pointMult[focus]);\n        }\n      }\n      if (p.stage === "post") {\n        p.issues = Math.max(0, p.issues - Math.round(team.length * 0.6 + 0.4) - fx.issueFix);\n      }''',
    '''      const plan = p.plan[p.stage] ?? 1;\n      const focus = STAGE_FOCUS[p.stage];\n      const qualityMult = teamQualityMultiplier(p, team, fx, mods, studio);\n      if (focus) {\n        for (const s of team) {\n          const m = mods?.(s, p, team);\n          p.points[focus] += Math.round(staffPoint(s, focus) * 0.07 * (m ? m.out : staminaF(s)) * fx.pointMult[focus] * qualityMult);\n        }\n      }\n      if (p.stage === "post") {\n        const surplusFix = Math.max(0, Math.floor((qualityMult - 1) * 8));\n        p.issues = Math.max(0, p.issues - Math.round(team.length * 0.6 + 0.4) - fx.issueFix - surplusFix);\n      }'''
)
replace_once(
    projects,
    '        p.progress += teamSpeed(p, team, fx, mods, studio);',
    '''        const load = departmentLoad[p.id] ?? 1;\n        p.progress += teamSpeed(p, team, fx, mods, studio) * load;\n        /* sustained over-capacity creates rework instead of making a fifth simultaneous\n           prestige show free. */\n        if (load < 0.72 && week % 2 === 0 && (p.stage === "animation" || p.stage === "post")) p.issues += 1;'''
)

# ---------------------------------------------------------------------------
# 3) Department capacity model (new file)
# ---------------------------------------------------------------------------
write("game_source/src/engine/capacity.ts", r'''import { PRODUCTION_SCOPES, type PointType, type Staff } from "./data";
import type { Facilities } from "./facilities";
import { activeProjects, type Project, type ProjectStage } from "./projects";

export type DepartmentId = "story" | "animation" | "sound" | "post" | "marketing";

export interface DepartmentStatus {
  id: DepartmentId;
  label: string;
  capacity: number;
  demand: number;
  utilization: number;
  overloaded: boolean;
}

export const DEPARTMENT_LABEL: Record<DepartmentId, string> = {
  story: "Writing",
  animation: "Animation",
  sound: "Sound / Voice",
  post: "Post / QA",
  marketing: "Marketing",
};

export function departmentForStage(stage: ProjectStage): DepartmentId | null {
  if (stage === "concept" || stage === "preprod") return "story";
  if (stage === "animation") return "animation";
  if (stage === "sound") return "sound";
  if (stage === "post") return "post";
  if (stage === "marketing") return "marketing";
  return null;
}

const roleContribution = (s: Staff, point: PointType, preferred: Staff["role"]) => {
  const skill = s[point];
  const roleF = s.role === preferred ? 1 : 0.38;
  const staminaF = 0.72 + s.stamina / 360;
  return skill * roleF * staminaF;
};

export function departmentCapacities(staff: Staff[], facilities: Facilities, research: string[]): Record<DepartmentId, number> {
  const writers = facilities.writers ?? 0;
  const anim = facilities.animation ?? 0;
  const rec = facilities.recording ?? 0;
  const edit = facilities.editing ?? 0;
  const market = facilities.marketing ?? 0;
  const cg = research.includes("cg") ? 1.2 : 1;
  const qa = research.includes("qa") ? 1.15 : 1;
  return {
    story: Math.round(65 + staff.reduce((a, s) => a + roleContribution(s, "story", "writer"), 0) + writers * 55),
    animation: Math.round((65 + staff.reduce((a, s) => a + roleContribution(s, "art", "animator"), 0) + anim * 65) * cg),
    sound: Math.round(60 + staff.reduce((a, s) => a + roleContribution(s, "sound", "composer"), 0) + rec * 58),
    post: Math.round((58 + staff.reduce((a, s) => a + ((s.art + s.sound) / 2) * 0.42, 0) + edit * 70) * qa),
    marketing: Math.round(55 + staff.reduce((a, s) => a + ((s.story + s.art + s.sound) / 3) * 0.28, 0) + market * 72),
  };
}

export function projectDepartmentDemand(p: Project, research: string[]): number {
  const dept = departmentForStage(p.stage);
  if (!dept || p.milestone) return 0;
  const scope = PRODUCTION_SCOPES[p.draft.scope ?? "standard"];
  const budget = p.draft.budget === "blockbuster" ? 1.38 : p.draft.budget === "indie" ? 0.78 : 1;
  const stage = dept === "animation" ? 1.15 : dept === "post" ? 0.82 : dept === "marketing" ? 0.7 : 1;
  const cgRelief = dept === "animation" && p.draft.budget === "blockbuster" && research.includes("cg") ? 0.9 : 1;
  return Math.round(105 * scope.workMult * budget * stage * cgRelief);
}

export function departmentStatuses(projects: Project[], staff: Staff[], facilities: Facilities, research: string[]): DepartmentStatus[] {
  const capacities = departmentCapacities(staff, facilities, research);
  const demand = { story: 0, animation: 0, sound: 0, post: 0, marketing: 0 } as Record<DepartmentId, number>;
  for (const p of activeProjects(projects)) {
    const d = departmentForStage(p.stage);
    if (d) demand[d] += projectDepartmentDemand(p, research);
  }
  return (Object.keys(demand) as DepartmentId[]).map((id) => {
    const capacity = capacities[id];
    const d = demand[id];
    const utilization = capacity > 0 ? d / capacity : d > 0 ? 9 : 0;
    return { id, label: DEPARTMENT_LABEL[id], capacity, demand: d, utilization, overloaded: utilization > 1 };
  });
}

/** per-project schedule multiplier from studio-wide department contention. */
export function projectLoadMap(projects: Project[], staff: Staff[], facilities: Facilities, research: string[]): Record<string, number> {
  const statuses = departmentStatuses(projects, staff, facilities, research);
  const byId = Object.fromEntries(statuses.map((s) => [s.id, s])) as Record<DepartmentId, DepartmentStatus>;
  const out: Record<string, number> = {};
  for (const p of activeProjects(projects)) {
    const d = departmentForStage(p.stage);
    if (!d || p.milestone) continue;
    const s = byId[d];
    out[p.id] = s.demand <= s.capacity ? 1 : Math.max(0.52, s.capacity / Math.max(1, s.demand));
  }
  return out;
}
''')

# ---------------------------------------------------------------------------
# 4) Background contract / timed training / timed research helpers
# ---------------------------------------------------------------------------
write("game_source/src/engine/studioOps.ts", r'''import { staffPoint, type Contract, type PointType, type Staff } from "./data";

export interface ContractAssignment {
  id: string;
  contract: Contract;
  staffIds: string[];
  startWeek: number;
  dueWeek: number;
  progress: number;
}

export interface TrainingJob {
  id: string;
  staffId: string;
  staffName: string;
  focus: PointType;
  tier: number;
  startWeek: number;
  completesWeek: number;
}

export interface ResearchJob {
  id: string;
  researchId: string;
  name: string;
  startWeek: number;
  completesWeek: number;
  rdCost: number;
}

export const trainingWeeks = (tier: number) => Math.max(2, 5 - Math.max(1, tier));
export const researchWeeks = (rd: number, archiveTier: number) => Math.max(2, Math.round(2 + rd / 18) - archiveTier);

export function contractWeeklyOutput(contract: Contract, crew: Staff[], research: string[] = []): number {
  const pipeline = research.includes("pipeline") ? 1.12 : 1;
  const base = 4; // showrunner / producer coordination
  return Math.max(
    1,
    Math.round(
      (base + crew.reduce((a, s) => a + staffPoint(s, contract.type) * (0.14 + s.stamina / 1000), 0)) * pipeline
    )
  );
}

export const projectedContractTotal = (contract: Contract, crew: Staff[], research: string[] = []) =>
  contractWeeklyOutput(contract, crew, research) * contract.weeks;
''')

# ---------------------------------------------------------------------------
# 5) Wire ops/capacity into RunState and weekly simulation
# ---------------------------------------------------------------------------
state = "game_source/src/engine/state.ts"
replace_once(
    state,
    '  GENRES,\n  OFFICES,',
    '  GENRES,\n  OFFICES,\n  PRODUCTION_SCOPES,\n  RESEARCH,'
)
replace_once(
    state,
    'import { tickDelegated } from "./automation";\nimport { rollStudioEvent, type StudioEvent } from "./events";',
    '''import { tickDelegated } from "./automation";\nimport { projectLoadMap } from "./capacity";\nimport {\n  contractWeeklyOutput,\n  researchWeeks,\n  trainingWeeks,\n  type ContractAssignment,\n  type ResearchJob,\n  type TrainingJob,\n} from "./studioOps";\nimport { rollStudioEvent, type StudioEvent } from "./events";'''
)
replace_once(
    state,
    '  /** pending studio dilemmas — 2–3 responses with real trade-offs */\n  studioEvents: StudioEvent[];\n  /** overseas licensing deal: +15% revenue until this week */',
    '''  /** pending studio dilemmas — 2–3 responses with real trade-offs */\n  studioEvents: StudioEvent[];\n  /** small freelance jobs now occupy real staff over real calendar weeks */\n  contractJobs: ContractAssignment[];\n  /** staff courses finish after several weeks instead of instantly */\n  trainingJobs: TrainingJob[];\n  /** studio technologies unlock after a timed research project */\n  researchJobs: ResearchJob[];\n  /** overseas licensing deal: +15% revenue until this week */'''
)
replace_once(
    state,
    '    studioEvents: [],\n    revBoostUntil: 0,',
    '    studioEvents: [],\n    contractJobs: [],\n    trainingJobs: [],\n    researchJobs: [],\n    revBoostUntil: 0,'
)
replace_once(
    state,
    '    studioEvents: Array.isArray(r.studioEvents) ? r.studioEvents : [],\n    revBoostUntil: typeof r.revBoostUntil === "number" ? r.revBoostUntil : 0,',
    '''    studioEvents: Array.isArray(r.studioEvents) ? r.studioEvents : [],\n    contractJobs: Array.isArray(r.contractJobs) ? r.contractJobs : [],\n    trainingJobs: Array.isArray(r.trainingJobs) ? r.trainingJobs : [],\n    researchJobs: Array.isArray(r.researchJobs) ? r.researchJobs : [],\n    revBoostUntil: typeof r.revBoostUntil === "number" ? r.revBoostUntil : 0,'''
)
replace_once(
    state,
    '  let projects = r.projects ?? [];\n  let rd = r.rd;',
    '  let projects = r.projects ?? [];\n  let rd = r.rd;\n  let research = [...(r.research ?? [])];\n  let contractJobs = [...(r.contractJobs ?? [])];\n  let trainingJobs = [...(r.trainingJobs ?? [])];\n  let researchJobs = [...(r.researchJobs ?? [])];'
)
replace_once(
    state,
    '    /* every project in the pipeline gets a week of work */\n    const tick = tickProjectsWeek(projects, staffArr, w, fx, mods, studio);',
    '''    /* every project in the pipeline gets a week of work. Multiple shows in\n       the same department now contend for finite studio capacity. */\n    const loadMap = projectLoadMap(projects, staffArr, r.facilities, research);\n    const tick = tickProjectsWeek(projects, staffArr, w, fx, mods, studio, loadMap);'''
)
# Insert operation ticking after delegated production and before archive research.
replace_once(
    state,
    '''    notices.push(...dlg.notices);\n\n    /* the archive room quietly files away research */\n    rd += fx.rdWeekly;''',
    '''    notices.push(...dlg.notices);\n\n    /* ------- background contract work: real staff, real weeks ------- */\n    {\n      const keep: ContractAssignment[] = [];\n      for (const job of contractJobs) {\n        const crew = staffArr.filter((s) => job.staffIds.includes(s.id));\n        const progress = job.progress + contractWeeklyOutput(job.contract, crew, research);\n        if (progress >= job.contract.target) {\n          cash += job.contract.pay;\n          rd += job.contract.rd;\n          staffArr = staffArr.map((s) => {\n            if (!job.staffIds.includes(s.id)) return s;\n            return gainXp(s, CONTRACT_XP).staff;\n          });\n          notices.push(`✅ Contract delivered in the background: ${job.contract.name} (+£${job.contract.pay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);\n        } else if (w >= job.dueWeek) {\n          const consolation = Math.max(1, Math.round(job.contract.rd / 3));\n          rd += consolation;\n          notices.push(`❌ Contract missed: ${job.contract.name} — ${progress}/${job.contract.target} progress (+${consolation} RD learned).`);\n        } else {\n          keep.push({ ...job, progress });\n        }\n      }\n      contractJobs = keep;\n    }\n\n    /* ------- courses complete after occupying the employee for weeks ------- */\n    {\n      const keep: TrainingJob[] = [];\n      for (const job of trainingJobs) {\n        const exists = staffArr.some((s) => s.id === job.staffId);\n        if (!exists) continue;\n        if (w < job.completesWeek) { keep.push(job); continue; }\n        staffArr = staffArr.map((s) => {\n          if (s.id !== job.staffId) return s;\n          let nx = ensureCareer({ ...s, [job.focus]: Math.min(99, s[job.focus] + 1), lastTrainedWeek: w }, w);\n          nx = moraleDelta(nx, 3);\n          return gainXp(nx, trainXp(job.tier)).staff;\n        });\n        notices.push(`🎓 ${job.staffName} completes ${job.focus} training (+1 ${job.focus}, +${trainXp(job.tier)} XP).`);\n      }\n      trainingJobs = keep;\n    }\n\n    /* ------- research projects mature over calendar time ------- */\n    {\n      const keep: ResearchJob[] = [];\n      for (const job of researchJobs) {\n        if (w < job.completesWeek) { keep.push(job); continue; }\n        if (!research.includes(job.researchId)) research.push(job.researchId);\n        notices.push(`🔬 Research complete: ${job.name}!`);\n      }\n      researchJobs = keep;\n    }\n\n    /* the archive room quietly files away research */\n    rd += fx.rdWeekly;'''
)
# Make staff working operations count as busy rather than recovering stamina.
replace_once(
    state,
    '''      const busy = assignedStaffIds(projects);\n      const drain = Math.max(1, 3 - fx.staminaSave);\n      const rest = 9 + fx.staminaRest;\n      staffArr = staffArr.map((st) => {\n        let nx = { ...st };\n        const proj = busy.has(st.id) ? projectOfStaff(projects, st.id) : null;\n        if (proj) {''',
    '''      const busy = assignedStaffIds(projects);\n      const opBusy = new Set([\n        ...contractJobs.flatMap((j) => j.staffIds),\n        ...trainingJobs.map((j) => j.staffId),\n      ]);\n      const drain = Math.max(1, 3 - fx.staminaSave);\n      const rest = 9 + fx.staminaRest;\n      staffArr = staffArr.map((st) => {\n        let nx = { ...st };\n        const proj = busy.has(st.id) ? projectOfStaff(projects, st.id) : null;\n        if (proj) {'''
)
replace_once(
    state,
    '''          if (g.levelsGained > 0)\n            notices.push(`${nx.name} is promoted to ${levelTitle(nx.level)} (Lv ${nx.level})!`);\n        } else {\n          nx.stamina = Math.min(100, nx.stamina + rest);''',
    '''          if (g.levelsGained > 0)\n            notices.push(`${nx.name} is promoted to ${levelTitle(nx.level)} (Lv ${nx.level})!`);\n        } else if (opBusy.has(st.id)) {\n          nx.stamina = Math.max(12, nx.stamina - Math.max(1, drain - 1));\n          const g = gainXp(nx, Math.max(1, WEEKLY_XP - 1) * dynFx.xpMult);\n          nx = g.staff;\n        } else {\n          nx.stamina = Math.min(100, nx.stamina + rest);'''
)
replace_once(
    state,
    '''    projects,\n    incomeThisWeek,''',
    '''    projects,\n    research,\n    contractJobs,\n    trainingJobs,\n    researchJobs,\n    incomeThisWeek,'''
)
# Scope gating at greenlight.
replace_once(
    state,
    '''  if (active >= cap)\n    return `${OFFICES[r.officeLevel].name} can only run ${cap} production${cap > 1 ? "s" : ""} at once`;\n  if (d && r.cash < projectUpfront(d)) return "Not enough cash for the greenlight payment";''',
    '''  if (active >= cap)\n    return `${OFFICES[r.officeLevel].name} can only run ${cap} production${cap > 1 ? "s" : ""} at once`;\n  if (d) {\n    const scope = PRODUCTION_SCOPES[d.scope ?? "standard"];\n    if (r.officeLevel < scope.minOffice) return `${scope.label} requires ${OFFICES[scope.minOffice].name} or larger`;\n    if (r.staff.length < scope.minStaff) return `${scope.label} needs at least ${scope.minStaff} staff on the books`;\n  }\n  if (d && r.cash < projectUpfront(d)) return "Not enough cash for the greenlight payment";'''
)
# Prevent project assignment from stealing staff out of contract/training operations.
replace_once(
    state,
    '''/** move a staff member onto / off a project (exclusive assignment) */\nexport function assignToProject(r: RunState, projectId: string, staffId: string): RunState {\n  return { ...r, projects: toggleAssign(r.projects, projectId, staffId) };\n}''',
    '''/** work outside major productions also occupies staff. */\nexport function staffOperationReason(r: RunState, staffId: string): string | null {\n  const c = (r.contractJobs ?? []).find((j) => j.staffIds.includes(staffId));\n  if (c) return `Contract: ${c.contract.name}`;\n  const t = (r.trainingJobs ?? []).find((j) => j.staffId === staffId);\n  if (t) return `Training until ${dateLabel(t.completesWeek)}`;\n  return null;\n}\n\nexport function staffBusyReason(r: RunState, staffId: string): string | null {\n  const p = projectOfStaff(r.projects, staffId);\n  return p ? `On “${p.draft.title}”` : staffOperationReason(r, staffId);\n}\n\n/** move a staff member onto / off a project (exclusive assignment). */\nexport function assignToProject(r: RunState, projectId: string, staffId: string): RunState {\n  const p = projectById(r, projectId);\n  const already = !!p?.staffIds.includes(staffId);\n  const op = !already ? staffOperationReason(r, staffId) : null;\n  if (op) return { ...r, notices: [...r.notices, `${r.staff.find((s) => s.id === staffId)?.name ?? "That employee"} is unavailable — ${op}.`] };\n  return { ...r, projects: toggleAssign(r.projects, projectId, staffId) };\n}\n\nexport function startContractAssignment(r: RunState, contract: Contract, staffIds: string[]): RunState | null {\n  const ids = [...new Set(staffIds)].slice(0, 3);\n  if (ids.length < 1) return null;\n  if (!r.contracts.some((c) => c.id === contract.id)) return null;\n  for (const id of ids) if (staffBusyReason(r, id)) return null;\n  const job: ContractAssignment = {\n    id: `job_${contract.id}_${r.week}`,\n    contract,\n    staffIds: ids,\n    startWeek: r.week,\n    dueWeek: r.week + contract.weeks,\n    progress: 0,\n  };\n  return {\n    ...r,\n    contracts: r.contracts.filter((c) => c.id !== contract.id),\n    contractJobs: [...(r.contractJobs ?? []), job],\n    notices: [...r.notices, `📋 ${contract.name} assigned to ${ids.length} staff — due ${dateLabel(job.dueWeek)}. The calendar does not jump.`],\n  };\n}'''
)
# Auto-clean integration.
replace_once(
    state,
    '''  const fx = facilityFX(r.facilities);\n  /* the QA suite catches problems before they become issues */\n  const guarded: MilestoneOutcome =\n    o.issues > 0 ? { ...o, issues: Math.max(0, o.issues - fx.issueGuard) } : o;''',
    '''  const fx = facilityFX(r.facilities);\n  const autoClean = done === "edit" && r.research.includes("autoclean") ? Math.ceil((proj?.issues ?? 0) * 0.35) : 0;\n  const withCleanup: MilestoneOutcome = autoClean > 0 ? { ...o, squashed: (o.squashed ?? 0) + autoClean } : o;\n  /* the QA suite catches problems before they become issues */\n  const guarded: MilestoneOutcome =\n    withCleanup.issues > 0 ? { ...withCleanup, issues: Math.max(0, withCleanup.issues - fx.issueGuard) } : withCleanup;'''
)
# Scope payout/fan ceiling.
replace_once(
    state,
    '''  let out = computeProjectResult(p, {\n    research: r.research,''',
    '''  let out = computeProjectResult(p, {\n    research: r.research,'''
)
replace_once(
    state,
    '''    audienceBar: dynastyAudienceBar(r),\n  });\n  /* dynasty-era empire buffs apply after the core review lands */''',
    '''    audienceBar: dynastyAudienceBar(r),\n  });\n  const scope = PRODUCTION_SCOPES[d.scope ?? "standard"];\n  if (scope.audienceMult !== 1) {\n    out = {\n      ...out,\n      revenue: Math.round(out.revenue * scope.audienceMult),\n      fans: Math.round(out.fans * Math.sqrt(scope.audienceMult)),\n      breakdown: [...out.breakdown, { label: `${scope.label} reach`, pts: `×${scope.audienceMult.toFixed(2)} revenue ceiling` }],\n    };\n  }\n  /* dynasty-era empire buffs apply after the core review lands */'''
)
# Timed training replaces instant training.
replace_once(
    state,
    '''export function trainBlockReason(r: RunState, staffId: string): string | null {\n  const tier = r.facilities.training ?? 0;\n  if (tier < 1) return "Build a Training Room first";\n  const s = r.staff.find((x) => x.id === staffId);\n  if (!s) return "No such staff member";\n  if (r.week - (s.lastTrainedWeek ?? -99) < TRAIN_COOLDOWN)\n    return `On cooldown (${TRAIN_COOLDOWN - (r.week - (s.lastTrainedWeek ?? 0))} wk left)`;\n  const cost = trainCost(tier);\n  if (r.cash < cost.cash) return `Needs £${cost.cash.toLocaleString("en-GB")}`;\n  if (r.rd < cost.rd) return `Needs ${cost.rd} research data`;\n  return null;\n}\n\n/** a course: costs money, RD and energy — pays out XP and +1 to one skill */\nexport function trainStaff(r: RunState, staffId: string, focus: PointType): RunState | null {\n  if (trainBlockReason(r, staffId)) return null;\n  const tier = r.facilities.training ?? 0;\n  const cost = trainCost(tier);\n  const notices = [...r.notices];\n  const staff = r.staff.map((s) => {\n    if (s.id !== staffId) return s;\n    let nx = ensureCareer({ ...s }, r.week);\n    nx = {\n      ...nx,\n      [focus]: Math.min(99, nx[focus] + 1),\n      stamina: Math.max(12, nx.stamina - 12),\n      lastTrainedWeek: r.week,\n    };\n    nx = moraleDelta(nx, 3);\n    const g = gainXp(nx, trainXp(tier));\n    if (g.levelsGained > 0)\n      notices.push(`${g.staff.name} is promoted to ${levelTitle(g.staff.level)} (Lv ${g.staff.level})!`);\n    notices.push(`${g.staff.name} completes a ${focus} masterclass (+1 ${focus}, +${trainXp(tier)} XP).`);\n    return g.staff;\n  });\n  return { ...r, cash: r.cash - cost.cash, rd: r.rd - cost.rd, staff, notices };\n}''',
    '''export function trainBlockReason(r: RunState, staffId: string): string | null {\n  const tier = r.facilities.training ?? 0;\n  if (tier < 1) return "Build a Training Room first";\n  const s = r.staff.find((x) => x.id === staffId);\n  if (!s) return "No such staff member";\n  const busy = staffBusyReason(r, staffId);\n  if (busy) return busy;\n  if (r.week - (s.lastTrainedWeek ?? -99) < TRAIN_COOLDOWN)\n    return `On cooldown (${TRAIN_COOLDOWN - (r.week - (s.lastTrainedWeek ?? 0))} wk left)`;\n  const cost = trainCost(tier);\n  if (r.cash < cost.cash) return `Needs £${cost.cash.toLocaleString("en-GB")}`;\n  if (r.rd < cost.rd) return `Needs ${cost.rd} research data`;\n  return null;\n}\n\n/** training now occupies the employee for calendar time; the reward lands on completion. */\nexport function trainStaff(r: RunState, staffId: string, focus: PointType): RunState | null {\n  if (trainBlockReason(r, staffId)) return null;\n  const tier = r.facilities.training ?? 0;\n  const cost = trainCost(tier);\n  const s = r.staff.find((x) => x.id === staffId)!;\n  const weeks = trainingWeeks(tier);\n  const job: TrainingJob = {\n    id: `train_${staffId}_${r.week}`, staffId, staffName: s.name, focus, tier, startWeek: r.week, completesWeek: r.week + weeks,\n  };\n  return {\n    ...r, cash: r.cash - cost.cash, rd: r.rd - cost.rd,\n    trainingJobs: [...(r.trainingJobs ?? []), job],\n    notices: [...r.notices, `🎓 ${s.name} starts ${focus} training for ${weeks} weeks — unavailable until ${dateLabel(job.completesWeek)}.`],\n  };\n}\n\nexport function startResearchProject(r: RunState, id: string, rdCost: number): RunState | null {\n  if (r.research.includes(id) || (r.researchJobs ?? []).some((j) => j.researchId === id)) return null;\n  if (r.rd < rdCost) return null;\n  const def = RESEARCH.find((x) => x.id === id);\n  if (!def) return null;\n  const weeks = researchWeeks(rdCost, r.facilities.archive ?? 0);\n  const job: ResearchJob = { id: `research_${id}_${r.week}`, researchId: id, name: def.name, startWeek: r.week, completesWeek: r.week + weeks, rdCost };\n  return {\n    ...r, rd: r.rd - rdCost, researchJobs: [...(r.researchJobs ?? []), job],\n    notices: [...r.notices, `🔬 Research started: ${def.name} — ${weeks} weeks to completion.`],\n  };\n}'''
)

# ---------------------------------------------------------------------------
# 6) Production floor research now accelerates staff rather than workload
# ---------------------------------------------------------------------------
floor = "game_source/src/components/ProductionFloor.tsx"
replace_once(floor, '  lifeMult,\n  bugRate,', '  lifeMult,\n  autoSpeedMult = 1,\n  bugRate,')
replace_once(floor, '  lifeMult: number;\n  bugRate: number;', '  lifeMult: number;\n  autoSpeedMult?: number;\n  bugRate: number;')
replace_once(
    floor,
    '      s.nextAuto[i] = s.elapsed + autoPopInterval(d.skill) * (0.88 + Math.random() * 0.24);',
    '      s.nextAuto[i] = s.elapsed + (autoPopInterval(d.skill) / Math.max(0.5, autoSpeedMult)) * (0.88 + Math.random() * 0.24);'
)

produce = "game_source/src/components/Produce.tsx"
replace_once(produce, '  POINT_COLOR,\n  POINT_LABEL,', '  POINT_COLOR,\n  POINT_LABEL,\n  PRODUCTION_SCOPES,')
replace_once(
    produce,
    '''  const spawnMult = (run.research.includes("pipeline") ? 1.2 : 1) * (1 + run.officeLevel * 0.05);\n  const lifeMult = (run.research.includes("storyboard") ? 1.25 : 1) * (run.showrunner === "steady" ? 1.2 : 1);''',
    '''  const scopeWork = PRODUCTION_SCOPES[project.draft.scope ?? "standard"].workMult;\n  /* project ambition creates somewhat more floor work; technology makes the CREW faster,\n     never the player's fingers busier. */\n  const spawnMult = 1 + Math.max(0, scopeWork - 1) * 0.22;\n  const autoSpeedMult = (run.research.includes("pipeline") ? 1.12 : 1) * (isEdit && run.research.includes("qa") ? 1.15 : 1);\n  const lifeMult = (run.research.includes("storyboard") ? 1.25 : 1) * (run.showrunner === "steady" ? 1.2 : 1);'''
)
replace_once(
    produce,
    '''          art: t.art + boost.art,\n          sound: t.sound + boost.sound,''',
    '''          art: t.art + boost.art + (run.research.includes("mocap") ? Math.round(t.art * 0.12) : 0),\n          sound: t.sound + boost.sound,'''
)
# Add prop to floor usage(s) in Produce.
replace_once(produce, '              lifeMult={lifeMult}\n              bugRate={bugRate}', '              lifeMult={lifeMult}\n              autoSpeedMult={autoSpeedMult}\n              bugRate={bugRate}')

# ---------------------------------------------------------------------------
# 7) Contract screen becomes assignment planning, no time teleport
# ---------------------------------------------------------------------------
write("game_source/src/components/ContractJob.tsx", r'''import { useMemo, useState } from "react";
import { Briefcase, Calendar, Check, Database, Users } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { POINT_COLOR, POINT_LABEL, ROLE_LABEL, formatGBP, staffPoint, type Contract } from "../engine/data";
import { staffBusyReason, type RunState } from "../engine/state";
import { projectedContractTotal } from "../engine/studioOps";
import { cn } from "../utils/cn";

export default function ContractJob({
  run,
  contract,
  onDone,
}: {
  run: RunState;
  contract: Contract;
  paused?: boolean;
  onDone: (staffIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const crew = useMemo(() => run.staff.filter((s) => selected.includes(s.id)), [run.staff, selected]);
  const projected = projectedContractTotal(contract, crew, run.research);
  const likely = projected >= contract.target;

  const toggle = (id: string) => {
    if (staffBusyReason(run, id)) return;
    sfx.click();
    setSelected((old) => old.includes(id) ? old.filter((x) => x !== id) : old.length >= 3 ? old : [...old, id]);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />
      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">
        <span className="rounded-md bg-cyanx px-2 py-0.5 text-[10px] font-bold text-ink">CONTRACT</span>
        <span className="truncate font-display text-sm font-extrabold">{contract.name}</span>
        <span className="ml-auto text-[11px] font-bold" style={{ color: POINT_COLOR[contract.type] }}>
          {contract.target} {POINT_LABEL[contract.type]}
        </span>
      </div>

      <div className="nice-scroll relative z-10 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="ink-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel3" style={{ color: POINT_COLOR[contract.type] }}><Briefcase size={21} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-extrabold">Assign a contract team</h2>
                <p className="mt-1 text-xs text-paper/65">This job now runs in the background for up to {contract.weeks} weeks. Staff assigned here cannot work on a show or attend training until the contract finishes.</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="ink-chip px-2 py-1 font-bold text-gold">{formatGBP(contract.pay)}</span>
                  <span className="ink-chip flex items-center gap-1 px-2 py-1 font-bold text-viol"><Database size={12} /> +{contract.rd} RD</span>
                  <span className="ink-chip flex items-center gap-1 px-2 py-1 font-bold text-cyanx"><Calendar size={12} /> {contract.weeks} wk deadline</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ink-card p-3">
            <div className="mb-2 flex items-center gap-2"><Users size={14} className="text-cyanx" /><span className="font-display text-sm font-extrabold">TEAM {selected.length}/3</span></div>
            <div className="space-y-1.5">
              {run.staff.map((s) => {
                const busy = staffBusyReason(run, s.id);
                const on = selected.includes(s.id);
                const skill = staffPoint(s, contract.type);
                return (
                  <button key={s.id} disabled={!!busy && !on} onClick={() => toggle(s.id)} className={cn("btn-press flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left", on ? "border-mint/60 bg-mint/10" : busy ? "border-line/40 bg-panel2/30 opacity-50" : "border-line bg-panel2/50 hover:border-cyanx/60")}>
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded border", on ? "border-mint bg-mint text-ink" : "border-line")}>{on && <Check size={13} />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{s.name}</span><span className="text-[10px] text-paper/45">{ROLE_LABEL[s.role]} · {POINT_LABEL[contract.type]} {skill}{busy ? ` · ${busy}` : ""}</span></span>
                    <span className="font-display text-sm font-extrabold" style={{ color: POINT_COLOR[contract.type] }}>{skill}</span>
                  </button>
                );
              })}
              {run.staff.length === 0 && <div className="py-4 text-center text-xs text-paper/45">Hire staff before taking background contracts.</div>}
            </div>
          </div>

          <div className={cn("rounded-xl border p-3", likely ? "border-mint/50 bg-mint/10" : "border-gold/50 bg-gold/10")}>
            <div className="flex items-center justify-between text-xs"><span className="font-bold">Projected output by deadline</span><span className={cn("font-display text-lg font-extrabold", likely ? "text-mint" : "text-gold")}>{projected}/{contract.target}</span></div>
            <div className="mt-1 text-[10px] text-paper/55">Estimate uses current skill, stamina and Digital Pipeline research. The job can finish early if the team reaches the target first.</div>
          </div>

          <Btn big variant="cyan" className="w-full" disabled={selected.length === 0} onClick={() => { sfx.phase(); onDone(selected); }}>
            ASSIGN & RETURN TO STUDIO
          </Btn>
        </div>
      </div>
    </div>
  );
}
''')

# ---------------------------------------------------------------------------
# 8) Create screen: explicit production scope
# ---------------------------------------------------------------------------
create = "game_source/src/components/Create.tsx"
replace_once(create, '  PETS,\n  PROTAGONISTS,', '  PETS,\n  PRODUCTION_SCOPES,\n  PROTAGONISTS,')
replace_once(create, '  randomTitle,\n  type AudienceId,', '  randomTitle,\n  scopeLabel,\n  type AudienceId,')
replace_once(create, '  type MediumId,\n  type SlotId,', '  type MediumId,\n  type ScopeId,\n  type SlotId,')
replace_once(create, '    budget: last?.budget ?? "standard",\n    slot:', '    budget: last?.budget ?? "standard",\n    scope: last?.scope ?? "standard",\n    slot:')
replace_once(
    create,
    '''              </Section>\n              <Section title="BROADCAST SLOT">''',
    '''              </Section>\n              <Section title="PRODUCTION SCOPE">\n                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">\n                  {(Object.keys(PRODUCTION_SCOPES) as ScopeId[]).map((scope) => {\n                    const def = PRODUCTION_SCOPES[scope];\n                    const locked = run.officeLevel < def.minOffice || run.staff.length < def.minStaff;\n                    return (\n                      <Pick key={scope} active={(d.scope ?? "standard") === scope} disabled={locked} onClick={() => set({ scope })}>\n                        <div className="font-display text-sm font-extrabold">{scopeLabel(scope, d.medium)}</div>\n                        <div className="text-[10px] font-bold text-gold">×{def.costMult.toFixed(2)} cost · ×{def.weeksMult.toFixed(2)} time</div>\n                        <div className="text-[10px] text-paper/50">{locked ? `Needs office Lv${def.minOffice + 1} and ${def.minStaff} staff` : def.desc}</div>\n                      </Pick>\n                    );\n                  })}\n                </div>\n              </Section>\n              <Section title="BROADCAST SLOT">'''
)

# ---------------------------------------------------------------------------
# 9) Research modal starts timed jobs
# ---------------------------------------------------------------------------
office = "game_source/src/components/Office.tsx"
replace_once(office, '  staffCapacity,\n  startBlockReason,', '  staffCapacity,\n  startBlockReason,\n  startResearchProject,')
replace_once(
    office,
    '''  const research = (id: string, rd: number) => {\n    if (run.rd < rd) return;\n    sfx.fanfare();\n    setRun((r) => ({\n      ...r,\n      rd: r.rd - rd,\n      research: [...r.research, id],\n      notices: [...r.notices, `Research complete: ${RESEARCH.find((x) => x.id === id)?.name}!`],\n    }));\n  };''',
    '''  const research = (id: string, rd: number) => {\n    if (run.rd < rd) return;\n    sfx.fanfare();\n    setRun((r) => startResearchProject(r, id, rd) ?? r);\n  };'''
)
replace_once(
    office,
    '''              const owned = run.research.includes(u.id);\n              return (''',
    '''              const owned = run.research.includes(u.id);\n              const pending = run.researchJobs.find((j) => j.researchId === u.id);\n              return ('''
)
replace_once(
    office,
    '''                    {owned ? (\n                      <span className="text-xs font-bold text-mint">RESEARCHED ✓</span>\n                    ) : (\n                      <Btn variant="gold" className="!px-3 !py-1.5 text-xs" disabled={run.rd < u.rd} onClick={() => research(u.id, u.rd)}>\n                        {u.rd} RD\n                      </Btn>\n                    )}''',
    '''                    {owned ? (\n                      <span className="text-xs font-bold text-mint">RESEARCHED ✓</span>\n                    ) : pending ? (\n                      <span className="text-xs font-bold text-cyanx">IN RESEARCH · {Math.max(0, pending.completesWeek - run.week)} WK</span>\n                    ) : (\n                      <Btn variant="gold" className="!px-3 !py-1.5 text-xs" disabled={run.rd < u.rd} onClick={() => research(u.id, u.rd)}>\n                        START · {u.rd} RD\n                      </Btn>\n                    )}'''
)

# ---------------------------------------------------------------------------
# 10) Slate / bottleneck UI
# ---------------------------------------------------------------------------
write("game_source/src/components/StudioSlate.tsx", r'''import { useState } from "react";
import { CalendarRange, ChevronDown, ChevronUp, GraduationCap, Microscope, Briefcase } from "lucide-react";
import { dateLabel } from "../engine/data";
import { departmentStatuses } from "../engine/capacity";
import { STAGE_LABEL, type Project } from "../engine/projects";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

const weeks = (run: RunState) => Array.from({ length: 10 }, (_, i) => run.week + i + 1);

function spanCells(start: number, end: number, cols: number[]) {
  return cols.map((w) => w >= start && w <= end);
}

export default function StudioSlate({ run }: { run: RunState }) {
  const [open, setOpen] = useState(true);
  const cols = weeks(run);
  const depts = departmentStatuses(run.projects, run.staff, run.facilities, run.research);
  const active = run.projects.filter((p) => p.stage !== "done" && p.stage !== "airing");

  return (
    <div className="rounded-xl border border-cyanx/25 bg-abyss/45 p-2.5">
      <button onClick={() => setOpen((v) => !v)} className="btn-press flex w-full items-center gap-2 text-left">
        <CalendarRange size={14} className="text-cyanx" />
        <span className="font-display text-xs font-extrabold">STUDIO SLATE & BOTTLENECKS</span>
        <span className="ml-auto text-paper/40">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
            {depts.map((d) => {
              const pct = Math.min(160, Math.round(d.utilization * 100));
              return (
                <div key={d.id} className={cn("rounded-lg border p-2", d.overloaded ? "border-neon/50 bg-neon/10" : "border-line/60 bg-panel2/45")}>
                  <div className="flex items-center justify-between text-[9px] font-bold"><span>{d.label}</span><span className={d.overloaded ? "text-neon" : "text-mint"}>{pct}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink"><div className={cn("h-full rounded-full", d.overloaded ? "bg-neon" : "bg-mint")} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                  <div className="mt-1 text-[8px] text-paper/45">{d.demand} demand / {d.capacity} cap</div>
                </div>
              );
            })}
          </div>

          <div className="nice-scroll overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1 text-[8px] text-paper/40">
                <div />{cols.map((w) => <div key={w} className="text-center">{dateLabel(w)}</div>)}
              </div>
              <div className="mt-1 space-y-1">
                {active.map((p: Project) => {
                  const remaining = Math.max(1, Math.ceil((p.plan[p.stage] ?? 1) - p.progress));
                  const cells = spanCells(run.week + 1, run.week + remaining, cols);
                  return (
                    <div key={p.id} className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1">
                      <div className="truncate text-[9px] font-bold text-paper/70">{p.draft.title}</div>
                      {cells.map((on, i) => <div key={cols[i]} className={cn("h-5 rounded border text-center text-[7px] leading-5", on ? "border-cyanx/35 bg-cyanx/15 text-cyanx" : cols[i] === p.deadlineWeek ? "border-gold/50 bg-gold/10 text-gold" : "border-line/30 bg-panel2/20")}>{on ? STAGE_LABEL[p.stage].slice(0, 4).toUpperCase() : cols[i] === p.deadlineWeek ? "DUE" : ""}</div>)}
                    </div>
                  );
                })}
                {run.contractJobs.map((j) => {
                  const cells = spanCells(Math.max(run.week + 1, j.startWeek + 1), j.dueWeek, cols);
                  return <div key={j.id} className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-gold"><Briefcase size={9} className="mr-1 inline" />{j.contract.name}</div>{cells.map((on, i) => <div key={cols[i]} className={cn("h-5 rounded border", on ? "border-gold/40 bg-gold/10" : "border-line/20 bg-panel2/10")} />)}</div>;
                })}
                {run.trainingJobs.map((j) => {
                  const cells = spanCells(Math.max(run.week + 1, j.startWeek + 1), j.completesWeek, cols);
                  return <div key={j.id} className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-mint"><GraduationCap size={9} className="mr-1 inline" />{j.staffName}</div>{cells.map((on, i) => <div key={cols[i]} className={cn("h-5 rounded border", on ? "border-mint/40 bg-mint/10" : "border-line/20 bg-panel2/10")} />)}</div>;
                })}
                {run.researchJobs.map((j) => {
                  const cells = spanCells(Math.max(run.week + 1, j.startWeek + 1), j.completesWeek, cols);
                  return <div key={j.id} className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-viol"><Microscope size={9} className="mr-1 inline" />{j.name}</div>{cells.map((on, i) => <div key={cols[i]} className={cn("h-5 rounded border", on ? "border-viol/40 bg-viol/10" : "border-line/20 bg-panel2/10")} />)}</div>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
''')
projui = "game_source/src/components/Projects.tsx"
replace_once(projui, 'import Portrait from "./Portrait";\nimport { cn } from "../utils/cn";', 'import Portrait from "./Portrait";\nimport StudioSlate from "./StudioSlate";\nimport { cn } from "../utils/cn";')
replace_once(projui, '    <div className="space-y-2.5">\n      <div className="flex items-center gap-2">', '    <div className="space-y-2.5">\n      <StudioSlate run={run} />\n      <div className="flex items-center gap-2">')
# Show operation busy state in project assignment list.
replace_once(projui, 'import { AIR_WEEKS, forecastWeek, projectCapacity, type RunState } from "../engine/state";', 'import { AIR_WEEKS, forecastWeek, projectCapacity, staffOperationReason, type RunState } from "../engine/state";')
replace_once(
    projui,
    '''                const mine = p.staffIds.includes(s.id);\n                const other = !mine ? projectOfStaff(run.projects, s.id) : null;\n                const full = !mine && p.staffIds.length >= TEAM_MAX;''',
    '''                const mine = p.staffIds.includes(s.id);\n                const other = !mine ? projectOfStaff(run.projects, s.id) : null;\n                const opBusy = !mine ? staffOperationReason(run, s.id) : null;\n                const full = !mine && p.staffIds.length >= TEAM_MAX;'''
)
replace_once(
    projui,
    '''                        {other && <span className="ml-1 text-gold">on “{other.draft.title}”</span>}\n                        {s.stamina < 45 && <span className="ml-1 text-neon">tired</span>}''',
    '''                        {other && <span className="ml-1 text-gold">on “{other.draft.title}”</span>}\n                        {opBusy && <span className="ml-1 text-viol">{opBusy}</span>}\n                        {s.stamina < 45 && <span className="ml-1 text-neon">tired</span>}'''
)
replace_once(projui, '                      disabled={full}\n                      onClick={() => onAssign(p.id, s.id)}', '                      disabled={full || !!opBusy}\n                      onClick={() => onAssign(p.id, s.id)}')
replace_once(projui, '{mine ? "REMOVE" : other ? "PULL OVER" : "ASSIGN"}', '{mine ? "REMOVE" : opBusy ? "BUSY" : other ? "PULL OVER" : "ASSIGN"}')

# ---------------------------------------------------------------------------
# 11) Partner relationship tiers
# ---------------------------------------------------------------------------
market = "game_source/src/engine/market.ts"
replace_once(
    market,
    'export const repShareDelta = (rep: number) => Math.max(-0.08, Math.min(0.06, (45 - rep) / 400));',
    '''export const repShareDelta = (rep: number) => Math.max(-0.08, Math.min(0.06, (45 - rep) / 400));\n\nexport type PartnerTierId = "unknown" | "trusted" | "preferred" | "strategic";\nexport interface PartnerTier { id: PartnerTierId; label: string; slack: number; desc: string; }\nexport function partnerTier(rep: number): PartnerTier {\n  if (rep < 40) return { id: "unknown", label: "UNKNOWN", slack: 0, desc: "They will hear the pitch, but nothing is guaranteed." };\n  if (rep < 60) return { id: "trusted", label: "TRUSTED", slack: 0, desc: "Regular calls and fair terms." };\n  if (rep < 80) return { id: "preferred", label: "PREFERRED", slack: 1, desc: "Extra deadline flexibility and stronger deal flow." };\n  return { id: "strategic", label: "STRATEGIC PARTNER", slack: 2, desc: "They plan around your studio and protect your delivery windows." };\n}'''
)
replace_once(
    market,
    '  const rep = partners[partner.id] ?? 45;\n',
    '  const rep = partners[partner.id] ?? 45;\n  const tier = partnerTier(rep);\n'
)
replace_once(
    market,
    '  const maxWeeks = planWeeks + partner.slack + Math.floor(Math.random() * 3) - 1;',
    '  const maxWeeks = planWeeks + partner.slack + tier.slack + Math.floor(Math.random() * 3) - 1;'
)
marketui = "game_source/src/components/Market.tsx"
replace_once(marketui, '  PARTNERS,\n  effectiveHeat,', '  PARTNERS,\n  effectiveHeat,\n  partnerTier,')
# The partner tab already exposes reputation; append tier beside it wherever the literal rep line occurs.
regex_once(
    marketui,
    r'(<span[^>]*>REP\s*\{rep\}[^<]*</span>)',
    r'\1 <span className="ml-1 text-[9px] font-extrabold text-cyanx">{partnerTier(rep).label}</span>'
)

# ---------------------------------------------------------------------------
# 12) App: background contracts + 0/1/4/12x time + automatic attention pause
# ---------------------------------------------------------------------------
app = "game_source/src/App.tsx"
replace_once(app, '  grantContractXp,\n  initialRun,', '  forecastWeek,\n  initialRun,')
replace_once(app, '  startBlockReason,\n  startProject,', '  startBlockReason,\n  startContractAssignment,\n  startProject,')
replace_once(app, '  const [paused, setPaused] = useState(false);', '  const [paused, setPaused] = useState(false);\n  const [timeSpeed, setTimeSpeed] = useState<0 | 1 | 4 | 12>(1);')
replace_once(app, '      dayAccRef.current += 1000;', '      if (timeSpeed === 0) return;\n      dayAccRef.current += 1000 * timeSpeed;')
# Replace week advance callback body with attention auto-pause/forecast guard.
replace_once(
    app,
    '''          setRun((r) => {\n            if (!r) return r;\n            let n = advanceWeeks(r, 1);\n            if (n.cash < 0) {''',
    '''          setRun((r) => {\n            if (!r) return r;\n            if (forecastWeek(r).cashAfter < 0) {\n              setTimeSpeed(0);\n              return { ...r, notices: [...r.notices, "⏸ Calendar paused: next week would bankrupt the studio."] };\n            }\n            let n = advanceWeeks(r, 1);\n            const attention =\n              n.projects.some((p) => p.milestone && !r.projects.find((x) => x.id === p.id)?.milestone) ||\n              n.projects.some((p) => p.stage === "ready" && r.projects.find((x) => x.id === p.id)?.stage !== "ready") ||\n              n.marketEvents.length > r.marketEvents.length || n.studioEvents.length > r.studioEvents.length || n.staffEvents.length > r.staffEvents.length ||\n              n.contractJobs.length < r.contractJobs.length || n.trainingJobs.length < r.trainingJobs.length || n.researchJobs.length < r.researchJobs.length;\n            if (attention) setTimeSpeed(0);\n            if (n.cash < 0) {'''
)
replace_once(app, '  }, [screen, paused, run !== null, run?.week]);', '  }, [screen, paused, timeSpeed, run !== null, run?.week]);')
# Reset speed on lifecycle.
replace_once(app, '    setPaused(false);\n    setSavePicker(false);', '    setPaused(false);\n    setTimeSpeed(1);\n    setSavePicker(false);')
# startRun and restart both contain setPaused(false); target next two occurrences safely.
text = read(app)
text = text.replace('    setPaused(false);\n    setScreen("office");', '    setPaused(false);\n    setTimeSpeed(1);\n    setScreen("office");', 2)
write(app, text)
# Contract callback.
regex_once(
    app,
    r'''  const finishContract = useCallback\(\n    \(success: boolean, scored: number\) => \{.*?\n  \);''',
    '''  const finishContract = useCallback(\n    (staffIds: string[]) => {\n      if (!run || !contract) return;\n      const next = startContractAssignment(run, contract, staffIds);\n      if (!next) { sfx.back(); return; }\n      setRun(next);\n      setContract(null);\n      setScreen("office");\n    },\n    [run, contract]\n  );''',
    flags=re.S
)
# Time controls in top-right utility strip.
replace_once(
    app,
    '''          <div className="absolute right-3 top-2.5 z-[60] flex gap-1.5">''',
    '''          <div className="absolute right-3 top-2.5 z-[60] flex gap-1.5">\n            {screen === "office" && ([0, 1, 4, 12] as const).map((speed) => (\n              <button key={speed} aria-label={`Time ${speed === 0 ? "paused" : `${speed}x`}`} onClick={() => { setTimeSpeed(speed); sfx.click(); }} className={cn("btn-press rounded-xl border px-2 py-1.5 text-[10px] font-extrabold", timeSpeed === speed ? "border-cyanx bg-cyanx/20 text-cyanx" : "border-line bg-panel2/90 text-paper/55")}>\n                {speed === 0 ? "Ⅱ" : `${speed}×`}\n              </button>\n            ))}'''
)

# ---------------------------------------------------------------------------
# 13) README + permanent regression tests
# ---------------------------------------------------------------------------
readme = "game_source/README.md"
replace_once(
    readme,
    'One in-game day ≈ 2 real minutes while you\'re in the office. Seven days =\none week:',
    'Office time now has 0× / 1× / 4× / 12× controls. Important milestones, completed contracts/training/research, crises and dangerous cash forecasts automatically stop the clock. At 1×, one in-game day ≈ 2 real minutes. Seven days =\none week:'
)
replace_once(
    readme,
    '- Production-floor work is handled automatically by your crew; more staff and\n  higher relevant skill increase throughput while missed work lowers the result',
    '- Production-floor work is handled automatically by your crew; more staff and higher relevant skill increase throughput while missed work lowers the result\n- Small contracts run in the background with 1–3 assigned staff instead of teleporting the calendar\n- Production Scope (short / standard / extended / prestige) raises cost, duration, audience ceiling and departmental demand; elite teams convert excess capacity into quality rather than infinite speed'
)

write("game_source/src/engine/__tests__/deeper-loop.test.ts", r'''import { describe, expect, it } from "vitest";
import { PRODUCTION_SCOPES, type Draft, type Staff } from "../data";
import { departmentStatuses } from "../capacity";
import { partnerTier } from "../market";
import { draftCost, draftWeeks, makeProject, rawTeamCapacity, teamSpeed } from "../projects";
import { advanceWeeks, buyFacility, initialRun, startContractAssignment, startResearchProject, trainStaff, type RunState } from "../state";

const draft = (over: Partial<Draft> = {}): Draft => ({ title: "Test", medium: "tv", budget: "standard", scope: "standard", slot: "midnight", genres: ["shonen"], audience: "teens", protag: "kai", protagName: "Kai", secondary: "none", pet: "none", villain: "none", arcs: ["origin", "rival", "finale"], sliders: [50, 50, 50], season: 1, ...over });
const worker = (id: string, role: Staff["role"], n = 80): Staff => ({ id, name: id, role, story: n, art: n, sound: n, level: 6, salary: 1000, cost: 0, stamina: 100, portrait: 0 });

describe("deeper studio loop", () => {
  it("scope increases real duration and cost", () => {
    const standard = draft({ scope: "standard" });
    const prestige = draft({ scope: "prestige" });
    expect(draftWeeks(prestige)).toBeGreaterThan(draftWeeks(standard));
    expect(draftCost(prestige)).toBeGreaterThan(draftCost(standard));
    expect(PRODUCTION_SCOPES.prestige.workMult).toBeGreaterThan(1.5);
  });

  it("elite crew capacity stops deleting calendar time", () => {
    const p = makeProject(draft(), 0);
    const crew = [worker("a", "writer", 99), worker("b", "animator", 99), worker("c", "composer", 99), worker("d", "writer", 99), worker("e", "animator", 99), worker("f", "composer", 99)];
    expect(rawTeamCapacity(p, crew)).toBeGreaterThan(1.35);
    expect(teamSpeed(p, crew)).toBeLessThanOrEqual(1.35);
  });

  it("simultaneous prestige animation can overload the department", () => {
    const p1 = { ...makeProject(draft({ title: "A", scope: "prestige", budget: "blockbuster" }), 0), stage: "animation" as const };
    const p2 = { ...makeProject(draft({ title: "B", scope: "prestige", budget: "blockbuster" }), 0), stage: "animation" as const };
    const s = departmentStatuses([p1, p2], [worker("a", "animator", 70), worker("b", "animator", 70)], {}, []);
    expect(s.find((x) => x.id === "animation")!.overloaded).toBe(true);
  });

  it("partner reputation has meaningful relationship tiers", () => {
    expect(partnerTier(25).id).toBe("unknown");
    expect(partnerTier(50).id).toBe("trusted");
    expect(partnerTier(70).id).toBe("preferred");
    expect(partnerTier(90).id).toBe("strategic");
  });

  it("small contracts become background assignments without an immediate time jump", () => {
    let r = initialRun("Test", "steady");
    r = { ...r, staff: [worker("a", "writer", 95)] } as RunState;
    const c = { ...r.contracts[0], type: "story" as const, target: 10, weeks: 3 };
    r = { ...r, contracts: [c] };
    const started = startContractAssignment(r, c, ["a"])!;
    expect(started.week).toBe(0);
    expect(started.contractJobs).toHaveLength(1);
    const after = advanceWeeks(started, 1);
    expect(after.contractJobs.length).toBeLessThanOrEqual(1);
  });

  it("training and research occupy calendar time", () => {
    let r = initialRun("Test", "steady");
    r = { ...r, cash: 1_000_000, rd: 500, staff: [worker("a", "writer", 60)] } as RunState;
    r = buyFacility(r, "training")!;
    const trained = trainStaff(r, "a", "story")!;
    expect(trained.staff[0].story).toBe(60);
    expect(trained.trainingJobs).toHaveLength(1);
    const tw = trained.trainingJobs[0].completesWeek - trained.week;
    const done = advanceWeeks(trained, tw);
    expect(done.staff[0].story).toBe(61);
    const research = startResearchProject(done, "pipeline", 28)!;
    expect(research.research.includes("pipeline")).toBe(false);
    const rw = research.researchJobs[0].completesWeek - research.week;
    expect(advanceWeeks(research, rw).research.includes("pipeline")).toBe(true);
  });
});
''')

print("Applied deeper studio loop implementation")
