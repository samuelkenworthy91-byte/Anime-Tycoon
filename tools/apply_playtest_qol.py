from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def path(rel: str) -> Path:
    return ROOT / rel


def replace_once(rel: str, old: str, new: str) -> None:
    p = path(rel)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected block missing in {rel}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# ------------------------------------------------------------------ Draft billing names
replace_once(
    "game_source/src/engine/data.ts",
    "  protag: string;\n  protagName: string;\n  secondary: string;\n  pet: string;\n  villain: string;",
    "  protag: string;\n  protagName: string;\n  /** Final billing names are locked after editing; optional keeps old saves valid. */\n  secondaryName?: string;\n  petName?: string;\n  villainName?: string;\n  secondary: string;\n  pet: string;\n  villain: string;",
)

# ------------------------------------------------------------------ milestone outcome can rename + spend RD
replace_once(
    "game_source/src/engine/projects.ts",
    "  rdGained: number;\n  /** direction slider set during the sprint's planning meeting */",
    "  rdGained: number;\n  /** Research Data deliberately invested in rush boost attempts. */\n  rdSpent?: number;\n  /** Final title/cast billing locked after the edit bay. */\n  rename?: Partial<Pick<Draft, \"title\" | \"protagName\" | \"secondaryName\" | \"petName\" | \"villainName\">>;\n  /** direction slider set during the sprint's planning meeting */",
)
replace_once(
    "game_source/src/engine/projects.ts",
    "  const draft: Draft = o.slider\n    ? { ...p.draft, sliders: p.draft.sliders.map((v, i) => (i === o.slider!.index ? o.slider!.value : v)) as [number, number, number] }\n    : p.draft;",
    "  const directed: Draft = o.slider\n    ? { ...p.draft, sliders: p.draft.sliders.map((v, i) => (i === o.slider!.index ? o.slider!.value : v)) as [number, number, number] }\n    : p.draft;\n  const draft: Draft = o.rename ? { ...directed, ...o.rename } : directed;",
)

# ------------------------------------------------------------------ contract/showrunner + rush helper maths
path("game_source/src/engine/studioOps.ts").write_text('''import { staffPoint, type Contract, type PointType, type Staff } from "./data";\n\nexport interface ContractAssignment {\n  id: string;\n  contract: Contract;\n  staffIds: string[];\n  /** Founding showrunner can personally take one of the three seats. */\n  showrunner?: boolean;\n  startWeek: number;\n  dueWeek: number;\n  progress: number;\n}\n\nexport interface TrainingJob {\n  id: string;\n  staffId: string;\n  staffName: string;\n  focus: PointType;\n  tier: number;\n  startWeek: number;\n  completesWeek: number;\n}\n\nexport interface ResearchJob {\n  id: string;\n  researchId: string;\n  name: string;\n  startWeek: number;\n  completesWeek: number;\n  rdCost: number;\n}\n\nexport const trainingWeeks = (tier: number) => Math.max(2, 5 - Math.max(1, tier));\nexport const researchWeeks = (rd: number, archiveTier: number) => Math.max(2, Math.round(2 + rd / 18) - archiveTier);\n\nexport function showrunnerContractSkill(showrunner: string, showsMade: number, type: PointType): number {\n  const base = Math.min(90, 50 + showsMade * 2);\n  const speciality =\n    showrunner === "steady" && type === "art" ? 12\n    : showrunner === "vision" && type === "story" ? 12\n    : showrunner === "producer" ? 8\n    : showrunner === "marketer" && type === "sound" ? 8\n    : 0;\n  return Math.min(99, base + speciality);\n}\n\nexport function contractWeeklyOutput(contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0): number {\n  const pipeline = research.includes("pipeline") ? 1.12 : 1;\n  const base = 4;\n  const runner = showrunnerSkill > 0 ? showrunnerSkill * 0.16 : 0;\n  return Math.max(\n    1,\n    Math.round((base + runner + crew.reduce((a, s) => a + staffPoint(s, contract.type) * (0.14 + s.stamina / 1000), 0)) * pipeline)\n  );\n}\n\nexport const projectedContractTotal = (contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0) =>\n  contractWeeklyOutput(contract, crew, research, showrunnerSkill) * contract.weeks;\n\n/** Better staff need less Research Data to reach the same boost confidence. */\nexport function rushResearchCost(skill: number, chance: number): number {\n  const base = chance >= 0.8 ? 14 : chance >= 0.5 ? 8 : 4;\n  const expertise = Math.max(0.48, 1.15 - Math.min(99, skill) / 160);\n  return Math.max(1, Math.round(base * expertise));\n}\n\nexport const rushStreamPoint = (skill: number, roll: number) =>\n  Math.max(2, Math.round(Math.min(99, skill) * (0.045 + Math.max(0, Math.min(1, roll)) * 0.035)));\n\nexport const rushBoostPoint = (skill: number) => Math.max(6, Math.round(4 + Math.min(99, skill) * 0.13));\n''')

# ------------------------------------------------------------------ state contract plumbing + billing
replace_once(
    "game_source/src/engine/state.ts",
    "  contractWeeklyOutput,\n  researchWeeks,",
    "  contractWeeklyOutput,\n  showrunnerContractSkill,\n  researchWeeks,",
)
replace_once(
    "game_source/src/engine/state.ts",
    "    contractJobs: Array.isArray(r.contractJobs) ? r.contractJobs : [],",
    "    contractJobs: Array.isArray(r.contractJobs) ? r.contractJobs.map((j) => ({ ...j, showrunner: !!j.showrunner })) : [],",
)
replace_once(
    "game_source/src/engine/state.ts",
    "        const crew = staffArr.filter((s) => job.staffIds.includes(s.id));\n        const progress = job.progress + contractWeeklyOutput(job.contract, crew, research);",
    "        const crew = staffArr.filter((s) => job.staffIds.includes(s.id));\n        const runnerSkill = job.showrunner ? showrunnerContractSkill(r.showrunner, r.showsMade, job.contract.type) : 0;\n        const progress = job.progress + contractWeeklyOutput(job.contract, crew, research, runnerSkill);",
)
replace_once(
    "game_source/src/engine/state.ts",
    '''export function startContractAssignment(r: RunState, contract: Contract, staffIds: string[]): RunState | null {\n  const ids = [...new Set(staffIds)].slice(0, 3);\n  if (ids.length < 1) return null;\n  if (!r.contracts.some((c) => c.id === contract.id)) return null;\n  for (const id of ids) if (staffBusyReason(r, id)) return null;\n  const job: ContractAssignment = {\n    id: `job_${contract.id}_${r.week}`,\n    contract,\n    staffIds: ids,\n    startWeek: r.week,\n    dueWeek: r.week + contract.weeks,\n    progress: 0,\n  };\n  return {\n    ...r,\n    contracts: r.contracts.filter((c) => c.id !== contract.id),\n    contractJobs: [...(r.contractJobs ?? []), job],\n    notices: [...r.notices, `📋 ${contract.name} assigned to ${ids.length} staff — due ${dateLabel(job.dueWeek)}. The calendar does not jump.`],\n  };\n}''',
    '''export function startContractAssignment(r: RunState, contract: Contract, staffIds: string[], showrunner = false): RunState | null {\n  const ids = [...new Set(staffIds)].slice(0, showrunner ? 2 : 3);\n  if (ids.length + (showrunner ? 1 : 0) < 1) return null;\n  if (!r.contracts.some((c) => c.id === contract.id)) return null;\n  for (const id of ids) if (staffBusyReason(r, id)) return null;\n  if (showrunner && (r.contractJobs ?? []).some((j) => j.showrunner)) return null;\n  const job: ContractAssignment = {\n    id: `job_${contract.id}_${r.week}`,\n    contract,\n    staffIds: ids,\n    showrunner,\n    startWeek: r.week,\n    dueWeek: r.week + contract.weeks,\n    progress: 0,\n  };\n  const seats = ids.length + (showrunner ? 1 : 0);\n  return {\n    ...r,\n    contracts: r.contracts.filter((c) => c.id !== contract.id),\n    contractJobs: [...(r.contractJobs ?? []), job],\n    notices: [...r.notices, `📋 ${contract.name} assigned to ${seats} contributor${seats === 1 ? "" : "s"}${showrunner ? " including the showrunner" : ""} — due ${dateLabel(job.dueWeek)}.`],\n  };\n}''',
)
replace_once(
    "game_source/src/engine/state.ts",
    "    rd: r.rd + Math.round((o.rdGained + (o.squashed ?? 0) * 2) * fx.rdMult),",
    "    rd: Math.max(0, r.rd - (o.rdSpent ?? 0)) + Math.round((o.rdGained + (o.squashed ?? 0) * 2) * fx.rdMult),",
)
replace_once(
    "game_source/src/engine/state.ts",
    '''    secondary: draft.secondary,\n    secondaryName: castById(draft.secondary).name,\n    pet: draft.pet,\n    petName: draft.pet === "none" ? "" : castById(draft.pet).name,\n    villain: draft.villain,\n    villainName: castById(draft.villain).name,''',
    '''    secondary: draft.secondary,\n    secondaryName: draft.secondaryName ?? castById(draft.secondary).name,\n    pet: draft.pet,\n    petName: draft.petName ?? (draft.pet === "none" ? "" : castById(draft.pet).name),\n    villain: draft.villain,\n    villainName: draft.villainName ?? castById(draft.villain).name,''',
)

# ------------------------------------------------------------------ Create: no hero-name entry; selected protagonist supplies working name
replace_once(
    "game_source/src/components/Create.tsx",
    '''                  onClick={() => {\n                    sfx.click();\n                    const pool = castRow.list;\n                    set({ [castRow.role]: pool[Math.floor(Math.random() * pool.length)].id } as Partial<Draft>);\n                  }}''',
    '''                  onClick={() => {\n                    sfx.click();\n                    const pool = castRow.list;\n                    const pick = pool[Math.floor(Math.random() * pool.length)];\n                    if (castRow.role === "protag") set({ protag: pick.id, protagName: pick.name });\n                    else set({ [castRow.role]: pick.id } as Partial<Draft>);\n                  }}''',
)
replace_once(
    "game_source/src/components/Create.tsx",
    '''                    onPick={() => {\n                      sfx.select();\n                      set({ [castRow.role]: m.id } as Partial<Draft>);\n                    }}''',
    '''                    onPick={() => {\n                      sfx.select();\n                      if (castRow.role === "protag") set({ protag: m.id, protagName: m.name });\n                      else set({ [castRow.role]: m.id } as Partial<Draft>);\n                    }}''',
)
replace_once(
    "game_source/src/components/Create.tsx",
    '''              {castRow.role === "protag" && (\n                <div className="flex flex-wrap items-center gap-2 pt-1">\n                  <span className="text-xs font-bold text-paper/50">HERO NAME:</span>\n                  <input\n                    value={d.protagName}\n                    onChange={(e) => set({ protagName: e.target.value.slice(0, 18) })}\n                    className="ink-input w-48 px-3 py-2 text-sm font-bold"\n                  />\n                  <span className="text-[10px] italic text-paper/40">“{protag.tag}”</span>\n                </div>\n              )}''',
    '''              {castRow.role === "protag" && (\n                <div className="rounded-xl border border-cyanx/25 bg-cyanx/5 px-3 py-2 text-[10px] text-paper/55">\n                  Cast use their working names during production. After the edit bay you can rename the lead, support, mascot, villain and the show itself before marketing begins.\n                </div>\n              )}''',
)

# ------------------------------------------------------------------ Contract screen: back path + showrunner seat
path("game_source/src/components/ContractJob.tsx").write_text('''import { useMemo, useState } from "react";\nimport { Briefcase, Calendar, Check, ChevronLeft, Database, UserRound, Users } from "lucide-react";\nimport { Btn } from "../fx/fx";\nimport { sfx } from "../engine/audio";\nimport { POINT_COLOR, POINT_LABEL, ROLE_LABEL, SHOWRUNNERS, formatGBP, staffPoint, type Contract } from "../engine/data";\nimport { staffBusyReason, type RunState } from "../engine/state";\nimport { projectedContractTotal, showrunnerContractSkill } from "../engine/studioOps";\nimport { cn } from "../utils/cn";\n\nexport default function ContractJob({ run, contract, onDone, onBack }: {\n  run: RunState;\n  contract: Contract;\n  paused?: boolean;\n  onDone: (selection: { staffIds: string[]; showrunner: boolean }) => void;\n  onBack: () => void;\n}) {\n  const [selected, setSelected] = useState<string[]>([]);\n  const [showrunnerSelected, setShowrunnerSelected] = useState(false);\n  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const runnerBusy = run.contractJobs.some((j) => j.showrunner);\n  const runnerSkill = showrunnerContractSkill(run.showrunner, run.showsMade, contract.type);\n  const crew = useMemo(() => run.staff.filter((s) => selected.includes(s.id)), [run.staff, selected]);\n  const seats = selected.length + (showrunnerSelected ? 1 : 0);\n  const projected = projectedContractTotal(contract, crew, run.research, showrunnerSelected ? runnerSkill : 0);\n  const likely = projected >= contract.target;\n\n  const toggle = (id: string) => {\n    if (staffBusyReason(run, id)) return;\n    sfx.click();\n    setSelected((old) => old.includes(id) ? old.filter((x) => x !== id) : seats >= 3 ? old : [...old, id]);\n  };\n\n  const toggleRunner = () => {\n    if (runnerBusy && !showrunnerSelected) return;\n    if (!showrunnerSelected && seats >= 3) return;\n    sfx.click();\n    setShowrunnerSelected((v) => !v);\n  };\n\n  return (\n    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">\n      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />\n      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">\n        <button onClick={() => { sfx.back(); onBack(); }} className="btn-press flex items-center gap-1 rounded-lg border border-line bg-panel2 px-2 py-1 text-[10px] font-bold text-paper/70 hover:border-cyanx/50"><ChevronLeft size={12} /> BACK</button>\n        <span className="rounded-md bg-cyanx px-2 py-0.5 text-[10px] font-bold text-ink">CONTRACT</span>\n        <span className="truncate font-display text-sm font-extrabold">{contract.name}</span>\n        <span className="ml-auto text-[11px] font-bold" style={{ color: POINT_COLOR[contract.type] }}>{contract.target} {POINT_LABEL[contract.type]}</span>\n      </div>\n\n      <div className="nice-scroll relative z-10 flex-1 overflow-y-auto p-4">\n        <div className="mx-auto max-w-2xl space-y-3">\n          <div className="ink-card p-4">\n            <div className="flex items-start gap-3">\n              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel3" style={{ color: POINT_COLOR[contract.type] }}><Briefcase size={21} /></span>\n              <div className="min-w-0 flex-1">\n                <h2 className="font-display text-xl font-extrabold">Assign a contract team</h2>\n                <p className="mt-1 text-xs text-paper/65">Pick up to three contributors. Staff are unavailable elsewhere until it finishes; your showrunner can personally take one seat too.</p>\n                <div className="mt-2 flex flex-wrap gap-2 text-xs">\n                  <span className="ink-chip px-2 py-1 font-bold text-gold">{formatGBP(contract.pay)}</span>\n                  <span className="ink-chip flex items-center gap-1 px-2 py-1 font-bold text-viol"><Database size={12} /> +{contract.rd} RD</span>\n                  <span className="ink-chip flex items-center gap-1 px-2 py-1 font-bold text-cyanx"><Calendar size={12} /> {contract.weeks} wk deadline</span>\n                </div>\n              </div>\n            </div>\n          </div>\n\n          <div className="ink-card p-3">\n            <div className="mb-2 flex items-center gap-2"><Users size={14} className="text-cyanx" /><span className="font-display text-sm font-extrabold">TEAM {seats}/3</span></div>\n            <div className="space-y-1.5">\n              <button disabled={runnerBusy && !showrunnerSelected} onClick={toggleRunner} className={cn("btn-press flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left", showrunnerSelected ? "border-gold/70 bg-gold/10" : runnerBusy ? "border-line/40 bg-panel2/30 opacity-50" : "border-gold/35 bg-panel2/50 hover:border-gold/70")}>\n                <span className={cn("flex h-5 w-5 items-center justify-center rounded border", showrunnerSelected ? "border-gold bg-gold text-ink" : "border-line")}>{showrunnerSelected && <Check size={13} />}</span>\n                <UserRound size={17} className="text-gold" />\n                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{runner.name} · SHOWRUNNER</span><span className="text-[10px] text-paper/45">{runner.title} · {POINT_LABEL[contract.type]} {runnerSkill}{runnerBusy ? " · already on a contract" : ""}</span></span>\n                <span className="font-display text-sm font-extrabold text-gold">{runnerSkill}</span>\n              </button>\n\n              {run.staff.map((s) => {\n                const busy = staffBusyReason(run, s.id);\n                const on = selected.includes(s.id);\n                const skill = staffPoint(s, contract.type);\n                return (\n                  <button key={s.id} disabled={!!busy && !on} onClick={() => toggle(s.id)} className={cn("btn-press flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left", on ? "border-mint/60 bg-mint/10" : busy ? "border-line/40 bg-panel2/30 opacity-50" : "border-line bg-panel2/50 hover:border-cyanx/60")}>\n                    <span className={cn("flex h-5 w-5 items-center justify-center rounded border", on ? "border-mint bg-mint text-ink" : "border-line")}>{on && <Check size={13} />}</span>\n                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{s.name}</span><span className="text-[10px] text-paper/45">{ROLE_LABEL[s.role]} · {POINT_LABEL[contract.type]} {skill}{busy ? ` · ${busy}` : ""}</span></span>\n                    <span className="font-display text-sm font-extrabold" style={{ color: POINT_COLOR[contract.type] }}>{skill}</span>\n                  </button>\n                );\n              })}\n              {run.staff.length === 0 && <div className="py-3 text-center text-xs text-paper/45">Your showrunner can handle a small contract solo.</div>}\n            </div>\n          </div>\n\n          <div className={cn("rounded-xl border p-3", likely ? "border-mint/50 bg-mint/10" : "border-gold/50 bg-gold/10")}>\n            <div className="flex items-center justify-between text-xs"><span className="font-bold">Projected output by deadline</span><span className={cn("font-display text-lg font-extrabold", likely ? "text-mint" : "text-gold")}>{projected}/{contract.target}</span></div>\n            <div className="mt-1 text-[10px] text-paper/55">Estimate uses current skill, stamina, showrunner contribution and Digital Pipeline research. The job can finish early.</div>\n          </div>\n\n          <div className="grid grid-cols-[auto_1fr] gap-2">\n            <Btn variant="ghost" onClick={() => { sfx.back(); onBack(); }}><ChevronLeft size={16} /> CANCEL</Btn>\n            <Btn big variant="cyan" className="w-full" disabled={seats === 0} onClick={() => { sfx.phase(); onDone({ staffIds: selected, showrunner: showrunnerSelected }); }}>ASSIGN & RETURN TO STUDIO</Btn>\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n}\n''')

# ------------------------------------------------------------------ App contract navigation
replace_once(
    "game_source/src/App.tsx",
    "    (staffIds: string[]) => {\n      if (!run || !contract) return;\n      const next = startContractAssignment(run, contract, staffIds);",
    "    (selection: { staffIds: string[]; showrunner: boolean }) => {\n      if (!run || !contract) return;\n      const next = startContractAssignment(run, contract, selection.staffIds, selection.showrunner);",
)
replace_once(
    "game_source/src/App.tsx",
    "          <ContractJob run={run} contract={contract} paused={paused} onDone={finishContract} />",
    '''          <ContractJob\n            run={run}\n            contract={contract}\n            paused={paused}\n            onDone={finishContract}\n            onBack={() => { setContract(null); setScreen("office"); }}\n          />''',
)

# ------------------------------------------------------------------ Produce imports/state
replace_once(
    "game_source/src/components/Produce.tsx",
    "  ChevronLeft,\n  Check,\n} from \"lucide-react\";",
    "  ChevronLeft,\n  Check,\n  Database,\n  HelpCircle,\n  Lightbulb,\n} from \"lucide-react\";",
)
replace_once(
    "game_source/src/components/Produce.tsx",
    "  SHOWRUNNERS,\n  formatGBP,",
    "  SHOWRUNNERS,\n  castById,\n  formatGBP,",
)
replace_once(
    "game_source/src/components/Produce.tsx",
    "import { cn } from \"../utils/cn\";",
    "import { cn } from \"../utils/cn\";\nimport { rushBoostPoint, rushResearchCost, rushStreamPoint } from \"../engine/studioOps\";",
)
replace_once(
    "game_source/src/components/Produce.tsx",
    "const CRUNCH_COST = 9_000;",
    '''const CRUNCH_COST = 9_000;\n\ntype SectionLead = { name: string; skill: number; type: PointType; cost: number };\ntype BoostPrompt = { name: string; skill: number; type: PointType } | null;''',
)
replace_once(
    "game_source/src/components/Produce.tsx",
    "  const [crunches, setCrunches] = useState(0);\n  const floorRef = useRef<FloorHandle>(null);",
    '''  const [crunches, setCrunches] = useState(0);\n  const [lead, setLead] = useState<SectionLead | null>(null);\n  const [leadToast, setLeadToast] = useState<{ name: string; pts: number } | null>(null);\n  const [rdSpent, setRdSpent] = useState(0);\n  const [rushIssues, setRushIssues] = useState(0);\n  const [boostPrompt, setBoostPrompt] = useState<BoostPrompt>(null);\n  const [boostResult, setBoostResult] = useState<{ success: boolean; text: string } | null>(null);\n  const streamTriggered = useRef(new Set<number>());\n  const boostAsked = useRef(false);\n  const [finalNames, setFinalNames] = useState(() => ({\n    title: project.draft.title,\n    protagName: project.draft.protagName || castById(project.draft.protag).name,\n    secondaryName: project.draft.secondaryName ?? castById(project.draft.secondary).name,\n    petName: project.draft.petName ?? (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),\n    villainName: project.draft.villainName ?? castById(project.draft.villain).name,\n  }));\n  const floorRef = useRef<FloorHandle>(null);''',
)

# leader selection stores a lead; points arrive later in five streams
replace_once(
    "game_source/src/components/Produce.tsx",
    '''  const takeSpecialist = (skill: number, cost: number) => {\n    if (!phase) return;\n    sfx.select();\n    const add = Math.round(skill * 0.42 + 4);\n    setBoost((b) => ({ ...b, [phase.type]: b[phase.type] + add }));\n    setSpent((s) => s + cost);\n    setMode("floor");\n  };''',
    '''  const takeSpecialist = (name: string, skill: number, cost: number) => {\n    if (!phase) return;\n    sfx.select();\n    setLead({ name, skill: Math.round(skill), type: phase.type, cost });\n    setSpent((s) => s + cost);\n    setMode("floor");\n  };''',
)

# progress drives five lead bursts + one optional employee boost request
replace_once(
    "game_source/src/components/Produce.tsx",
    '''  const crunch = () => {\n    if (run.cash - spent < CRUNCH_COST) return;\n    setSpent((s) => s + CRUNCH_COST);\n    setCrunches((c) => c + 1);\n    floorRef.current?.crunch();\n  };''',
    '''  const crunch = () => {\n    if (run.cash - spent < CRUNCH_COST) return;\n    setSpent((s) => s + CRUNCH_COST);\n    setCrunches((c) => c + 1);\n    floorRef.current?.crunch();\n  };\n\n  const handleProgress = (t: FloorTotals, pct: number) => {\n    setLive(t);\n    if (isEdit || !phase || !lead) return;\n    const thresholds = [0.12, 0.26, 0.40, 0.56, 0.72];\n    thresholds.forEach((th, i) => {\n      if (pct < th || streamTriggered.current.has(i)) return;\n      streamTriggered.current.add(i);\n      const pts = rushStreamPoint(lead.skill, Math.random());\n      setBoost((b) => ({ ...b, [lead.type]: b[lead.type] + pts }));\n      setLeadToast({ name: lead.name, pts });\n      window.setTimeout(() => setLeadToast((x) => x?.name === lead.name && x.pts === pts ? null : x), 900);\n      sfx.coin();\n    });\n    if (!boostAsked.current && pct >= 0.50 && !boostPrompt) {\n      boostAsked.current = true;\n      const candidates = team.map((s) => ({ name: s.name, skill: Math.round(staffPoint(s, phase.type)), type: phase.type }));\n      candidates.push({ name: runner.name, skill: Math.min(99, 46 + run.showsMade * 2), type: phase.type });\n      candidates.sort((a, b) => b.skill - a.skill);\n      setBoostPrompt(candidates[0] ?? { name: lead.name, skill: lead.skill, type: lead.type });\n      sfx.select();\n    }\n  };\n\n  const attemptBoost = (chance: number) => {\n    if (!boostPrompt) return;\n    const cost = rushResearchCost(boostPrompt.skill, chance);\n    if (run.rd - rdSpent < cost) return;\n    setRdSpent((v) => v + cost);\n    const success = Math.random() < chance;\n    if (success) {\n      const reward = rushBoostPoint(boostPrompt.skill);\n      setBoost((b) => ({ ...b, [boostPrompt.type]: b[boostPrompt.type] + reward }));\n      setBoostResult({ success: true, text: `${boostPrompt.name}'s experiment lands: +${reward} ${POINT_LABEL[boostPrompt.type]} points.` });\n      sfx.fanfare();\n    } else {\n      setRushIssues((v) => v + 1);\n      setBoostResult({ success: false, text: `${boostPrompt.name}'s experiment misses and creates an extra editing note.` });\n      sfx.fail();\n    }\n  };\n\n  const closeBoost = () => { setBoostPrompt(null); setBoostResult(null); sfx.phase(); };''',
)

# milestone outcome carries RD spent / rename
replace_once(
    "game_source/src/components/Produce.tsx",
    '''        rdGained: 0,\n        /* Never farm extra RD by clearing more visual notes than the project owns. */''',
    '''        rdGained: 0,\n        rename: {\n          title: finalNames.title.trim() || project.draft.title,\n          protagName: finalNames.protagName.trim() || castById(project.draft.protag).name,\n          secondaryName: finalNames.secondaryName.trim() || castById(project.draft.secondary).name,\n          petName: finalNames.petName.trim() || (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),\n          villainName: finalNames.villainName.trim() || castById(project.draft.villain).name,\n        },\n        /* Never farm extra RD by clearing more visual notes than the project owns. */''',
)
replace_once(
    "game_source/src/components/Produce.tsx",
    '''        issues: t.issues,\n        spent,\n        rdGained: t.squashed,''',
    '''        issues: t.issues + rushIssues,\n        spent,\n        rdGained: t.squashed,\n        rdSpent,''',
)

# lead buttons now launch streams, not an instant lump
replace_once(
    "game_source/src/components/Produce.tsx",
    "onClick={() => takeSpecialist(c.skill * (0.55 + c.stamina / 220), 0)}",
    "onClick={() => takeSpecialist(c.name, c.skill * (0.55 + c.stamina / 220), 0)}",
)
replace_once(
    "game_source/src/components/Produce.tsx",
    "onClick={() => takeSpecialist(78, outsourceCost)}",
    "onClick={() => takeSpecialist(\"Famous Studio\", 78, outsourceCost)}",
)
replace_once(
    "game_source/src/components/Produce.tsx",
    "onClick={() => takeSpecialist(40 + run.showsMade * 3, 0)}",
    "onClick={() => takeSpecialist(runner.name, 40 + run.showsMade * 3, 0)}",
)
replace_once(
    "game_source/src/components/Produce.tsx",
    "              Who leads the {POINT_LABEL[phase.type].toLowerCase()} work? They set the opening point bonus.",
    "              Choose the section lead. They contribute their work in up to five point bursts while the full team keeps production moving.",
)

# crunch tooltip + paused boost modal + lead stream visual
replace_once(
    "game_source/src/components/Produce.tsx",
    '''            {!isEdit && (\n              <button\n                onClick={crunch}\n                disabled={run.cash - spent < CRUNCH_COST}\n                className={cn(\n                  "btn-press ml-auto flex items-center gap-1 rounded-lg border border-gold/60 bg-gold/15 px-2.5 py-1 text-[10px] font-extrabold text-gold",\n                  run.cash - spent < CRUNCH_COST && "pointer-events-none opacity-40"\n                )}\n              >\n                <Zap size={12} /> CRUNCH {formatGBP(CRUNCH_COST)}\n              </button>\n            )}''',
    '''            {!isEdit && (\n              <div className="ml-auto flex items-center gap-1.5">\n                <span className="cursor-help text-paper/45 hover:text-gold" title="Crunch spends £9,000 to flood the team with extra work for six seconds. It can generate more points if the crew keeps up, but bug risk nearly doubles and overwhelmed teams may miss work." aria-label="What does Crunch do?"><HelpCircle size={13} /></span>\n                <button onClick={crunch} disabled={run.cash - spent < CRUNCH_COST} className={cn("btn-press flex items-center gap-1 rounded-lg border border-gold/60 bg-gold/15 px-2.5 py-1 text-[10px] font-extrabold text-gold", run.cash - spent < CRUNCH_COST && "pointer-events-none opacity-40")}>\n                  <Zap size={12} /> CRUNCH {formatGBP(CRUNCH_COST)}\n                </button>\n              </div>\n            )}''',
)
replace_once(
    "game_source/src/components/Produce.tsx",
    '''          <div className="min-h-0 flex-1">\n            <ProductionFloor''',
    '''          <div className="relative min-h-0 flex-1">\n            <ProductionFloor''',
)
replace_once(
    "game_source/src/components/Produce.tsx",
    '''              paused={paused}\n              onProgress={(t) => setLive(t)}\n              onDone={onFloorDone}\n            />\n          </div>''',
    '''              paused={paused || !!boostPrompt}\n              onProgress={handleProgress}\n              onDone={onFloorDone}\n            />\n            {leadToast && (\n              <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 anim-pop rounded-xl border border-gold/60 bg-abyss/90 px-4 py-2 text-center shadow-xl">\n                <div className="text-[9px] font-bold tracking-widest text-paper/45">SECTION LEAD</div>\n                <div className="font-display text-sm font-extrabold text-gold">{leadToast.name} +{leadToast.pts} {phase ? POINT_LABEL[phase.type] : ""}</div>\n              </div>\n            )}\n            {boostPrompt && (\n              <div className="absolute inset-0 z-20 flex items-center justify-center bg-abyss/82 p-3 backdrop-blur-sm">\n                <div className="anim-pop ink-card w-full max-w-md p-4">\n                  <div className="flex items-center gap-2 text-viol"><Lightbulb size={17} /><span className="text-[10px] font-extrabold tracking-[0.25em]">STAFF BOOST IDEA</span></div>\n                  <h3 className="mt-1 font-display text-xl font-extrabold">{boostPrompt.name} wants to try something</h3>\n                  <p className="mt-1 text-xs text-paper/60">Back the experiment with Research Data. Skilled staff need less RD for the same confidence. Success adds quality; failure creates an editing note.</p>\n                  {boostResult ? (\n                    <div className={cn("mt-3 rounded-xl border p-3 text-sm font-bold", boostResult.success ? "border-mint/50 bg-mint/10 text-mint" : "border-neon/50 bg-neon/10 text-neon2")}>\n                      {boostResult.text}\n                      <Btn big variant="primary" className="mt-3 w-full" onClick={closeBoost}>BACK TO THE RUSH</Btn>\n                    </div>\n                  ) : (\n                    <div className="mt-3 space-y-2">\n                      {([0.2, 0.5, 0.8] as const).map((chance) => {\n                        const cost = rushResearchCost(boostPrompt.skill, chance);\n                        return <button key={chance} disabled={run.rd - rdSpent < cost} onClick={() => attemptBoost(chance)} className={cn("btn-press flex w-full items-center gap-3 rounded-xl border border-line bg-panel2/70 p-3 text-left hover:border-viol/60", run.rd - rdSpent < cost && "pointer-events-none opacity-40")}><Database size={17} className="text-viol" /><div className="flex-1"><div className="text-sm font-extrabold">{Math.round(chance * 100)}% CONFIDENCE</div><div className="text-[10px] text-paper/45">Skill {boostPrompt.skill}</div></div><span className="font-display text-sm font-extrabold text-viol">{cost} RD</span></button>;\n                      })}\n                      <button onClick={closeBoost} className="btn-press w-full rounded-xl border border-line px-3 py-2 text-xs font-bold text-paper/55">PASS — KEEP THE PLAN</button>\n                      <div className="text-center text-[10px] text-paper/40">Research available: {Math.max(0, run.rd - rdSpent)} RD</div>\n                    </div>\n                  )}\n                </div>\n              </div>\n            )}\n          </div>''',
)

# edit completion is the rename/billing gate
replace_once(
    "game_source/src/components/Produce.tsx",
    '''            {isEdit ? (\n              <div className="mt-3">\n                <div className="font-display text-3xl font-extrabold text-mint">{totals.squashed}</div>\n                <div className="text-[10px] font-bold text-paper/50">EDITING NOTES FIXED</div>\n              </div>\n            ) : (''',
    '''            {isEdit ? (\n              <div className="mt-3 text-left">\n                <div className="text-center"><div className="font-display text-3xl font-extrabold text-mint">{totals.squashed}</div><div className="text-[10px] font-bold text-paper/50">EDITING NOTES FIXED</div></div>\n                <div className="mt-3 rounded-xl border border-cyanx/30 bg-cyanx/5 p-3">\n                  <div className="text-center text-[10px] font-extrabold tracking-[0.2em] text-cyanx">LOCK PICTURE · FINAL BILLING</div>\n                  <div className="mt-2 grid gap-2 sm:grid-cols-2">\n                    {[\n                      ["title", "SHOW TITLE", 32],\n                      ["protagName", "LEAD", 18],\n                      ["secondaryName", "SUPPORT", 18],\n                      ["petName", "MASCOT", 18],\n                      ["villainName", "VILLAIN", 18],\n                    ].map(([key, label, max]) => (\n                      <label key={String(key)} className={key === "title" ? "sm:col-span-2" : ""}>\n                        <span className="mb-1 block text-[9px] font-bold text-paper/45">{label}</span>\n                        <input value={finalNames[key as keyof typeof finalNames]} maxLength={Number(max)} onChange={(e) => setFinalNames((n) => ({ ...n, [key]: e.target.value }))} className="ink-input w-full px-2.5 py-2 text-sm font-bold" />\n                      </label>\n                    ))}\n                  </div>\n                  <div className="mt-2 text-center text-[9px] text-paper/40">These names go on the poster, franchise history and future sequels.</div>\n                </div>\n              </div>\n            ) : (''',
)
replace_once(
    "game_source/src/components/Produce.tsx",
    '''            <Btn big variant="primary" className="mt-4 w-full" onClick={finish}>\n              <Check size={18} /> BACK TO THE STUDIO\n            </Btn>''',
    '''            <Btn big variant="primary" className="mt-4 w-full" onClick={finish}>\n              <Check size={18} /> {isEdit ? "LOCK NAMES & RETURN TO STUDIO" : "BACK TO THE STUDIO"}\n            </Btn>''',
)

# ------------------------------------------------------------------ Release shows final billing names
replace_once(
    "game_source/src/components/Release.tsx",
    '''  const cast = [\n    { m: protag, tag: "LEAD" },\n    { m: sec, tag: "SUPPORT" },\n    { m: pet, tag: "MASCOT" },\n    { m: vil, tag: "VILLAIN" },\n  ];''',
    '''  const cast = [\n    { m: protag, tag: "LEAD", name: draft.protagName || protag.name },\n    { m: sec, tag: "SUPPORT", name: draft.secondaryName ?? sec.name },\n    { m: pet, tag: "MASCOT", name: draft.petName ?? pet.name },\n    { m: vil, tag: "VILLAIN", name: draft.villainName ?? vil.name },\n  ];''',
)
replace_once(
    "game_source/src/components/Release.tsx",
    '''                    name={c.m.name}\n                    alt={c.m.name}''',
    '''                    name={c.name}\n                    alt={c.name}''',
)
replace_once(
    "game_source/src/components/Release.tsx",
    '''                <div className="mt-0.5 text-center text-[11px] font-bold text-cyanx">\n                  {draft.protagName} · {MEDIUMS[draft.medium].label}\n                </div>''',
    '''                <div className="mt-0.5 text-center text-[11px] font-bold text-cyanx">\n                  {draft.protagName} · {MEDIUMS[draft.medium].label}\n                </div>\n                <div className="mt-0.5 text-center text-[8px] text-paper/45">{draft.secondaryName ?? sec.name} · {draft.petName ?? pet.name} · {draft.villainName ?? vil.name}</div>''',
)

# ------------------------------------------------------------------ tests
path("game_source/src/engine/__tests__/playtest-qol.test.ts").write_text('''import { describe, expect, it } from "vitest";\nimport { initialRun, startContractAssignment } from "../state";\nimport { makeProject, applyMilestoneOutcome } from "../projects";\nimport { freshDraft } from "../../components/Create";\nimport { rushResearchCost, rushStreamPoint, showrunnerContractSkill } from "../studioOps";\n\ndescribe("playtest QoL pass", () => {\n  it("lets the showrunner take a contract without staff", () => {\n    const r = initialRun("Test", "producer");\n    const c = r.contracts[0];\n    const next = startContractAssignment(r, c, [], true);\n    expect(next).not.toBeNull();\n    expect(next!.contractJobs[0].showrunner).toBe(true);\n    expect(next!.contractJobs[0].staffIds).toEqual([]);\n  });\n\n  it("showrunner contract skill has a useful floor", () => {\n    expect(showrunnerContractSkill("producer", 0, "story")).toBeGreaterThanOrEqual(50);\n  });\n\n  it("better rush leaders need less RD for the same confidence", () => {\n    expect(rushResearchCost(90, 0.8)).toBeLessThan(rushResearchCost(25, 0.8));\n  });\n\n  it("lead streams add positive points", () => {\n    expect(rushStreamPoint(70, 0.5)).toBeGreaterThan(0);\n  });\n\n  it("edit milestone can lock final title and cast names", () => {\n    const r = initialRun("Test", "steady");\n    const d = freshDraft(r);\n    let p = makeProject(d, 0);\n    p = { ...p, stage: "post", milestone: "edit" };\n    const out = applyMilestoneOutcome(p, { points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0, squashed: 0, rename: { title: "Final Cut", protagName: "Renamed Hero", secondaryName: "Renamed Support", petName: "Renamed Pet", villainName: "Renamed Villain" } });\n    expect(out.draft.title).toBe("Final Cut");\n    expect(out.draft.protagName).toBe("Renamed Hero");\n    expect(out.draft.secondaryName).toBe("Renamed Support");\n    expect(out.draft.villainName).toBe("Renamed Villain");\n  });\n});\n''')

print("Applied playtest QoL: GDS-style section leads/streams, boost requests, contracts, billing and crunch help")
