from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def p(rel): return ROOT / rel

def replace_once(rel, old, new):
    path = p(rel)
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"Missing expected block in {rel}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))

# ---------------------------------------------------------------- Projects: persistent live rush state
replace_once(
    "game_source/src/engine/projects.ts",
    'export type MilestoneId = "story" | "art" | "sound" | "edit";\n',
    '''export type MilestoneId = "story" | "art" | "sound" | "edit";\nexport type RushMilestoneId = Exclude<MilestoneId, "edit">;\n\nexport interface RushBoostPrompt {\n  actorId: string;\n  name: string;\n  skill: number;\n  type: PointType;\n}\n\n/** A key creative phase now unfolds on the live studio clock instead of in a\n * detached minigame. One lead owns the rush and contributes once per day. */\nexport interface ProjectRush {\n  milestone: RushMilestoneId;\n  type: PointType;\n  leadId: string;\n  leadName: string;\n  skill: number;\n  cost: number;\n  slider: number;\n  daysWorked: number;\n  durationDays: number;\n  pointsAdded: number;\n  boostAsked: boolean;\n  boostPrompt?: RushBoostPrompt | null;\n  crunchDays?: number;\n}\n\nexport interface RushAssignment {\n  leadId: string;\n  leadName: string;\n  skill: number;\n  type: PointType;\n  cost: number;\n  slider: number;\n}\n'''
)
replace_once(
    "game_source/src/engine/projects.ts",
    '  /** milestone sprint waiting to be played, if any */\n  milestone: MilestoneId | null;\n  milestonesDone: MilestoneId[];',
    '  /** milestone sprint waiting for a lead/decision, if any */\n  milestone: MilestoneId | null;\n  /** live Game-Dev-Story-style rush currently unfolding on the studio clock */\n  rush?: ProjectRush | null;\n  milestonesDone: MilestoneId[];'
)
replace_once(
    "game_source/src/engine/projects.ts",
    '    milestone: null,\n    milestonesDone: [],',
    '    milestone: null,\n    rush: null,\n    milestonesDone: [],'
)

# ---------------------------------------------------------------- State: live rush mechanics
replace_once(
    "game_source/src/engine/state.ts",
    '  ROLE_POINT,\n  rollContract,',
    '  ROLE_POINT,\n  staffPoint,\n  rollContract,'
)
replace_once(
    "game_source/src/engine/state.ts",
    '  type MilestoneOutcome,\n  type Project,',
    '  type MilestoneOutcome,\n  type Project,\n  type RushAssignment,'
)
replace_once(
    "game_source/src/engine/state.ts",
    '  contractWeeklyOutput,\n  showrunnerContractSkill,',
    '  contractWeeklyOutput,\n  rushBoostPoint,\n  rushResearchCost,\n  showrunnerContractSkill,'
)
replace_once(
    "game_source/src/engine/state.ts",
    '    projects: Array.isArray(r.projects) ? r.projects : [],',
    '    projects: Array.isArray(r.projects) ? r.projects.map((pr) => ({ ...pr, rush: pr.rush ?? null })) : [],'
)

rush_code = r'''

/* ------------------------------------------------------ live rush system */
export interface DeskPulse {
  actorId: string;
  name: string;
  type: PointType;
  points: number;
  nonce: number;
}

export const RUSH_CRUNCH_COST = 9_000;

const rushRoll = (skill: number, crunching = false) => {
  const s = Math.max(1, Math.min(99, skill));
  const lo = Math.max(1, Math.floor(s * 0.035));
  const hi = Math.max(lo + 1, Math.ceil(s * 0.105));
  const raw = lo + Math.floor(Math.random() * (hi - lo + 1));
  return Math.max(1, Math.round(raw * (crunching ? 1.35 : 1)));
};

/** Pick a lead, then return to the office: the actual work now happens as days pass. */
export function startMilestoneRush(r: RunState, projectId: string, a: RushAssignment): RunState | null {
  const target = r.projects.find((x) => x.id === projectId);
  if (!target || !target.milestone || target.milestone === "edit" || target.rush) return null;
  if (r.cash < a.cost) return null;
  const isOutsource = a.leadId.startsWith("outsource:");
  if (!isOutsource && a.leadId !== "showrunner" && !target.staffIds.includes(a.leadId)) return null;
  const idx = target.milestone === "story" ? 0 : target.milestone === "art" ? 1 : 2;
  const projects = r.projects.map((pr) => {
    if (pr.id !== projectId) return pr;
    const draft = {
      ...pr.draft,
      sliders: pr.draft.sliders.map((v, i) => (i === idx ? a.slider : v)) as [number, number, number],
    };
    return {
      ...pr,
      draft,
      spent: pr.spent + a.cost,
      rush: {
        milestone: pr.milestone as "story" | "art" | "sound",
        type: a.type,
        leadId: a.leadId,
        leadName: a.leadName,
        skill: Math.max(1, Math.min(99, Math.round(a.skill))),
        cost: a.cost,
        slider: a.slider,
        daysWorked: 0,
        durationDays: 4,
        pointsAdded: 0,
        boostAsked: false,
        boostPrompt: null,
        crunchDays: 0,
      },
    };
  });
  return {
    ...r,
    cash: r.cash - a.cost,
    projects,
    notices: [...r.notices, `🎬 ${a.leadName} takes charge of ${target.draft.title}'s ${target.milestone} rush. Watch the studio — their work lands day by day.`],
  };
}

/** Crunch is still available, but it now pushes the next two live workdays instead of flooding a bubble minigame. */
export function crunchRush(r: RunState, projectId: string): RunState {
  const target = r.projects.find((x) => x.id === projectId);
  if (!target?.rush || r.cash < RUSH_CRUNCH_COST) return r;
  return {
    ...r,
    cash: r.cash - RUSH_CRUNCH_COST,
    projects: r.projects.map((pr) => pr.id === projectId ? {
      ...pr,
      spent: pr.spent + RUSH_CRUNCH_COST,
      rush: { ...pr.rush!, crunchDays: Math.max(pr.rush!.crunchDays ?? 0, 2) },
    } : pr),
    notices: [...r.notices, `⚡ Crunch called on “${target.draft.title}” — the next two rush days hit harder, but mistake risk rises.`],
  };
}

/** One in-game day of special-section work. Normal production remains the team's
 * background job; this is the visible lead contribution that makes a rush special. */
export function tickRushDay(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const pulses: DeskPulse[] = [];
  const notices = [...r.notices];
  let attention = false;
  let projects = r.projects.map((pr0) => {
    const rush0 = pr0.rush;
    if (!rush0 || rush0.boostPrompt) return pr0;
    const crunching = (rush0.crunchDays ?? 0) > 0;
    const pts = rushRoll(rush0.skill, crunching);
    let pr: Project = {
      ...pr0,
      points: { ...pr0.points, [rush0.type]: pr0.points[rush0.type] + pts },
    };
    let rush = {
      ...rush0,
      daysWorked: rush0.daysWorked + 1,
      pointsAdded: rush0.pointsAdded + pts,
      crunchDays: Math.max(0, (rush0.crunchDays ?? 0) - 1),
    };
    pulses.push({ actorId: rush.leadId, name: rush.leadName, type: rush.type, points: pts, nonce: Date.now() + pulses.length });

    /* Weak leads are more volatile; Crunch almost doubles that risk. */
    const issueChance = Math.max(0.012, 0.085 - rush.skill * 0.00072) * (crunching ? 1.9 : 1);
    if (Math.random() < issueChance) pr = { ...pr, issues: pr.issues + 1 };

    /* A staff member may walk over with one optional experiment during the rush. */
    if (!rush.boostAsked && rush.daysWorked >= 1 && rush.daysWorked < rush.durationDays && Math.random() < 0.24) {
      const team = r.staff.filter((s) => pr.staffIds.includes(s.id));
      const candidates = team.map((s) => ({ actorId: s.id, name: s.name, skill: Math.round(staffPoint(s, rush.type)), type: rush.type }));
      candidates.push({ actorId: "showrunner", name: r.studio + " showrunner", skill: showrunnerContractSkill(r.showrunner, r.showsMade, rush.type), type: rush.type });
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      rush = { ...rush, boostPrompt: pick };
      attention = true;
    }

    pr = { ...pr, rush };
    if (rush.daysWorked >= rush.durationDays) {
      const done = applyMilestoneOutcome({ ...pr, rush: null }, { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0 });
      notices.push(`✅ ${rush.leadName} finishes the ${rush.milestone} rush on “${pr.draft.title}” (+${rush.pointsAdded} ${rush.type} across ${rush.durationDays} days).`);
      return done;
    }
    return pr;
  });
  return { run: { ...r, projects, notices }, pulses, attention };
}

export function respondRushBoost(r: RunState, projectId: string, chance: number | null): RunState {
  const target = r.projects.find((x) => x.id === projectId);
  const prompt = target?.rush?.boostPrompt;
  if (!target?.rush || !prompt) return r;
  if (chance === null) {
    return {
      ...r,
      projects: r.projects.map((pr) => pr.id === projectId ? { ...pr, rush: { ...pr.rush!, boostPrompt: null, boostAsked: true } } : pr),
      notices: [...r.notices, `${prompt.name}'s experiment is passed over — the rush keeps to plan.`],
    };
  }
  const cost = rushResearchCost(prompt.skill, chance);
  if (r.rd < cost) return r;
  const success = Math.random() < chance;
  const reward = success ? rushBoostPoint(prompt.skill) : 0;
  return {
    ...r,
    rd: r.rd - cost,
    projects: r.projects.map((pr) => {
      if (pr.id !== projectId || !pr.rush) return pr;
      return {
        ...pr,
        points: success ? { ...pr.points, [prompt.type]: pr.points[prompt.type] + reward } : pr.points,
        issues: success ? pr.issues : pr.issues + 1,
        rush: { ...pr.rush, boostPrompt: null, boostAsked: true, pointsAdded: pr.rush.pointsAdded + reward },
      };
    }),
    notices: [...r.notices, success
      ? `💡 ${prompt.name}'s experiment works: +${reward} ${prompt.type} for ${cost} RD.`
      : `💥 ${prompt.name}'s experiment fails: ${cost} RD spent and one extra editing note.`],
  };
}
'''

state_path = p("game_source/src/engine/state.ts")
state_text = state_path.read_text()
marker = '/** score a ready project without committing anything */'
if marker not in state_text:
    raise SystemExit('state milestone insertion marker missing')
state_path.write_text(state_text.replace(marker, rush_code + '\n' + marker, 1))

# ---------------------------------------------------------------- Produce: choice screen only; rush plays out in office time
p("game_source/src/components/Produce.tsx").write_text(r'''import { useMemo, useState } from "react";
import { Building2, ChevronLeft, MonitorPlay, Music4, PenTool, Scissors, UserRound } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  POINT_COLOR,
  POINT_LABEL,
  SHOWRUNNERS,
  castById,
  formatGBP,
  staffPoint,
  type PointType,
} from "../engine/data";
import type { RunState } from "../engine/state";
import type { MilestoneId, MilestoneOutcome, Project, RushAssignment } from "../engine/projects";
import { MILESTONE_LABEL } from "../engine/projects";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";

const PHASES: Record<Exclude<MilestoneId, "edit">, { idx: 0 | 1 | 2; name: string; icon: typeof PenTool; a: string; b: string; type: PointType }> = {
  story: { idx: 0, name: "STORY RUSH", icon: PenTool, a: "Plot", b: "Characters", type: "story" },
  art: { idx: 1, name: "ANIMATION RUSH", icon: MonitorPlay, a: "Sakuga", b: "Consistency", type: "art" },
  sound: { idx: 2, name: "RECORDING RUSH", icon: Music4, a: "Soundtrack", b: "Voice Cast", type: "sound" },
};

export default function Produce({ run, project, milestone, onDone, onStartRush, onBack }: {
  run: RunState;
  project: Project;
  milestone: MilestoneId;
  paused: boolean;
  onDone: (o: MilestoneOutcome) => void;
  onStartRush: (a: RushAssignment) => void;
  onBack: () => void;
}) {
  const isEdit = milestone === "edit";
  const phase = isEdit ? null : PHASES[milestone];
  const [mode, setMode] = useState<"plan" | "assign">(isEdit ? "plan" : "plan");
  const [slider, setSlider] = useState(phase ? project.draft.sliders[phase.idx] : 50);
  const [finalNames, setFinalNames] = useState(() => ({
    title: project.draft.title,
    protagName: project.draft.protagName || castById(project.draft.protag).name,
    secondaryName: project.draft.secondaryName ?? castById(project.draft.secondary).name,
    petName: project.draft.petName ?? (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),
    villainName: project.draft.villainName ?? castById(project.draft.villain).name,
  }));
  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];
  const team = useMemo(() => run.staff.filter((s) => project.staffIds.includes(s.id)), [run.staff, project.staffIds]);

  if (isEdit) {
    const avg = team.length ? team.reduce((a, s) => a + (s.story + s.art + s.sound) / 3, 0) / team.length : 0;
    const fixes = Math.min(project.issues, Math.max(1, Math.round(team.length * 1.25 + avg / 35)));
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-xl flex-1 overflow-y-auto p-4">
          <div className="text-center">
            <Scissors size={24} className="mx-auto text-mint" />
            <div className="mt-2 text-[10px] font-bold tracking-[0.35em] text-mint">EDIT BAY · FINAL MASTER</div>
            <h2 className="font-display text-3xl font-extrabold">LOCK PICTURE</h2>
            <p className="mt-1 text-xs text-paper/55">The team has been cleaning up throughout post. Lock the final billing before marketing.</p>
          </div>
          <div className="mt-4 rounded-xl border border-mint/30 bg-mint/5 p-3 text-center">
            <div className="font-display text-2xl font-extrabold text-mint">{fixes}</div>
            <div className="text-[10px] font-bold text-paper/45">OF {project.issues} REMAINING NOTES CLEARED ON LOCK</div>
          </div>
          <div className="mt-3 ink-card p-3">
            <div className="text-center text-[10px] font-extrabold tracking-[0.2em] text-cyanx">FINAL BILLING</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                ["title", "SHOW TITLE", 32], ["protagName", "LEAD", 18], ["secondaryName", "SUPPORT", 18],
                ["petName", "MASCOT", 18], ["villainName", "VILLAIN", 18],
              ] as const).map(([key, label, max]) => (
                <label key={key} className={key === "title" ? "sm:col-span-2" : ""}>
                  <span className="mb-1 block text-[9px] font-bold text-paper/45">{label}</span>
                  <input value={finalNames[key]} maxLength={max} onChange={(e) => setFinalNames((n) => ({ ...n, [key]: e.target.value }))} className="ink-input w-full px-2.5 py-2 text-sm font-bold" />
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn variant="ghost" onClick={onBack}><ChevronLeft size={16} /> LATER</Btn>
            <Btn big variant="primary" className="flex-1" onClick={() => {
              sfx.whoosh();
              onDone({ points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0, squashed: fixes,
                rename: {
                  title: finalNames.title.trim() || project.draft.title,
                  protagName: finalNames.protagName.trim() || castById(project.draft.protag).name,
                  secondaryName: finalNames.secondaryName.trim() || castById(project.draft.secondary).name,
                  petName: finalNames.petName.trim() || (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),
                  villainName: finalNames.villainName.trim() || castById(project.draft.villain).name,
                } });
            }}>LOCK MASTER</Btn>
          </div>
        </div>
      </div>
    );
  }

  const Icon = phase!.icon;
  const candidates = [...team].sort((a, b) => staffPoint(b, phase!.type) - staffPoint(a, phase!.type));
  const outsourceCost = 18_000 + phase!.idx * 6_000;
  const choose = (a: RushAssignment) => { sfx.select(); onStartRush(a); };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">
        <span className="rounded-md bg-neon px-2 py-0.5 text-[10px] font-bold text-white">{MILESTONE_LABEL[milestone].toUpperCase()}</span>
        <span className="truncate font-display text-sm font-extrabold">{project.draft.title}</span>
      </div>
      {mode === "plan" ? (
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-xl flex-1 overflow-y-auto p-4">
          <div className="text-center">
            <div className="text-[11px] tracking-[0.4em] text-cyanx">{phase!.name}</div>
            <h2 className="font-display text-3xl font-extrabold">DIRECTION MEETING</h2>
            <p className="mt-1 text-xs text-paper/55">Set the balance, then appoint one lead. The rush itself happens back in the studio while the calendar runs.</p>
          </div>
          <div className="mt-4 ink-card p-4">
            <div className="flex items-center gap-2"><span className="rounded-lg bg-panel3 p-2" style={{ color: POINT_COLOR[phase!.type] }}><Icon size={18} /></span><div><div className="font-display text-sm font-extrabold">{phase!.name}</div><div className="text-[10px] text-paper/40">Lead contributes {POINT_LABEL[phase!.type]} each in-game day</div></div></div>
            <div className="mt-4 flex justify-between text-[10px] font-bold"><span className="text-neon2">{phase!.a}</span><span className="text-cyanx">{phase!.b}</span></div>
            <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(+e.target.value)} className="ink-range relative z-10" style={{ "--p": `${slider}%` } as React.CSSProperties} />
            <div className="mt-1 flex justify-between text-[10px] text-paper/50"><span>{slider}%</span><span>{100-slider}%</span></div>
          </div>
          <div className="mt-4 flex gap-2"><Btn variant="ghost" onClick={onBack}><ChevronLeft size={16}/> LATER</Btn><Btn big variant="primary" className="flex-1" onClick={() => setMode("assign")}>ASSIGN RUSH LEAD</Btn></div>
        </div>
      ) : (
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4">
          <div className="text-center"><div className="text-[11px] tracking-[0.4em] text-cyanx">{phase!.name}</div><h2 className="font-display text-3xl font-extrabold">WHO OWNS THIS RUSH?</h2><p className="mt-1 text-xs text-paper/55">Their relevant skill defines the floor and ceiling of each daily RNG contribution. You will see those points pop from their desk as time passes.</p></div>
          <div className="mt-4 space-y-2">
            {candidates.map((s) => {
              const skill = Math.round(staffPoint(s, phase!.type) * (0.72 + s.stamina / 360));
              return <button key={s.id} onClick={() => choose({ leadId: s.id, leadName: s.name, skill, type: phase!.type, cost: 0, slider })} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-cyanx/60"><span className="rounded-lg bg-panel3 p-2 text-cyanx"><UserRound size={17}/></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{s.name}</div><div className="text-[10px] text-paper/50">{POINT_LABEL[phase!.type]} {staffPoint(s, phase!.type)} · stamina {Math.round(s.stamina)}%</div></div><div className="text-right"><div className="font-display text-lg font-extrabold" style={{color:POINT_COLOR[phase!.type]}}>SKILL {skill}</div><div className="text-[9px] text-paper/40">4 live workdays</div></div></button>;
            })}
            <button onClick={() => choose({ leadId: "showrunner", leadName: runner.name, skill: Math.min(99, 44 + run.showsMade * 3), type: phase!.type, cost: 0, slider })} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-gold/60"><Portrait img={runner.portrait} name={runner.name} className="h-10 w-10 rounded-lg"/><div className="flex-1"><div className="text-sm font-bold">{runner.name} (showrunner)</div><div className="text-[10px] text-paper/50">Free · improves with studio experience</div></div></button>
            <button disabled={run.cash < outsourceCost} onClick={() => choose({ leadId: `outsource:${milestone}`, leadName: "Famous Studio", skill: 78, type: phase!.type, cost: outsourceCost, slider })} className={cn("btn-press ink-card flex w-full items-center gap-3 border-gold/40 p-3 text-left", run.cash < outsourceCost && "pointer-events-none opacity-40")}><span className="rounded-lg bg-panel3 p-2 text-gold"><Building2 size={17}/></span><div className="flex-1"><div className="text-sm font-bold text-gold">Outsource the rush</div><div className="text-[10px] text-paper/50">Strong bounded output without tying up a staff lead.</div></div><span className="font-display text-sm font-extrabold text-gold">{formatGBP(outsourceCost)}</span></button>
          </div>
          <Btn variant="ghost" className="mt-3" onClick={() => setMode("plan")}><ChevronLeft size={16}/> DIRECTION</Btn>
        </div>
      )}
    </div>
  );
}
''')

# ---------------------------------------------------------------- Rush boost popup
p("game_source/src/components/RushBoostModal.tsx").write_text(r'''import { Database, Lightbulb } from "lucide-react";
import { Btn } from "../fx/fx";
import { rushResearchCost } from "../engine/studioOps";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

export default function RushBoostModal({ run, onRespond }: { run: RunState; onRespond: (projectId: string, chance: number | null) => void }) {
  const project = run.projects.find((p) => p.rush?.boostPrompt);
  const prompt = project?.rush?.boostPrompt;
  if (!project || !prompt) return null;
  return <div className="fixed inset-0 z-[95] flex items-center justify-center bg-abyss/86 p-4 backdrop-blur-md">
    <div className="anim-pop ink-card w-full max-w-md p-4">
      <div className="flex items-center gap-2 text-viol"><Lightbulb size={18}/><span className="text-[10px] font-extrabold tracking-[0.25em]">STAFF IMPROVEMENT IDEA</span></div>
      <h3 className="mt-1 font-display text-2xl font-extrabold">{prompt.name} walks over with an idea</h3>
      <p className="mt-1 text-xs text-paper/60">The studio clock has stopped. Back the experiment with Research Data, or keep the rush on plan. Higher skill needs less RD for the same confidence.</p>
      <div className="mt-3 space-y-2">
        {([0.2,0.5,0.8] as const).map((chance) => { const cost = rushResearchCost(prompt.skill, chance); return <button key={chance} disabled={run.rd < cost} onClick={() => onRespond(project.id, chance)} className={cn("btn-press flex w-full items-center gap-3 rounded-xl border border-line bg-panel2/70 p-3 text-left hover:border-viol/60", run.rd < cost && "pointer-events-none opacity-40")}><Database size={17} className="text-viol"/><div className="flex-1"><div className="text-sm font-extrabold">{Math.round(chance*100)}% CONFIDENCE</div><div className="text-[10px] text-paper/45">Relevant skill {prompt.skill}</div></div><span className="font-display text-sm font-extrabold text-viol">{cost} RD</span></button>; })}
        <Btn variant="ghost" className="w-full" onClick={() => onRespond(project.id, null)}>PASS — KEEP WORKING</Btn>
        <div className="text-center text-[10px] text-paper/40">Research available: {run.rd} RD</div>
      </div>
    </div>
  </div>;
}
''')

# ---------------------------------------------------------------- App clock + rush callbacks + no skip week
app = p("game_source/src/App.tsx").read_text()
app = app.replace('  advanceWeeks,\n  applyMilestone,', '  advanceWeeks,\n  applyMilestone,\n  crunchRush,')
app = app.replace('  initialRun,\n  MAX_WEEKS,', '  initialRun,\n  MAX_WEEKS,\n  respondRushBoost,\n  startMilestoneRush,\n  tickRushDay,\n  type DeskPulse,')
app = app.replace('import type { MilestoneId, MilestoneOutcome } from "./engine/projects";', 'import type { MilestoneId, MilestoneOutcome, RushAssignment } from "./engine/projects";')
app = app.replace('import Release from "./components/Release";', 'import Release from "./components/Release";\nimport RushBoostModal from "./components/RushBoostModal";')
app = app.replace('  const [timeSpeed, setTimeSpeed] = useState<0 | 1 | 4 | 12>(1);', '  const [timeSpeed, setTimeSpeed] = useState<0 | 1 | 4 | 12>(1);\n  const [workPulses, setWorkPulses] = useState<DeskPulse[]>([]);')
app = app.replace('  /* real-time game clock: 1 in-game day = 2 real minutes; 7 days = 1 week */', '  /* GDS-style live studio clock: one in-game day = 10 real seconds at 1×. */')

old_clock = re.search(r'  /\* ------------------------------------------------------- game clock \*/\n  useEffect\(\(\) => \{.*?\n  \}, \[screen, paused, timeSpeed, run !== null, run\?\.week\]\);', app, re.S)
if not old_clock:
    raise SystemExit('App clock block not found')
new_clock = r'''  /* ------------------------------------------------------- game clock */
  useEffect(() => {
    if (screen !== "office" || paused || !run) return;
    const DAY_MS = 10_000;
    const iv = setInterval(() => {
      if (timeSpeed === 0) return;
      dayAccRef.current += 250 * timeSpeed;
      if (dayAccRef.current >= DAY_MS) {
        dayAccRef.current -= DAY_MS;
        dayCountRef.current += 1;
        const weekBoundary = dayCountRef.current >= 7;
        if (weekBoundary) dayCountRef.current = 0;
        setClockDay(dayCountRef.current);
        setRun((current) => {
          if (!current) return current;
          const daily = tickRushDay(current);
          let n = daily.run;
          setWorkPulses(daily.pulses);
          if (daily.attention) setTimeSpeed(0);
          if (weekBoundary) {
            if (forecastWeek(n).cashAfter < 0) {
              setTimeSpeed(0);
              return { ...n, notices: [...n.notices, "⏸ Calendar paused: next week would bankrupt the studio."] };
            }
            const before = n;
            n = advanceWeeks(n, 1);
            const attention =
              n.projects.some((p) => p.milestone && !p.rush && !before.projects.find((x) => x.id === p.id)?.milestone) ||
              n.projects.some((p) => p.stage === "ready" && before.projects.find((x) => x.id === p.id)?.stage !== "ready") ||
              n.marketEvents.length > before.marketEvents.length || n.studioEvents.length > before.studioEvents.length || n.staffEvents.length > before.staffEvents.length ||
              n.contractJobs.length < before.contractJobs.length || n.trainingJobs.length < before.trainingJobs.length || n.researchJobs.length < before.researchJobs.length;
            if (attention) setTimeSpeed(0);
            if (n.cash < 0) {
              if (n.bailouts < 2) n = { ...n, bailouts: n.bailouts + 1, cash: n.cash + 150_000, notices: [...n.notices, "Emergency crowdfunding from the fans! (+£150,000)"] };
              else { setScreen("gameover"); return n; }
            }
            if (n.week >= MAX_WEEKS && !n.dynasty) setScreen("retrospective");
          }
          return n;
        });
      }
      setClockPhase(Math.floor((dayAccRef.current / DAY_MS) * 4));
    }, 250);
    return () => clearInterval(iv);
  }, [screen, paused, timeSpeed, run !== null, run?.week]);'''
app = app[:old_clock.start()] + new_clock + app[old_clock.end():]

# remove skip-week callback
app = re.sub(r'\n  /\* one deliberate week of studio time from the project board \*/\n  const skipWeek = useCallback\(\(\) => \{.*?\n  \}, \[settle\]\);\n', '\n', app, flags=re.S)

# add start rush callback after finishMilestone
needle = '''  const finishMilestone = useCallback(\n    (o: MilestoneOutcome) => {'''
# target insertion after whole callback by locating release comment
release_marker = '  /* --------------------------------------------------------- release */'
idx = app.find(release_marker)
if idx < 0: raise SystemExit('release marker missing')
rush_callbacks = r'''  const beginRush = useCallback((a: RushAssignment) => {
    if (!focus) return;
    setRun((r) => (r ? (startMilestoneRush(r, focus.projectId, a) ?? r) : r));
    setFocus(null);
    setScreen("office");
    setTimeSpeed(1);
  }, [focus]);

  const pushRush = useCallback((projectId: string) => {
    sfx.phase();
    setRun((r) => (r ? crunchRush(r, projectId) : r));
  }, []);

  const answerRushBoost = useCallback((projectId: string, chance: number | null) => {
    setRun((r) => (r ? respondRushBoost(r, projectId, chance) : r));
    setTimeSpeed(1);
  }, []);

'''
app = app[:idx] + rush_callbacks + app[idx:]

app = app.replace('            onShip={openShip}\n            onSkipWeek={skipWeek}\n            clockDay={clockDay}', '            onShip={openShip}\n            onRushCrunch={pushRush}\n            workPulses={workPulses}\n            clockDay={clockDay}')
app = app.replace('            onDone={finishMilestone}\n            onBack={() => {', '            onDone={finishMilestone}\n            onStartRush={beginRush}\n            onBack={() => {')
# global boost modal before pause menu
app = app.replace('        {paused && pauseMenu}', '        {screen === "office" && run && <RushBoostModal run={run} onRespond={answerRushBoost} />}\n\n        {paused && pauseMenu}')
p("game_source/src/App.tsx").write_text(app)

# ---------------------------------------------------------------- Office props: pulses + crunch; no skip
op = p("game_source/src/components/Office.tsx").read_text()
op = op.replace('  onShip,\n  onSkipWeek,\n  clockDay = 0,', '  onShip,\n  onRushCrunch,\n  workPulses = [],\n  clockDay = 0,')
op = op.replace('  onShip: (projectId: string) => void;\n  onSkipWeek: () => void;\n  clockDay?: number;', '  onShip: (projectId: string) => void;\n  onRushCrunch: (projectId: string) => void;\n  workPulses?: import("../engine/state").DeskPulse[];\n  clockDay?: number;')
op = op.replace('  const projAlerts = run.projects.filter((p) => p.milestone || p.stage === "ready").length;', '  const projAlerts = run.projects.filter((p) => (p.milestone && !p.rush) || p.stage === "ready").length;')
# OfficeScene payload
old_scene = '''        boss={{ name: runner.name.split(" ")[0], color: "#ffd166", sprite: runner.sprite }}\n        staff={run.staff.map((s) => ({\n          name: s.name.split(" ")[0],\n          color: POINT_COLOR[ROLE_POINT[s.role]],\n          tired: s.stamina < 45,\n          look: workerLookIndex(s),\n        }))}'''
new_scene = '''        boss={{ id: "showrunner", name: runner.name.split(" ")[0], color: "#ffd166", sprite: runner.sprite, working: projActive.length > 0, pulse: workPulses.find((x) => x.actorId === "showrunner") }}\n        staff={run.staff.map((s) => ({\n          id: s.id,\n          name: s.name.split(" ")[0],\n          color: POINT_COLOR[ROLE_POINT[s.role]],\n          tired: s.stamina < 45,\n          look: workerLookIndex(s),\n          working: projActive.some((pr) => pr.staffIds.includes(s.id)),\n          pulse: workPulses.find((x) => x.actorId === s.id),\n        }))}'''
if old_scene not in op: raise SystemExit('OfficeScene payload missing')
op = op.replace(old_scene, new_scene, 1)
# ProjectsPanel call props
op = op.replace('            onShip={onShip}\n            onSkipWeek={onSkipWeek}', '            onShip={onShip}\n            onRushCrunch={onRushCrunch}')
p("game_source/src/components/Office.tsx").write_text(op)

# ---------------------------------------------------------------- Projects board: no Next Week; live rush card + crunch
pp = p("game_source/src/components/Projects.tsx").read_text()
pp = pp.replace('  FastForward,\n', '')
# add callback through ProjectCard
pp = pp.replace('  onShip,\n  onDelegate,', '  onShip,\n  onRushCrunch,\n  onDelegate,', 1)
pp = pp.replace('  onShip: (projectId: string) => void;\n  onDelegate:', '  onShip: (projectId: string) => void;\n  onRushCrunch: (projectId: string) => void;\n  onDelegate:', 1)
# progress label
pp = pp.replace('            {p.milestone && (\n              <b className="text-neon"> {MILESTONE_LABEL[p.milestone]} waiting</b>\n            )}', '            {p.rush ? (\n              <b className="text-cyanx"> {MILESTONE_LABEL[p.rush.milestone]} · day {p.rush.daysWorked}/{p.rush.durationDays}</b>\n            ) : p.milestone ? (\n              <b className="text-neon"> {MILESTONE_LABEL[p.milestone]} waiting</b>\n            ) : null}')
# actions replacement
old_action = '''      {!auto && p.milestone && (\n        <Btn big variant="primary" className="anim-ring mt-2 w-full" onClick={() => onMilestone(p.id)}>\n          <Play size={17} /> PLAY {MILESTONE_LABEL[p.milestone].toUpperCase()}\n        </Btn>\n      )}'''
new_action = '''      {!auto && p.milestone && !p.rush && (\n        <Btn big variant="primary" className="anim-ring mt-2 w-full" onClick={() => onMilestone(p.id)}>\n          <Play size={17} /> ASSIGN {MILESTONE_LABEL[p.milestone].toUpperCase()} LEAD\n        </Btn>\n      )}\n      {p.rush && (\n        <div className="mt-2 rounded-xl border border-cyanx/40 bg-cyanx/5 p-2.5">\n          <div className="flex items-center gap-2"><UserRound size={13} className="text-cyanx"/><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-extrabold text-cyanx">{p.rush.leadName} · SKILL {p.rush.skill}</div><div className="text-[9px] text-paper/45">+{p.rush.pointsAdded} {p.rush.type} so far · work lands each in-game day</div></div><Btn variant="gold" className="!px-2 !py-1 text-[9px]" disabled={run.cash < 9000} onClick={() => onRushCrunch(p.id)}><Zap size={11}/> CRUNCH</Btn></div>\n          <div className="mt-1 text-[9px] text-paper/40">Crunch costs £9,000: +35% lead output for the next two rush days, with almost double mistake risk.</div>\n        </div>\n      )}'''
if old_action not in pp: raise SystemExit('Projects milestone action missing')
pp = pp.replace(old_action, new_action, 1)
# panel signatures remove skip add crunch
pp = pp.replace('  onShip,\n  onSkipWeek,\n  onNewShow,', '  onShip,\n  onRushCrunch,\n  onNewShow,', 1)
pp = pp.replace('  onShip: (projectId: string) => void;\n  onSkipWeek: () => void;\n  onNewShow:', '  onShip: (projectId: string) => void;\n  onRushCrunch: (projectId: string) => void;\n  onNewShow:', 1)
# remove next week button
pp = re.sub(r'\n\s*<Btn variant="cyan" className="ml-auto !px-2\.5 !py-1\.5 text-\[10px\]" onClick=\{onSkipWeek\}>\n\s*<FastForward size=\{13\} /> NEXT WEEK\n\s*</Btn>', '', pp)
# pass callback into ProjectCard
pp = pp.replace('          onShip={onShip}\n          onDelegate={onDelegate}', '          onShip={onShip}\n          onRushCrunch={onRushCrunch}\n          onDelegate={onDelegate}')
p("game_source/src/components/Projects.tsx").write_text(pp)

# ---------------------------------------------------------------- OfficeScene: staff stay at desks while working + point pops
osp = p("game_source/src/components/OfficeScene.tsx").read_text()
osp = osp.replace('export interface OfficeStaff {\n  name: string;', 'export interface OfficeStaff {\n  id?: string;\n  name: string;')
osp = osp.replace('  /** the showrunner\'s own painted office sprite */\n  sprite?: string;', '  /** the showrunner\'s own painted office sprite */\n  sprite?: string;\n  working?: boolean;\n  pulse?: { actorId: string; name: string; type: string; points: number; nonce: number };')
# Character args
osp = osp.replace('  tired,\n  onClick,\n  bobDelay,', '  tired,\n  working,\n  pulse,\n  onClick,\n  bobDelay,')
osp = osp.replace('  tired?: boolean;\n  onClick?: () => void;', '  tired?: boolean;\n  working?: boolean;\n  pulse?: { points: number; type: string; nonce: number };\n  onClick?: () => void;')
# insert desk/pulse before tired wisp
marker = '      {/* tired wisp */}'
desk_markup = '''      {working && (\n        <>\n          <span className="pointer-events-none absolute bottom-[2%] left-1/2 z-20 block h-[13%] w-[92%] -translate-x-1/2 rounded-sm border border-[#9b6a48]/70 bg-gradient-to-b from-[#9b6a48] to-[#5e3b24] shadow-lg" />\n          <span className="pointer-events-none absolute bottom-[12%] left-1/2 z-10 block h-[18%] w-[42%] -translate-x-1/2 rounded border border-cyanx/30 bg-abyss/90 shadow-[0_0_12px_rgba(59,225,255,.18)]">\n            <span className="absolute inset-x-[18%] bottom-[18%] h-[12%] rounded bg-cyanx/60 anim-blink" />\n          </span>\n        </>\n      )}\n      {pulse && (\n        <span key={pulse.nonce} className="pointer-events-none absolute -top-[8%] left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-lg border border-gold/50 bg-abyss/90 px-2 py-1 font-display text-[10px] font-extrabold text-gold shadow-xl anim-floaty">\n          +{pulse.points} {pulse.type.toUpperCase()}\n        </span>\n      )}\n\n'''
if marker not in osp: raise SystemExit('OfficeScene marker missing')
osp = osp.replace(marker, desk_markup + marker, 1)
# movement skips workers
osp = osp.replace('      const i = Math.floor(Math.random() * list.length);', '      const movable = list.map((_, i) => i).filter((i) => !cast[i]?.working);\n      if (!movable.length) return;\n      const i = movable[Math.floor(Math.random() * movable.length)];')
osp = osp.replace('  }, [bodies.length, zone]);', '  }, [bodies.length, zone, cast]);')
# pass props to Character
osp = osp.replace('              tired={c.tired}\n              bobDelay={i * 370}', '              tired={c.tired}\n              working={c.working}\n              pulse={c.pulse}\n              bobDelay={i * 370}')
p("game_source/src/components/OfficeScene.tsx").write_text(osp)

# ---------------------------------------------------------------- Poster: remove decorative SVG layer/laurels from full reveal, add clean accent
poster = p("game_source/src/components/Poster.tsx").read_text()
poster = poster.replace('        <PosterDecorationLayer design={design} />\n', '')
poster = poster.replace('            {design.hallOfFame && <Laurel side="l" />}\n', '')
poster = poster.replace('            {design.hallOfFame && <Laurel side="r" />}\n', '')
poster = poster.replace('      <div className="relative aspect-[4/5]">', '      <div className="relative aspect-[4/5]" style={{ boxShadow: `inset 0 0 0 1px ${design.primary.color}55, inset 0 -80px 80px rgba(6,5,14,.35)` }}>\n        <div className="pointer-events-none absolute inset-x-[8%] top-2 z-20 h-px" style={{ background: `linear-gradient(90deg, transparent, ${design.primary.color}, transparent)` }} />')
p("game_source/src/components/Poster.tsx").write_text(poster)

# ---------------------------------------------------------------- Tests for live rush model
p("game_source/src/engine/__tests__/gds-production.test.ts").write_text(r'''import { describe, expect, it, vi } from "vitest";
import { initialRun, startMilestoneRush, tickRushDay, respondRushBoost, crunchRush, RUSH_CRUNCH_COST } from "../state";
import { makeProject, type Draft } from "../projects";

const draft = (): Draft => ({ title:"Rush Test", medium:"tv", budget:"standard", scope:"standard", slot:"midnight", genres:["shonen"], audience:"teens", protag:"kai", protagName:"Kai", secondary:"s_ren", pet:"none", villain:"v_oni", arcs:[], sliders:[50,50,50], season:1 });

describe("continuous GDS-style production", () => {
  it("starts a live rush instead of resolving the milestone immediately", () => {
    const r = initialRun("Test", "producer");
    const pr = { ...makeProject(draft(), 0), milestone: "story" as const, progress: 1 };
    const run = { ...r, projects:[pr] };
    const out = startMilestoneRush(run, pr.id, { leadId:"showrunner", leadName:"Runner", skill:60, type:"story", cost:0, slider:65 });
    expect(out?.projects[0].rush?.daysWorked).toBe(0);
    expect(out?.projects[0].milestone).toBe("story");
    expect(out?.projects[0].draft.sliders[0]).toBe(65);
  });

  it("adds bounded lead points each day and completes after four days", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    let r = initialRun("Test", "producer");
    const pr = { ...makeProject(draft(), 0), milestone: "story" as const, progress: 1 };
    r = { ...r, projects:[pr] };
    r = startMilestoneRush(r, pr.id, { leadId:"showrunner", leadName:"Runner", skill:60, type:"story", cost:0, slider:50 })!;
    for (let i=0;i<4;i++) r = tickRushDay(r).run;
    expect(r.projects[0].points.story).toBeGreaterThan(0);
    expect(r.projects[0].rush).toBeNull();
    expect(r.projects[0].milestonesDone).toContain("story");
    vi.restoreAllMocks();
  });

  it("research boost spends RD and resolves the pending idea", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    let r = initialRun("Test", "producer");
    const pr = { ...makeProject(draft(), 0), milestone:"story" as const, rush:{ milestone:"story" as const, type:"story" as const, leadId:"showrunner", leadName:"Runner", skill:70, cost:0, slider:50, daysWorked:1, durationDays:4, pointsAdded:4, boostAsked:false, boostPrompt:{actorId:"showrunner",name:"Runner",skill:70,type:"story" as const}, crunchDays:0 } };
    r = { ...r, rd:50, projects:[pr] };
    const before = r.rd;
    r = respondRushBoost(r, pr.id, 0.8);
    expect(r.rd).toBeLessThan(before);
    expect(r.projects[0].rush?.boostPrompt).toBeNull();
    expect(r.projects[0].rush?.boostAsked).toBe(true);
    vi.restoreAllMocks();
  });

  it("crunch costs cash and powers the next two rush days", () => {
    let r = initialRun("Test", "producer");
    const pr = { ...makeProject(draft(), 0), milestone:"art" as const, rush:{ milestone:"art" as const, type:"art" as const, leadId:"showrunner", leadName:"Runner", skill:70, cost:0, slider:50, daysWorked:1, durationDays:4, pointsAdded:4, boostAsked:true, boostPrompt:null, crunchDays:0 } };
    r = { ...r, projects:[pr] };
    const cash = r.cash;
    r = crunchRush(r, pr.id);
    expect(r.cash).toBe(cash - RUSH_CRUNCH_COST);
    expect(r.projects[0].rush?.crunchDays).toBe(2);
  });
});
''')

print("Applied GDS-style continuous production loop and clean poster treatment")
