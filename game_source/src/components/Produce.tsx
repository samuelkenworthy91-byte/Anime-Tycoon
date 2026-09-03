import { useMemo, useRef, useState } from "react";
import {
  Play,
  PenTool,
  MonitorPlay,
  Music4,
  Scissors,
  Zap,
  UserRound,
  Building2,
  ChevronLeft,
  Check,
  Database,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  POINT_COLOR,
  POINT_LABEL,
  PRODUCTION_SCOPES,
  ROLE_POINT,
  SHOWRUNNERS,
  castById,
  formatGBP,
  staffPoint,
  workerLookIndex,
  type PointType,
} from "../engine/data";
import type { RunState } from "../engine/state";
import type { Points } from "../engine/scoring";
import { MILESTONE_LABEL, type MilestoneId, type MilestoneOutcome, type Project } from "../engine/projects";
import ProductionFloor, { type FloorDesk, type FloorHandle, type FloorTotals } from "./ProductionFloor";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";
import { rushBoostPoint, rushResearchCost, rushStreamPoint } from "../engine/studioOps";

/* one sprint = one interactive phase of the old production loop */
const PHASES: Record<
  Exclude<MilestoneId, "edit">,
  { idx: 0 | 1 | 2; name: string; icon: typeof PenTool; a: string; b: string; type: PointType }
> = {
  story: { idx: 0, name: "STORY SPRINT", icon: PenTool, a: "Plot", b: "Characters", type: "story" },
  art: { idx: 1, name: "ANIMATION SPRINT", icon: MonitorPlay, a: "Sakuga", b: "Consistency", type: "art" },
  sound: { idx: 2, name: "RECORDING SESSION", icon: Music4, a: "Soundtrack", b: "Voice Cast", type: "sound" },
};

const CRUNCH_COST = 9_000;

type SectionLead = { name: string; skill: number; type: PointType; cost: number };
type BoostPrompt = { name: string; skill: number; type: PointType } | null;

export default function Produce({
  run,
  project,
  milestone,
  paused,
  onDone,
  onBack,
}: {
  run: RunState;
  project: Project;
  milestone: MilestoneId;
  paused: boolean;
  onDone: (o: MilestoneOutcome) => void;
  onBack: () => void;
}) {
  const isEdit = milestone === "edit";
  const phase = isEdit ? null : PHASES[milestone];

  const [mode, setMode] = useState<"plan" | "assign" | "floor" | "done">(isEdit ? "floor" : "plan");
  const [slider, setSlider] = useState<number>(phase ? project.draft.sliders[phase.idx] : 50);
  const [boost, setBoost] = useState<Points>({ story: 0, art: 0, sound: 0 });
  const [spent, setSpent] = useState(0);
  const [totals, setTotals] = useState<FloorTotals | null>(null);
  const [live, setLive] = useState<FloorTotals | null>(null);
  const [crunches, setCrunches] = useState(0);
  const [lead, setLead] = useState<SectionLead | null>(null);
  const [leadToast, setLeadToast] = useState<{ name: string; pts: number } | null>(null);
  const [rdSpent, setRdSpent] = useState(0);
  const [rushIssues, setRushIssues] = useState(0);
  const [boostPrompt, setBoostPrompt] = useState<BoostPrompt>(null);
  const [boostResult, setBoostResult] = useState<{ success: boolean; text: string } | null>(null);
  const streamTriggered = useRef(new Set<number>());
  const boostAsked = useRef(false);
  const [finalNames, setFinalNames] = useState(() => ({
    title: project.draft.title,
    protagName: project.draft.protagName || castById(project.draft.protag).name,
    secondaryName: project.draft.secondaryName ?? castById(project.draft.secondary).name,
    petName: project.draft.petName ?? (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),
    villainName: project.draft.villainName ?? castById(project.draft.villain).name,
  }));
  const floorRef = useRef<FloorHandle>(null);

  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner)!;
  const team = useMemo(
    () => run.staff.filter((s) => project.staffIds.includes(s.id)),
    [run.staff, project.staffIds]
  );

  /* the floor is crewed by the showrunner + this project's team only */
  const desks = useMemo<FloorDesk[]>(() => {
    const focus: PointType = phase?.type ?? "art";
    const list: FloorDesk[] = [
      { name: runner.name.split(" ")[0], skill: 46 + run.showsMade * 2, type: focus, isBoss: true, img: runner.portrait, sprite: runner.sprite },
    ];
    team.forEach((s) =>
      list.push({
        name: s.name.split(" ")[0],
        skill: Math.round(staffPoint(s, ROLE_POINT[s.role]) * (0.6 + s.stamina / 250)),
        type: ROLE_POINT[s.role],
        look: workerLookIndex(s),
      })
    );
    return list;
  }, [team, run.showsMade, runner.name, runner.portrait, runner.sprite, phase?.type]);

  const scopeWork = PRODUCTION_SCOPES[project.draft.scope ?? "standard"].workMult;
  /* project ambition creates somewhat more floor work; technology makes the CREW faster,
     never the player's fingers busier. */
  const spawnMult = 1 + Math.max(0, scopeWork - 1) * 0.22;
  const autoSpeedMult = (run.research.includes("pipeline") ? 1.12 : 1) * (isEdit && run.research.includes("qa") ? 1.15 : 1);
  const lifeMult = (run.research.includes("storyboard") ? 1.25 : 1) * (run.showrunner === "steady" ? 1.2 : 1);
  const bugRate =
    0.11 *
    (run.research.includes("qa") ? 0.7 : 1) *
    (run.showrunner === "steady" ? 0.85 : 1) *
    (1 + (project.draft.budget === "blockbuster" ? 0.35 : 0));

  /* ---------------------------------------------------------- helpers */
  const specialistCandidates = useMemo(() => {
    if (!phase) return [];
    const list = team.map((s) => ({ id: s.id, name: s.name, skill: staffPoint(s, phase.type), stamina: s.stamina }));
    list.sort((a, b) => b.skill - a.skill);
    return list;
  }, [team, phase]);

  const outsourceCost = 18_000 + (phase?.idx ?? 0) * 6_000;

  const takeSpecialist = (name: string, skill: number, cost: number) => {
    if (!phase) return;
    sfx.select();
    setLead({ name, skill: Math.round(skill), type: phase.type, cost });
    setSpent((s) => s + cost);
    setMode("floor");
  };

  const onFloorDone = (t: FloorTotals) => {
    setTotals(t);
    setMode("done");
    sfx.phase();
  };

  const crunch = () => {
    if (run.cash - spent < CRUNCH_COST) return;
    setSpent((s) => s + CRUNCH_COST);
    setCrunches((c) => c + 1);
    floorRef.current?.crunch();
  };

  const handleProgress = (t: FloorTotals, pct: number) => {
    setLive(t);
    if (isEdit || !phase || !lead) return;
    const thresholds = [0.12, 0.26, 0.40, 0.56, 0.72];
    thresholds.forEach((th, i) => {
      if (pct < th || streamTriggered.current.has(i)) return;
      streamTriggered.current.add(i);
      const pts = rushStreamPoint(lead.skill, Math.random());
      setBoost((b) => ({ ...b, [lead.type]: b[lead.type] + pts }));
      setLeadToast({ name: lead.name, pts });
      window.setTimeout(() => setLeadToast((x) => x?.name === lead.name && x.pts === pts ? null : x), 900);
      sfx.coin();
    });
    if (!boostAsked.current && pct >= 0.50 && !boostPrompt) {
      boostAsked.current = true;
      const candidates = team.map((s) => ({ name: s.name, skill: Math.round(staffPoint(s, phase.type)), type: phase.type }));
      candidates.push({ name: runner.name, skill: Math.min(99, 46 + run.showsMade * 2), type: phase.type });
      candidates.sort((a, b) => b.skill - a.skill);
      setBoostPrompt(candidates[0] ?? { name: lead.name, skill: lead.skill, type: lead.type });
      sfx.select();
    }
  };

  const attemptBoost = (chance: number) => {
    if (!boostPrompt) return;
    const cost = rushResearchCost(boostPrompt.skill, chance);
    if (run.rd - rdSpent < cost) return;
    setRdSpent((v) => v + cost);
    const success = Math.random() < chance;
    if (success) {
      const reward = rushBoostPoint(boostPrompt.skill);
      setBoost((b) => ({ ...b, [boostPrompt.type]: b[boostPrompt.type] + reward }));
      setBoostResult({ success: true, text: `${boostPrompt.name}'s experiment lands: +${reward} ${POINT_LABEL[boostPrompt.type]} points.` });
      sfx.fanfare();
    } else {
      setRushIssues((v) => v + 1);
      setBoostResult({ success: false, text: `${boostPrompt.name}'s experiment misses and creates an extra editing note.` });
      sfx.fail();
    }
  };

  const closeBoost = () => { setBoostPrompt(null); setBoostResult(null); sfx.phase(); };

  const finish = () => {
    sfx.whoosh();
    const t = totals!;
    if (isEdit) {
      onDone({
        points: { story: 0, art: 0, sound: 0 },
        issues: 0,
        spent,
        rdGained: 0,
        rename: {
          title: finalNames.title.trim() || project.draft.title,
          protagName: finalNames.protagName.trim() || castById(project.draft.protag).name,
          secondaryName: finalNames.secondaryName.trim() || castById(project.draft.secondary).name,
          petName: finalNames.petName.trim() || (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),
          villainName: finalNames.villainName.trim() || castById(project.draft.villain).name,
        },
        /* Never farm extra RD by clearing more visual notes than the project owns. */
        squashed: Math.min(project.issues, t.squashed),
      });
    } else {
      onDone({
        points: {
          story: t.story + boost.story,
          art: t.art + boost.art + (run.research.includes("mocap") ? Math.round(t.art * 0.12) : 0),
          sound: t.sound + boost.sound,
        },
        issues: t.issues + rushIssues,
        spent,
        rdGained: t.squashed,
        rdSpent,
        slider: { index: phase!.idx, value: slider },
      });
    }
  };

  const title = isEdit ? "EDIT BAY" : phase!.name;
  const Icon = isEdit ? Scissors : phase!.icon;

  /* -------------------------------------------------------------- UI */
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />

      {/* header */}
      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">
        <span className="shrink-0 rounded-md bg-neon px-2 py-0.5 text-[10px] font-bold text-white">
          {MILESTONE_LABEL[milestone].toUpperCase()}
        </span>
        <span className="truncate font-display text-sm font-extrabold">{project.draft.title}</span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-paper/50">
          <UserRound size={11} /> {team.length} on the team
        </span>
      </div>

      {/* ---------------------------------------------------------- PLAN */}
      {mode === "plan" && phase && (
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-xl flex-1 overflow-y-auto p-4">
          <div className="mb-3 text-center">
            <div className="text-[11px] tracking-[0.4em] text-cyanx">{title}</div>
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">DIRECTION MEETING</h2>
            <p className="mt-1 text-xs text-paper/50">
              Set the balance for this stage. The critics will tell you if you got it right.
            </p>
          </div>
          <div className="ink-card p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-panel3 p-2" style={{ color: POINT_COLOR[phase.type] }}>
                <Icon size={17} />
              </span>
              <div>
                <div className="font-display text-sm font-extrabold leading-tight">{title}</div>
                <div className="text-[10px] text-paper/40">makes {POINT_LABEL[phase.type]} points</div>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-[10px] font-bold">
              <span className="text-neon2">{phase.a}</span>
              <span className="text-cyanx">{phase.b}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={slider}
              onChange={(e) => setSlider(+e.target.value)}
              className="ink-range relative z-10"
              style={{ "--p": `${slider}%` } as React.CSSProperties}
            />
            <div className="mt-1 flex justify-between text-[10px] text-paper/50">
              <span>{slider}%</span>
              <span>{100 - slider}%</span>
            </div>
          </div>
          {team.length === 0 && (
            <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-center text-[11px] font-bold text-gold">
              Nobody is assigned to this project — you'll be running the floor alone.
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Btn variant="ghost" onClick={onBack}>
              <ChevronLeft size={16} /> LATER
            </Btn>
            <Btn big variant="primary" className="anim-ring flex-1" onClick={() => { sfx.phase(); setMode("assign"); }}>
              <Play size={20} /> START THE SPRINT
            </Btn>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- ASSIGN */}
      {mode === "assign" && phase && (
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4">
          <div className="anim-pop text-center">
            <div className="text-[11px] tracking-[0.4em] text-cyanx">{title}</div>
            <h2 className="font-display text-3xl font-extrabold md:text-4xl">LEAD {POINT_LABEL[phase.type].toUpperCase()}</h2>
            <p className="mt-1 text-xs text-paper/60">
              Choose the section lead. They contribute their work in up to five point bursts while the full team keeps production moving.
            </p>
          </div>
          <div className="mt-4 space-y-2">
            {specialistCandidates.map((c) => (
              <button
                key={c.id}
                onClick={() => takeSpecialist(c.name, c.skill * (0.55 + c.stamina / 220), 0)}
                className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-neon/50"
              >
                <span className="rounded-lg bg-panel3 p-2 text-cyanx">
                  <UserRound size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{c.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-28 rounded bg-abyss">
                      <div className="h-full rounded" style={{ width: `${c.skill}%`, background: POINT_COLOR[phase.type] }} />
                    </div>
                    <span className="text-[10px] font-bold text-paper/60">
                      {POINT_LABEL[phase.type]} {c.skill}
                    </span>
                    <span className={cn("text-[10px] font-bold", c.stamina < 45 ? "text-neon" : "text-mint")}>
                      {c.stamina < 45 ? "BURNT OUT" : "FRESH"} {Math.round(c.stamina)}%
                    </span>
                  </div>
                </div>
                <span className="font-display text-sm font-extrabold text-mint">
                  +{Math.round(c.skill * (0.55 + c.stamina / 220) * 0.42 + 4)}
                </span>
              </button>
            ))}
            <button
              onClick={() => takeSpecialist("Famous Studio", 78, outsourceCost)}
              disabled={run.cash - spent < outsourceCost}
              className={cn(
                "btn-press ink-card flex w-full items-center gap-3 border-gold/40 p-3 text-left hover:border-gold",
                run.cash - spent < outsourceCost && "pointer-events-none opacity-40"
              )}
            >
              <span className="rounded-lg bg-panel3 p-2 text-gold">
                <Building2 size={16} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-bold text-gold">Outsource to a famous studio</div>
                <div className="text-[10px] text-paper/50">Guaranteed quality — for a price.</div>
              </div>
              <div className="text-right">
                <div className="font-display text-sm font-extrabold text-mint">+37</div>
                <div className="text-[10px] font-bold text-gold">{formatGBP(outsourceCost)}</div>
              </div>
            </button>
            <button
              onClick={() => takeSpecialist(runner.name, 40 + run.showsMade * 3, 0)}
              className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-neon/50"
            >
              <Portrait img={runner.portrait} name={runner.name} alt="" className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <div className="text-sm font-bold">{runner.name} (you)</div>
                <div className="text-[10px] text-paper/50">Do it yourself. Free, improves with experience.</div>
              </div>
              <span className="font-display text-sm font-extrabold text-mint">
                +{Math.round((40 + run.showsMade * 3) * 0.42 + 4)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- FLOOR */}
      {mode === "floor" && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-line/40 bg-panel2/60 px-3 py-1.5">
            <span className="text-[10px] text-paper/60">
              {isEdit
                ? "EDITING — your crew fixes notes automatically; higher skill means faster cleanup"
                : "AUTO PRODUCTION — staff handle incoming work; larger, trained teams clear more"}
            </span>
            {!isEdit && (
              <div className="ml-auto flex items-center gap-1.5">
                <span className="cursor-help text-paper/45 hover:text-gold" title="Crunch spends £9,000 to flood the team with extra work for six seconds. It can generate more points if the crew keeps up, but bug risk nearly doubles and overwhelmed teams may miss work." aria-label="What does Crunch do?"><HelpCircle size={13} /></span>
                <button onClick={crunch} disabled={run.cash - spent < CRUNCH_COST} className={cn("btn-press flex items-center gap-1 rounded-lg border border-gold/60 bg-gold/15 px-2.5 py-1 text-[10px] font-extrabold text-gold", run.cash - spent < CRUNCH_COST && "pointer-events-none opacity-40")}>
                  <Zap size={12} /> CRUNCH {formatGBP(CRUNCH_COST)}
                </button>
              </div>
            )}
          </div>
          <div className="relative min-h-0 flex-1">
            <ProductionFloor
              key={milestone}
              handleRef={floorRef}
              desks={desks}
              duration={isEdit ? 10000 : 13000}
              focus={phase?.type ?? "art"}
              spawnMult={isEdit ? 1.5 : spawnMult}
              lifeMult={lifeMult}
              autoSpeedMult={autoSpeedMult}
              bugRate={isEdit ? 1 : bugRate}
              editingMode={isEdit}
              paused={paused || !!boostPrompt}
              onProgress={handleProgress}
              onDone={onFloorDone}
            />
            {leadToast && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 anim-pop rounded-xl border border-gold/60 bg-abyss/90 px-4 py-2 text-center shadow-xl">
                <div className="text-[9px] font-bold tracking-widest text-paper/45">SECTION LEAD</div>
                <div className="font-display text-sm font-extrabold text-gold">{leadToast.name} +{leadToast.pts} {phase ? POINT_LABEL[phase.type] : ""}</div>
              </div>
            )}
            {boostPrompt && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-abyss/82 p-3 backdrop-blur-sm">
                <div className="anim-pop ink-card w-full max-w-md p-4">
                  <div className="flex items-center gap-2 text-viol"><Lightbulb size={17} /><span className="text-[10px] font-extrabold tracking-[0.25em]">STAFF BOOST IDEA</span></div>
                  <h3 className="mt-1 font-display text-xl font-extrabold">{boostPrompt.name} wants to try something</h3>
                  <p className="mt-1 text-xs text-paper/60">Back the experiment with Research Data. Skilled staff need less RD for the same confidence. Success adds quality; failure creates an editing note.</p>
                  {boostResult ? (
                    <div className={cn("mt-3 rounded-xl border p-3 text-sm font-bold", boostResult.success ? "border-mint/50 bg-mint/10 text-mint" : "border-neon/50 bg-neon/10 text-neon2")}>
                      {boostResult.text}
                      <Btn big variant="primary" className="mt-3 w-full" onClick={closeBoost}>BACK TO THE RUSH</Btn>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {([0.2, 0.5, 0.8] as const).map((chance) => {
                        const cost = rushResearchCost(boostPrompt.skill, chance);
                        return <button key={chance} disabled={run.rd - rdSpent < cost} onClick={() => attemptBoost(chance)} className={cn("btn-press flex w-full items-center gap-3 rounded-xl border border-line bg-panel2/70 p-3 text-left hover:border-viol/60", run.rd - rdSpent < cost && "pointer-events-none opacity-40")}><Database size={17} className="text-viol" /><div className="flex-1"><div className="text-sm font-extrabold">{Math.round(chance * 100)}% CONFIDENCE</div><div className="text-[10px] text-paper/45">Skill {boostPrompt.skill}</div></div><span className="font-display text-sm font-extrabold text-viol">{cost} RD</span></button>;
                      })}
                      <button onClick={closeBoost} className="btn-press w-full rounded-xl border border-line px-3 py-2 text-xs font-bold text-paper/55">PASS — KEEP THE PLAN</button>
                      <div className="text-center text-[10px] text-paper/40">Research available: {Math.max(0, run.rd - rdSpent)} RD</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- DONE */}
      {mode === "done" && totals && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
          <div className="anim-pop ink-card w-full max-w-sm p-5 text-center">
            <div className="text-[10px] tracking-[0.4em] text-mint">SPRINT COMPLETE</div>
            <div className="mt-1 font-display text-2xl font-extrabold">{title}</div>
            {isEdit ? (
              <div className="mt-3 text-left">
                <div className="text-center"><div className="font-display text-3xl font-extrabold text-mint">{totals.squashed}</div><div className="text-[10px] font-bold text-paper/50">EDITING NOTES FIXED</div></div>
                <div className="mt-3 rounded-xl border border-cyanx/30 bg-cyanx/5 p-3">
                  <div className="text-center text-[10px] font-extrabold tracking-[0.2em] text-cyanx">LOCK PICTURE · FINAL BILLING</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {[
                      ["title", "SHOW TITLE", 32],
                      ["protagName", "LEAD", 18],
                      ["secondaryName", "SUPPORT", 18],
                      ["petName", "MASCOT", 18],
                      ["villainName", "VILLAIN", 18],
                    ].map(([key, label, max]) => (
                      <label key={String(key)} className={key === "title" ? "sm:col-span-2" : ""}>
                        <span className="mb-1 block text-[9px] font-bold text-paper/45">{label}</span>
                        <input value={finalNames[key as keyof typeof finalNames]} maxLength={Number(max)} onChange={(e) => setFinalNames((n) => ({ ...n, [key]: e.target.value }))} className="ink-input w-full px-2.5 py-2 text-sm font-bold" />
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 text-center text-[9px] text-paper/40">These names go on the poster, franchise history and future sequels.</div>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(["story", "art", "sound"] as PointType[]).map((t) => (
                  <div key={t}>
                    <div className="font-display text-xl font-extrabold" style={{ color: POINT_COLOR[t] }}>
                      +{totals[t] + boost[t]}
                    </div>
                    <div className="text-[9px] font-bold text-paper/50">{POINT_LABEL[t].toUpperCase()}</div>
                  </div>
                ))}
                <div>
                  <div className="font-display text-xl font-extrabold text-[#ff5e5e]">{totals.issues}</div>
                  <div className="text-[9px] font-bold text-paper/50">ISSUES</div>
                </div>
              </div>
            )}
            <div className="mt-3 flex justify-center gap-3 text-[10px] font-bold text-paper/50">
              <span>BEST FLOW <b className="text-gold">{totals.best}</b></span>
              <span>{isEdit ? "NOTES ESCAPED" : "MISSED"} <b className="text-neon">{isEdit ? totals.issues : totals.missed}</b></span>
              {crunches > 0 && <span>CRUNCH <b className="text-gold">×{crunches}</b></span>}
            </div>
            <Btn big variant="primary" className="mt-4 w-full" onClick={finish}>
              <Check size={18} /> {isEdit ? "LOCK NAMES & RETURN TO STUDIO" : "BACK TO THE STUDIO"}
            </Btn>
          </div>
        </div>
      )}

      {/* keep the live totals in the type graph even though the header is minimal */}
      <span className="hidden">{live?.collected}</span>
    </div>
  );
}
