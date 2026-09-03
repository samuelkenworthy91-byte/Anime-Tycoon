import { useMemo, useState } from "react";
import { Briefcase, Calendar, Check, ChevronLeft, Database, UserRound, Users } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { POINT_COLOR, POINT_LABEL, ROLE_LABEL, SHOWRUNNERS, formatGBP, staffPoint, type Contract } from "../engine/data";
import { staffBusyReason, type RunState } from "../engine/state";
import { projectedContractTotal, showrunnerContractSkill } from "../engine/studioOps";
import { cn } from "../utils/cn";

export default function ContractJob({ run, contract, onDone, onBack }: {
  run: RunState;
  contract: Contract;
  paused?: boolean;
  onDone: (selection: { staffIds: string[]; showrunner: boolean }) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [showrunnerSelected, setShowrunnerSelected] = useState(false);
  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];
  const runnerBusy = run.contractJobs.some((j) => j.showrunner);
  const runnerSkill = showrunnerContractSkill(run.showrunner, run.showsMade, contract.type);
  const crew = useMemo(() => run.staff.filter((s) => selected.includes(s.id)), [run.staff, selected]);
  const seats = selected.length + (showrunnerSelected ? 1 : 0);
  const projected = projectedContractTotal(contract, crew, run.research, showrunnerSelected ? runnerSkill : 0);
  const likely = projected >= contract.target;

  const toggle = (id: string) => {
    if (staffBusyReason(run, id)) return;
    sfx.click();
    setSelected((old) => old.includes(id) ? old.filter((x) => x !== id) : seats >= 3 ? old : [...old, id]);
  };

  const toggleRunner = () => {
    if (runnerBusy && !showrunnerSelected) return;
    if (!showrunnerSelected && seats >= 3) return;
    sfx.click();
    setShowrunnerSelected((v) => !v);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />
      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">
        <button onClick={() => { sfx.back(); onBack(); }} className="btn-press flex items-center gap-1 rounded-lg border border-line bg-panel2 px-2 py-1 text-[10px] font-bold text-paper/70 hover:border-cyanx/50"><ChevronLeft size={12} /> BACK</button>
        <span className="rounded-md bg-cyanx px-2 py-0.5 text-[10px] font-bold text-ink">CONTRACT</span>
        <span className="truncate font-display text-sm font-extrabold">{contract.name}</span>
        <span className="ml-auto text-[11px] font-bold" style={{ color: POINT_COLOR[contract.type] }}>{contract.target} {POINT_LABEL[contract.type]}</span>
      </div>

      <div className="nice-scroll relative z-10 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="ink-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel3" style={{ color: POINT_COLOR[contract.type] }}><Briefcase size={21} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-extrabold">Assign a contract team</h2>
                <p className="mt-1 text-xs text-paper/65">Pick up to three contributors. Staff are unavailable elsewhere until it finishes; your showrunner can personally take one seat too.</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="ink-chip px-2 py-1 font-bold text-gold">{formatGBP(contract.pay)}</span>
                  <span className="ink-chip flex items-center gap-1 px-2 py-1 font-bold text-viol"><Database size={12} /> +{contract.rd} RD</span>
                  <span className="ink-chip flex items-center gap-1 px-2 py-1 font-bold text-cyanx"><Calendar size={12} /> {contract.weeks} wk deadline</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ink-card p-3">
            <div className="mb-2 flex items-center gap-2"><Users size={14} className="text-cyanx" /><span className="font-display text-sm font-extrabold">TEAM {seats}/3</span></div>
            <div className="space-y-1.5">
              <button disabled={runnerBusy && !showrunnerSelected} onClick={toggleRunner} className={cn("btn-press flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left", showrunnerSelected ? "border-gold/70 bg-gold/10" : runnerBusy ? "border-line/40 bg-panel2/30 opacity-50" : "border-gold/35 bg-panel2/50 hover:border-gold/70")}>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded border", showrunnerSelected ? "border-gold bg-gold text-ink" : "border-line")}>{showrunnerSelected && <Check size={13} />}</span>
                <UserRound size={17} className="text-gold" />
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{runner.name} · SHOWRUNNER</span><span className="text-[10px] text-paper/45">{runner.title} · {POINT_LABEL[contract.type]} {runnerSkill}{runnerBusy ? " · already on a contract" : ""}</span></span>
                <span className="font-display text-sm font-extrabold text-gold">{runnerSkill}</span>
              </button>

              {run.staff.map((s) => {
                const busy = staffBusyReason(run, s.id);
                const on = selected.includes(s.id);
                const skill = staffPoint(s, contract.type);
                return (
                  <button key={s.id} disabled={!!busy && !on} onClick={() => toggle(s.id)} className={cn("btn-press flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left", on ? "border-mint/60 bg-mint/10" : busy ? "border-line/40 bg-panel2/30 opacity-50" : "border-line bg-panel2/50 hover:border-cyanx/60")}>
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded border", on ? "border-mint bg-mint text-ink" : "border-line")}>{on && <Check size={13} />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{s.name}</span><span className="text-[10px] text-paper/45">{ROLE_LABEL[s.role]} · {POINT_LABEL[contract.type]} {skill}{busy ? ` · ${busy}` : ""}</span></span>
                    <span className="font-display text-sm font-extrabold" style={{ color: POINT_COLOR[contract.type] }}>{skill}</span>
                  </button>
                );
              })}
              {run.staff.length === 0 && <div className="py-3 text-center text-xs text-paper/45">Your showrunner can handle a small contract solo.</div>}
            </div>
          </div>

          <div className={cn("rounded-xl border p-3", likely ? "border-mint/50 bg-mint/10" : "border-gold/50 bg-gold/10")}>
            <div className="flex items-center justify-between text-xs"><span className="font-bold">Projected output by deadline</span><span className={cn("font-display text-lg font-extrabold", likely ? "text-mint" : "text-gold")}>{projected}/{contract.target}</span></div>
            <div className="mt-1 text-[10px] text-paper/55">Estimate uses current skill, stamina, showrunner contribution and Digital Pipeline research. The job can finish early.</div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Btn variant="ghost" onClick={() => { sfx.back(); onBack(); }}><ChevronLeft size={16} /> CANCEL</Btn>
            <Btn big variant="cyan" className="w-full" disabled={seats === 0} onClick={() => { sfx.phase(); onDone({ staffIds: selected, showrunner: showrunnerSelected }); }}>ASSIGN & RETURN TO STUDIO</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
