from __future__ import annotations

from pathlib import Path
from io import BytesIO
import base64
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def text(rel: str) -> str:
    return (ROOT / rel).read_text()

def write(rel: str, value: str) -> None:
    (ROOT / rel).write_text(value)

def replace_once(rel: str, old: str, new: str) -> None:
    s = text(rel)
    if old not in s:
        raise SystemExit(f"missing replacement anchor in {rel}: {old[:120]!r}")
    write(rel, s.replace(old, new, 1))

def regex_once(rel: str, pattern: str, repl: str) -> None:
    s = text(rel)
    out, n = re.subn(pattern, repl, s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"regex replacement count {n} in {rel}: {pattern[:120]!r}")
    write(rel, out)

projects = "game_source/src/engine/projects.ts"
replace_once(projects, "  points: Points;\n  issues: number;", "  points: Points;\n  /** quality already banked by live desk bubbles since the last week boundary */\n  liveQuality?: Points;\n  issues: number;")
replace_once(projects, '    points: { story: 0, art: 0, sound: 0 },\n    issues: 0,', '    points: { story: 0, art: 0, sound: 0 },\n    liveQuality: { story: 0, art: 0, sound: 0 },\n    issues: 0,')
replace_once(projects, '    const p = { ...p0, points: { ...p0.points } };', '    const p = { ...p0, points: { ...p0.points }, liveQuality: { story: 0, art: 0, sound: 0, ...(p0.liveQuality ?? {}) } };')
regex_once(projects, r'''      if \(focus\) \{\n        for \(const s of team\) \{\n          const m = mods\?\.\(s, p, team\);\n          p\.points\[focus\] \+= Math\.round\(staffPoint\(s, focus\) \* 0\.07 \* \(m \? m\.out : staminaF\(s\)\) \* fx\.pointMult\[focus\] \* qualityMult\);\n        \}\n      \}\n      if \(p\.stage === "post"\)''', '''      if (focus) {
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
      if (p.stage === "post")''')
replace_once(projects, '    milestonesDone: [...p.milestonesDone, done],\n    points: {', '    milestonesDone: [...p.milestonesDone, done],\n    liveQuality: { story: 0, art: 0, sound: 0 },\n    points: {')

ops = "game_source/src/engine/studioOps.ts"
replace_once(ops, "  progress: number;\n}", "  progress: number;\n  /** progress already produced by live desk bubbles in the current week */\n  liveProgressThisWeek?: number;\n}")
replace_once(ops, '''export const projectedContractTotal = (contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0) =>
  contractWeeklyOutput(contract, crew, research, showrunnerSkill) * contract.weeks;
''', '''/** Approximate live desk-bubble output per in-game day for the Jobs UI.
 * Actual delivery remains RNG-driven and can be faster or slower. */
export function contractDailyOutputEstimate(contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0): number {
  const pipeline = research.includes("pipeline") ? 1.12 : 1;
  const one = (skill: number) => {
    const s = Math.max(1, Math.min(99, skill));
    const chance = Math.min(0.97, 0.62 + s / 300);
    const avgBubble = Math.min(6, 1 + s / 34 + 0.9);
    return 5.7 * chance * avgBubble;
  };
  const staff = crew.reduce((a, s) => a + one(staffPoint(s, contract.type)), 0);
  const runner = showrunnerSkill > 0 ? one(showrunnerSkill) : 0;
  return Math.max(1, Math.round((staff + runner) * pipeline));
}

export const projectedContractTotal = (contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0) =>
  contractDailyOutputEstimate(contract, crew, research, showrunnerSkill) * contract.weeks * 7;
''')

state = "game_source/src/engine/state.ts"
replace_once(state, '    projects: Array.isArray(r.projects) ? r.projects.map((pr) => ({ ...pr, rush: null })) : [],', '    projects: Array.isArray(r.projects) ? r.projects.map((pr) => ({ ...pr, rush: null, liveQuality: { story: 0, art: 0, sound: 0, ...(pr.liveQuality ?? {}) } })) : [],')
replace_once(state, '    contractJobs: Array.isArray(r.contractJobs) ? r.contractJobs.map((j) => ({ ...j, showrunner: !!j.showrunner })) : [],', '    contractJobs: Array.isArray(r.contractJobs) ? r.contractJobs.map((j) => ({ ...j, showrunner: !!j.showrunner, liveProgressThisWeek: j.liveProgressThisWeek ?? 0 })) : [],')
replace_once(state, '    progress: 0,\n  };', '    progress: 0,\n    liveProgressThisWeek: 0,\n  };')
regex_once(state, r'''    /\* ------- background contract work: real staff, real weeks ------- \*/\n    \{\n      const keep: ContractAssignment\[\] = \[\];\n      for \(const job of contractJobs\) \{.*?\n      contractJobs = keep;\n    \}\n\n    /\* ------- courses complete after occupying the employee for weeks ------- \*/''', '''    /* ------- background contract work: live bubbles first, weekly fallback ------- */
    {
      const keep: ContractAssignment[] = [];
      for (const job of contractJobs) {
        const crew = staffArr.filter((s) => job.staffIds.includes(s.id) && !(r.staffResting ?? {})[s.id]);
        const runnerSkill = job.showrunner ? showrunnerContractSkill(r.showrunner, r.showsMade, job.contract.type) : 0;
        const baseline = contractWeeklyOutput(job.contract, crew, research, runnerSkill);
        const live = job.liveProgressThisWeek ?? 0;
        const progress = Math.min(job.contract.target, job.progress + Math.max(0, baseline - live));
        if (progress >= job.contract.target) {
          cash += job.contract.pay;
          rd += job.contract.rd;
          staffArr = staffArr.map((s) => {
            if (!job.staffIds.includes(s.id)) return s;
            return gainXp(s, CONTRACT_XP).staff;
          });
          notices.push(`✅ Contract delivered: ${job.contract.name} (+£${job.contract.pay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);
        } else if (w >= job.dueWeek) {
          const consolation = Math.max(1, Math.round(job.contract.rd / 3));
          rd += consolation;
          notices.push(`❌ Contract missed: ${job.contract.name} — ${progress}/${job.contract.target} progress (+${consolation} RD learned).`);
        } else {
          keep.push({ ...job, progress, liveProgressThisWeek: 0 });
        }
      }
      contractJobs = keep;
    }

    /* ------- courses complete after occupying the employee for weeks ------- */''')
regex_once(state, r'''export interface DeskPulse \{.*?\n\}\n\n/\*\*\n \* Frequent visible work units for the office\..*?export function rollStudioWorkPulses\(r: RunState\): DeskPulse\[\] \{.*?\n\}\n\n/\*\*\n \* One visible in-game day in the office\.''', '''export interface DeskPulse {
  actorId: string;
  name: string;
  type: PointType;
  points: number;
  nonce: number;
  source?: "project" | "contract";
  projectId?: string;
  jobId?: string;
}

export function rollStudioWorkPulses(r: RunState): DeskPulse[] {
  const pulses: DeskPulse[] = [];
  const pipeline = r.research.includes("pipeline") ? 1.12 : 1;
  for (const st of r.staff) {
    if ((r.staffResting ?? {})[st.id] || st.stamina <= 0) continue;
    const contract = (r.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));
    if (contract) {
      const skill = staffPoint(st, contract.contract.type);
      const chance = Math.min(0.97, 0.62 + skill / 300);
      if (Math.random() <= chance) {
        const raw = Math.round((1 + skill / 34 + Math.random() * 1.8) * pipeline);
        pulses.push({ actorId: st.id, name: st.name, type: contract.contract.type, points: Math.max(1, Math.min(6, raw)), nonce: Date.now() + pulses.length, source: "contract", jobId: contract.id });
      }
      continue;
    }
    const project = projectOfStaff(r.projects, st.id);
    if (!project || project.milestone) continue;
    const type: PointType | null = project.stage === "concept" || project.stage === "preprod" ? "story" : project.stage === "animation" ? "art" : project.stage === "sound" ? "sound" : null;
    if (!type) continue;
    const skill = staffPoint(st, type);
    const chance = Math.min(0.22, 0.06 + skill / 650);
    if (Math.random() <= chance) {
      const points = skill >= 80 && Math.random() < 0.28 ? 2 : 1;
      pulses.push({ actorId: st.id, name: st.name, type, points, nonce: Date.now() + pulses.length, source: "project", projectId: project.id });
    }
  }
  const runnerJob = (r.contractJobs ?? []).find((j) => j.showrunner);
  if (runnerJob) {
    const skill = showrunnerContractSkill(r.showrunner, r.showsMade, runnerJob.contract.type);
    if (Math.random() < 0.78) {
      const raw = Math.round((1 + skill / 34 + Math.random() * 1.8) * pipeline);
      pulses.push({ actorId: "showrunner", name: `${r.studio} showrunner`, type: runnerJob.contract.type, points: Math.max(1, Math.min(6, raw)), nonce: Date.now() + 900 + pulses.length, source: "contract", jobId: runnerJob.id });
    }
  } else {
    const active = r.projects.find((pr) => !pr.milestone && pr.stage !== "airing" && pr.stage !== "done" && pr.stage !== "ready");
    const type: PointType | null = active ? active.stage === "concept" || active.stage === "preprod" ? "story" : active.stage === "animation" ? "art" : active.stage === "sound" ? "sound" : null : null;
    if (active && type && Math.random() < 0.10) pulses.push({ actorId: "showrunner", name: `${r.studio} showrunner`, type, points: 1, nonce: Date.now() + 900 + pulses.length, source: "project", projectId: active.id });
  }
  return pulses;
}

export function tickStudioWorkPulse(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const pulses = rollStudioWorkPulses(r);
  if (!pulses.length) return { run: r, pulses, attention: false };
  let projects = r.projects.map((p) => ({ ...p, points: { ...p.points }, liveQuality: { story: 0, art: 0, sound: 0, ...(p.liveQuality ?? {}) } }));
  let contractJobs = (r.contractJobs ?? []).map((j) => ({ ...j, liveProgressThisWeek: j.liveProgressThisWeek ?? 0 }));
  let cash = r.cash;
  let rd = r.rd;
  let staff = r.staff;
  const notices = [...r.notices];
  for (const pulse of pulses) {
    if (pulse.source === "project" && pulse.projectId) {
      projects = projects.map((p) => p.id !== pulse.projectId || p.milestone ? p : ({ ...p, points: { ...p.points, [pulse.type]: p.points[pulse.type] + pulse.points }, liveQuality: { story: 0, art: 0, sound: 0, ...(p.liveQuality ?? {}), [pulse.type]: (p.liveQuality?.[pulse.type] ?? 0) + pulse.points } }));
    } else if (pulse.source === "contract" && pulse.jobId) {
      contractJobs = contractJobs.map((j) => j.id === pulse.jobId ? ({ ...j, progress: Math.min(j.contract.target, j.progress + pulse.points), liveProgressThisWeek: (j.liveProgressThisWeek ?? 0) + pulse.points }) : j);
    }
  }
  const completed = contractJobs.filter((j) => j.progress >= j.contract.target);
  for (const job of completed) {
    cash += job.contract.pay;
    rd += job.contract.rd;
    staff = staff.map((s) => job.staffIds.includes(s.id) ? gainXp(s, CONTRACT_XP).staff : s);
    notices.push(`🎉 CONTRACT DELIVERED: ${job.contract.name} (+£${job.contract.pay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);
  }
  if (completed.length) {
    const ids = new Set(completed.map((j) => j.id));
    contractJobs = contractJobs.filter((j) => !ids.has(j.id));
  }
  return { run: { ...r, projects, contractJobs, cash, rd, staff, notices: notices.slice(-40) }, pulses, attention: completed.length > 0 };
}

/**
 * One visible in-game day in the office.''')
regex_once(state, r'''export function tickStudioDay\(r: RunState\): \{ run: RunState; pulses: DeskPulse\[\]; attention: boolean \} \{.*?\n\}\n\n/\*\*\n \* The Edit Bay is an open-ended live phase\.''', '''export function tickStudioDay(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const projects = r.projects.map((p) => ({ ...p, points: { ...p.points } }));
  const resting = { ...(r.staffResting ?? {}) };
  const fx = facilityFX(r.facilities);
  const staff = r.staff.map((st0) => {
    const st = { ...st0 };
    const project = projectOfStaff(projects, st.id);
    const contract = (r.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));
    const projectFocus = project && !project.milestone ? project.stage === "concept" || project.stage === "preprod" ? "story" : project.stage === "animation" ? "art" : project.stage === "sound" ? "sound" : null : null;
    const busy = !!projectFocus || !!contract;
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
  return tickStudioWorkPulse({ ...r, projects, staff, staffResting: resting });
}

/**
 * The Edit Bay is an open-ended live phase.''')

app = "game_source/src/App.tsx"
replace_once(app, "  tickStudioDay,\n  tickEditDay,", "  tickStudioDay,\n  tickStudioWorkPulse,\n  tickEditDay,")
regex_once(app, r'''  /\* Frequent office work bubbles:.*?  \}, \[screen, paused, timeSpeed, run !== null\]\);\n''', '''  /* Desk bursts now change the game state at the same instant as the bubble. */
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
  }, [screen, paused, timeSpeed, run !== null]);
''')
replace_once(app, '<div className="absolute right-3 top-2.5 z-[60] flex gap-1.5">', '<div className="game-controls absolute right-3 top-2.5 z-[60] flex gap-1.5">')

office = "game_source/src/components/Office.tsx"
replace_once(office, 'import { contractWeeklyOutput, showrunnerContractSkill } from "../engine/studioOps";', 'import { contractDailyOutputEstimate, showrunnerContractSkill } from "../engine/studioOps";')
replace_once(office, 'className="pointer-events-none absolute bottom-[54px] left-2 z-20 hidden w-56 rounded-lg border border-cyanx/35 bg-abyss/88 p-2 shadow-xl backdrop-blur-sm sm:block"', 'className="pointer-events-none absolute bottom-[56px] left-2 right-2 z-20 rounded-lg border border-cyanx/35 bg-abyss/90 p-2 shadow-xl backdrop-blur-sm sm:right-auto sm:w-56"')
replace_once(office, '<div className="relative z-20 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md md:pl-5">', '<div className="office-hud relative z-20 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md md:pl-5">')
replace_once(office, '<div className="ink-chip flex shrink-0 items-center gap-1 px-2 py-1 text-[10px] font-bold text-cyanx md:text-xs">', '<div className="office-hud-date ink-chip flex shrink-0 items-center gap-1 px-2 py-1 text-[10px] font-bold text-cyanx md:text-xs">')
replace_once(office, '<div className="ml-auto flex items-center gap-1.5 md:gap-2">', '<div className="office-hud-stats ml-auto flex items-center gap-1.5 md:gap-2">')
replace_once(office, '<div className="ink-chip flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-mint">', '<div className="hidden ink-chip items-center gap-1 px-2 py-1 text-[10px] font-bold text-mint sm:flex">')
replace_once(office, '<div className="relative">\n            <button\n              onClick={() => setFcOpen', '<div className="office-hud-forecast relative">\n            <button\n              onClick={() => setFcOpen')
replace_once(office, '<div className={cn("ink-chip flex items-center gap-1.5 px-2 py-1 text-xs font-bold", run.cash < 0 && "border-neon text-neon")}>', '<div className={cn("office-hud-cash ink-chip flex items-center gap-1.5 px-2 py-1 text-xs font-bold", run.cash < 0 && "border-neon text-neon")}>')
replace_once(office, '<div className="ink-chip flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-viol">', '<div className="office-hud-rd ink-chip flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-viol">')
replace_once(office, '<div><b className="text-paper">3 · WORK</b><br/>Skill + energy generate contract progress each in-game week.</div>', '<div><b className="text-paper">3 · WORK</b><br/>Every desk bubble advances the bar instantly. Strong crews can finish in a day.</div>')
regex_once(office, r'''                  const crew = run\.staff\.filter\(\(st\) => job\.staffIds\.includes\(st\.id\)\);\n                  const runnerSkill = job\.showrunner \? showrunnerContractSkill\(run\.showrunner, run\.showsMade, job\.contract\.type\) : 0;\n                  const rate = contractWeeklyOutput\(job\.contract, crew\.filter\(\(st\) => !run\.staffResting\?\.\[st\.id\]\), run\.research, runnerSkill\);\n                  const weeksLeft = Math\.max\(0, job\.dueWeek - run\.week\);\n                  const projected = job\.progress \+ rate \* weeksLeft;''', '''                  const crew = run.staff.filter((st) => job.staffIds.includes(st.id));
                  const runnerSkill = job.showrunner ? showrunnerContractSkill(run.showrunner, run.showsMade, job.contract.type) : 0;
                  const rate = contractDailyOutputEstimate(job.contract, crew.filter((st) => !run.staffResting?.[st.id]), run.research, runnerSkill);
                  const daysLeft = Math.max(0, (job.dueWeek - run.week) * 7 - clockDay);
                  const projected = job.progress + rate * daysLeft;
                  const eta = Math.max(1, Math.ceil(Math.max(0, job.contract.target - job.progress) / Math.max(1, rate)));''')
replace_once(office, '<div className="text-[8px] text-paper/40">≈ +{rate}/wk</div>', '<div className="text-[8px] text-paper/40">≈ +{rate}/day · LIVE</div>')
replace_once(office, '{projected >= job.contract.target ? `On pace to deliver${weeksLeft ? ` within ${weeksLeft} wk` : ""}.` : `At current pace: ${projected}/${job.contract.target} by deadline — add stronger staff next time.`}', '{projected >= job.contract.target ? `On pace · roughly ${eta} workday${eta === 1 ? "" : "s"} at this crew strength. Every bubble moves this bar.` : `At current pace: ${projected}/${job.contract.target} by deadline — add stronger staff next time.`}')

scene = "game_source/src/components/OfficeScene.tsx"
replace_once(scene, 'function anchors(zone: FloorZone, n: number): { x: number; y: number }[] {\n  if (n <= 0) return [];\n  const perRow = Math.max(2, Math.ceil(Math.sqrt(n * 1.6)));', 'function anchors(zone: FloorZone, n: number, portrait = false): { x: number; y: number }[] {\n  if (n <= 0) return [];\n  const perRow = portrait ? Math.min(2, Math.max(1, n)) : Math.max(2, Math.ceil(Math.sqrt(n * 1.6)));')
replace_once(scene, '  const [stage, setStage] = useState({ w: 0, h: 0, left: 0, top: 0 });', '  const [stage, setStage] = useState({ w: 0, h: 0, left: 0, top: 0, viewW: 0, viewH: 0, portrait: false });')
regex_once(scene, r'''  /\* --------------------------------------------------- stage measurement \*/\n  useLayoutEffect\(\(\) => \{.*?\n  \}, \[\]\);\n''', '''  /* --------------------------------------------------- stage measurement */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect();
      if (!cw || !ch) return;
      const portrait = ch > cw * 1.12;
      const scale = Math.max(cw / STAGE_AR, ch);
      const w = scale * STAGE_AR;
      const h = scale;
      let left = (cw - w) / 2;
      if (portrait && w > cw) {
        const floorMid = ((zone.x0 + zone.x1) / 2 / 100) * w;
        left = Math.max(cw - w, Math.min(0, cw / 2 - floorMid));
      }
      setStage({ w, h, left, top: (ch - h) / 2, viewW: cw, viewH: ch, portrait });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [lvl]);

  const layoutZone = useMemo<FloorZone>(() => {
    if (!stage.portrait || !stage.w || !stage.viewW) return zone;
    const visibleX0 = Math.max(0, (-stage.left / stage.w) * 100);
    const visibleX1 = Math.min(100, ((stage.viewW - stage.left) / stage.w) * 100);
    const span = Math.max(1, visibleX1 - visibleX0);
    let x0 = Math.max(zone.x0, visibleX0 + span * 0.07);
    let x1 = Math.min(zone.x1, visibleX1 - span * 0.07);
    if (x1 - x0 < 5) { x0 = visibleX0 + span * 0.09; x1 = visibleX1 - span * 0.09; }
    return { x0, x1, y0: Math.max(60, zone.y0 - 5), y1: Math.min(94, zone.y1) };
  }, [stage.portrait, stage.w, stage.viewW, stage.left, zone]);
''')
replace_once(scene, '    const spots = anchors(zone, Math.max(cast.length, Math.min(maxStaff + 1, 13)));', '    const spots = anchors(layoutZone, Math.max(cast.length, Math.min(maxStaff + 1, 13)), stage.portrait);')
replace_once(scene, '  }, [cast.length, maxStaff, lvl]); // eslint-disable-line react-hooks/exhaustive-deps', '  }, [cast.length, maxStaff, lvl, layoutZone.x0, layoutZone.x1, layoutZone.y0, layoutZone.y1, stage.portrait]); // eslint-disable-line react-hooks/exhaustive-deps')
replace_once(scene, '                x: zone.x0 + Math.random() * (zone.x1 - zone.x0),\n                y: zone.y0 + Math.random() * (zone.y1 - zone.y0),', '                x: layoutZone.x0 + Math.random() * (layoutZone.x1 - layoutZone.x0),\n                y: layoutZone.y0 + Math.random() * (layoutZone.y1 - layoutZone.y0),')
replace_once(scene, '  }, [bodies.length, zone, cast]);', '  }, [bodies.length, layoutZone, cast]);')
replace_once(scene, '              scale={SPRITE_H[lvl] * 100}', '              scale={SPRITE_H[lvl] * 100 * (stage.portrait ? 0.82 : 1)}')

css = "game_source/src/index.css"
s = text(css)
if ".game-controls" not in s:
    s += '''\n\n/* ---------- phone portrait shell ---------- */\n@supports (height: 100dvh) {\n  html, body, #root { height: 100dvh; }\n}\n@media (max-width: 600px) and (orientation: portrait) {\n  .office-hud { min-height: 62px; padding: 4px 6px 31px !important; padding-right: 6px !important; gap: 4px !important; }\n  .office-hud-date { position: absolute; left: 6px; bottom: 4px; padding: 3px 7px !important; font-size: 9px !important; }\n  .office-hud-stats { gap: 3px !important; }\n  .office-hud-forecast { display: none !important; }\n  .office-hud-cash, .office-hud-rd { padding: 3px 7px !important; font-size: 10px !important; }\n  .game-controls { top: 34px !important; right: 5px !important; gap: 2px !important; }\n  .game-controls button { min-height: 25px !important; padding: 4px 6px !important; border-radius: 8px !important; font-size: 9px !important; }\n}\n'''
    write(css, s)

icon_b64 = (ROOT / "tools/anime_runner_icon.b64").read_text().strip()
icon = Image.open(BytesIO(base64.b64decode(icon_b64))).convert("RGBA")
icon.save(ROOT / "game_source/public/img/app-icon.png", optimize=True)
density_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
res = ROOT / "game_source/android/app/src/main/res"
for density, size in density_sizes.items():
    folder = res / f"mipmap-{density}"
    legacy = icon.resize((size, size), Image.Resampling.LANCZOS)
    legacy.save(folder / "ic_launcher.png", optimize=True)
    legacy.save(folder / "ic_launcher_round.png", optimize=True)
    fg_size = round(size * 2.25)
    foreground = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    content_size = round(fg_size * 0.74)
    content = icon.resize((content_size, content_size), Image.Resampling.LANCZOS)
    foreground.alpha_composite(content, ((fg_size - content_size) // 2, (fg_size - content_size) // 2))
    foreground.save(folder / "ic_launcher_foreground.png", optimize=True)
bg = ROOT / "game_source/android/app/src/main/res/values/ic_launcher_background.xml"
bg.write_text(bg.read_text().replace("#1b1046", "#000000"))

test = "game_source/src/engine/__tests__/gds-production.test.ts"
replace_once(test, 'import { initialRun, tickStudioDay } from "../state";', 'import { initialRun, startContractAssignment, tickStudioDay, tickStudioWorkPulse } from "../state";')
replace_once(test, '''  it("ordinary desk work emits a visible contribution bubble of the correct type", () => {\n    vi.spyOn(Math, "random").mockReturnValue(0);\n    let r = initialRun("Test", "producer");\n    const staff = { ...r.candidates[0], story:99, stamina:100 };\n    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };\n    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1) };\n    const out = tickStudioDay(r);\n    expect(out.pulses.length).toBeGreaterThan(0);\n    expect(out.pulses[0].type).toBe("story");\n    expect(out.pulses[0].points).toBeGreaterThan(0);\n    vi.restoreAllMocks();\n  });\n''', '''  it("ordinary desk work emits a visible contribution bubble of the correct type", () => {\n    vi.spyOn(Math, "random").mockReturnValue(0);\n    let r = initialRun("Test", "producer");\n    const staff = { ...r.candidates[0], story:99, stamina:100 };\n    const pr = { ...makeProject(draft(), 0), staffIds:[staff.id] };\n    r = { ...r, staff:[staff], projects:[pr], candidates:r.candidates.slice(1) };\n    const before = r.projects[0].points.story;\n    const out = tickStudioDay(r);\n    expect(out.pulses.length).toBeGreaterThan(0);\n    expect(out.pulses[0].type).toBe("story");\n    expect(out.pulses[0].points).toBeGreaterThan(0);\n    expect(out.run.projects[0].points.story).toBeGreaterThan(before);\n    expect(out.run.projects[0].liveQuality?.story ?? 0).toBeGreaterThan(0);\n    vi.restoreAllMocks();\n  });\n\n  it("contract bubbles advance the bar immediately and may deliver before a week boundary", () => {\n    vi.spyOn(Math, "random").mockReturnValue(0);\n    let r = initialRun("Test", "producer");\n    const staff = { ...r.candidates[0], art:99, stamina:100 };\n    const contract = { id:"instant", name:"One-Day Cleanup", type:"art" as const, target:1, weeks:2, pay:12000, rd:3 };\n    r = { ...r, staff:[staff], candidates:r.candidates.slice(1), contracts:[contract] };\n    r = startContractAssignment(r, contract, [staff.id], false)!;\n    const cash = r.cash;\n    const out = tickStudioWorkPulse(r);\n    expect(out.pulses.some((p) => p.source === "contract")).toBe(true);\n    expect(out.run.contractJobs).toHaveLength(0);\n    expect(out.run.cash).toBe(cash + contract.pay);\n    expect(out.run.rd).toBeGreaterThan(r.rd);\n    vi.restoreAllMocks();\n  });\n''')
print("realtime work / portrait / icon migration applied")
