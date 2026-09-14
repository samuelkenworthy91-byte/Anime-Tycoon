import { Crown, Sparkles } from "lucide-react";
import { acknowledgeBigThreeReveal, type BigThreeReveal as BigThreeRevealData, type BigThreeSlot } from "../engine/bigThree";
import type { RunState } from "../engine/state";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { BigThreePoster } from "./BigThreeBoard";

export default function BigThreeReveal({
  run,
  presentation,
  setRun,
}: {
  run: RunState;
  presentation: { reveal: BigThreeRevealData; slot: BigThreeSlot };
  setRun: (fn: (r: RunState) => RunState) => void;
}) {
  const { reveal, slot } = presentation;
  const intro = reveal.kind === "era";
  const remaining = Math.max(0, 3 - run.bigThree.slots.length);
  return (
    <div className="fixed inset-0 z-[112] overflow-y-auto bg-[#05030a]/95 px-3 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center py-3">
        <div className="anim-pop w-full overflow-hidden rounded-3xl border border-gold/55 bg-gradient-to-b from-[#211328] via-[#100b18] to-[#08060d] p-4 shadow-[0_30px_120px_rgba(0,0,0,.85)] sm:p-6">
          <div className="text-center">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-[9px] font-black tracking-[0.24em] text-gold"><Crown size={12}/> FAN CONSENSUS</div>
            <div className="mt-3 font-jp text-[10px] tracking-[0.45em] text-paper/45">CULTURAL RECOGNITION · NOT AN AWARD</div>
            <h2 className="mt-1 font-display text-2xl font-black leading-tight text-paper sm:text-4xl">{intro ? "THE BIG THREE ERA BEGINS" : "THE BIG THREE HAS A NEW NAME"}</h2>
            <p className="mx-auto mt-2 max-w-xl text-[10px] leading-relaxed text-paper/55 sm:text-xs">{intro ? "After years of releases, fandom has begun talking about three defining anime of this generation. Sunnyrise's flagship is the first name to stick. Two places are still unwritten." : `This did not come from judges or a committee. Audience reach, craft and sustained cultural momentum pushed “${slot.title}” into the conversation until the name became unavoidable.`}</p>
          </div>

          <div className="mx-auto mt-5 grid max-w-2xl gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="mx-auto w-full max-w-[220px]"><BigThreePoster slot={slot} studio={slot.originalStudio} /></div>
            <div className="space-y-2 text-center sm:text-left">
              <div className="font-display text-2xl font-black text-gold">{slot.title}</div>
              <div className="text-xs font-bold text-paper/75">{slot.originalStudio}</div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Metric label="CRITICS" value={`${slot.score}/40`} />
                <Metric label="AUDIENCE REACH" value={Math.round(slot.reach).toLocaleString("en-GB")} />
                <Metric label="CRAFT FLOOR" value={slot.craftFloor.toFixed(1)} />
                <Metric label="CULTURAL MOMENTUM" value={`${Math.round(slot.momentum)}/100`} />
              </div>
              {slot.player && <div className="rounded-xl border border-mint/35 bg-mint/8 p-2 text-[9px] text-mint"><Sparkles size={12} className="mr-1 inline"/>Your studio gains +75,000 fans, +60 RD, permanent franchise prestige and stronger renewal leverage for a licensed property.</div>}
              {!intro && <div className="text-[9px] font-bold tracking-wider text-paper/45">{remaining ? `${remaining} BIG THREE PLACE${remaining === 1 ? "" : "S"} REMAIN` : "THE ERA'S BIG THREE IS COMPLETE"}</div>}
            </div>
          </div>

          <Btn big variant="gold" className="mx-auto mt-5 w-full max-w-sm" onClick={() => { sfx.fanfare(); setRun((current) => acknowledgeBigThreeReveal(current, reveal.id)); }}>CONTINUE</Btn>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line/60 bg-black/20 p-2"><div className="text-[8px] font-black tracking-widest text-paper/35">{label}</div><div className="mt-0.5 font-display text-sm font-black text-paper">{value}</div></div>;
}
