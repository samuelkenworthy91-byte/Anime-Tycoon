import { useState } from "react";
import { CalendarRange, ChevronDown, ChevronUp, GraduationCap, Microscope, Briefcase } from "lucide-react";
import { dateLabel } from "../engine/data";
import { departmentStatuses } from "../engine/capacity";
import { STAGE_LABEL, type Project } from "../engine/projects";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

const weeks = (run: RunState) => Array.from({ length: 10 }, (_, i) => run.week + i + 1);

function spanCells(start: number, end: number, cols: number[]) {
  return cols.map((w) => w >= start && w <= end);
}

export default function StudioSlate({ run }: { run: RunState }) {
  const [open, setOpen] = useState(true);
  const cols = weeks(run);
  const depts = departmentStatuses(run.projects, run.staff, run.facilities, run.research);
  const active = run.projects.filter((p) => p.stage !== "done" && p.stage !== "airing");

  return (
    <div className="rounded-xl border border-cyanx/25 bg-abyss/45 p-2.5">
      <button onClick={() => setOpen((v) => !v)} className="btn-press flex w-full items-center gap-2 text-left">
        <CalendarRange size={14} className="text-cyanx" />
        <span className="font-display text-xs font-extrabold">STUDIO SLATE & BOTTLENECKS</span>
        <span className="ml-auto text-paper/40">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
            {depts.map((d) => {
              const pct = Math.min(160, Math.round(d.utilization * 100));
              return (
                <div key={d.id} className={cn("rounded-lg border p-2", d.overloaded ? "border-neon/50 bg-neon/10" : "border-line/60 bg-panel2/45")}>
                  <div className="flex items-center justify-between text-[9px] font-bold"><span>{d.label}</span><span className={d.overloaded ? "text-neon" : "text-mint"}>{pct}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink"><div className={cn("h-full rounded-full", d.overloaded ? "bg-neon" : "bg-mint")} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                  <div className="mt-1 text-[8px] text-paper/45">{d.demand} demand / {d.capacity} cap</div>
                </div>
              );
            })}
          </div>

          <div className="nice-scroll overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1 text-[8px] text-paper/40">
                <div />{cols.map((w) => <div key={w} className="text-center">{dateLabel(w)}</div>)}
              </div>
              <div className="mt-1 space-y-1">
                {active.map((p: Project) => {
                  const remaining = Math.max(1, Math.ceil((p.plan[p.stage] ?? 1) - p.progress));
                  const cells = spanCells(run.week + 1, run.week + remaining, cols);
                  return (
                    <div key={p.id} className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1">
                      <div className="truncate text-[9px] font-bold text-paper/70">{p.draft.title}</div>
                      {cells.map((on, i) => <div key={cols[i]} className={cn("h-5 rounded border text-center text-[7px] leading-5", on ? "border-cyanx/35 bg-cyanx/15 text-cyanx" : cols[i] === p.deadlineWeek ? "border-gold/50 bg-gold/10 text-gold" : "border-line/30 bg-panel2/20")}>{on ? STAGE_LABEL[p.stage].slice(0, 4).toUpperCase() : cols[i] === p.deadlineWeek ? "DUE" : ""}</div>)}
                    </div>
                  );
                })}
                {run.contractJobs.map((j) => {
                  const cells = spanCells(Math.max(run.week + 1, j.startWeek + 1), j.dueWeek, cols);
                  return <div key={j.id} className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-gold"><Briefcase size={9} className="mr-1 inline" />{j.contract.name}</div>{cells.map((on, i) => <div key={cols[i]} className={cn("h-5 rounded border", on ? "border-gold/40 bg-gold/10" : "border-line/20 bg-panel2/10")} />)}</div>;
                })}
                {run.trainingJobs.map((j) => {
                  const cells = spanCells(Math.max(run.week + 1, j.startWeek + 1), j.completesWeek, cols);
                  return <div key={j.id} className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-mint"><GraduationCap size={9} className="mr-1 inline" />{j.staffName}</div>{cells.map((on, i) => <div key={cols[i]} className={cn("h-5 rounded border", on ? "border-mint/40 bg-mint/10" : "border-line/20 bg-panel2/10")} />)}</div>;
                })}
                {run.researchJobs.map((j) => {
                  const cells = spanCells(Math.max(run.week + 1, j.startWeek + 1), j.completesWeek, cols);
                  return <div key={j.id} className="grid grid-cols-[150px_repeat(10,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-viol"><Microscope size={9} className="mr-1 inline" />{j.name}</div>{cells.map((on, i) => <div key={cols[i]} className={cn("h-5 rounded border", on ? "border-viol/40 bg-viol/10" : "border-line/20 bg-panel2/10")} />)}</div>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
