import { Lock, Sparkles } from "lucide-react";
import { castById } from "../engine/data";
import { ipById } from "../engine/ip";
import { rivalPosterById } from "../engine/rivalPosters";
import type { BigThreeSlot } from "../engine/bigThree";
import Poster, { PosterDecorationLayer, hofDesign, titleTextStyle } from "./Poster";
import "./bigThreeReveal.css";

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

export function BigThreeMountain({
  slots,
  incomingIndex = -1,
  concealIncoming = false,
  focusSlotId = null,
  compact = false,
}: {
  slots: Array<BigThreeSlot | null>;
  incomingIndex?: number;
  concealIncoming?: boolean;
  focusSlotId?: string | null;
  compact?: boolean;
}) {
  const wall = Array.from({ length: 3 }, (_, index) => slots[index] ?? null);

  return (
    <div className={`big3-mountain-scene ${compact ? "big3-mountain-compact" : ""}`} aria-label="The Big Three mountain monument">
      <div className="big3-mountain-skyglow" aria-hidden="true" />
      <div className="big3-mountain-distant" aria-hidden="true" />
      <div className="big3-mountain-cliff" aria-hidden="true" />

      <div className="big3-carving-grid grid grid-cols-3 gap-2 sm:gap-4">
        {wall.map((entry, index) => {
          const incoming = index === incomingIndex;
          const concealed = incoming && concealIncoming;
          const focused = !!entry && entry.id === focusSlotId;

          if (!entry || concealed) {
            return (
              <div
                key={entry?.id ?? `mountain-open-${index}`}
                className={`big3-carving big3-carving-empty ${incoming ? "big3-carving-incoming" : ""}`}
              >
                <div className={`big3-unhewn ${incoming ? "big3-unhewn-incoming" : ""}`}>
                  <div className="big3-unhewn-mark">
                    {incoming ? <Sparkles size={compact ? 15 : 20} /> : <Lock size={compact ? 13 : 18} />}
                  </div>
                  <div className="mt-2 font-display text-[8px] font-black tracking-[0.14em] text-stone sm:text-[10px]">
                    {incoming ? "THE STONE IS MOVING" : `PLACE ${index + 1}`}
                  </div>
                  <div className="mt-1 text-[6px] font-black tracking-[0.18em] text-stone/45 sm:text-[8px]">
                    {incoming ? "CONSENSUS FORMING" : "UNWRITTEN"}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={entry.id}
              className={`big3-carving ${focused ? "big3-carving-focus" : ""}`}
            >
              <div className="big3-relief-shell">
                <div className="big3-relief-poster">
                  <BigThreePoster slot={entry} studio={entry.originalStudio} />
                </div>
                <div className="big3-relief-stone" aria-hidden="true" />
                <div className="big3-relief-chisel" aria-hidden="true" />
              </div>
              <div className="big3-stone-plaque">
                <div className="truncate font-display text-[8px] font-black text-[#ead9bb] sm:text-[11px]">{entry.title}</div>
                <div className="mt-0.5 truncate text-[6px] font-black uppercase tracking-[0.12em] text-[#c9b898]/65 sm:text-[8px]">
                  {entry.originalStudio} · YEAR {entry.recognisedYear}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="big3-mountain-inscription" aria-hidden="true">THE BIG THREE</div>
      <div className="big3-mountain-plaza" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i />
      </div>
    </div>
  );
}
