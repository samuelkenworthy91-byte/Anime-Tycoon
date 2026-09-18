import { Crown, Lock, Star } from "lucide-react";
import { GENRES } from "../engine/data";
import { resolveBigThreeSlotOwner } from "../engine/bigThree";
import type { RunState } from "../engine/state";
import { BigThreeMountain } from "./BigThreeMountain";

export default function BigThreeBoard({ run }: { run: RunState }) {
  const slots = Array.from({ length: 3 }, (_, index) => run.bigThree.slots[index] ? resolveBigThreeSlotOwner(run, run.bigThree.slots[index]) : null);
  return (
    <section className="mb-4 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-panel2/80 to-viol/10 p-3">
      <div className="flex items-center gap-2">
        <Crown size={16} className="text-gold" />
        <div>
          <div className="font-display text-sm font-black tracking-wider text-gold">THE BIG THREE</div>
          <div className="text-[9px] text-paper/50">Fan-decided cultural canon · three permanent monuments for this era</div><div className="mt-0.5 text-[8px] text-gold/65">38+/40 · 150,000+ franchise following · elite craft · sustained zeitgeist and cultural momentum · at least 48 weeks between inductions</div>
        </div>
      </div>
      {!run.bigThree.introduced && <div className="mt-3 rounded-xl border border-dashed border-line p-3 text-center text-[10px] text-paper/45"><Lock size={14} className="mx-auto mb-1"/>The cultural landscape changes in Year 5.</div>}
      {run.bigThree.introduced && (
        <>
          <div className="mt-3 overflow-hidden rounded-2xl border border-gold/20 bg-abyss/55 p-1.5">
            <BigThreeMountain slots={slots} compact />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {slots.map((slot, index) => slot ? (
              <div key={slot.id} className="rounded-xl border border-gold/25 bg-abyss/55 p-2.5">
                <div className="flex items-start gap-1.5"><Star size={11} className="mt-0.5 shrink-0 text-gold"/><div className="min-w-0"><div className="truncate text-xs font-black text-paper">{slot.title}</div><div className="text-[9px] text-paper/50">Carved for {slot.originalStudio} · Year {slot.recognisedYear}</div></div></div>
                <div className="mt-1 text-[8px] text-paper/45">{slot.genres.map((genre) => GENRES.find((g) => g.id === genre)?.label ?? genre).join(" × ")} · {slot.score}/40 · {Math.round(slot.reach).toLocaleString("en-GB")} reach</div>
                {slot.currentOwner !== slot.originalStudio && <div className="mt-1 rounded border border-cyanx/25 bg-cyanx/5 px-1.5 py-1 text-[8px] text-cyanx">Current rights: {slot.currentOwner} · the monument still credits {slot.originalStudio}</div>}
              </div>
            ) : (
              <div key={`open-${index}`} className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-gold/20 bg-abyss/30 p-2 text-center"><div><div className="font-display text-sm font-black text-gold/35">PLACE {index + 1}</div><div className="mt-1 text-[8px] text-paper/35">UNWRITTEN · FANDOM IS WATCHING</div></div></div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}