import { Database, Lightbulb } from "lucide-react";
import { Btn } from "../fx/fx";
import { rushResearchCost } from "../engine/studioOps";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

export default function RushBoostModal({ run, onRespond }: { run: RunState; onRespond: (projectId: string, chance: number | null) => void }) {
  const project = run.projects.find((p) => p.rush?.boostPrompt);
  const prompt = project?.rush?.boostPrompt;
  if (!project || !prompt) return null;
  return <div className="fixed inset-0 z-[95] flex items-center justify-center bg-abyss/86 p-4 backdrop-blur-md">
    <div className="anim-pop ink-card w-full max-w-md p-4">
      <div className="flex items-center gap-2 text-viol"><Lightbulb size={18}/><span className="text-[10px] font-extrabold tracking-[0.25em]">STAFF IMPROVEMENT IDEA</span></div>
      <h3 className="mt-1 font-display text-2xl font-extrabold">{prompt.name} walks over with an idea</h3>
      <p className="mt-1 text-xs text-paper/60">The studio clock has stopped. Back the experiment with Research Data, or keep the rush on plan. Higher skill needs less RD for the same confidence.</p>
      <div className="mt-3 space-y-2">
        {([0.2,0.5,0.8] as const).map((chance) => { const cost = rushResearchCost(prompt.skill, chance); return <button key={chance} disabled={run.rd < cost} onClick={() => onRespond(project.id, chance)} className={cn("btn-press flex w-full items-center gap-3 rounded-xl border border-line bg-panel2/70 p-3 text-left hover:border-viol/60", run.rd < cost && "pointer-events-none opacity-40")}><Database size={17} className="text-viol"/><div className="flex-1"><div className="text-sm font-extrabold">{Math.round(chance*100)}% CONFIDENCE</div><div className="text-[10px] text-paper/45">Relevant skill {prompt.skill}</div></div><span className="font-display text-sm font-extrabold text-viol">{cost} RD</span></button>; })}
        <Btn variant="ghost" className="w-full" onClick={() => onRespond(project.id, null)}>PASS — KEEP WORKING</Btn>
        <div className="text-center text-[10px] text-paper/40">Research available: {run.rd} RD</div>
      </div>
    </div>
  </div>;
}
