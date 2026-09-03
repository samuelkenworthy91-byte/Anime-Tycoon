from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def p(rel: str) -> Path:
    return ROOT / rel

def repl(rel: str, old: str, new: str):
    f = p(rel)
    s = f.read_text()
    if old not in s:
        raise SystemExit(f"Missing target in {rel}: {old[:140]!r}")
    f.write_text(s.replace(old, new, 1))

# ---------------------------------------------------------------- studioOps: make specialist skill visibly matter
f = p("game_source/src/engine/studioOps.ts")
s = f.read_text()
anchor = 'export const rushBoostPoint = (skill: number) => Math.max(6, Math.round(4 + Math.min(99, skill) * 0.13));\n'
if anchor not in s:
    raise SystemExit("studioOps rushBoostPoint anchor missing")
extra = '''export const rushBoostPoint = (skill: number) => Math.max(6, Math.round(4 + Math.min(99, skill) * 0.13));

/** Stronger rush specialists now have a substantially higher floor AND ceiling. */
export function rushOutcomeRange(skill: number): { min: number; max: number } {
  const s = Math.max(1, Math.min(99, Math.round(skill)));
  const min = Math.max(4, Math.round(8 + s * 0.45));
  const max = Math.max(min + 6, Math.round(18 + s * 0.90));
  return { min, max };
}

/** The rest of the assigned production team still matters during a lead spotlight. */
export const rushTeamSupport = (skills: number[]) =>
  Math.min(30, Math.round(skills.reduce((a, v) => a + Math.max(0, Math.min(99, v)) * 0.08, 0)));
'''
s = s.replace(anchor, extra, 1)
f.write_text(s)

# ---------------------------------------------------------------- state: frequent visual work units, fast recovery, live editing
repl(
    "game_source/src/engine/state.ts",
    '''export interface DeskPulse {\n  actorId: string;\n  name: string;\n  type: PointType;\n  points: number;\n  nonce: number;\n  source?: "project" | "contract";\n}\n\n''',
    '''export interface DeskPulse {\n  actorId: string;\n  name: string;\n  type: PointType;\n  points: number;\n  nonce: number;\n  source?: "project" | "contract";\n}\n\n/**\n * Frequent visible work units for the office. These are a readable animation of\n * the skill-driven production work already banked by the weekly scoring engine,\n * not an extra duplicate score award. Higher skill produces larger bubbles.\n */\nexport function rollStudioWorkPulses(r: RunState): DeskPulse[] {\n  const pulses: DeskPulse[] = [];\n  for (const st of r.staff) {\n    if ((r.staffResting ?? {})[st.id] || st.stamina <= 0) continue;\n    const project = projectOfStaff(r.projects, st.id);\n    const contract = (r.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));\n    const type: PointType | null = project && !project.milestone\n      ? (project.stage === "concept" || project.stage === "preprod" ? "story" : project.stage === "animation" ? "art" : project.stage === "sound" ? "sound" : null)\n      : contract?.contract.type ?? null;\n    if (!type) continue;\n    const skill = staffPoint(st, type);\n    const chance = Math.min(0.96, 0.62 + skill / 280);\n    if (Math.random() > chance) continue;\n    const points = Math.max(2, Math.min(10, Math.round(1 + skill * 0.07 + Math.random() * 2.4)));\n    pulses.push({ actorId: st.id, name: st.name, type, points, nonce: Date.now() + pulses.length, source: contract ? "contract" : "project" });\n  }\n\n  const runnerJob = (r.contractJobs ?? []).find((j) => j.showrunner);\n  const active = r.projects.find((pr) => !pr.milestone && pr.stage !== "airing" && pr.stage !== "done" && pr.stage !== "ready");\n  const runnerType: PointType | null = runnerJob?.contract.type\n    ?? (active ? (active.stage === "concept" || active.stage === "preprod" ? "story" : active.stage === "animation" ? "art" : active.stage === "sound" ? "sound" : null) : null);\n  if (runnerType && Math.random() < 0.72) {\n    const skill = showrunnerContractSkill(r.showrunner, r.showsMade, runnerType);\n    pulses.push({ actorId: "showrunner", name: `${r.studio} showrunner`, type: runnerType, points: Math.max(3, Math.round(skill * 0.065)), nonce: Date.now() + 900 + pulses.length, source: runnerJob ? "contract" : "project" });\n  }\n  return pulses;\n}\n\n'''
)

repl(
    "game_source/src/engine/state.ts",
    '''    if (resting[st.id]) {\n      st.stamina = Math.min(100, st.stamina + 22 + fx.staminaRest);\n      if (st.stamina >= 82) delete resting[st.id];\n      return st;\n    }\n\n    if (!busy) {\n      st.stamina = Math.min(100, st.stamina + 13 + fx.staminaRest);\n      return st;\n    }''',
    '''    if (resting[st.id]) {\n      /* recovery is deliberately brisk: roughly two game-days from empty */\n      st.stamina = Math.min(100, st.stamina + 38 + fx.staminaRest * 2);\n      if (st.stamina >= 68) delete resting[st.id];\n      return st;\n    }\n\n    if (!busy) {\n      st.stamina = Math.min(100, st.stamina + 18 + fx.staminaRest);\n      return st;\n    }'''
)

# Daily office boundary should also produce the new readable bubble values.
repl(
    "game_source/src/engine/state.ts",
    '  return { run: { ...r, projects, staff, staffResting: resting }, pulses, attention: false };\n}\n\n/* ------------------------------------------------------ live rush system */',
    '''  const visible = rollStudioWorkPulses({ ...r, projects, staff, staffResting: resting });\n  return { run: { ...r, projects, staff, staffResting: resting }, pulses: visible.length ? visible : pulses, attention: false };\n}\n\n/**\n * The Edit Bay is an open-ended live phase. Every game-day spent here can clear\n * notes; every cleared note immediately earns 1 RD. There is no artificial edit\n * timer, so the player can chase a clean master at the cost of calendar time,\n * weekly burn and potential late-delivery penalties.\n */\nexport function tickEditDay(r: RunState, projectId: string): { run: RunState; pulses: DeskPulse[]; attention: boolean } {\n  const target = projectById(r, projectId);\n  if (!target || target.milestone !== "edit" || target.issues <= 0)\n    return { run: r, pulses: [], attention: !!target && target.milestone === "edit" && target.issues <= 0 };\n\n  const fx = facilityFX(r.facilities);\n  const team = r.staff.filter((st) => target.staffIds.includes(st.id));\n  const capacity =\n    0.8\n    + team.reduce((a, st) => {\n        const craft = (st.story + st.art + st.sound) / 3;\n        return a + (craft / 95) * (0.62 + st.stamina / 260);\n      }, 0)\n    + fx.issueFix * 0.45\n    + (r.research.includes("autoclean") ? 0.8 : 0);\n  const whole = Math.max(1, Math.floor(capacity));\n  const cleared = Math.min(target.issues, whole + (Math.random() < capacity - Math.floor(capacity) ? 1 : 0));\n  const remaining = Math.max(0, target.issues - cleared);\n  const resting = { ...(r.staffResting ?? {}) };\n  const staff = r.staff.map((st) => {\n    if (!target.staffIds.includes(st.id)) return st;\n    const stamina = Math.max(0, st.stamina - 3);\n    if (stamina <= 0) resting[st.id] = true;\n    return { ...st, stamina };\n  });\n  const projects = r.projects.map((pr) => pr.id === projectId ? { ...pr, issues: remaining, rdGained: pr.rdGained + cleared } : pr);\n  return {\n    run: {\n      ...r,\n      rd: r.rd + cleared,\n      staff,\n      staffResting: resting,\n      projects,\n      notices: [...r.notices, `✂ Edit Bay clears ${cleared} note${cleared === 1 ? "" : "s"} on “${target.draft.title}” (+${cleared} RD, ${remaining} remaining).`].slice(-40),\n    },\n    pulses: [],\n    attention: remaining === 0,\n  };\n}\n\n/* ------------------------------------------------------ live rush system */'''
)

# Auto-Cleanup now accelerates live edit days rather than silently deleting notes on LOCK.
repl(
    "game_source/src/engine/state.ts",
    '''  const autoClean = done === "edit" && r.research.includes("autoclean") ? Math.ceil((proj?.issues ?? 0) * 0.35) : 0;\n  const withCleanup: MilestoneOutcome = autoClean > 0 ? { ...o, squashed: (o.squashed ?? 0) + autoClean } : o;\n  /* the QA suite catches problems before they become issues */\n  const guarded: MilestoneOutcome =\n    withCleanup.issues > 0 ? { ...withCleanup, issues: Math.max(0, withCleanup.issues - fx.issueGuard) } : withCleanup;''',
    '''  /* Auto-Cleanup now speeds the live Edit Bay instead of erasing notes for free on LOCK. */\n  const withCleanup: MilestoneOutcome = o;\n  /* the QA suite catches problems before they become issues */\n  const guarded: MilestoneOutcome =\n    withCleanup.issues > 0 ? { ...withCleanup, issues: Math.max(0, withCleanup.issues - fx.issueGuard) } : withCleanup;'''
)

# ---------------------------------------------------------------- App: frequent desk bubbles + live calendar while Edit Bay is open
repl("game_source/src/App.tsx", "  tickStudioDay,\n", "  tickStudioDay,\n  tickEditDay,\n  rollStudioWorkPulses,\n")
repl(
    "game_source/src/App.tsx",
    '    if (screen !== "office" || paused || !run) return;\n    const DAY_MS = 10_000;',
    '    const liveEditing = screen === "produce" && focus?.milestone === "edit" && !!focus.projectId;\n    if ((screen !== "office" && !liveEditing) || paused || !run) return;\n    const DAY_MS = 10_000;'
)
repl(
    "game_source/src/App.tsx",
    '          const daily = tickStudioDay(current);\n          let n = daily.run;',
    '          const liveEditing = screen === "produce" && focus?.milestone === "edit" && !!focus.projectId;\n          const daily = liveEditing && focus ? tickEditDay(current, focus.projectId) : tickStudioDay(current);\n          let n = daily.run;'
)
repl(
    "game_source/src/App.tsx",
    '  }, [screen, paused, timeSpeed, run !== null, run?.week]);\n\n  /* --------------------------------------------------------- lifecycle */',
    '''  }, [screen, paused, timeSpeed, run !== null, run?.week, focus?.milestone, focus?.projectId]);\n\n  /* Frequent office work bubbles: the calendar still advances daily, but the\n     staff should LOOK busy throughout that day rather than only once every 10s. */\n  useEffect(() => {\n    if (screen !== "office" || paused || timeSpeed === 0 || !run) return;\n    const gap = timeSpeed >= 12 ? 700 : timeSpeed >= 4 ? 1050 : 1750;\n    const iv = window.setInterval(() => {\n      setRun((current) => {\n        if (current) setWorkPulses(rollStudioWorkPulses(current));\n        return current;\n      });\n    }, gap);\n    return () => window.clearInterval(iv);\n  }, [screen, paused, timeSpeed, run !== null]);\n\n  /* --------------------------------------------------------- lifecycle */'''
)
repl(
    "game_source/src/App.tsx",
    '{screen === "office" && ([0, 1, 4, 12] as const).map((speed) => (',
    '{(screen === "office" || (screen === "produce" && focus?.milestone === "edit")) && ([0, 1, 4, 12] as const).map((speed) => ('
)

# ---------------------------------------------------------------- OfficeScene: resting staff actually roam around
repl(
    "game_source/src/components/OfficeScene.tsx",
    '''      const movable = list.map((_, i) => i).filter((i) => !cast[i]?.working);\n      if (!movable.length) return;\n      const i = movable[Math.floor(Math.random() * movable.length)];\n      setBodies((prev) =>\n        prev.map((b, j) => {\n          if (j !== i) return b;\n          const atHome = Math.abs(b.pos.x - b.home.x) < 0.6 && Math.abs(b.pos.y - b.home.y) < 0.6;\n          const to = atHome\n            ? {\n                x: zone.x0 + Math.random() * (zone.x1 - zone.x0),\n                y: zone.y0 + Math.random() * (zone.y1 - zone.y0),\n              }\n            : { ...b.home };\n          const dist = Math.hypot(to.x - b.pos.x, to.y - b.pos.y);\n          return {\n            ...b,\n            target: to,\n            pos: to,\n            /* a steady walking pace rather than a fixed animation time */\n            dur: Math.max(1.4, dist / 5.5),\n            flip: to.x < b.pos.x,\n          };\n        })\n      );\n    }, 2600);''',
    '''      const resters = list.map((_, i) => i).filter((i) => !!cast[i]?.resting);\n      const movable = resters.length ? resters : list.map((_, i) => i).filter((i) => !cast[i]?.working);\n      if (!movable.length) return;\n      if (!resters.length && Math.random() < 0.45) return;\n      const picked = new Set<number>();\n      const moves = resters.length ? Math.min(2, movable.length) : 1;\n      while (picked.size < moves) picked.add(movable[Math.floor(Math.random() * movable.length)]);\n      setBodies((prev) =>\n        prev.map((b, j) => {\n          if (!picked.has(j)) return b;\n          const recovering = !!cast[j]?.resting;\n          const atHome = Math.abs(b.pos.x - b.home.x) < 0.6 && Math.abs(b.pos.y - b.home.y) < 0.6;\n          const to = recovering || atHome\n            ? {\n                x: zone.x0 + Math.random() * (zone.x1 - zone.x0),\n                y: zone.y0 + Math.random() * (zone.y1 - zone.y0),\n              }\n            : { ...b.home };\n          const dist = Math.hypot(to.x - b.pos.x, to.y - b.pos.y);\n          return {\n            ...b,\n            target: to,\n            pos: to,\n            dur: recovering ? Math.max(0.75, dist / 8) : Math.max(1.4, dist / 5.5),\n            flip: to.x < b.pos.x,\n          };\n        })\n      );\n    }, 1150);'''
)
repl(
    "game_source/src/components/OfficeScene.tsx",
    '''      {tired && (\n        <span className="pointer-events-none absolute -top-1 left-[62%] text-[10px] font-bold text-cyanx/80 anim-floaty">\n          z\n        </span>\n      )}''',
    '''      {tired && (\n        <span className="pointer-events-none absolute -top-1 left-[62%] text-[10px] font-bold text-cyanx/80 anim-floaty">\n          {resting ? "☕" : "z"}\n        </span>\n      )}'''
)

# ---------------------------------------------------------------- Produce: open-ended Edit Bay + much bigger character-led rush reveal
f = p("game_source/src/components/Produce.tsx")
s = f.read_text()
s = s.replace("  SHOWRUNNERS,\n", "  SHOWRUNNERS,\n  WORKER_LOOKS,\n  workerLookIndex,\n  dateLabel,\n", 1)
s = s.replace('import { rushBoostPoint, rushResearchCost } from "../engine/studioOps";', 'import { rushBoostPoint, rushOutcomeRange, rushResearchCost, rushTeamSupport } from "../engine/studioOps";', 1)

start = s.find("  if (isEdit) {")
end = s.find("\n  const Icon = phase!.icon;", start)
if start < 0 or end < 0:
    raise SystemExit("Produce edit block markers missing")
edit_block = r'''  if (isEdit) {
    const remaining = project.issues;
    const late = run.week > project.deadlineWeek;
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-xl flex-1 overflow-y-auto p-4">
          <div className="text-center">
            <Scissors size={24} className="mx-auto text-mint" />
            <div className="mt-2 text-[10px] font-bold tracking-[0.35em] text-mint">EDIT BAY · LIVE CALENDAR</div>
            <h2 className="font-display text-3xl font-extrabold">POLISH OR SHIP?</h2>
            <p className="mt-1 text-xs text-paper/55">There is no edit-note timer. Let the calendar run and the team keeps clearing notes; every note removed earns +1 RD. Lock whenever you choose.</p>
          </div>

          <div className={cn("mt-4 rounded-2xl border p-4 text-center", remaining === 0 ? "border-mint/60 bg-mint/10" : "border-gold/45 bg-gold/5")}>
            <div className="text-[9px] font-extrabold tracking-[0.3em] text-paper/45">EDITOR NOTES REMAINING</div>
            <div className={cn("mt-1 font-display text-6xl font-extrabold tabular-nums", remaining === 0 ? "text-mint" : "text-gold")}>{remaining}</div>
            <div className="mt-2 text-[10px] font-bold text-cyanx">✂ EVERY CLEARED NOTE = +1 RD</div>
            <div className="mt-2 text-[9px] text-paper/45">Calendar: {dateLabel(run.week)} · use the time controls above to keep editing</div>
          </div>

          {remaining > 0 ? (
            <div className="mt-3 rounded-xl border border-line bg-panel2/60 p-3 text-xs text-paper/60">
              Waiting can produce a clean master, but production burn and the broadcast deadline keep moving. You can lock early: any notes left on the project remain in the final master and reduce review quality.
            </div>
          ) : (
            <div className="anim-pop mt-3 rounded-xl border border-mint/50 bg-mint/10 p-3 text-center text-xs font-extrabold text-mint">MASTER CLEAN · ALL NOTES RESOLVED</div>
          )}
          {late && <div className="mt-3 rounded-xl border border-neon/55 bg-neon/10 p-3 text-xs font-bold text-neon">LATE DELIVERY · every extra week now costs cash, hype and can create further issues.</div>}

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
            <Btn big variant={remaining === 0 ? "primary" : "gold"} className="flex-1" onClick={() => {
              sfx.whoosh();
              onDone({ points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0, squashed: 0,
                rename: {
                  title: finalNames.title.trim() || project.draft.title,
                  protagName: finalNames.protagName.trim() || castById(project.draft.protag).name,
                  secondaryName: finalNames.secondaryName.trim() || castById(project.draft.secondary).name,
                  petName: finalNames.petName.trim() || (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),
                  villainName: finalNames.villainName.trim() || castById(project.draft.villain).name,
                } });
            }}>{remaining === 0 ? "LOCK CLEAN MASTER" : `LOCK WITH ${remaining} NOTE${remaining === 1 ? "" : "S"}`}</Btn>
          </div>
        </div>
      </div>
    );
  }
'''
s = s[:start] + edit_block + s[end:]

# Reveal state carries art + range/support breakdown.
s = s.replace(
'''    assignment: RushAssignment; base: number; total: number; spent: number; issues: number; rdSpent: number;\n    idea: null | { name: string; skill: number }; ideaDone: boolean; message?: string;''',
'''    assignment: RushAssignment; base: number; total: number; spent: number; issues: number; rdSpent: number;\n    support: number; min: number; max: number; leadImg?: string | null;\n    idea: null | { name: string; skill: number }; ideaDone: boolean; message?: string;''', 1)

# Make the Pointless-style build a touch more dramatic.
s = s.replace('const duration = Math.max(700, Math.min(1900, 850 + Math.abs(to - from) * 42));', 'const duration = Math.max(950, Math.min(2500, 1100 + Math.abs(to - from) * 28));', 1)

# Replace old roll function + choose block up to answerIdea.
start = s.find("  const rollRush = (skill: number) => {")
end = s.find("\n  const answerIdea =", start)
if start < 0 or end < 0:
    raise SystemExit("Produce rush roll block markers missing")
new_choose = r'''  const choose = (a: RushAssignment, leadImg?: string | null) => {
    sfx.reveal();
    const range = rushOutcomeRange(a.skill);
    const leadRoll = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    const support = rushTeamSupport(team.filter((st) => st.id !== a.leadId).map((st) => staffPoint(st, phase!.type)));
    let base = leadRoll + support;
    let min = range.min + support;
    let max = range.max + support;
    if (crunch) {
      base = Math.max(base + 1, Math.round(base * 1.25));
      min = Math.round(min * 1.25);
      max = Math.round(max * 1.25);
    }
    const issueChance = Math.max(0.012, 0.105 - a.skill * 0.00088) * (crunch ? 1.8 : 1);
    const ideaPool = [
      ...team.map((st) => ({ name: st.name, skill: Math.round(staffPoint(st, phase!.type)) })),
      { name: runner.name, skill: Math.min(99, 48 + run.showsMade * 2) },
    ];
    const idea = Math.random() < 0.32 && ideaPool.length ? ideaPool[Math.floor(Math.random() * ideaPool.length)] : null;
    shownRef.current = 0;
    setShown(0);
    setReveal({ assignment: a, base, total: base, spent: a.cost + (crunch ? crunchCost : 0), issues: Math.random() < issueChance ? 1 : 0, rdSpent: 0, support, min, max, leadImg, idea, ideaDone: !idea });
    setMode("reveal");
  };
'''
s = s[:start] + new_choose + s[end:]

# Candidate buttons: actual sprite + explicit expected range.
old = '''              const skill = Math.round(staffPoint(st, phase!.type) * (0.72 + st.stamina / 360));\n              return <button key={st.id} onClick={() => choose({ leadId: st.id, leadName: st.name, skill, type: phase!.type, cost: 0, slider })} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-cyanx/60"><span className="rounded-lg bg-panel3 p-2 text-cyanx"><UserRound size={17}/></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{st.name}</div><div className="text-[10px] text-paper/50">{POINT_LABEL[phase!.type]} {staffPoint(st, phase!.type)} · energy {Math.round(st.stamina)}%</div></div><div className="text-right"><div className="font-display text-lg font-extrabold" style={{color:POINT_COLOR[phase!.type]}}>SKILL {skill}</div><div className="text-[9px] text-paper/40">bounded RNG</div></div></button>;'''
new = '''              const skill = Math.round(staffPoint(st, phase!.type) * (0.72 + st.stamina / 360));\n              const range = rushOutcomeRange(skill);\n              const support = rushTeamSupport(team.filter((x) => x.id !== st.id).map((x) => staffPoint(x, phase!.type)));\n              const img = WORKER_LOOKS[workerLookIndex(st)]?.sprite;\n              return <button key={st.id} onClick={() => choose({ leadId: st.id, leadName: st.name, skill, type: phase!.type, cost: 0, slider }, img)} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-cyanx/60"><img src={img} alt="" className="h-12 w-10 shrink-0 object-contain drop-shadow-lg"/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{st.name}</div><div className="text-[10px] text-paper/50">{POINT_LABEL[phase!.type]} {staffPoint(st, phase!.type)} · energy {Math.round(st.stamina)}% · team support +{support}</div></div><div className="text-right"><div className="font-display text-lg font-extrabold" style={{color:POINT_COLOR[phase!.type]}}>SKILL {skill}</div><div className="text-[9px] font-bold text-paper/50">RANGE {range.min + support}–{range.max + support}</div></div></button>;'''
if old not in s:
    raise SystemExit("staff rush candidate block missing")
s = s.replace(old, new, 1)

# Showrunner / outsource calls get art and range copy.
s = s.replace('onClick={() => choose({ leadId: "showrunner", leadName: runner.name, skill: Math.min(99, 44 + run.showsMade * 3), type: phase!.type, cost: 0, slider })}', 'onClick={() => choose({ leadId: "showrunner", leadName: runner.name, skill: Math.min(99, 44 + run.showsMade * 3), type: phase!.type, cost: 0, slider }, runner.sprite)}', 1)
s = s.replace('onClick={() => choose({ leadId: `outsource:${milestone}`, leadName: "Famous Studio", skill: 78, type: phase!.type, cost: outsourceCost, slider })}', 'onClick={() => choose({ leadId: `outsource:${milestone}`, leadName: "Famous Studio", skill: 78, type: phase!.type, cost: outsourceCost, slider }, null)}', 1)

# Replace reveal tail with character-led burst presentation.
start = s.find('      ) : reveal ? (')
end = s.find('      ) : null}\n    </div>\n  );\n}', start)
if start < 0 or end < 0:
    raise SystemExit("Produce reveal tail markers missing")
reveal_tail = r'''      ) : reveal ? (
        <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
          <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: `repeating-conic-gradient(from -12deg at 34% 52%, ${POINT_COLOR[phase!.type]}22 0deg 2deg, transparent 2deg 12deg)` }} />
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 34% 52%, ${POINT_COLOR[phase!.type]}48 0%, ${POINT_COLOR[phase!.type]}18 24%, transparent 58%)` }} />
          {[[8,16],[88,14],[10,78],[91,72],[24,8],[76,87]].map(([x,y], i) => <span key={i} className="pointer-events-none absolute font-display text-2xl font-black anim-pop" style={{ left: `${x}%`, top: `${y}%`, color: POINT_COLOR[phase!.type], textShadow: `0 0 18px ${POINT_COLOR[phase!.type]}` }}>✦</span>)}

          <div className="anim-pop relative grid w-full max-w-4xl items-center gap-3 overflow-hidden rounded-3xl border border-paper/15 bg-abyss/90 p-3 shadow-[0_24px_90px_rgba(0,0,0,.65)] sm:grid-cols-[0.82fr_1.18fr] sm:p-5">
            <div className="relative flex min-h-64 items-end justify-center overflow-hidden rounded-2xl border border-line/60 bg-panel2/45 sm:min-h-[360px]">
              <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 65%, ${POINT_COLOR[phase!.type]}35, transparent 55%)` }} />
              {reveal.leadImg ? (
                <img src={reveal.leadImg} alt={reveal.assignment.leadName} className="relative z-10 max-h-[340px] w-auto max-w-[92%] object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.75)]" />
              ) : (
                <div className="relative z-10 mb-12 rounded-2xl border border-gold/50 bg-gold/10 px-8 py-6 font-display text-4xl font-black tracking-widest text-gold shadow-2xl">FAMOUS<br/>STUDIO</div>
              )}
              <div className="absolute inset-x-2 bottom-2 z-20 rounded-xl border border-paper/10 bg-abyss/85 px-3 py-2 text-center backdrop-blur-sm">
                <div className="truncate font-display text-lg font-extrabold">{reveal.assignment.leadName}</div>
                <div className="text-[9px] font-bold tracking-wider text-paper/45">SKILL {reveal.assignment.skill} · TEAM SUPPORT +{reveal.support}</div>
              </div>
            </div>

            <div className="relative text-center sm:text-left">
              <div className="text-[10px] font-black tracking-[0.5em]" style={{ color: POINT_COLOR[phase!.type] }}>RUSH SPOTLIGHT</div>
              <div className="mt-1 font-display text-xl font-extrabold text-paper/80">{phase!.name}</div>
              <div className="relative mt-4 overflow-hidden rounded-2xl border border-paper/15 bg-panel/80 p-4 sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[18px] opacity-20" style={{ borderColor: POINT_COLOR[phase!.type] }} />
                <div className="text-[9px] font-extrabold tracking-[0.28em] text-paper/40">CONTRIBUTION</div>
                <div key={shown === reveal.total ? `done-${reveal.total}` : "count"} className={cn("mt-1 font-display text-7xl font-black tabular-nums sm:text-8xl", shown === reveal.total && "anim-pop")} style={{ color: POINT_COLOR[phase!.type], textShadow: `0 0 18px ${POINT_COLOR[phase!.type]}88, 0 8px 28px rgba(0,0,0,.7)` }}>+{shown}</div>
                <div className="mt-1 text-xs font-black tracking-[0.3em] text-paper/55">{POINT_LABEL[phase!.type].toUpperCase()}</div>
                <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-panel3 sm:mx-0"><div className="h-full rounded-full transition-all duration-100" style={{ width: `${Math.min(100, reveal.total ? (shown / reveal.total) * 100 : 0)}%`, background: POINT_COLOR[phase!.type], boxShadow: `0 0 16px ${POINT_COLOR[phase!.type]}` }} /></div>
                <div className="mt-2 text-[9px] font-bold text-paper/40">EXPECTED RANGE {reveal.min}–{reveal.max}{crunch ? " · CRUNCH ×1.25" : ""}</div>
              </div>

              {shown === reveal.total && !reveal.ideaDone && reveal.idea ? (
                <div className="anim-pop mt-3 rounded-xl border border-viol/50 bg-viol/10 p-3 text-left">
                  <div className="text-[10px] font-extrabold tracking-widest text-viol">💡 {reveal.idea.name.toUpperCase()} HAS AN IDEA</div>
                  <div className="mt-1 text-xs text-paper/60">Back the experiment with Research Data. More RD raises confidence; failure adds an editing note.</div>
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {[0.2, 0.5, 0.8].map((chance) => { const cost = rushResearchCost(reveal.idea!.skill, chance); return <button key={chance} disabled={run.rd < cost} onClick={() => answerIdea(chance)} className="btn-press rounded-lg border border-viol/40 bg-panel2 px-2 py-2 text-[10px] font-bold disabled:opacity-35"><span className="block text-viol">{Math.round(chance*100)}%</span><span className="text-[9px] text-paper/45">{cost} RD</span></button>; })}
                    <button onClick={() => answerIdea(null)} className="btn-press rounded-lg border border-line bg-panel2 px-2 py-2 text-[10px] font-bold text-paper/55">PASS</button>
                  </div>
                </div>
              ) : shown === reveal.total && reveal.ideaDone ? (
                <div className="anim-pop mt-3 text-center sm:text-left">
                  {reveal.message && <div className={cn("mb-2 text-xs font-bold", reveal.message.startsWith("BREAKTHROUGH") ? "text-mint" : "text-gold")}>{reveal.message}</div>}
                  {reveal.issues > 0 && <div className="mb-2 text-[10px] font-bold text-neon">+{reveal.issues} EDITING NOTE{reveal.issues > 1 ? "S" : ""}</div>}
                  <Btn big variant="primary" className="min-w-56" onClick={lockRush}>LOCK IN +{reveal.total}</Btn>
                </div>
              ) : <div className="mt-3 text-[10px] font-bold tracking-[0.3em] text-paper/35 animate-pulse">BUILDING CONTRIBUTION…</div>}
            </div>
          </div>
        </div>
'''
s = s[:start] + reveal_tail + s[end:]
f.write_text(s)

# ---------------------------------------------------------------- tests for new mechanics
p("game_source/src/engine/__tests__/rush-edit-tuning.test.ts").write_text(r'''import { describe, expect, it } from "vitest";
import { initialRun, tickEditDay, tickStudioDay } from "../state";
import { makeProject } from "../projects";
import { rushOutcomeRange } from "../studioOps";
import type { Draft } from "../data";

const draft = (): Draft => ({
  title: "Cut Test", medium: "tv", budget: "standard", scope: "standard", slot: "midnight",
  genres: ["shonen"], audience: "teens", protag: "kai", protagName: "Kai",
  secondary: "s_ren", pet: "none", villain: "v_oni", arcs: [], sliders: [50, 50, 50], season: 1,
});

describe("rush spectacle and live editing tuning", () => {
  it("high skill has a much stronger rush floor and ceiling", () => {
    const junior = rushOutcomeRange(30);
    const master = rushOutcomeRange(90);
    expect(master.min).toBeGreaterThan(junior.min + 20);
    expect(master.max).toBeGreaterThan(junior.max + 45);
  });

  it("a fully exhausted worker recovers fast enough to return in two game days", () => {
    let r = initialRun("Recovery Test", "steady");
    const st = { ...r.candidates[0], stamina: 0 };
    r = { ...r, staff: [st], staffResting: { [st.id]: true } };
    r = tickStudioDay(r).run;
    expect(r.staff[0].stamina).toBeGreaterThanOrEqual(38);
    r = tickStudioDay(r).run;
    expect(r.staffResting[st.id]).not.toBe(true);
    expect(r.staff[0].stamina).toBeGreaterThanOrEqual(68);
  });

  it("live editing clears notes and awards one RD for every note removed", () => {
    let r = initialRun("Edit Test", "steady");
    const st = { ...r.candidates[0], stamina: 100 };
    let project = makeProject(draft(), 0);
    project = { ...project, stage: "post", milestone: "edit", issues: 6, staffIds: [st.id] };
    r = { ...r, staff: [st], projects: [project], rd: 0 };
    const out = tickEditDay(r, project.id).run;
    const remaining = out.projects[0].issues;
    const cleared = 6 - remaining;
    expect(cleared).toBeGreaterThan(0);
    expect(out.rd).toBe(cleared);
  });
});
''')

print("Applied explosive character rush reveal, stronger skill ranges, frequent work bubbles, faster recovery and open-ended live Edit Bay")
