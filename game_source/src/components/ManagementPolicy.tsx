import { AlertTriangle, Briefcase, KanbanSquare, ShieldCheck } from "lucide-react";
import { managementPolicyOf, setManagementPolicy, type AlertManagementMode, type ContractManagementMode, type ProjectManagementMode } from "../engine/management";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

type Props = { run: RunState; setRun: (fn: (run: RunState) => RunState) => void };

function Choice<T extends string>({
  value,
  option,
  label,
  detail,
  onPick,
}: {
  value: T;
  option: T;
  label: string;
  detail: string;
  onPick: (value: T) => void;
}) {
  const active = value === option;
  return (
    <button
      type="button"
      onClick={() => onPick(option)}
      className={cn(
        "btn-press min-h-14 rounded-xl border p-2.5 text-left",
        active ? "border-mint/60 bg-mint/10" : "border-line bg-panel2/50 hover:border-cyanx/50",
      )}
    >
      <div className={cn("text-[10px] font-black tracking-wider", active ? "text-mint" : "text-paper/75")}>{label}</div>
      <div className="mt-0.5 text-[9px] leading-snug text-paper/45">{detail}</div>
    </button>
  );
}

export default function ManagementPolicyPanel({ run, setRun }: Props) {
  const policy = managementPolicyOf(run);
  const patch = (next: Parameters<typeof setManagementPolicy>[1]) => setRun((r) => setManagementPolicy(r, next));
  const mature = run.officeLevel >= 2 || run.week >= 8 * 48;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyanx/35 bg-cyanx/5 p-3">
        <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-cyanx"/><b className="text-sm text-cyanx">MANAGE BY EXCEPTION</b></div>
        <p className="mt-1 text-[10px] leading-relaxed text-paper/55">
          These are defaults, not permanent automation. You can still take over any production or hand-pick any contract team. The aim is to stop a large studio asking you to repeat routine decisions.
        </p>
        {!mature && <div className="mt-2 rounded-lg border border-gold/35 bg-gold/5 p-2 text-[9px] text-gold">The policies are visible now, but auto-production only becomes available once the studio has enough management infrastructure.</div>}
      </div>

      <section>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black tracking-widest text-gold"><KanbanSquare size={13}/> PROJECT DEFAULT</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Choice<ProjectManagementMode> value={policy.projectMode} option="manual" label="HANDS-ON" detail="Every production stays manual unless you delegate it yourself." onPick={(projectMode)=>patch({projectMode})}/>
          <Choice<ProjectManagementMode> value={policy.projectMode} option="routine-auto" label="ROUTINE AUTO" detail="Once a real team is assigned, routine productions default to Auto Manage." onPick={(projectMode)=>patch({projectMode})}/>
          <Choice<ProjectManagementMode> value={policy.projectMode} option="auto-except-prestige" label="PROTECT FLAGSHIPS" detail="Routine work auto-manages; Prestige scope and Blockbuster shows always remain hands-on." onPick={(projectMode)=>patch({projectMode})}/>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black tracking-widest text-cyanx"><Briefcase size={13}/> QUICK JOB DEFAULT</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Choice<ContractManagementMode> value={policy.contractMode} option="ask" label="ASK EACH TIME" detail="Opening a quick job still asks you to choose the crew." onPick={(contractMode)=>patch({contractMode})}/>
          <Choice<ContractManagementMode> value={policy.contractMode} option="minimum" label="MINIMUM STAFF" detail="Quick jobs use the smallest legal team that can make the deadline." onPick={(contractMode)=>patch({contractMode})}/>
          <Choice<ContractManagementMode> value={policy.contractMode} option="fastest" label="FASTEST FINISH" detail="Quick jobs use the strongest available crew, up to three contributors." onPick={(contractMode)=>patch({contractMode})}/>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black tracking-widest text-viol"><AlertTriangle size={13}/> CLOCK INTERRUPTIONS</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice<AlertManagementMode> value={policy.alertMode} option="all" label="EVERY COMPLETION" detail="Contract, course and research completions may pause the live clock." onPick={(alertMode)=>patch({alertMode})}/>
          <Choice<AlertManagementMode> value={policy.alertMode} option="exceptions" label="EXCEPTIONS ONLY" detail="Routine completions go to notices; milestones, crises, staff requests and decisions still interrupt." onPick={(alertMode)=>patch({alertMode})}/>
        </div>
      </section>
    </div>
  );
}
