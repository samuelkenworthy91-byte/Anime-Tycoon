import { useEffect, useMemo, useState } from "react";
import { Check, FastForward, Sparkles } from "lucide-react";
import { Btn } from "../fx/fx";
import { POINT_COLOR, SHOWRUNNERS, type PointType } from "../engine/data";
import { showrunnerLevelTitle } from "../engine/showrunnerCareer";
import type { RunState } from "../engine/state";
import Portrait from "./Portrait";

export default function ShowrunnerLevelUpModal({ run, setRun }: { run: RunState; setRun: (fn: (r: RunState) => RunState) => void }) {
  const runner = SHOWRUNNERS.find((x) => x.id === run.showrunner) ?? SHOWRUNNERS[0];
  const record = run.showrunnerCareer.pendingLevelUps[0] ?? null;
  const [step, setStep] = useState(0);
  useEffect(() => { setStep(0); }, [record?.id]);
  useEffect(() => {
    if (!record || step >= 5) return;
    const timer = window.setTimeout(() => setStep((x) => Math.min(5, x + 1)), 620);
    return () => window.clearTimeout(timer);
  }, [record?.id, step]);
  const displayName = run.showrunnerName?.trim() || runner.name;
  const points = useMemo<PointType[]>(() => ["story", "art", "sound"], []);
  if (!record) return null;

  const clearOne = () => setRun((r) => ({ ...r, showrunnerCareer: { ...r.showrunnerCareer, pendingLevelUps: r.showrunnerCareer.pendingLevelUps.filter((x) => x.id !== record.id) } }));
  const clearAll = () => setRun((r) => ({ ...r, showrunnerCareer: { ...r.showrunnerCareer, pendingLevelUps: [] } }));
  const total = record.gains.story + record.gains.art + record.gains.sound;

  return <div className="fixed inset-0 z-[111] flex items-center justify-center bg-abyss/90 p-4 backdrop-blur-lg">
    <button onClick={() => setStep(5)} className="btn-press absolute right-4 top-4 rounded-lg border border-line bg-panel px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-paper/70"><FastForward size={12} className="inline" /> SKIP ANIMATION</button>
    <div className="anim-pop ink-card w-full max-w-md border-viol/55 p-5 text-center shadow-2xl">
      <Sparkles size={28} className="mx-auto text-viol" />
      <div className="mt-2 text-[10px] font-black tracking-[0.35em] text-viol">SHOWRUNNER LEVEL UP</div>
      <Portrait img={runner.portrait} name={displayName} alt={displayName} className="mx-auto mt-3 h-24 w-24 rounded-2xl border border-viol/45 object-cover" />
      <div className="mt-2 font-display text-2xl font-extrabold">{displayName}</div>
      <div className="text-[10px] text-paper/50">{runner.title} · {showrunnerLevelTitle(record.afterLevel)}</div>
      <div className="mt-4 min-h-56 space-y-2">
        {step >= 1 && <div className="anim-pop font-display text-3xl font-black text-viol">Lv {record.beforeLevel} → Lv {record.afterLevel}</div>}
        {step >= 2 && <div className="anim-pop text-sm font-extrabold tracking-wider text-paper">{record.title.toUpperCase()}</div>}
        {points.map((point, index) => step >= index + 3 ? <div key={point} className="anim-pop grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-line bg-panel2/70 px-3 py-2 text-left">
          <b className="text-xs tracking-wider" style={{ color: POINT_COLOR[point] }}>{point.toUpperCase()}</b>
          <span className="font-display text-lg font-extrabold text-paper/70">{record.before[point]} → {record.after[point]}</span>
          <span className={record.gains[point] > 0 ? "min-w-12 text-right font-display text-xl font-black text-mint" : "min-w-12 text-right font-display text-xl font-black text-paper/30"}>+{record.gains[point]}</span>
        </div> : null)}
        {step >= 5 && <div className="anim-pop mt-2 rounded-xl border border-mint/30 bg-mint/5 p-2 text-xs text-mint"><Check size={13} className="mr-1 inline" /> Total growth +{total}</div>}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <Btn big variant="primary" disabled={step < 5} onClick={clearOne}>CONTINUE</Btn>
        <Btn variant="ghost" onClick={clearAll}>SKIP ALL</Btn>
      </div>
      <div className="mt-2 text-[9px] text-paper/40">Your founding showrunner now has a visible career of their own. Their actual craft stats are used whenever they personally contribute.</div>
    </div>
  </div>;
}
