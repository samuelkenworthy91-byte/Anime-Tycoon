import { useMemo, useState } from "react";
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
