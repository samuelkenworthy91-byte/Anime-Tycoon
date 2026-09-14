import { Crown, Lock, Star } from "lucide-react";
import { castById, GENRES } from "../engine/data";
import { ipById } from "../engine/ip";
import { resolveBigThreeSlotOwner, type BigThreeSlot } from "../engine/bigThree";
import { rivalPosterById } from "../engine/rivalPosters";
import type { RunState } from "../engine/state";
import Poster, { PosterDecorationLayer, hofDesign, titleTextStyle } from "./Poster";

function FallbackPoster({ slot }: { slot: BigThreeSlot }) {
  const design = hofDesign({
    title: slot.title,
    genres: slot.genres,
    animeType: slot.animeType,
    protag: slot.protag ?? slot.title,
    score: slot.score,
  });
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-xl">
      <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 30%, ${design.primary.color}bb 0%, #151021 54%, #08060f 100%)` }} />
      <PosterDecorationLayer design={design} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#05030a] via-[#05030acc] to-transparent px-3 pb-4 pt-14 text-center">
        <div style={titleTextStyle(design, 22)}>{slot.title}</div>
      </div>
    </div>
  );
}

export function BigThreePoster({ slot, studio }: { slot: BigThreeSlot; studio: string }) {
  const licensed = slot.licensedIpId ? ipById(slot.licensedIpId) : null;
  if (licensed?.posterAsset) {
    return <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-xl"><img src={licensed.posterAsset} alt={`${slot.title} poster`} className="absolute inset-0 h-full w-full object-cover" /></div>;
  }
  if (slot.player && slot.draft) {
    const lead = castById(slot.draft.protag);
    return <Poster draft={slot.draft} studio={studio} score={slot.score} portrait={{ img: lead.img, name: slot.draft.protagName || lead.name }} className="w-full shadow-xl" />;
  }
  const rival = slot.posterId ? rivalPosterById(slot.posterId) : null;
  if (rival) {
    return <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-xl"><img src={rival.img} alt={`${slot.title} poster`} className="absolute inset-0 h-full w-full object-cover" /></div>;
  }
  return <FallbackPoster slot={slot} />;
}

export default function BigThreeBoard({ run }: { run: RunState }) {
  const slots = Array.from({ length: 3 }, (_, index) => run.bigThree.slots[index] ? resolveBigThreeSlotOwner(run, run.bigThree.slots[index]) : null);
  return (
    <section className="mb-4 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-panel2/80 to-viol/10 p-3">
      <div className="flex items-center gap-2">
        <Crown size={16} className="text-gold" />
        <div>
          <div className="font-display text-sm font-black tracking-wider text-gold">THE BIG THREE</div>
          <div className="text-[9px] text-paper/50">Fan-decided cultural canon · three permanent names for this era</div>
        </div>
      </div>
      {!run.bigThree.introduced && <div className="mt-3 rounded-xl border border-dashed border-line p-3 text-center text-[10px] text-paper/45"><Lock size={14} className="mx-auto mb-1"/>The cultural conversation changes in Year 6.</div>}
      {run.bigThree.introduced && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {slots.map((slot, index) => slot ? (
            <div key={slot.id} className="rounded-xl border border-gold/30 bg-abyss/55 p-2">
              <div className="mx-auto max-w-[180px]"><BigThreePoster slot={slot} studio={slot.originalStudio} /></div>
              <div className="mt-2 flex items-start gap-1.5"><Star size={11} className="mt-0.5 shrink-0 text-gold"/><div className="min-w-0"><div className="truncate text-xs font-black text-paper">{slot.title}</div><div className="text-[9px] text-paper/50">Creator: {slot.originalStudio} · Year {slot.recognisedYear}</div></div></div>
              <div className="mt-1 text-[8px] text-paper/45">{slot.genres.map((genre) => GENRES.find((g) => g.id === genre)?.label ?? genre).join(" × ")} · {slot.score}/40 · {Math.round(slot.reach).toLocaleString("en-GB")} reach</div>
              {slot.currentOwner !== slot.originalStudio && <div className="mt-1 rounded border border-cyanx/25 bg-cyanx/5 px-1.5 py-1 text-[8px] text-cyanx">Current rights: {slot.currentOwner} · creator credit remains {slot.originalStudio}</div>}
            </div>
          ) : (
            <div key={`open-${index}`} className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-gold/25 bg-abyss/30 p-3 text-center"><div><div className="font-display text-lg font-black text-gold/35">SLOT {index + 1}</div><div className="mt-1 text-[9px] text-paper/35">UNCLAIMED<br/>FANDOM IS WATCHING</div></div></div>
          ))}
        </div>
      )}
    </section>
  );
}
