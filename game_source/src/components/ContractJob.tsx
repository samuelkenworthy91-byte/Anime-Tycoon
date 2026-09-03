import { useMemo, useState } from "react";
import { Briefcase, Calendar, Check, Database, Users } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { POINT_COLOR, POINT_LABEL, ROLE_LABEL, formatGBP, staffPoint, type Contract } from "../engine/data";
import { staffBusyReason, type RunState } from "../engine/state";
import { projectedContractTotal } from "../engine/studioOps";
import { cn } from "../utils/cn";

export default function ContractJob({
  run,
  contract,
  onDone,
}: {
  run: RunState;
  contract: Contract;
  paused?: boolean;
  onDone: (staffIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const crew = useMemo(() => run.staff.filter((s) => selected.includes(s.id)), [run.staff, selected]);
  const projected = projectedContractTotal(contract, crew, run.research);
  const likely = projected >= contract.target;

  const toggle = (id: string) => {
    if (staffBusyReason(run, id)) return;
    sfx.click();
    setSelected((old) => old.includes(id) ? old.filter((x) => x !== id) : old.length >= 3 ? old : [...old, id]);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />
      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">
        <span className="rounded-md bg-cyanx px-2 py-0.5 text-[10px] font-bold text-ink">CONTRACT</span>
        <span className="truncate font-display text-sm font-extrabold">{contract.name}</span>
        <span className="ml-auto text-[11px] font-bold" style={{ color: POINT_COLOR[contract.type] }}>
          {contract.target} {POINT_LABEL[contract.type]}
        </span>
      </div>

      <div className="nice-scroll relative z-10 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="ink-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel3" style={{ color: POINT_COLOR[contract.type] }}><Briefcase size={21} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-extrabold">Assign a contract team</h2>
                <p className="mt-1 text-xs text-paper/65">This job now runs in the background for up to {contract.weeks} weeks. Staff assigned here cannot work on a show or attend training until the contract finishes.</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="ink-chip px-2 py-1 font-bold text-gold">{formatGBP(contract.pay)}</span>
                  <span className="ink-chip flex items-center gap-1 px-2 py-1 font-bold text-viol"><Database size={12} /> +{contract.rd} RD</span>
                  <span className="ink-chip flex items-center gap-1 px-2 py-1 font-bold text-cyanx"><Calendar size={12} /> {contract.weeks} wk deadline</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ink-card p-3">
            <div className="mb-2 flex items-center gap-2"><Users size={14} className="text-cyanx" /><span className="font-display text-sm font-extrabold">TEAM {selected.length}/3</span></div>
            <div className="space-y-1.5">
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
              {run.staff.length === 0 && <div className="py-4 text-center text-xs text-paper/45">Hire staff before taking background contracts.</div>}
            </div>
          </div>

          <div className={cn("rounded-xl border p-3", likely ? "border-mint/50 bg-mint/10" : "border-gold/50 bg-gold/10")}>
            <div className="flex items-center justify-between text-xs"><span className="font-bold">Projected output by deadline</span><span className={cn("font-display text-lg font-extrabold", likely ? "text-mint" : "text-gold")}>{projected}/{contract.target}</span></div>
            <div className="mt-1 text-[10px] text-paper/55">Estimate uses current skill, stamina and Digital Pipeline research. The job can finish early if the team reaches the target first.</div>
          </div>

          <Btn big variant="cyan" className="w-full" disabled={selected.length === 0} onClick={() => { sfx.phase(); onDone(selected); }}>
            ASSIGN & RETURN TO STUDIO
          </Btn>
        </div>
      </div>
    </div>
  );
}
