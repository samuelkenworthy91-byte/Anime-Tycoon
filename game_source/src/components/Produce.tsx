import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronLeft, MonitorPlay, Music4, PenTool, Scissors } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  POINT_COLOR,
  POINT_LABEL,
  SHOWRUNNERS,
  WORKER_LOOKS,
  workerLookIndex,
  dateLabel,
  castById,
  formatGBP,
  staffPoint,
  type PointType,
} from "../engine/data";
import type { DeskPulse, RunState } from "../engine/state";
import type { MilestoneId, MilestoneOutcome, Project, RushAssignment } from "../engine/projects";
import { rushBoostPoint, rushOutcomeRange, rushResearchCost, rushTeamSupport } from "../engine/studioOps";
import { MILESTONE_LABEL } from "../engine/projects";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";

const PHASES: Record<Exclude<MilestoneId, "edit">, { idx: 0 | 1 | 2; name: string; icon: typeof PenTool; a: string; b: string; type: PointType }> = {
  story: { idx: 0, name: "STORY RUSH", icon: PenTool, a: "Plot", b: "Characters", type: "story" },
  art: { idx: 1, name: "ANIMATION RUSH", icon: MonitorPlay, a: "Sakuga", b: "Consistency", type: "art" },
  sound: { idx: 2, name: "RECORDING RUSH", icon: Music4, a: "Soundtrack", b: "Voice Cast", type: "sound" },
};

export default function Produce({ run, project, milestone, workPulses = [], onDone, onBack }: {
  run: RunState;
  project: Project;
  milestone: MilestoneId;
  paused: boolean;
  workPulses?: DeskPulse[];
  onDone: (o: MilestoneOutcome) => void;
  onBack: () => void;
}) {
  const isEdit = milestone === "edit";
  const phase = isEdit ? null : PHASES[milestone];
  const [mode, setMode] = useState<"plan" | "assign" | "reveal">("plan");
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
  const [crunch, setCrunch] = useState(false);
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  const [reveal, setReveal] = useState<null | {
    assignment: RushAssignment; base: number; total: number; spent: number; issues: number; rdSpent: number;
    support: number; min: number; max: number; leadImg?: string | null;
    idea: null | { name: string; skill: number }; ideaDone: boolean; message?: string;
  }>(null);

  useEffect(() => {
    if (mode !== "reveal" || !reveal) return;
    const from = shownRef.current;
    const to = reveal.total;
    const started = performance.now();
    const duration = Math.max(950, Math.min(2500, 1100 + Math.abs(to - from) * 28));
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const n = Math.round(from + (to - from) * eased);
      shownRef.current = n;
      setShown(n);
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mode, reveal?.total]);

  if (isEdit) {
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
            <div className="mt-3 min-h-10 space-y-1">
              {workPulses.filter((p) => p.source === "edit").slice(-3).map((p) => (
                <div key={p.nonce} className="anim-pop mx-auto flex w-fit items-center gap-2 rounded-full border border-mint/50 bg-mint/10 px-3 py-1 text-[10px] font-extrabold text-mint">
                  <span>{p.name.split(" ")[0]}</span><span>−{p.points} NOTE{p.points === 1 ? "" : "S"}</span><span className="text-viol">+{p.points} RD</span>
                </div>
              ))}
            </div>
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

  const Icon = phase!.icon;
  const candidates = [...team].sort((a, b) => staffPoint(b, phase!.type) - staffPoint(a, phase!.type));
  const outsourceCost = 18_000 + phase!.idx * 6_000;
  const crunchCost = 9_000;

  const choose = (a: RushAssignment, leadImg?: string | null) => {
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
              const range = rushOutcomeRange(skill);
              const support = rushTeamSupport(team.filter((x) => x.id !== st.id).map((x) => staffPoint(x, phase!.type)));
              const img = WORKER_LOOKS[workerLookIndex(st)]?.sprite;
              return <button key={st.id} onClick={() => choose({ leadId: st.id, leadName: st.name, skill, type: phase!.type, cost: 0, slider }, img)} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-cyanx/60"><img src={img} alt="" className="h-12 w-10 shrink-0 object-contain drop-shadow-lg"/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{st.name}</div><div className="text-[10px] text-paper/50">{POINT_LABEL[phase!.type]} {staffPoint(st, phase!.type)} · energy {Math.round(st.stamina)}% · team support +{support}</div></div><div className="text-right"><div className="font-display text-lg font-extrabold" style={{color:POINT_COLOR[phase!.type]}}>SKILL {skill}</div><div className="text-[9px] font-bold text-paper/50">RANGE {range.min + support}–{range.max + support}</div></div></button>;
            })}
            <button onClick={() => choose({ leadId: "showrunner", leadName: runner.name, skill: Math.min(99, 44 + run.showsMade * 3), type: phase!.type, cost: 0, slider }, runner.sprite)} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-gold/60"><Portrait img={runner.portrait} name={runner.name} className="h-10 w-10 rounded-lg"/><div className="flex-1"><div className="text-sm font-bold">{runner.name} (showrunner)</div><div className="text-[10px] text-paper/50">Free · improves with studio experience</div></div></button>
            <button disabled={run.cash < outsourceCost + (crunch ? crunchCost : 0)} onClick={() => choose({ leadId: `outsource:${milestone}`, leadName: "Famous Studio", skill: 78, type: phase!.type, cost: outsourceCost, slider }, null)} className={cn("btn-press ink-card flex w-full items-center gap-3 border-gold/40 p-3 text-left", run.cash < outsourceCost + (crunch ? crunchCost : 0) && "pointer-events-none opacity-40")}><span className="rounded-lg bg-panel3 p-2 text-gold"><Building2 size={17}/></span><div className="flex-1"><div className="text-sm font-bold text-gold">Outsource the rush</div><div className="text-[10px] text-paper/50">Reliable high skill without using an employee.</div></div><span className="font-display text-sm font-extrabold text-gold">{formatGBP(outsourceCost)}</span></button>
          </div>
          <Btn variant="ghost" className="mt-3" onClick={() => setMode("plan")}><ChevronLeft size={16}/> DIRECTION</Btn>
        </div>
      ) : reveal ? (
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
      ) : null}
    </div>
  );
}
