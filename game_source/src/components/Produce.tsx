import { useEffect, useMemo, useRef, useState } from "react";
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
import { rushBoostPoint, rushResearchCost } from "../engine/studioOps";
import { MILESTONE_LABEL } from "../engine/projects";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";

const PHASES: Record<Exclude<MilestoneId, "edit">, { idx: 0 | 1 | 2; name: string; icon: typeof PenTool; a: string; b: string; type: PointType }> = {
  story: { idx: 0, name: "STORY RUSH", icon: PenTool, a: "Plot", b: "Characters", type: "story" },
  art: { idx: 1, name: "ANIMATION RUSH", icon: MonitorPlay, a: "Sakuga", b: "Consistency", type: "art" },
  sound: { idx: 2, name: "RECORDING RUSH", icon: Music4, a: "Soundtrack", b: "Voice Cast", type: "sound" },
};

export default function Produce({ run, project, milestone, onDone, onBack }: {
  run: RunState;
  project: Project;
  milestone: MilestoneId;
  paused: boolean;
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
    idea: null | { name: string; skill: number }; ideaDone: boolean; message?: string;
  }>(null);

  useEffect(() => {
    if (mode !== "reveal" || !reveal) return;
    const from = shownRef.current;
    const to = reveal.total;
    const started = performance.now();
    const duration = Math.max(700, Math.min(1900, 850 + Math.abs(to - from) * 42));
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
