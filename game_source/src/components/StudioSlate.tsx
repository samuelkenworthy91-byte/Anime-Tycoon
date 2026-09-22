import { useMemo, useState } from "react";
import { AlertTriangle, Briefcase, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GraduationCap, Microscope, Plus, Trash2 } from "lucide-react";
import { dateLabel } from "../engine/data";
import { departmentStatuses } from "../engine/capacity";
import { STAGE_LABEL, type Project } from "../engine/projects";
import type { RunState } from "../engine/state";
import {
  QUARTER_WEEKS,
  addSlatePlan,
  careerCalendarYear,
  plansForQuarter,
  quarterIndexForWeek,
  quarterStartWeek,
  removeSlatePlan,
  slateQuarterWarnings,
  updateSlatePlan,
  type SlateImportance,
  type SlatePlan,
  type SlatePlanKind,
} from "../engine/slate";
import { ipById } from "../engine/ip";
import { cn } from "../utils/cn";

function quarterColumns(year: number, quarter: number) {
  const start = quarterStartWeek(year, quarter);
  return Array.from({ length: QUARTER_WEEKS }, (_, i) => start + i);
}

const importanceLabel: Record<SlateImportance, string> = {
  supporting: "SUPPORTING",
  standard: "STANDARD",
  tentpole: "TENTPOLE",
};

export default function StudioSlate({
  run,
  setRun,
  onOriginal,
  onFranchise,
  onLicensed,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  onOriginal: () => void;
  onFranchise?: (key: string) => void;
  onLicensed?: (ipId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const nowYear = careerCalendarYear(run.week);
  const nowQuarter = quarterIndexForWeek(run.week);
  const [year, setYear] = useState(nowYear);
  const [quarter, setQuarter] = useState(nowQuarter);
  const [planning, setPlanning] = useState(false);
  const [kind, setKind] = useState<SlatePlanKind>("original");
  const [importance, setImportance] = useState<SlateImportance>("standard");
  const [property, setProperty] = useState("");
  const cols = useMemo(() => quarterColumns(year, quarter), [year, quarter]);
  const start = cols[0];
  const end = cols[cols.length - 1];
  const projects = run.projects ?? [];
  const staff = run.staff ?? [];
  const research = run.research ?? [];
  const contractJobs = run.contractJobs ?? [];
  const trainingJobs = run.trainingJobs ?? [];
  const researchJobs = run.researchJobs ?? [];
  const depts = departmentStatuses(projects, staff, run.facilities, research);
  const active = projects.filter((p) => p.stage !== "done" && p.stage !== "airing");
  const plans = plansForQuarter(run, year, quarter);
  const warnings = slateQuarterWarnings(run, year, quarter);
  const franchises = Object.values(run.franchises ?? {}).filter((fr) => !fr.soldTo);
  const ownedIps = Object.values(run.ipMarket?.owned ?? {})
    .filter((contract) => contract.expiresWeek > run.week)
    .map((contract) => ({ contract, ip: ipById(contract.ipId) }))
    .filter((row) => !!row.ip);
  const targetWeek = Math.max(run.week, start + Math.floor(QUARTER_WEEKS / 2));

  const shiftQuarter = (delta: number) => {
    const absolute = (year - 1) * 4 + quarter + delta;
    setYear(Math.max(1, Math.floor(absolute / 4) + 1));
    setQuarter(((absolute % 4) + 4) % 4);
  };

  const addPlan = () => {
    const chosenFr = kind === "franchise" ? franchises.find((fr) => fr.key === property) : undefined;
    const chosenIp = kind === "licensed" ? ownedIps.find((row) => row.contract.ipId === property)?.ip : undefined;
    if (kind !== "original" && !property) return;
    setRun((r) => addSlatePlan(r, {
      kind,
      title: kind === "original" ? "Planned Original" : chosenFr?.baseTitle ?? chosenIp?.title ?? "Planned Project",
      targetWeek,
      importance,
      franchiseKey: chosenFr?.key,
      licensedIpId: chosenIp?.id,
    }));
    setPlanning(false);
    setProperty("");
  };

  const startPlan = (plan: SlatePlan) => {
    setRun((r) => updateSlatePlan(r, plan.id, { status: "setup" }));
    if (plan.kind === "franchise" && plan.franchiseKey && onFranchise) onFranchise(plan.franchiseKey);
    else if (plan.kind === "licensed" && plan.licensedIpId && onLicensed) onLicensed(plan.licensedIpId);
    else onOriginal();
  };

  return (
    <div className="rounded-xl border border-cyanx/25 bg-abyss/45 p-2.5">
      <button onClick={() => setOpen((v) => !v)} className="btn-press flex min-h-11 w-full items-center gap-2 text-left">
        <CalendarRange size={14} className="text-cyanx" />
        <span className="font-display text-xs font-extrabold">STUDIO SLATE & DEPARTMENT LOAD</span>
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

          <div className="flex items-center gap-1 rounded-lg border border-line bg-panel2/40 p-1">
            <button className="btn-press min-h-9 rounded-md px-2 text-paper/55" onClick={() => shiftQuarter(-1)}><ChevronLeft size={14}/></button>
            <div className="min-w-0 flex-1 text-center">
              <div className="text-[8px] font-black tracking-wider text-paper/35">YEAR {year}</div>
              <div className="font-display text-xs font-extrabold text-cyanx">Q{quarter + 1} · {dateLabel(start)}–{dateLabel(end)}</div>
            </div>
            <button className="btn-press min-h-9 rounded-md px-2 text-paper/55" onClick={() => shiftQuarter(1)}><ChevronRight size={14}/></button>
            <button className="btn-press min-h-9 rounded-md border border-cyanx/35 px-2 text-[9px] font-black text-cyanx" onClick={() => setPlanning((v) => !v)}><Plus size={11} className="mr-1 inline"/>PLAN</button>
          </div>

          {warnings.length > 0 && <div className="space-y-1">{warnings.map((warning) => <div key={warning} className="flex items-start gap-1.5 rounded-lg border border-gold/35 bg-gold/5 px-2 py-1.5 text-[9px] text-gold"><AlertTriangle size={11} className="mt-0.5 shrink-0"/>{warning}</div>)}</div>}

          {planning && (
            <div className="rounded-xl border border-cyanx/35 bg-cyanx/5 p-2.5">
              <div className="text-[9px] font-black tracking-wider text-cyanx">PLAN A FUTURE GREENLIGHT</div>
              <div className="mt-2 grid grid-cols-3 gap-1">{(["original","franchise","licensed"] as SlatePlanKind[]).map((id)=><button key={id} className={cn("min-h-10 rounded-lg border px-1 text-[9px] font-black",kind===id?"border-cyanx bg-cyanx/15 text-cyanx":"border-line text-paper/50")} onClick={()=>{setKind(id);setProperty("");}}>{id.toUpperCase()}</button>)}</div>
              {kind === "franchise" && <select value={property} onChange={(e)=>setProperty(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-line bg-panel2 px-2 text-xs"><option value="">Choose franchise…</option>{franchises.map((fr)=><option key={fr.key} value={fr.key}>{fr.baseTitle}</option>)}</select>}
              {kind === "licensed" && <select value={property} onChange={(e)=>setProperty(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-line bg-panel2 px-2 text-xs"><option value="">Choose owned IP…</option>{ownedIps.map(({contract,ip})=><option key={contract.ipId} value={contract.ipId}>{ip!.title}</option>)}</select>}
              <div className="mt-2 grid grid-cols-3 gap-1">{(["supporting","standard","tentpole"] as SlateImportance[]).map((id)=><button key={id} onClick={()=>setImportance(id)} className={cn("min-h-10 rounded-lg border px-1 text-[8px] font-black",importance===id?"border-gold bg-gold/10 text-gold":"border-line text-paper/45")}>{importanceLabel[id]}</button>)}</div>
              <button disabled={kind!=="original"&&!property} onClick={addPlan} className="btn-press mt-2 min-h-11 w-full rounded-lg border border-cyanx/50 bg-cyanx/10 text-[10px] font-black text-cyanx disabled:opacity-30">ADD TO Q{quarter+1} SLATE · {dateLabel(targetWeek)}</button>
            </div>
          )}

          <div className="space-y-1.5 sm:hidden">
            {plans.length === 0 && <div className="rounded-lg border border-dashed border-line p-3 text-center text-[9px] text-paper/35">No future greenlights planned in this quarter.</div>}
            {plans.map((plan)=><div key={plan.id} className="rounded-lg border border-line bg-panel2/55 p-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-bold">{plan.title}</div><div className="text-[8px] text-paper/40">{dateLabel(plan.targetWeek)} · {plan.kind.toUpperCase()} · {importanceLabel[plan.importance]}</div></div><button className="p-2 text-paper/35" onClick={()=>setRun((r)=>removeSlatePlan(r,plan.id))}><Trash2 size={12}/></button></div><button onClick={()=>startPlan(plan)} className="btn-press mt-1.5 min-h-10 w-full rounded-md border border-gold/35 bg-gold/5 text-[9px] font-black text-gold">START SETUP</button></div>)}
          </div>

          <div className="nice-scroll hidden overflow-x-auto sm:block">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[150px_repeat(12,minmax(46px,1fr))] gap-1 text-[8px] text-paper/40"><div />{cols.map((w)=><div key={w} className={cn("text-center",w===run.week&&"font-black text-gold")}>{dateLabel(w)}</div>)}</div>
              <div className="mt-1 space-y-1">
                {active.map((p: Project) => <div key={p.id} className="grid grid-cols-[150px_repeat(12,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-paper/70">{p.draft.title}</div>{cols.map((w)=><div key={w} className={cn("h-5 rounded border text-center text-[7px] leading-5",w>=run.week&&w<=p.deadlineWeek?"border-cyanx/35 bg-cyanx/15 text-cyanx":w===p.deadlineWeek?"border-gold/50 bg-gold/10 text-gold":"border-line/20 bg-panel2/10")}>{w>=run.week&&w<=p.deadlineWeek?STAGE_LABEL[p.stage].slice(0,4).toUpperCase():""}</div>)}</div>)}
                {plans.map((plan)=><div key={plan.id} className="grid grid-cols-[150px_repeat(12,minmax(46px,1fr))] gap-1"><div className="flex items-center gap-1 truncate text-[9px] font-bold text-gold"><span className="truncate">{plan.title}</span><button className="ml-auto text-paper/30" onClick={()=>setRun((r)=>removeSlatePlan(r,plan.id))}><Trash2 size={9}/></button></div>{cols.map((w)=><button key={w} onClick={()=>w===plan.targetWeek&&startPlan(plan)} className={cn("h-5 rounded border text-center text-[7px] leading-5",w===plan.targetWeek?"border-gold/50 bg-gold/15 text-gold":"border-line/20 bg-panel2/10")}>{w===plan.targetWeek?importanceLabel[plan.importance].slice(0,4):""}</button>)}</div>)}
                {contractJobs.map((j)=><div key={j.id} className="grid grid-cols-[150px_repeat(12,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-gold"><Briefcase size={9} className="mr-1 inline"/>{j.contract.name}</div>{cols.map((w)=><div key={w} className={cn("h-5 rounded border",w>=Math.max(run.week,j.startWeek)&&w<=j.dueWeek?"border-gold/30 bg-gold/10":"border-line/20 bg-panel2/10")}/>)}</div>)}
                {trainingJobs.map((j)=><div key={j.id} className="grid grid-cols-[150px_repeat(12,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-mint"><GraduationCap size={9} className="mr-1 inline"/>{j.staffName}</div>{cols.map((w)=><div key={w} className={cn("h-5 rounded border",w>=j.startWeek&&w<=j.completesWeek?"border-mint/30 bg-mint/10":"border-line/20 bg-panel2/10")}/>)}</div>)}
                {researchJobs.map((j)=><div key={j.id} className="grid grid-cols-[150px_repeat(12,minmax(46px,1fr))] gap-1"><div className="truncate text-[9px] font-bold text-viol"><Microscope size={9} className="mr-1 inline"/>{j.name}</div>{cols.map((w)=><div key={w} className={cn("h-5 rounded border",w>=j.startWeek&&w<=j.completesWeek?"border-viol/30 bg-viol/10":"border-line/20 bg-panel2/10")}/>)}</div>)}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-line/50 bg-panel2/35 px-2 py-1.5 text-[8px] text-paper/45">Plans are executive intent, not phantom projects: START SETUP hands off to the normal Original, Franchise or Licensed creation flow. On mobile the quarter is a card list; the dense timeline only appears on larger screens.</div>
        </div>
      )}
    </div>
  );
}
