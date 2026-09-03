from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def path(rel): return ROOT / rel

def replace_once(rel, old, new):
    p = path(rel)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"Missing target in {rel}: {old[:100]!r}")
    p.write_text(s.replace(old, new, 1))

# ---------------------------------------------------------------- projects: split normal quality between daily visible pulses + weekly bank
replace_once("game_source/src/engine/projects.ts", "staffPoint(s, focus) * 0.07 *", "staffPoint(s, focus) * 0.035 *")

# ---------------------------------------------------------------- state: persistent rest cycle + daily studio work
replace_once("game_source/src/engine/state.ts", "  /** overseas licensing deal: +15% revenue until this week */\n  revBoostUntil: number;", "  /** employees who have exhausted their energy and are actively recuperating */\n  staffResting: Record<string, boolean>;\n  /** overseas licensing deal: +15% revenue until this week */\n  revBoostUntil: number;")
replace_once("game_source/src/engine/state.ts", "    researchJobs: [],\n    revBoostUntil: 0,", "    researchJobs: [],\n    staffResting: {},\n    revBoostUntil: 0,")
replace_once("game_source/src/engine/state.ts", "    researchJobs: Array.isArray(r.researchJobs) ? r.researchJobs : [],\n    arcCombos:", "    researchJobs: Array.isArray(r.researchJobs) ? r.researchJobs : [],\n    staffResting: r.staffResting && typeof r.staffResting === \"object\" ? r.staffResting : {},\n    arcCombos:")
# old live rush saves must not remain stuck behind a no-longer-rendered rush UI
replace_once("game_source/src/engine/state.ts", "projects: Array.isArray(r.projects) ? r.projects.map((pr) => ({ ...pr, rush: pr.rush ?? null })) : [],", "projects: Array.isArray(r.projects) ? r.projects.map((pr) => ({ ...pr, rush: null })) : [],")

# Weekly stamina is now handled by the visible daily energy cycle. Keep weekly XP/morale only.
p = path("game_source/src/engine/state.ts")
s = p.read_text()
s = s.replace("      const drain = Math.max(1, 3 - fx.staminaSave);\n      const rest = 9 + fx.staminaRest;\n", "")
s = s.replace("          nx.stamina = Math.max(12, nx.stamina - drain);\n", "")
s = s.replace("          nx.stamina = Math.max(12, nx.stamina - Math.max(1, drain - 1));\n", "")
s = s.replace("          nx.stamina = Math.min(100, nx.stamina + rest);\n", "")
# resting contract staff do not magically produce while wandering around recuperating
s = s.replace("const crew = staffArr.filter((s) => job.staffIds.includes(s.id));", "const crew = staffArr.filter((s) => job.staffIds.includes(s.id) && !(r.staffResting ?? {})[s.id]);")
p.write_text(s)

# Insert daily studio engine before legacy live-rush block.
p = path("game_source/src/engine/state.ts")
s = p.read_text()
anchor = "/* ------------------------------------------------------ live rush system */"
daily = r'''/* ---------------------------------------------------- daily studio work */
export interface DeskPulse {
  actorId: string;
  name: string;
  type: PointType;
  points: number;
  nonce: number;
  source?: "project" | "contract";
}

/**
 * One visible in-game day in the office. Staff assigned to real work spend
 * energy. When energy bottoms out they enter a recovery state, wander around
 * the office, and only return to their desk once they are comfortably charged.
 *
 * Normal show work also has a small real quality contribution here so the
 * bubbles over employees are truthful rather than decorative. The weekly
 * contribution in projects.ts is deliberately halved to keep long-run scoring
 * near its previous balance.
 */
export function tickStudioDay(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const pulses: DeskPulse[] = [];
  let projects = r.projects.map((p) => ({ ...p, points: { ...p.points } }));
  const resting = { ...(r.staffResting ?? {}) };
  const fx = facilityFX(r.facilities);

  const staff = r.staff.map((st0) => {
    let st = { ...st0 };
    const project = projectOfStaff(projects, st.id);
    const contract = (r.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));
    const projectFocus = project && !project.milestone ? (project.stage === "concept" || project.stage === "preprod" ? "story" : project.stage === "animation" ? "art" : project.stage === "sound" ? "sound" : null) : null;
    const busy = !!projectFocus || !!contract;

    if (resting[st.id]) {
      st.stamina = Math.min(100, st.stamina + 22 + fx.staminaRest);
      if (st.stamina >= 82) delete resting[st.id];
      return st;
    }

    if (!busy) {
      st.stamina = Math.min(100, st.stamina + 13 + fx.staminaRest);
      return st;
    }

    const drain = Math.max(5, 9 - fx.staminaSave);
    st.stamina = Math.max(0, st.stamina - drain);
    if (st.stamina <= 0) {
      resting[st.id] = true;
      return st;
    }

    if (project && projectFocus) {
      const team = r.staff.filter((x) => project.staffIds.includes(x.id));
      const mod = personMod(st, project, team, { bonds: r.bonds });
      const chance = Math.max(0.08, Math.min(0.94, (staffPoint(st, projectFocus) / 200) * mod.out * fx.pointMult[projectFocus]));
      if (Math.random() < chance) {
        projects = projects.map((p) => p.id === project.id ? { ...p, points: { ...p.points, [projectFocus]: p.points[projectFocus] + 1 } } : p);
        pulses.push({ actorId: st.id, name: st.name, type: projectFocus, points: 1, nonce: Date.now() + pulses.length, source: "project" });
      }
    } else if (contract) {
      const pts = Math.max(1, Math.round(staffPoint(st, contract.contract.type) / 32));
      pulses.push({ actorId: st.id, name: st.name, type: contract.contract.type, points: pts, nonce: Date.now() + pulses.length, source: "contract" });
    }
    return st;
  });

  return { run: { ...r, projects, staff, staffResting: resting }, pulses, attention: false };
}

'''
# Existing DeskPulse declaration would conflict; remove it from the old block while retaining old exported functions for compatibility/tests until cleanup.
old_decl = '''export interface DeskPulse {\n  actorId: string;\n  name: string;\n  type: PointType;\n  points: number;\n  nonce: number;\n}\n\n'''
if anchor not in s: raise SystemExit("state anchor missing")
s = s.replace(anchor, daily + anchor, 1)
s = s.replace(old_decl, "", 1)
p.write_text(s)

# ---------------------------------------------------------------- App: daily clock, no live-rush state/modal
p = path("game_source/src/App.tsx")
s = p.read_text()
for token in ["  crunchRush,\n", "  respondRushBoost,\n", "  startMilestoneRush,\n", "  tickRushDay,\n"]:
    s = s.replace(token, "")
s = s.replace("  initialRun,\n", "  initialRun,\n  tickStudioDay,\n")
s = s.replace('import type { MilestoneId, MilestoneOutcome, RushAssignment } from "./engine/projects";', 'import type { MilestoneId, MilestoneOutcome } from "./engine/projects";')
s = s.replace('import RushBoostModal from "./components/RushBoostModal";\n', '')
s = s.replace("const daily = tickRushDay(current);", "const daily = tickStudioDay(current);")
# Remove obsolete callback block.
start = s.find("  const beginRush = useCallback")
end = s.find("  /* --------------------------------------------------------- release */", start)
if start < 0 or end < 0: raise SystemExit("App rush callback block missing")
s = s[:start] + s[end:]
s = s.replace("            onRushCrunch={pushRush}\n", "")
s = s.replace("            onStartRush={beginRush}\n", "")
s = s.replace('        {screen === "office" && run && <RushBoostModal run={run} onRespond={answerRushBoost} />}\n\n', '')
p.write_text(s)

# ---------------------------------------------------------------- Produce: instant specialist reveal with count-up + optional RD idea
p = path("game_source/src/components/Produce.tsx")
s = p.read_text()
s = s.replace('import { useMemo, useState } from "react";', 'import { useEffect, useMemo, useRef, useState } from "react";')
s = s.replace('import type { MilestoneId, MilestoneOutcome, Project, RushAssignment } from "../engine/projects";', 'import type { MilestoneId, MilestoneOutcome, Project, RushAssignment } from "../engine/projects";\nimport { rushBoostPoint, rushResearchCost } from "../engine/studioOps";')
s = s.replace("export default function Produce({ run, project, milestone, onDone, onStartRush, onBack }:", "export default function Produce({ run, project, milestone, onDone, onBack }:")
s = s.replace("  onStartRush: (a: RushAssignment) => void;\n", "")
s = s.replace('const [mode, setMode] = useState<"plan" | "assign">(isEdit ? "plan" : "plan");', 'const [mode, setMode] = useState<"plan" | "assign" | "reveal">("plan");')
# Add reveal state after finalNames state closes.
needle = '''  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const team = useMemo(() => run.staff.filter((s) => project.staffIds.includes(s.id)), [run.staff, project.staffIds]);\n\n'''
insert = '''  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const team = useMemo(() => run.staff.filter((s) => project.staffIds.includes(s.id)), [run.staff, project.staffIds]);\n  const [crunch, setCrunch] = useState(false);\n  const [shown, setShown] = useState(0);\n  const shownRef = useRef(0);\n  const [reveal, setReveal] = useState<null | {\n    assignment: RushAssignment; base: number; total: number; spent: number; issues: number; rdSpent: number;\n    idea: null | { name: string; skill: number }; ideaDone: boolean; message?: string;\n  }>(null);\n\n  useEffect(() => {\n    if (mode !== "reveal" || !reveal) return;\n    const from = shownRef.current;\n    const to = reveal.total;\n    const started = performance.now();\n    const duration = Math.max(700, Math.min(1900, 850 + Math.abs(to - from) * 42));\n    let raf = 0;\n    const frame = (now: number) => {\n      const t = Math.min(1, (now - started) / duration);\n      const eased = 1 - Math.pow(1 - t, 4);\n      const n = Math.round(from + (to - from) * eased);\n      shownRef.current = n;\n      setShown(n);\n      if (t < 1) raf = requestAnimationFrame(frame);\n    };\n    raf = requestAnimationFrame(frame);\n    return () => cancelAnimationFrame(raf);\n  }, [mode, reveal?.total]);\n\n'''
if needle not in s: raise SystemExit("Produce runner/team needle missing")
s = s.replace(needle, insert, 1)
# Replace entire non-edit tail.
start = s.find("  const Icon = phase!.icon;")
if start < 0: raise SystemExit("Produce non-edit tail missing")
new_tail = r'''  const Icon = phase!.icon;
  const candidates = [...team].sort((a, b) => staffPoint(b, phase!.type) - staffPoint(a, phase!.type));
  const outsourceCost = 18_000 + phase!.idx * 6_000;
  const crunchCost = 9_000;

  const rollRush = (skill: number) => {
    const s = Math.max(1, Math.min(99, skill));
    const lo = Math.max(1, Math.floor(s * 0.035));
    const hi = Math.max(lo + 1, Math.ceil(s * 0.105));
    let total = 0;
    for (let i = 0; i < 4; i++) total += lo + Math.floor(Math.random() * (hi - lo + 1));
    return total;
  };

  const choose = (a: RushAssignment) => {
    sfx.reveal();
    let base = rollRush(a.skill);
    if (crunch) base = Math.max(base + 1, Math.round(base * 1.25));
    const issueChance = Math.max(0.015, 0.11 - a.skill * 0.0009) * (crunch ? 1.8 : 1);
    const ideaPool = [
      ...team.map((st) => ({ name: st.name, skill: Math.round(staffPoint(st, phase!.type)) })),
      { name: runner.name, skill: Math.min(99, 48 + run.showsMade * 2) },
    ];
    const idea = Math.random() < 0.28 && ideaPool.length ? ideaPool[Math.floor(Math.random() * ideaPool.length)] : null;
    shownRef.current = 0;
    setShown(0);
    setReveal({ assignment: a, base, total: base, spent: a.cost + (crunch ? crunchCost : 0), issues: Math.random() < issueChance ? 1 : 0, rdSpent: 0, idea, ideaDone: !idea });
    setMode("reveal");
  };

  const answerIdea = (chance: number | null) => {
    if (!reveal?.idea) return;
    if (chance === null) {
      setReveal({ ...reveal, ideaDone: true, message: `${reveal.idea.name}'s idea is parked. The rush stays on plan.` });
      return;
    }
    const cost = rushResearchCost(reveal.idea.skill, chance);
    if (run.rd < cost) return;
    const success = Math.random() < chance;
    const reward = success ? rushBoostPoint(reveal.idea.skill) : 0;
    setReveal({
      ...reveal,
      total: reveal.total + reward,
      issues: reveal.issues + (success ? 0 : 1),
      rdSpent: reveal.rdSpent + cost,
      ideaDone: true,
      message: success ? `BREAKTHROUGH! +${reward} ${POINT_LABEL[phase!.type]}` : `The experiment misses. +1 editing note.`,
    });
  };

  const lockRush = () => {
    if (!reveal) return;
    const points = { story: 0, art: 0, sound: 0 };
    points[phase!.type] = reveal.total;
    sfx.fanfare();
    onDone({
      points,
      issues: reveal.issues,
      spent: reveal.spent,
      rdGained: 0,
      rdSpent: reveal.rdSpent,
      slider: { index: phase!.idx, value: slider },
    });
  };

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
            <p className="mt-1 text-xs text-paper/55">Set the balance, appoint one specialist, then the rush resolves as a short studio spotlight. Their skill sets the RNG floor and ceiling.</p>
          </div>
          <div className="mt-4 ink-card p-4">
            <div className="flex items-center gap-2"><span className="rounded-lg bg-panel3 p-2" style={{ color: POINT_COLOR[phase!.type] }}><Icon size={18} /></span><div><div className="font-display text-sm font-extrabold">{phase!.name}</div><div className="text-[10px] text-paper/40">One lead · one bounded roll · one big creative injection</div></div></div>
            <div className="mt-4 flex justify-between text-[10px] font-bold"><span className="text-neon2">{phase!.a}</span><span className="text-cyanx">{phase!.b}</span></div>
            <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(+e.target.value)} className="ink-range relative z-10" style={{ "--p": `${slider}%` } as React.CSSProperties} />
            <div className="mt-1 flex justify-between text-[10px] text-paper/50"><span>{slider}%</span><span>{100-slider}%</span></div>
          </div>
          <div className="mt-4 flex gap-2"><Btn variant="ghost" onClick={onBack}><ChevronLeft size={16}/> LATER</Btn><Btn big variant="primary" className="flex-1" onClick={() => setMode("assign")}>ASSIGN RUSH LEAD</Btn></div>
        </div>
      ) : mode === "assign" ? (
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4">
          <div className="text-center"><div className="text-[11px] tracking-[0.4em] text-cyanx">{phase!.name}</div><h2 className="font-display text-3xl font-extrabold">WHO GETS THE SPOTLIGHT?</h2><p className="mt-1 text-xs text-paper/55">Higher relevant skill raises both the minimum and maximum result. The reveal is instant and does not consume calendar days.</p></div>
          <button onClick={() => setCrunch((v) => !v)} disabled={run.cash < crunchCost} className={cn("btn-press mx-auto mt-3 flex max-w-xl items-center gap-2 rounded-xl border px-3 py-2 text-left", crunch ? "border-neon bg-neon/10" : "border-line bg-panel2/60", run.cash < crunchCost && "opacity-40") }>
            <span className="text-lg">⚡</span><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold">{crunch ? "CRUNCH ENABLED" : "OPTIONAL CRUNCH"}</span><span className="block text-[9px] text-paper/50">+25% rush output · £9,000 · roughly doubles mistake risk</span></span><span className="font-display text-xs font-extrabold text-neon">{crunch ? "ON" : "OFF"}</span>
          </button>
          <div className="mt-4 space-y-2">
            {candidates.map((st) => {
              const skill = Math.round(staffPoint(st, phase!.type) * (0.72 + st.stamina / 360));
              return <button key={st.id} onClick={() => choose({ leadId: st.id, leadName: st.name, skill, type: phase!.type, cost: 0, slider })} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-cyanx/60"><span className="rounded-lg bg-panel3 p-2 text-cyanx"><UserRound size={17}/></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{st.name}</div><div className="text-[10px] text-paper/50">{POINT_LABEL[phase!.type]} {staffPoint(st, phase!.type)} · energy {Math.round(st.stamina)}%</div></div><div className="text-right"><div className="font-display text-lg font-extrabold" style={{color:POINT_COLOR[phase!.type]}}>SKILL {skill}</div><div className="text-[9px] text-paper/40">bounded RNG</div></div></button>;
            })}
            <button onClick={() => choose({ leadId: "showrunner", leadName: runner.name, skill: Math.min(99, 44 + run.showsMade * 3), type: phase!.type, cost: 0, slider })} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-gold/60"><Portrait img={runner.portrait} name={runner.name} className="h-10 w-10 rounded-lg"/><div className="flex-1"><div className="text-sm font-bold">{runner.name} (showrunner)</div><div className="text-[10px] text-paper/50">Free · improves with studio experience</div></div></button>
            <button disabled={run.cash < outsourceCost + (crunch ? crunchCost : 0)} onClick={() => choose({ leadId: `outsource:${milestone}`, leadName: "Famous Studio", skill: 78, type: phase!.type, cost: outsourceCost, slider })} className={cn("btn-press ink-card flex w-full items-center gap-3 border-gold/40 p-3 text-left", run.cash < outsourceCost + (crunch ? crunchCost : 0) && "pointer-events-none opacity-40")}><span className="rounded-lg bg-panel3 p-2 text-gold"><Building2 size={17}/></span><div className="flex-1"><div className="text-sm font-bold text-gold">Outsource the rush</div><div className="text-[10px] text-paper/50">Reliable high skill without using an employee.</div></div><span className="font-display text-sm font-extrabold text-gold">{formatGBP(outsourceCost)}</span></button>
          </div>
          <Btn variant="ghost" className="mt-3" onClick={() => setMode("plan")}><ChevronLeft size={16}/> DIRECTION</Btn>
        </div>
      ) : reveal ? (
        <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(59,225,255,.12),transparent_44%)]" />
          <div className="anim-pop w-full max-w-xl text-center">
            <div className="text-[10px] font-extrabold tracking-[0.45em] text-paper/45">RUSH SPOTLIGHT</div>
            <div className="mt-1 truncate font-display text-2xl font-extrabold">{reveal.assignment.leadName}</div>
            <div className="mt-1 text-xs text-paper/50">SKILL {reveal.assignment.skill} · {phase!.name}</div>
            <div className="relative mx-auto mt-6 flex h-48 w-48 items-center justify-center rounded-full border border-line bg-panel/80 shadow-2xl sm:h-56 sm:w-56">
              <div className="absolute inset-3 rounded-full border border-cyanx/20" />
              <div className="absolute inset-x-7 bottom-7 h-2 overflow-hidden rounded-full bg-panel3"><div className="h-full rounded-full transition-all duration-150" style={{ width: `${Math.min(100, reveal.total ? (shown / reveal.total) * 100 : 0)}%`, background: POINT_COLOR[phase!.type] }} /></div>
              <div><div className="font-display text-6xl font-extrabold tabular-nums" style={{ color: POINT_COLOR[phase!.type] }}>+{shown}</div><div className="mt-1 text-[10px] font-extrabold tracking-[0.25em] text-paper/45">{POINT_LABEL[phase!.type].toUpperCase()}</div></div>
            </div>
            {shown === reveal.total && !reveal.ideaDone && reveal.idea ? (
              <div className="anim-pop mt-5 rounded-xl border border-viol/50 bg-viol/10 p-3 text-left">
                <div className="text-[10px] font-extrabold tracking-widest text-viol">💡 {reveal.idea.name.toUpperCase()} HAS AN IDEA</div>
                <div className="mt-1 text-xs text-paper/60">Back the experiment with Research Data. More RD raises confidence; failure adds an editing note.</div>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {[0.2, 0.5, 0.8].map((chance) => { const cost = rushResearchCost(reveal.idea!.skill, chance); return <button key={chance} disabled={run.rd < cost} onClick={() => answerIdea(chance)} className="btn-press rounded-lg border border-viol/40 bg-panel2 px-2 py-2 text-[10px] font-bold disabled:opacity-35"><span className="block text-viol">{Math.round(chance*100)}%</span><span className="text-[9px] text-paper/45">{cost} RD</span></button>; })}
                  <button onClick={() => answerIdea(null)} className="btn-press rounded-lg border border-line bg-panel2 px-2 py-2 text-[10px] font-bold text-paper/55">PASS</button>
                </div>
              </div>
            ) : shown === reveal.total && reveal.ideaDone ? (
              <div className="anim-pop mt-5">
                {reveal.message && <div className={cn("mb-3 text-xs font-bold", reveal.message.startsWith("BREAKTHROUGH") ? "text-mint" : "text-gold")}>{reveal.message}</div>}
                {reveal.issues > 0 && <div className="mb-2 text-[10px] font-bold text-neon">+{reveal.issues} EDITING NOTE{reveal.issues > 1 ? "S" : ""}</div>}
                <Btn big variant="primary" className="min-w-56" onClick={lockRush}>LOCK IN +{reveal.total}</Btn>
              </div>
            ) : <div className="mt-5 text-[10px] font-bold tracking-[0.3em] text-paper/35 animate-pulse">CALCULATING CONTRIBUTION…</div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
'''
s = s[:start] + new_tail
p.write_text(s)

# ---------------------------------------------------------------- OfficeScene: better workstation, energy HUD, recovery walking
p = path("game_source/src/components/OfficeScene.tsx")
s = p.read_text()
s = s.replace("  working?: boolean;\n  pulse?:", "  working?: boolean;\n  energy?: number;\n  resting?: boolean;\n  pulse?:")
s = s.replace("  working,\n  pulse,", "  working,\n  energy,\n  resting,\n  pulse,")
s = s.replace("  working?: boolean;\n  pulse?: { points", "  working?: boolean;\n  energy?: number;\n  resting?: boolean;\n  pulse?: { points")
old_work = '''      {working && (\n        <>\n          <span className="pointer-events-none absolute bottom-[2%] left-1/2 z-20 block h-[13%] w-[92%] -translate-x-1/2 rounded-sm border border-[#9b6a48]/70 bg-gradient-to-b from-[#9b6a48] to-[#5e3b24] shadow-lg" />\n          <span className="pointer-events-none absolute bottom-[12%] left-1/2 z-10 block h-[18%] w-[42%] -translate-x-1/2 rounded border border-cyanx/30 bg-abyss/90 shadow-[0_0_12px_rgba(59,225,255,.18)]">\n            <span className="absolute inset-x-[18%] bottom-[18%] h-[12%] rounded bg-cyanx/60 anim-blink" />\n          </span>\n        </>\n      )}\n      {pulse && (\n        <span key={pulse.nonce} className="pointer-events-none absolute -top-[8%] left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-lg border border-gold/50 bg-abyss/90 px-2 py-1 font-display text-[10px] font-extrabold text-gold shadow-xl anim-floaty">\n          +{pulse.points} {pulse.type.toUpperCase()}\n        </span>\n      )}\n'''
new_work = '''      {working && (\n        <>\n          {/* compact production desk: monitor, stand and drawing tablet — no faux laptop/SVG */}\n          <span className="pointer-events-none absolute bottom-[1%] left-1/2 z-20 block h-[10%] w-[94%] -translate-x-1/2 rounded-[3px] border border-[#8a6248]/70 bg-[#674630] shadow-[0_5px_12px_rgba(0,0,0,.45)]" />\n          <span className="pointer-events-none absolute bottom-[10%] left-[51%] z-10 block h-[20%] w-[49%] -translate-x-1/2 rounded-[3px] border border-paper/20 bg-[#17182a] shadow-[0_0_10px_rgba(59,225,255,.16)]">\n            <span className="absolute inset-[10%] overflow-hidden rounded-[2px] bg-[#252844]">\n              <span className="absolute left-[8%] right-[8%] top-[18%] h-[8%] rounded bg-cyanx/65" />\n              <span className="absolute left-[8%] right-[25%] top-[40%] h-[7%] rounded bg-neon/55" />\n              <span className="absolute bottom-[18%] left-[8%] right-[12%] h-[6%] rounded bg-gold/45" />\n            </span>\n          </span>\n          <span className="pointer-events-none absolute bottom-[7%] left-1/2 z-20 block h-[5%] w-[5%] -translate-x-1/2 bg-paper/25" />\n          <span className="pointer-events-none absolute bottom-[3%] left-[48%] z-30 block h-[4%] w-[34%] -translate-x-1/2 -skew-x-6 rounded-[2px] border border-paper/10 bg-[#222235]" />\n        </>\n      )}\n      {energy !== undefined && (\n        <span className="pointer-events-none absolute -top-[5%] left-1/2 z-40 block w-[74%] -translate-x-1/2">\n          <span className="mb-[2px] flex items-center justify-between text-[7px] font-extrabold text-paper/70"><span>{resting ? "RECOVERING" : working ? "ENERGY" : "REST"}</span><span>{Math.round(energy)}%</span></span>\n          <span className="block h-[5px] overflow-hidden rounded-full border border-paper/20 bg-abyss/90"><span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, energy))}%`, background: energy < 25 ? "#ff4d6d" : energy < 55 ? "#ffd166" : "#73f2b5" }} /></span>\n        </span>\n      )}\n      {pulse && (\n        <span key={pulse.nonce} className="pointer-events-none absolute -top-[20%] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/50 bg-abyss/95 px-2 py-1 font-display text-[10px] font-extrabold text-gold shadow-xl anim-floaty">\n          +{pulse.points} {pulse.type.toUpperCase()}\n        </span>\n      )}\n'''
if old_work not in s: raise SystemExit("OfficeScene workstation block missing")
s = s.replace(old_work, new_work, 1)
# Force a recovered employee to walk back to their home desk immediately.
move_anchor = "  /* every so often somebody wanders off and comes back */\n"
return_effect = '''  /* employees who finish recovering walk straight back to their workstation */\n  useEffect(() => {\n    setBodies((prev) => prev.map((b, i) => {\n      if (!cast[i]?.working) return b;\n      const dist = Math.hypot(b.home.x - b.pos.x, b.home.y - b.pos.y);\n      if (dist < 0.6) return b;\n      return { ...b, target: { ...b.home }, pos: { ...b.home }, dur: Math.max(1.2, dist / 5.5), flip: b.home.x < b.pos.x };\n    }));\n  }, [cast.map((c) => !!c.working).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps\n\n'''
if move_anchor not in s: raise SystemExit("OfficeScene movement anchor missing")
s = s.replace(move_anchor, return_effect + move_anchor, 1)
s = s.replace("              working={c.working}\n              pulse={c.pulse}", "              working={c.working}\n              energy={c.energy}\n              resting={c.resting}\n              pulse={c.pulse}")
p.write_text(s)

# ---------------------------------------------------------------- Office: map contract work/resting + visible contract guidance/progress
p = path("game_source/src/components/Office.tsx")
s = p.read_text()
s = s.replace('import { type Commission } from "../engine/market";', 'import { type Commission } from "../engine/market";\nimport { contractWeeklyOutput, showrunnerContractSkill } from "../engine/studioOps";')
s = s.replace("  onRushCrunch,\n", "")
s = s.replace("  onRushCrunch: (projectId: string) => void;\n", "")
s = s.replace('boss={{ id: "showrunner", name: runner.name.split(" ")[0], color: "#ffd166", sprite: runner.sprite, working: projActive.length > 0, pulse: workPulses.find((x) => x.actorId === "showrunner") }}', 'boss={{ id: "showrunner", name: runner.name.split(" ")[0], color: "#ffd166", sprite: runner.sprite, working: projActive.length > 0 || run.contractJobs.some((j) => j.showrunner), pulse: workPulses.find((x) => x.actorId === "showrunner") }}')
old_map = '''          tired: s.stamina < 45,\n          look: workerLookIndex(s),\n          working: projActive.some((pr) => pr.staffIds.includes(s.id)),\n          pulse: workPulses.find((x) => x.actorId === s.id),\n'''
new_map = '''          tired: !!run.staffResting?.[s.id] || s.stamina < 28,\n          look: workerLookIndex(s),\n          working: !run.staffResting?.[s.id] && s.stamina > 0 && (projActive.some((pr) => pr.staffIds.includes(s.id)) || run.contractJobs.some((j) => j.staffIds.includes(s.id))),\n          energy: s.stamina,\n          resting: !!run.staffResting?.[s.id],\n          pulse: workPulses.find((x) => x.actorId === s.id),\n'''
if old_map not in s: raise SystemExit("Office staff map missing")
s = s.replace(old_map, new_map, 1)
s = s.replace("            onRushCrunch={onRushCrunch}\n", "")
# Jobs button badge active count.
s = s.replace('<Briefcase size={15} /> JOBS\n          </Btn>', '<Briefcase size={15} /> JOBS{run.contractJobs.length > 0 && <span className="text-[8px] text-mint">{run.contractJobs.length}</span>}\n          </Btn>')
# Add compact active-contract overlay after OfficeScene.
scene_end = '''        onDeskClick={() => setModal("staff")}\n      />\n'''
overlay = '''        onDeskClick={() => setModal("staff")}\n      />\n      {run.contractJobs.length > 0 && (\n        <div className="pointer-events-none absolute bottom-[54px] left-2 z-20 hidden w-56 rounded-lg border border-cyanx/35 bg-abyss/88 p-2 shadow-xl backdrop-blur-sm sm:block">\n          <div className="mb-1 flex items-center gap-1 text-[8px] font-extrabold tracking-widest text-cyanx"><Briefcase size={10}/> ACTIVE CONTRACT{run.contractJobs.length > 1 ? "S" : ""}</div>\n          {run.contractJobs.slice(0, 2).map((job) => (\n            <div key={job.id} className="mt-1">\n              <div className="flex items-center justify-between gap-2 text-[9px]"><span className="truncate font-bold text-paper/75">{job.contract.name}</span><span className="shrink-0 text-mint">{job.progress}/{job.contract.target}</span></div>\n              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-panel3"><div className="h-full rounded-full bg-cyanx" style={{ width: `${Math.min(100, job.progress / Math.max(1, job.contract.target) * 100)}%` }} /></div>\n            </div>\n          ))}\n        </div>\n      )}\n'''
if scene_end not in s: raise SystemExit("OfficeScene closing anchor missing")
s = s.replace(scene_end, overlay, 1)
# Replace intro text in contract modal and insert active jobs.
old_contract_intro = '''          <p className="mb-3 text-xs text-paper/60">\n            Small jobs for other studios. Quick money and research data — the classic way to keep the lights on between shows.\n          </p>\n          <div className="space-y-2">\n'''
new_contract_intro = '''          <div className="mb-3 rounded-xl border border-cyanx/35 bg-cyanx/5 p-3">\n            <div className="text-[10px] font-extrabold tracking-widest text-cyanx">HOW CONTRACTS WORK</div>\n            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-paper/60 sm:grid-cols-4">\n              <div><b className="text-paper">1 · PICK</b><br/>Choose up to 3 contributors.</div>\n              <div><b className="text-paper">2 · COMMIT</b><br/>They are unavailable for shows while assigned.</div>\n              <div><b className="text-paper">3 · WORK</b><br/>Skill + energy generate contract progress each in-game week.</div>\n              <div><b className="text-paper">4 · DELIVER</b><br/>Hit the target before the deadline for cash + RD. Jobs can finish early.</div>\n            </div>\n          </div>\n          {run.contractJobs.length > 0 && (\n            <div className="mb-4">\n              <div className="mb-2 text-[10px] font-extrabold tracking-widest text-mint">ACTIVE JOBS</div>\n              <div className="space-y-2">\n                {run.contractJobs.map((job) => {\n                  const crew = run.staff.filter((st) => job.staffIds.includes(st.id));\n                  const runnerSkill = job.showrunner ? showrunnerContractSkill(run.showrunner, run.showsMade, job.contract.type) : 0;\n                  const rate = contractWeeklyOutput(job.contract, crew.filter((st) => !run.staffResting?.[st.id]), run.research, runnerSkill);\n                  const weeksLeft = Math.max(0, job.dueWeek - run.week);\n                  const projected = job.progress + rate * weeksLeft;\n                  return (\n                    <div key={job.id} className="ink-card p-3">\n                      <div className="flex items-center gap-2"><Briefcase size={14} className="text-cyanx"/><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{job.contract.name}</div><div className="text-[9px] text-paper/45">{[...crew.map((st) => st.name), ...(job.showrunner ? [runner.name] : [])].join(", ")} · due {dateLabel(job.dueWeek)}</div></div><div className="text-right"><div className="font-display text-sm font-extrabold text-mint">{job.progress}/{job.contract.target}</div><div className="text-[8px] text-paper/40">≈ +{rate}/wk</div></div></div>\n                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel3"><div className="h-full rounded-full bg-cyanx transition-all" style={{ width: `${Math.min(100, job.progress / Math.max(1, job.contract.target) * 100)}%` }} /></div>\n                      <div className={cn("mt-1 text-[9px] font-bold", projected >= job.contract.target ? "text-mint" : "text-gold")}>{projected >= job.contract.target ? `On pace to deliver${weeksLeft ? ` within ${weeksLeft} wk` : ""}.` : `At current pace: ${projected}/${job.contract.target} by deadline — add stronger staff next time.`}</div>\n                    </div>\n                  );\n                })}\n              </div>\n            </div>\n          )}\n          <div className="mb-2 text-[10px] font-extrabold tracking-widest text-paper/45">AVAILABLE CONTRACTS</div>\n          <div className="space-y-2">\n'''
if old_contract_intro not in s: raise SystemExit("contract intro missing")
s = s.replace(old_contract_intro, new_contract_intro, 1)
p.write_text(s)

# ---------------------------------------------------------------- Projects: no live rush card/crunch callback after instant reveal
p = path("game_source/src/components/Projects.tsx")
s = p.read_text()
# remove p.rush block
s = re.sub(r'\n      \{p\.rush && \(\n        <div className="mt-2 rounded-xl border border-cyanx/40.*?\n      \)\}', '', s, count=1, flags=re.S)
s = s.replace("  onRushCrunch,\n", "")
s = s.replace("  onRushCrunch: (projectId: string) => void;\n", "")
s = s.replace("          onRushCrunch={onRushCrunch}\n", "")
p.write_text(s)

# ---------------------------------------------------------------- ContractJob: make mechanics impossible to miss
p = path("game_source/src/components/ContractJob.tsx")
s = p.read_text()
old = '<p className="mt-1 text-xs text-paper/65">Pick up to three contributors. Staff are unavailable elsewhere until it finishes; your showrunner can personally take one seat too.</p>'
new = '<p className="mt-1 text-xs text-paper/65">This is background work, not an instant payout. Assign up to three people, return to the office, then watch the contract fill as weeks pass. Assigned staff cannot work on your shows until the job delivers or misses its deadline.</p>'
if old not in s: raise SystemExit("ContractJob paragraph missing")
s = s.replace(old, new, 1)
projection = '<div className="mt-1 text-[10px] text-paper/55">Estimate uses current skill, stamina, showrunner contribution and Digital Pipeline research. The job can finish early.</div>'
projection_new = '<div className="mt-1 text-[10px] text-paper/55">Each in-game week, selected contributors turn their relevant skill + current energy into progress. Digital Pipeline improves output. Reach the target early and the job pays immediately; miss the deadline and you only recover a little learning RD.</div>'
s = s.replace(projection, projection_new, 1)
p.write_text(s)

# ---------------------------------------------------------------- tests: replace old continuous-rush expectations with energy/day tests
p = path("game_source/src/engine/__tests__/gds-production.test.ts")
p.write_text('''import { describe, expect, it, vi } from "vitest";\nimport { initialRun, tickStudioDay } from "../state";\nimport { makeProject } from "../projects";\nimport type { Draft } from "../data";\n\nconst draft = (): Draft => ({ title:"Desk Test", medium:"tv", budget:"standard", scope:"standard", slot:"midnight", genres:["shonen"], audience:"teens", protag:"kai", protagName:"Kai", secondary:"s_ren", pet:"none", villain:"v_oni", arcs:[], sliders:[50,50,50], season:1 });\n\ndescribe("visible daily studio work", () => {\n  it("drains energy while assigned and eventually sends an employee to recover", () => {\n    let r = initialRun("Test", "producer");\n    const staff = { ...r.candidates[0], stamina: 12 };\n    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };\n    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1) };\n    r = tickStudioDay(r).run;\n    r = tickStudioDay(r).run;\n    expect(r.staffResting[staff.id]).toBe(true);\n    expect(r.staff[0].stamina).toBe(0);\n  });\n\n  it("recovers an exhausted employee before returning them to work", () => {\n    let r = initialRun("Test", "producer");\n    const staff = { ...r.candidates[0], stamina: 0 };\n    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };\n    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1), staffResting:{ [staff.id]: true } };\n    for (let i=0;i<4;i++) r = tickStudioDay(r).run;\n    expect(r.staff[0].stamina).toBeGreaterThanOrEqual(82);\n    expect(r.staffResting[staff.id]).toBeUndefined();\n  });\n\n  it("ordinary desk bubbles can add real project quality", () => {\n    vi.spyOn(Math, "random").mockReturnValue(0);\n    let r = initialRun("Test", "producer");\n    const staff = { ...r.candidates[0], story:99, stamina:100 };\n    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };\n    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1) };\n    const out = tickStudioDay(r);\n    expect(out.pulses.length).toBeGreaterThan(0);\n    expect(out.run.projects[0].points.story).toBeGreaterThan(0);\n    vi.restoreAllMocks();\n  });\n});\n''')
# office-shell regression no longer expects live rush crunch wire
p = path("game_source/src/engine/__tests__/office-shell.test.ts")
s = p.read_text()
s = s.replace('  it("wires live rush crunch into the Projects board", () => {\n    expect(office).toContain("onRushCrunch={onRushCrunch}");\n  });\n', '  it("shows persistent staff energy in the office scene", () => {\n    expect(office).toContain("energy: s.stamina");\n    expect(office).toContain("staffResting");\n  });\n')
p.write_text(s)

print("Applied staff energy loop, truthful desk pulses, instant rush reveal, and visible contracts")
