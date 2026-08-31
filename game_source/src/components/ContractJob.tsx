import { useMemo, useState } from "react";
import { Briefcase, Check, X, Database, Play } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  POINT_COLOR,
  POINT_LABEL,
  ROLE_POINT,
  SHOWRUNNERS,
  formatGBP,
  staffPoint,
  type Contract,
} from "../engine/data";
import type { RunState } from "../engine/state";
import ProductionFloor, { type FloorDesk, type FloorTotals } from "./ProductionFloor";
import { cn } from "../utils/cn";

export default function ContractJob({
  run,
  contract,
  paused,
  onDone,
}: {
  run: RunState;
  contract: Contract;
  paused: boolean;
  onDone: (success: boolean, scored: number) => void;
}) {
  const [mode, setMode] = useState<"brief" | "work" | "result">("brief");
  const [totals, setTotals] = useState<FloorTotals | null>(null);
  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner)!;

  const desks = useMemo<FloorDesk[]>(() => {
    const list: FloorDesk[] = [
      { name: runner.name.split(" ")[0], skill: 44 + run.showsMade * 2, type: contract.type, isBoss: true, img: runner.img },
    ];
    run.staff.forEach((s) =>
      list.push({ name: s.name.split(" ")[0], skill: Math.round(staffPoint(s, ROLE_POINT[s.role]) * (0.6 + s.stamina / 250)), type: ROLE_POINT[s.role], portrait: s.portrait })
    );
    return list;
  }, [run.staff, run.showsMade, runner.name, contract.type]);

  const scored = totals ? totals[contract.type] : 0;
  const success = scored >= contract.target;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />
      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">
        <span className="rounded-md bg-cyanx px-2 py-0.5 text-[10px] font-bold text-ink">CONTRACT</span>
        <span className="truncate font-display text-sm font-extrabold">{contract.name}</span>
        <span className="ml-auto text-[11px] font-bold" style={{ color: POINT_COLOR[contract.type] }}>
          {mode === "work" ? `${scored}` : 0}/{contract.target} {POINT_LABEL[contract.type]}
        </span>
      </div>

      {mode === "brief" && (
        <div className="relative z-10 flex flex-1 items-center justify-center p-4">
          <div className="anim-pop ink-card w-full max-w-md p-5 text-center">
            <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-panel3" style={{ color: POINT_COLOR[contract.type] }}>
              <Briefcase size={22} />
            </span>
            <h2 className="font-display text-2xl font-extrabold">{contract.name}</h2>
            
            <p className="mt-3 text-sm text-paper/70">
              The client needs{" "}
              <b style={{ color: POINT_COLOR[contract.type] }}>
                {contract.target} {POINT_LABEL[contract.type]} points
              </b>{" "}
              in {contract.weeks} weeks. Miss the target and you get nothing.
            </p>
            <div className="mt-3 flex justify-center gap-3 text-sm">
              <span className="ink-chip px-3 py-1 font-bold text-gold">{formatGBP(contract.pay)}</span>
              <span className="ink-chip flex items-center gap-1 px-3 py-1 font-bold text-viol">
                <Database size={13} /> +{contract.rd} RD
              </span>
            </div>
            <Btn big variant="cyan" className="mt-4 w-full" onClick={() => { sfx.phase(); setMode("work"); }}>
              <Play size={18} /> START WORK
            </Btn>
          </div>
        </div>
      )}

      {mode === "work" && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="border-b border-line/40 bg-panel2/60 px-3 py-1.5 text-[10px] text-paper/60">
            Pop the {POINT_LABEL[contract.type].toLowerCase()} bubbles — tap or press 1-{Math.min(7, desks.length)} / SPACE
          </div>
          <div className="min-h-0 flex-1">
            <ProductionFloor
              desks={desks}
              duration={12000}
              focus={contract.type}
              spawnMult={1.15 * (run.research.includes("pipeline") ? 1.2 : 1)}
              lifeMult={run.research.includes("storyboard") ? 1.25 : 1}
              bugRate={0.07}
              paused={paused}
              onProgress={(t) => setTotals(t)}
              onDone={(t) => {
                setTotals(t);
                if (t[contract.type] >= contract.target) sfx.fanfare();
                else sfx.fail();
                setMode("result");
              }}
            />
          </div>
        </div>
      )}

      {mode === "result" && (
        <div className="relative z-10 flex flex-1 items-center justify-center p-4">
          <div className="anim-pop ink-card w-full max-w-md p-5 text-center">
            <span
              className={cn(
                "mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full",
                success ? "bg-mint/20 text-mint" : "bg-neon/20 text-neon"
              )}
            >
              {success ? <Check size={28} /> : <X size={28} />}
            </span>
            <h2 className="font-display text-3xl font-extrabold">{success ? "DELIVERED!" : "MISSED THE BRIEF"}</h2>
            <p className="mt-1 text-sm text-paper/60">
              {scored} / {contract.target} {POINT_LABEL[contract.type]} points
            </p>
            {success ? (
              <div className="mt-3 flex justify-center gap-3">
                <span className="ink-chip px-3 py-1 font-bold text-gold">+{formatGBP(contract.pay)}</span>
                <span className="ink-chip px-3 py-1 font-bold text-viol">+{contract.rd} RD</span>
              </div>
            ) : (
              <div className="mt-3 text-xs text-neon2">
                No fee — but you still keep {Math.max(1, Math.round(contract.rd / 3))} RD from the experience.
              </div>
            )}
            <Btn big variant="primary" className="mt-4 w-full" onClick={() => onDone(success, scored)}>
              BACK TO THE STUDIO
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
