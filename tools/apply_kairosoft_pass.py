from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text()

def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)

def replace(rel, old, new, count=1):
    s = read(rel)
    if old not in s:
        raise SystemExit(f"missing anchor in {rel}: {old[:120]!r}")
    s = s.replace(old, new, count)
    write(rel, s)

# ------------------------------------------------------------------ state
state = "game_source/src/engine/state.ts"
replace(state,
'''  comboLevels: Record<string, number>;
  /** discovered cast chemistry ids */''',
'''  comboLevels: Record<string, number>;
  /** studio familiarity with each individual genre; information unlocks as this rises */
  genreKnowledge: Partial<Record<GenreId, number>>;
  /** discovered cast chemistry ids */''')
replace(state,
'''    comboLevels: {},
    castCombos: [],''',
'''    comboLevels: {},
    genreKnowledge: {},
    castCombos: [],''')
replace(state,
'''    staffResting: r.staffResting && typeof r.staffResting === "object" ? r.staffResting : {},
    arcCombos:''',
'''    staffResting: r.staffResting && typeof r.staffResting === "object" ? r.staffResting : {},
    genreKnowledge: r.genreKnowledge && typeof r.genreKnowledge === "object" ? r.genreKnowledge : {},
    arcCombos:''')

start = read(state).index('/* ---------------------------------------------------- daily studio work */')
end = read(state).index('/* ------------------------------------------------------ live rush system */')
s = read(state)
new_daily = r'''/* ---------------------------------------------------- daily studio work */
export interface DeskPulse {
  actorId: string;
  name: string;
  type: PointType;
  points: number;
  nonce: number;
  source?: "project" | "contract" | "edit";
  projectId?: string;
  jobId?: string;
}

const POINT_TYPES: PointType[] = ["story", "art", "sound"];

/** Kairosoft-style percentile output. 65 effective skill = 65% chance of +1;
 *  175 = guaranteed +1 plus 75% chance of +2; 247 = guaranteed +2 plus 47% +3. */
export function percentileSkillOutput(effectiveSkill: number, roll = Math.random()): number {
  const skill = Math.max(0, effectiveSkill);
  const guaranteed = Math.floor(skill / 100);
  const remainder = skill - guaranteed * 100;
  return guaranteed + (roll * 100 < remainder ? 1 : 0);
}

function chooseDiscipline(st: Staff): PointType {
  /* Nobody is hard-locked to their job title. Strong skills are more likely to
     surface, while +20 on every weight keeps cross-discipline ideas alive. */
  const weights = POINT_TYPES.map((type) => ({ type, weight: Math.max(1, staffPoint(st, type) + 20) }));
  const total = weights.reduce((a, x) => a + x.weight, 0);
  let roll = Math.random() * total;
  for (const x of weights) {
    roll -= x.weight;
    if (roll <= 0) return x.type;
  }
  return "story";
}

function contributionEffectiveSkill(r: RunState, st: Staff, type: PointType, editing = false): number {
  const fx = facilityFX(r.facilities);
  let effective = staffPoint(st, type) * (0.72 + Math.max(0, st.stamina) / 220);
  effective *= fx.pointMult[type];
  if (r.research.includes("pipeline")) effective *= 1.12;
  if (type === "story" && r.research.includes("storyboard")) effective *= 1.15;
  if (type === "art" && r.research.includes("mocap")) effective *= 1.12;
  if (editing) {
    effective *= 1 + fx.issueFix * 0.15;
    if (r.research.includes("qa")) effective *= 1.15;
    if (r.research.includes("autoclean")) effective += 35;
  }
  /* Genji's Steady Hand now has a mechanical purpose: expected contribution
     output is 25% higher everywhere, including contract and edit work. */
  if (r.showrunner === "steady") effective *= 1.25;
  return Math.max(0, effective);
}

function showrunnerEffectiveSkill(r: RunState, type: PointType): number {
  let skill = showrunnerContractSkill(r.showrunner, r.showsMade, type);
  skill *= facilityFX(r.facilities).pointMult[type];
  if (r.research.includes("pipeline")) skill *= 1.12;
  if (type === "story" && r.research.includes("storyboard")) skill *= 1.15;
  if (type === "art" && r.research.includes("mocap")) skill *= 1.12;
  if (r.showrunner === "steady") skill *= 1.25;
  return skill;
}

/** One visible production-check cycle. At most two hired staff are sampled per
 *  cycle so a full office stays readable; skill determines whether their check
 *  fires and whether 100+/200+ effective skill creates multi-point bubbles. */
export function rollStudioWorkPulses(r: RunState): DeskPulse[] {
  const pulses: DeskPulse[] = [];
  const eligible = r.staff.filter((st) => {
    if ((r.staffResting ?? {})[st.id] || st.stamina <= 0) return false;
    const contract = (r.contractJobs ?? []).some((j) => j.staffIds.includes(st.id));
    const project = projectOfStaff(r.projects, st.id);
    const production = !!project && !project.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(project.stage);
    return contract || production;
  });
  const sampled = [...eligible].sort(() => Math.random() - 0.5).slice(0, 2);
  for (const st of sampled) {
    const contract = (r.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));
    if (contract) {
      const type = contract.contract.type;
      const points = percentileSkillOutput(contributionEffectiveSkill(r, st, type));
      if (points > 0) pulses.push({ actorId: st.id, name: st.name, type, points, nonce: Date.now() + pulses.length, source: "contract", jobId: contract.id });
      continue;
    }
    const project = projectOfStaff(r.projects, st.id);
    if (!project || project.milestone) continue;
    const type = chooseDiscipline(st);
    const points = percentileSkillOutput(contributionEffectiveSkill(r, st, type));
    if (points > 0) pulses.push({ actorId: st.id, name: st.name, type, points, nonce: Date.now() + pulses.length, source: "project", projectId: project.id });
  }

  const runnerJob = (r.contractJobs ?? []).find((j) => j.showrunner);
  if (runnerJob && Math.random() < 0.34) {
    const type = runnerJob.contract.type;
    const points = percentileSkillOutput(showrunnerEffectiveSkill(r, type));
    if (points > 0) pulses.push({ actorId: "showrunner", name: `${r.studio} showrunner`, type, points, nonce: Date.now() + 900 + pulses.length, source: "contract", jobId: runnerJob.id });
  } else if (!runnerJob && Math.random() < 0.22) {
    const active = r.projects.find((pr) => !pr.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(pr.stage));
    if (active) {
      const skills = POINT_TYPES.map((type) => ({ type, skill: showrunnerEffectiveSkill(r, type) })).sort((a, b) => b.skill - a.skill);
      const type = Math.random() < 0.62 ? skills[0].type : POINT_TYPES[Math.floor(Math.random() * POINT_TYPES.length)];
      const points = percentileSkillOutput(showrunnerEffectiveSkill(r, type));
      if (points > 0) pulses.push({ actorId: "showrunner", name: `${r.studio} showrunner`, type, points, nonce: Date.now() + 900 + pulses.length, source: "project", projectId: active.id });
    }
  }
  return pulses;
}

export function tickStudioWorkPulse(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const pulses = rollStudioWorkPulses(r);
  if (!pulses.length) return { run: r, pulses, attention: false };
  let projects = r.projects.map((p) => ({ ...p, points: { ...p.points } }));
  let contractJobs = (r.contractJobs ?? []).map((j) => ({ ...j, liveProgressThisWeek: j.liveProgressThisWeek ?? 0 }));
  let cash = r.cash;
  let rd = r.rd;
  let staff = r.staff;
  const notices = [...r.notices];
  for (const pulse of pulses) {
    if (pulse.source === "project" && pulse.projectId) {
      projects = projects.map((p) => p.id !== pulse.projectId || p.milestone ? p : ({ ...p, points: { ...p.points, [pulse.type]: p.points[pulse.type] + pulse.points } }));
    } else if (pulse.source === "contract" && pulse.jobId) {
      contractJobs = contractJobs.map((j) => j.id === pulse.jobId ? ({ ...j, progress: Math.min(j.contract.target, j.progress + pulse.points), liveProgressThisWeek: (j.liveProgressThisWeek ?? 0) + pulse.points }) : j);
    }
  }
  const completed = contractJobs.filter((j) => j.progress >= j.contract.target);
  for (const job of completed) {
    cash += job.contract.pay;
    rd += job.contract.rd;
    staff = staff.map((st) => job.staffIds.includes(st.id) ? gainXp(st, CONTRACT_XP).staff : st);
    notices.push(`🎉 CONTRACT DELIVERED: ${job.contract.name} (+£${job.contract.pay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);
  }
  if (completed.length) {
    const ids = new Set(completed.map((j) => j.id));
    contractJobs = contractJobs.filter((j) => !ids.has(j.id));
  }
  return { run: { ...r, projects, contractJobs, cash, rd, staff, notices: notices.slice(-40) }, pulses, attention: completed.length > 0 };
}

/** A calendar day handles energy only; quality is created solely by the visible
 *  work-check bubbles above, never by an invisible weekly score injection. */
export function tickStudioDay(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const projects = r.projects.map((p) => ({ ...p, points: { ...p.points } }));
  const resting = { ...(r.staffResting ?? {}) };
  const fx = facilityFX(r.facilities);
  const staff = r.staff.map((st0) => {
    const st = { ...st0 };
    const project = projectOfStaff(projects, st.id);
    const contract = (r.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));
    const production = !!project && !project.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(project.stage);
    const busy = production || !!contract;
    if (resting[st.id]) {
      st.stamina = Math.min(100, st.stamina + 50 + fx.staminaRest * 2);
      if (st.stamina >= 100) delete resting[st.id];
      return st;
    }
    if (!busy) {
      st.stamina = Math.min(100, st.stamina + 18 + fx.staminaRest);
      return st;
    }
    const drain = Math.max(5, 9 - fx.staminaSave);
    st.stamina = Math.max(0, st.stamina - drain);
    if (st.stamina <= 0) resting[st.id] = true;
    return st;
  });
  return { run: { ...r, projects, staff, staffResting: resting }, pulses: [], attention: false };
}

/** One live editing work check. Editors roll one of their three craft skills;
 *  successful bubbles remove exactly that many notes and award exactly 1 RD per
 *  cleared note. The same >100/>200 percentile rule applies. */
export function tickEditWorkPulse(r: RunState, projectId: string): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const target = projectById(r, projectId);
  if (!target || target.milestone !== "edit" || target.issues <= 0)
    return { run: r, pulses: [], attention: !!target && target.milestone === "edit" && target.issues <= 0 };
  const candidates = r.staff.filter((st) => target.staffIds.includes(st.id) && !(r.staffResting ?? {})[st.id] && st.stamina > 0);
  const sampled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 2);
  let left = target.issues;
  const pulses: DeskPulse[] = [];
  for (const st of sampled) {
    if (left <= 0) break;
    const type = chooseDiscipline(st);
    const rolled = percentileSkillOutput(contributionEffectiveSkill(r, st, type, true));
    const points = Math.min(left, rolled);
    if (points <= 0) continue;
    left -= points;
    pulses.push({ actorId: st.id, name: st.name, type, points, nonce: Date.now() + pulses.length, source: "edit", projectId });
  }
  if (!pulses.length) return { run: r, pulses, attention: false };
  const cleared = target.issues - left;
  const projects = r.projects.map((pr) => pr.id === projectId ? { ...pr, issues: left } : pr);
  return {
    run: {
      ...r,
      rd: r.rd + cleared,
      projects,
      notices: [...r.notices, `✂ ${cleared} editor note${cleared === 1 ? "" : "s"} cleared on “${target.draft.title}” (+${cleared} RD, ${left} remaining).`].slice(-40),
    },
    pulses,
    attention: left === 0,
  };
}

/** Editing has no artificial timer. Calendar days only drain/recover energy;
 *  note removal is performed by visible edit bubbles from tickEditWorkPulse. */
export function tickEditDay(r: RunState, projectId: string): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const target = projectById(r, projectId);
  if (!target || target.milestone !== "edit") return { run: r, pulses: [], attention: false };
  const resting = { ...(r.staffResting ?? {}) };
  const fx = facilityFX(r.facilities);
  const staff = r.staff.map((st0) => {
    if (!target.staffIds.includes(st0.id)) return st0;
    const st = { ...st0 };
    if (resting[st.id]) {
      st.stamina = Math.min(100, st.stamina + 50 + fx.staminaRest * 2);
      if (st.stamina >= 100) delete resting[st.id];
      return st;
    }
    st.stamina = Math.max(0, st.stamina - Math.max(3, 6 - fx.staminaSave));
    if (st.stamina <= 0) resting[st.id] = true;
    return st;
  });
  return { run: { ...r, staff, staffResting: resting }, pulses: [], attention: target.issues <= 0 };
}

'''
s = s[:start] + new_daily + s[end:]
write(state, s)

# release learns individual genres
replace(state,
'''    comboLevels: { ...r.comboLevels, [ck]: Math.min(5, (r.comboLevels[ck] ?? 0) + 1) },
    castCombos:''',
'''    comboLevels: { ...r.comboLevels, [ck]: Math.min(5, (r.comboLevels[ck] ?? 0) + 1) },
    genreKnowledge: draft.genres.reduce((acc, genre) => {
      const gain = result.hallOfFame ? 3 : result.tier === "hit" ? 2 : 1;
      acc[genre] = Math.min(12, (acc[genre] ?? 0) + gain);
      return acc;
    }, { ...(r.genreKnowledge ?? {}) }),
    castCombos:''')

# ---------------------------------------------------------------- projects: no hidden weekly quality
projects = "game_source/src/engine/projects.ts"
replace(projects,
'''    const p = { ...p0, points: { ...p0.points }, liveQuality: { story: 0, art: 0, sound: 0, ...(p0.liveQuality ?? {}) } };''',
'''    const p = { ...p0, points: { ...p0.points } };''')
old_quality = '''      const focus = STAGE_FOCUS[p.stage];
      const qualityMult = teamQualityMultiplier(p, team, fx, mods, studio);
      if (focus) {
        let weeklyTarget = 0;
        for (const s of team) {
          const m = mods?.(s, p, team);
          weeklyTarget += Math.round(staffPoint(s, focus) * 0.07 * (m ? m.out : staminaF(s)) * fx.pointMult[focus] * qualityMult);
        }
        /* Desk bubbles now bank real quality immediately. The weekly tick only
           tops up whatever part of the established baseline was not already
           earned live, so the same work is never counted twice. */
        const live = p.liveQuality?.[focus] ?? 0;
        p.points[focus] += Math.max(0, weeklyTarget - live);
      }
      p.liveQuality = { story: 0, art: 0, sound: 0 };
'''
new_quality = '''      /* Story / Art / Sound are deliberately NOT generated here. Quality now
         comes only from visible Kairosoft-style desk bubbles, rushes and explicit
         events. The weekly engine controls schedule, burn, deadlines and rework. */
      const qualityMult = teamQualityMultiplier(p, team, fx, mods, studio);
'''
replace(projects, old_quality, new_quality)

# ---------------------------------------------------------------- App: editing gets same live pulse cadence
app = "game_source/src/App.tsx"
replace(app,
'''  tickStudioWorkPulse,
  tickEditDay,''',
'''  tickStudioWorkPulse,
  tickEditWorkPulse,
  tickEditDay,''')
old_effect = '''  /* Desk bursts now change the game state at the same instant as the bubble. */
  useEffect(() => {
    if (screen !== "office" || paused || timeSpeed === 0 || !run) return;
    const gap = Math.max(180, Math.round(1750 / Math.max(1, timeSpeed)));
    const iv = window.setInterval(() => {
      setRun((current) => {
        if (!current) return current;
        const live = tickStudioWorkPulse(current);
        setWorkPulses(live.pulses);
        if (live.attention) setTimeSpeed(0);
        return live.run;
      });
    }, gap);
    return () => window.clearInterval(iv);
  }, [screen, paused, timeSpeed, run !== null]);'''
new_effect = '''  /* Visible desk/edit bubbles are the actual unit of work. */
  useEffect(() => {
    const liveEditing = screen === "produce" && focus?.milestone === "edit" && !!focus.projectId;
    if ((screen !== "office" && !liveEditing) || paused || timeSpeed === 0 || !run) return;
    const gap = Math.max(180, Math.round(1750 / Math.max(1, timeSpeed)));
    const iv = window.setInterval(() => {
      setRun((current) => {
        if (!current) return current;
        const live = liveEditing && focus ? tickEditWorkPulse(current, focus.projectId) : tickStudioWorkPulse(current);
        setWorkPulses(live.pulses);
        if (live.attention) setTimeSpeed(0);
        return live.run;
      });
    }, gap);
    return () => window.clearInterval(iv);
  }, [screen, paused, timeSpeed, run !== null, focus?.milestone, focus?.projectId]);'''
replace(app, old_effect, new_effect)
replace(app,
'''            milestone={focus.milestone}
            paused={paused}
            onDone={finishMilestone}''',
'''            milestone={focus.milestone}
            paused={paused}
            workPulses={workPulses}
            onDone={finishMilestone}''')

# ---------------------------------------------------------------- Produce: show edit bubbles
produce = "game_source/src/components/Produce.tsx"
replace(produce,
'''import type { RunState } from "../engine/state";''',
'''import type { DeskPulse, RunState } from "../engine/state";''')
replace(produce,
'''  paused: boolean;
  onDone: (o: MilestoneOutcome) => void;''',
'''  paused: boolean;
  workPulses?: DeskPulse[];
  onDone: (o: MilestoneOutcome) => void;''')
replace(produce,
'''  milestone: MilestoneId;
  paused: boolean;
  onDone:''',
'''  milestone: MilestoneId;
  paused: boolean;
  workPulses = [],
  onDone:''')
replace(produce,
'''            <div className="mt-2 text-[10px] font-bold text-cyanx">✂ EVERY CLEARED NOTE = +1 RD</div>
            <div className="mt-2 text-[9px] text-paper/45">Calendar:''',
'''            <div className="mt-2 text-[10px] font-bold text-cyanx">✂ EVERY CLEARED NOTE = +1 RD</div>
            <div className="mt-3 min-h-10 space-y-1">
              {workPulses.filter((p) => p.source === "edit").slice(-3).map((p) => (
                <div key={p.nonce} className="anim-pop mx-auto flex w-fit items-center gap-2 rounded-full border border-mint/50 bg-mint/10 px-3 py-1 text-[10px] font-extrabold text-mint">
                  <span>{p.name.split(" ")[0]}</span><span>−{p.points} NOTE{p.points === 1 ? "" : "S"}</span><span className="text-viol">+{p.points} RD</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[9px] text-paper/45">Calendar:''')

# ---------------------------------------------------------------- data: live-system descriptions
DATA = "game_source/src/engine/data.ts"
s = read(DATA)
s = s.replace('Steady Hand — bubbles float 20% longer and editing notes are rarer.', 'Steady Hand — all contribution checks are 25% more impactful and production creates fewer editing notes.')
s = s.replace('Work stays available 25% longer before it becomes a miss.', 'Story contribution checks gain +15% effective skill.')
s = s.replace('Crew automatically clears production work 12% faster.', 'All live contribution checks gain +12% effective skill.')
s = s.replace('Editing staff clear notes 15% faster and production issues are reduced.', 'Editing note-clear checks gain +15% effective skill and production issues are reduced.')
s = s.replace('+12% Art output during animation sprints.', '+12% effective Art skill on live contribution checks.')
s = s.replace('Automatically clears 35% of outstanding edit notes before final QA.', 'Adds +35 effective skill to live editing checks.')
write(DATA, s)

# README terminology
README = "game_source/README.md"
s = read(README)
s = s.replace('Genji Ashida** — Steady Hand: bubbles float longer, editing notes rarer.', 'Genji Ashida** — Steady Hand: contribution checks are 25% more impactful, editing notes rarer.')
write(README, s)

# ---------------------------------------------------------------- facilities copy aligned to new engine
fac = "game_source/src/engine/facilities.ts"
s = read(fac)
s = s.replace('`Story production +${[15, 30, 50][t - 1]}%`', '`Story contribution effective skill +${[15, 30, 50][t - 1]}%`')
s = s.replace('`Art production +${[15, 30, 50][t - 1]}%`', '`Art contribution effective skill +${[15, 30, 50][t - 1]}%`')
s = s.replace('`Sound & voice production +${[15, 30, 50][t - 1]}%`', '`Sound contribution effective skill +${[15, 30, 50][t - 1]}%`')
s = s.replace('`Post-production fixes +${t} issue${t > 1 ? "s" : ""}/week`,', '`Live editing effective skill +${t * 15}%`,')
s = s.replace('`+${[1, 2, 4][t - 1]} research point${t > 1 ? "s" : ""}/week`,\n      `Research earned from sprints +${[25, 50, 100][t - 1]}%`,', '`+${[1, 2, 4][t - 1]} research point${t > 1 ? "s" : ""}/week`,\n      `Research projects finish ${t} week${t > 1 ? "s" : ""} sooner`,')
write(fac, s)

# ---------------------------------------------------------------- new ProjectTracker component
write("game_source/src/components/ProjectTracker.tsx", r'''import { AlertTriangle, Clock3, KanbanSquare } from "lucide-react";
import type { RunState } from "../engine/state";
import { activeProjects, STAGE_LABEL, weeksToDeadline } from "../engine/projects";
import { POINT_COLOR } from "../engine/data";

export default function ProjectTracker({ run, clockDay, onOpen }: { run: RunState; clockDay: number; onOpen: () => void }) {
  const projects = activeProjects(run.projects);
  if (!projects.length) return null;
  return (
    <div className="relative z-20 shrink-0 border-b border-line/60 bg-panel/92 px-2 py-1 backdrop-blur-md">
      <div className="nice-scroll mx-auto flex max-w-6xl gap-1.5 overflow-x-auto">
        {projects.map((p) => {
          const due = weeksToDeadline(p, run.week);
          const elapsedWeeks = Math.max(0, run.week - p.createdWeek);
          return (
            <button key={p.id} onClick={onOpen} className="btn-press min-w-[285px] flex-1 rounded-lg border border-line/80 bg-panel2/80 px-2.5 py-1.5 text-left sm:min-w-[360px]">
              <div className="flex items-center gap-1.5">
                <KanbanSquare size={11} className="text-cyanx" />
                <span className="min-w-0 flex-1 truncate font-display text-[10px] font-extrabold">{p.draft.title}</span>
                <span className="text-[8px] font-bold text-paper/45">{STAGE_LABEL[p.stage].toUpperCase()}</span>
                <span className={due < 0 ? "text-neon" : due <= 2 ? "text-gold" : "text-paper/45"}>{due < 0 ? <AlertTriangle size={10}/> : <Clock3 size={10}/>}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[9px] font-extrabold tabular-nums">
                <span style={{ color: POINT_COLOR.story }}>STORY {p.points.story}</span>
                <span style={{ color: POINT_COLOR.art }}>ART {p.points.art}</span>
                <span style={{ color: POINT_COLOR.sound }}>SOUND {p.points.sound}</span>
                <span className={p.issues ? "text-gold" : "text-mint"}>NOTES {p.issues}</span>
                <span className="ml-auto text-paper/45">{elapsedWeeks}W {clockDay + 1}D · {due < 0 ? `${Math.abs(due)}W LATE` : `${due}W LEFT`}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
''')

# ---------------------------------------------------------------- Knowledge Dossier
write("game_source/src/components/KnowledgeDossier.tsx", r'''import { BookOpen, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import { COMBO, GENRES, comboKey, type GenreId } from "../engine/data";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

type Selection = { kind: "genre"; key: GenreId } | { kind: "pair"; key: string } | null;
export type KnowledgeSelection = Selection;

const levelLabel = (n: number) => n <= 0 ? "UNTESTED" : n <= 2 ? "FAMILIAR" : n <= 5 ? "EXPERIENCED" : n <= 8 ? "EXPERT" : "MASTERED";
const pairFit = (m: number) => m >= 1.2 ? "GREAT FIT" : m > 1.02 ? "GOOD FIT" : m < 0.9 ? "RISKY" : "NEUTRAL";

export default function KnowledgeDossier({ run, selection, onSelect }: { run: RunState; selection: Selection; onSelect: (s: Selection) => void }) {
  const unlocked = GENRES.filter((g) => run.genresUnlocked.includes(g.id));
  if (selection?.kind === "genre") {
    const g = GENRES.find((x) => x.id === selection.key)!;
    const k = run.genreKnowledge?.[g.id] ?? 0;
    const emphasis = [
      ["Story", g.ratio[0]], ["Art", g.ratio[1]], ["Sound", g.ratio[2]],
    ].sort((a, b) => Number(b[1]) - Number(a[1]));
    const knownPairs = Object.entries(run.comboLevels).filter(([key]) => key.split("|").includes(g.id));
    const learnedArcs = Object.keys(run.arcGenreKnowledge ?? {}).filter((key) => key.endsWith(`|${g.id}`)).length;
    return <div className="rounded-xl border border-cyanx/40 bg-cyanx/5 p-3">
      <button className="mb-2 text-[10px] font-bold text-cyanx" onClick={() => onSelect(null)}>← ALL KNOWLEDGE</button>
      <div className="flex items-center gap-2"><g.icon size={18} style={{color:g.color}}/><div><div className="font-display text-lg font-extrabold">{g.label}</div><div className="text-[9px] font-extrabold tracking-widest text-gold">{levelLabel(k)} · KNOWLEDGE {k}</div></div></div>
      <p className="mt-2 text-[11px] text-paper/60">{g.desc}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px]"><b>PRODUCTION LEAN</b><br/><span className="text-paper/60">{emphasis.map(([n,v]) => `${n} ${Math.round(Number(v)*100)}%`).join(" · ")}</span></div>
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px]"><b>STORY KNOWLEDGE</b><br/><span className="text-paper/60">{learnedArcs} arc relationship{learnedArcs===1?"":"s"} learned for this genre.</span></div>
      </div>
      <div className="mt-3 text-[9px] font-extrabold tracking-widest text-paper/45">KNOWN PAIRINGS</div>
      <div className="mt-1 grid gap-1 sm:grid-cols-2">{knownPairs.length ? knownPairs.map(([key,lv]) => {
        const other = key.split("|").find((x) => x !== g.id) as GenreId | undefined;
        const og = GENRES.find((x)=>x.id===other);
        const mult = COMBO[key] ?? 1;
        return <button key={key} className="btn-press flex items-center rounded-lg border border-line bg-panel2/60 px-2 py-1.5 text-left text-[10px]" onClick={()=>onSelect({kind:"pair",key})}><span className="font-bold">{og?.label ?? other}</span><span className="ml-auto text-gold">{pairFit(mult)} · Lv{lv}</span><ChevronRight size={10}/></button>
      }) : <div className="text-[10px] text-paper/40">No pairing has been shipped yet.</div>}</div>
    </div>;
  }
  if (selection?.kind === "pair") {
    const [a,b] = selection.key.split("|") as GenreId[];
    const ga=GENRES.find((x)=>x.id===a)!; const gb=GENRES.find((x)=>x.id===b)!;
    const lv=run.comboLevels[selection.key]??0; const mult=COMBO[selection.key]??1;
    return <div className="rounded-xl border border-gold/45 bg-gold/5 p-3">
      <button className="mb-2 text-[10px] font-bold text-cyanx" onClick={() => onSelect(null)}>← ALL KNOWLEDGE</button>
      <div className="font-display text-lg font-extrabold">{ga.label} × {gb.label}</div>
      <div className={cn("mt-1 text-xs font-extrabold", mult>=1.03?"text-mint":mult<0.95?"text-neon":"text-gold")}>{pairFit(mult)} · COMBO LEVEL {lv}</div>
      <div className="mt-2 rounded-lg border border-line bg-panel2/70 p-2 text-[10px] text-paper/60">Your studio has shipped this exact pairing {lv} time{lv===1?"":"s"}. Learned review interaction: <b className="text-paper">×{mult.toFixed(2)}</b>. Higher combo knowledge adds the separate familiarity bonus shown during greenlight.</div>
      <div className="mt-2 flex items-center gap-1 text-[9px] text-paper/45"><HelpCircle size={10}/> Unknown pairings stay hidden until you actually ship or research them.</div>
    </div>;
  }
  return <div>
    <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-cyanx"><BookOpen size={14}/> STUDIO KNOWLEDGE</div>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">{unlocked.map((g)=>{
      const n=run.genreKnowledge?.[g.id]??0;
      return <button key={g.id} className="btn-press rounded-lg border border-line bg-panel2/60 p-2 text-left" onClick={()=>onSelect({kind:"genre",key:g.id})}><div className="flex items-center gap-1"><g.icon size={13} style={{color:g.color}}/><span className="text-[10px] font-bold">{g.label}</span></div><div className="mt-1 text-[8px] font-extrabold tracking-wider text-paper/45">{levelLabel(n)} · {n}</div></button>
    })}</div>
    <div className="mt-3 text-[9px] font-extrabold tracking-widest text-paper/45">KNOWN GENRE PAIRS</div>
    <div className="mt-1 grid gap-1 sm:grid-cols-2">{Object.entries(run.comboLevels).slice().sort((a,b)=>b[1]-a[1]).map(([key,lv])=>{
      const labels=key.split("|").map((id)=>GENRES.find((g)=>g.id===id)?.label??id).join(" × ");
      return <button key={key} onClick={()=>onSelect({kind:"pair",key})} className="btn-press flex items-center rounded-lg border border-line bg-panel2/60 px-2 py-1.5 text-left text-[10px]"><Sparkles size={10} className="mr-1 text-gold"/><span className="truncate font-bold">{labels}</span><span className="ml-auto text-gold">Lv{lv}</span><ChevronRight size={10}/></button>
    })}</div>
    <div className="mt-2 flex gap-1 text-[9px] text-paper/45"><HelpCircle size={10} className="shrink-0"/>Tap a genre or known pairing for what the studio has actually learned. Undiscovered synergies remain secret.</div>
  </div>;
}
''')

# ---------------------------------------------------------------- Office integrates tracker + dossier
OFFICE = "game_source/src/components/Office.tsx"
replace(OFFICE,
'''import { activeProjects } from "../engine/projects";''',
'''import { activeProjects } from "../engine/projects";
import ProjectTracker from "./ProjectTracker";
import KnowledgeDossier, { type KnowledgeSelection } from "./KnowledgeDossier";''')
replace(OFFICE,
'''  const [fcOpen, setFcOpen] = useState(false);''',
'''  const [fcOpen, setFcOpen] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeSelection>(null);''')
replace(OFFICE,
'''      {/* ---------------------------------------------------- compact dock */}''',
'''      <ProjectTracker run={run} clockDay={clockDay} onOpen={() => setModal("projects")} />

      {/* ---------------------------------------------------- compact dock */}''')
replace(OFFICE,
'''          <div className="mb-2 text-xs font-bold tracking-widest text-paper/50">STUDIO TECH</div>''',
'''          <KnowledgeDossier run={run} selection={knowledge} onSelect={setKnowledge} />
          <div className="mb-2 mt-4 text-xs font-bold tracking-widest text-paper/50">STUDIO TECH</div>''')

# ---------------------------------------------------------------- tests
write("game_source/src/engine/__tests__/kairosoft-production.test.ts", r'''import { describe, expect, it, vi } from "vitest";
import { initialRun, migrateRun, percentileSkillOutput, tickEditWorkPulse, tickStudioWorkPulse } from "../state";
import { makeProject } from "../projects";
import { GENRES, PROTAGONISTS, SECONDARY, PETS, VILLAINS, type Draft } from "../data";

const draft = (): Draft => ({ title:"Test", medium:"tv", budget:"indie", scope:"standard", slot:"midnight", genres:["shojo","romance"], audience:"teens", protag:PROTAGONISTS[0].id, protagName:"Lead", secondary:SECONDARY[0].id, pet:PETS[0].id, villain:VILLAINS[0].id, arcs:[], sliders:[50,50,50], season:1 });

describe("Kairosoft live production", () => {
  it("percentile skill scales cleanly beyond 100 and 200", () => {
    expect(percentileSkillOutput(65, 0.64)).toBe(1);
    expect(percentileSkillOutput(65, 0.66)).toBe(0);
    expect(percentileSkillOutput(175, 0.74)).toBe(2);
    expect(percentileSkillOutput(175, 0.76)).toBe(1);
    expect(percentileSkillOutput(247, 0.46)).toBe(3);
    expect(percentileSkillOutput(247, 0.48)).toBe(2);
  });

  it("visible project bubbles immediately change project quality", () => {
    let r = initialRun("Live", "steady");
    const st = { ...r.candidates[0], id:"worker", story:99, art:99, sound:99, stamina:100 };
    const p = { ...makeProject(draft(), 0), staffIds:[st.id] };
    r = { ...r, staff:[st], projects:[p] };
    vi.spyOn(Math, "random").mockReturnValue(0);
    const before = r.projects[0].points.story + r.projects[0].points.art + r.projects[0].points.sound;
    const out = tickStudioWorkPulse(r);
    const after = out.run.projects[0].points.story + out.run.projects[0].points.art + out.run.projects[0].points.sound;
    expect(out.pulses.length).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(before);
    vi.restoreAllMocks();
  });

  it("editing bubbles clear notes and award exactly one RD per note", () => {
    let r = initialRun("Edit", "steady");
    const st = { ...r.candidates[0], id:"editor", story:99, art:99, sound:99, stamina:100 };
    const p = { ...makeProject(draft(),0), staffIds:[st.id], stage:"post" as const, milestone:"edit" as const, issues:5 };
    r = { ...r, staff:[st], projects:[p] };
    vi.spyOn(Math, "random").mockReturnValue(0);
    const rd = r.rd;
    const out = tickEditWorkPulse(r,p.id);
    const cleared = 5 - out.run.projects[0].issues;
    expect(cleared).toBeGreaterThan(0);
    expect(out.run.rd-rd).toBe(cleared);
    expect(out.pulses.every((x)=>x.source==="edit")).toBe(true);
    vi.restoreAllMocks();
  });

  it("old saves gain an empty genre knowledge ledger", () => {
    const old = initialRun("Old","steady") as any;
    delete old.genreKnowledge;
    expect(migrateRun(old).genreKnowledge).toEqual({});
  });

  it("Shojo x Romance has a dual-affinity option in every cast role", () => {
    for (const pool of [PROTAGONISTS, SECONDARY, PETS, VILLAINS]) {
      expect(pool.some((m)=>m.aff.includes("shojo") && m.aff.includes("romance"))).toBe(true);
    }
  });

  it("all twenty genres remain present", () => expect(GENRES).toHaveLength(20));
});
''')

print("Kairosoft production pass migration applied")
